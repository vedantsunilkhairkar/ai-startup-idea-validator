"""Comprehensive Logging System & HTTP Request/Response Middleware for Startup Validator Backend."""

import json
import logging
import sys
import time
from typing import Callable, Any, Dict
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import StreamingResponse

SENSITIVE_KEYS = {"password", "token", "access_token", "jwt", "secret", "api_key", "authorization"}


def sanitize_payload(obj: Any) -> Any:
    """Recursively mask sensitive fields in request/response payloads for secure logging."""
    if isinstance(obj, dict):
        sanitized = {}
        for k, v in obj.items():
            if any(s in k.lower() for s in SENSITIVE_KEYS):
                sanitized[k] = "***"
            else:
                sanitized[k] = sanitize_payload(v)
        return sanitized
    elif isinstance(obj, list):
        return [sanitize_payload(item) for item in obj]
    return obj


def format_body_preview(body_bytes: bytes, max_len: int = 500) -> str:
    """Decodes raw bytes and returns a clean, formatted JSON or text preview."""
    if not body_bytes:
        return "(empty)"
    try:
        data = json.loads(body_bytes.decode("utf-8", errors="replace"))
        sanitized = sanitize_payload(data)
        text = json.dumps(sanitized, ensure_ascii=False)
    except Exception:
        text = body_bytes.decode("utf-8", errors="replace").strip()

    if len(text) > max_len:
        return text[:max_len] + f"... [+{len(text) - max_len} chars truncated]"
    return text


class ColorLogFormatter(logging.Formatter):
    """Clean ANSI colorized terminal log formatter."""

    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"

    COLORS = {
        "DEBUG": "\033[36m",            # Cyan
        "INFO": "\033[32m",             # Green
        "WARNING": "\033[33m",          # Yellow
        "ERROR": "\033[31m",            # Red
        "CRITICAL": "\033[35m\033[1m",  # Bold Magenta
    }

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, self.RESET)
        timestamp = self.formatTime(record, "%Y-%m-%d %H:%M:%S")
        record_name = record.name.split(".")[-1]

        prefix = f"{self.DIM}{timestamp}{self.RESET} [{color}{record.levelname:<7}{self.RESET}] {self.BOLD}[{record_name}]{self.RESET}"
        return f"{prefix} {record.getMessage()}"


def setup_logging(log_level: str = "INFO") -> logging.Logger:
    """Configures the root logger with colorized stdout handler and standard log levels."""
    root_logger = logging.getLogger()
    level = getattr(logging, log_level.upper(), logging.INFO)
    root_logger.setLevel(level)

    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    # Avoid adding duplicate handlers across server reloads
    root_logger.handlers.clear()
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    handler.setFormatter(ColorLogFormatter())
    root_logger.addHandler(handler)

    # Suppress third-party noise while preserving backend domain logging
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)  # Superseded by our detailed middleware
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("asyncpg").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)

    return logging.getLogger("backend")


http_logger = logging.getLogger("backend.http")


class RequestResponseLoggingMiddleware(BaseHTTPMiddleware):
    """
    FastAPI / Starlette Middleware that intercepts and logs:
    1. Inbound HTTP requests (Method, Path, Client IP, Query Params, Request Body)
    2. Outbound HTTP responses (Status Code, Latency in ms, Response Body preview)
    3. Real-time Server-Sent Events (SSE) streaming events sent to the client
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()
        method = request.method
        path = request.url.path
        query = str(request.url.query)
        client_ip = request.client.host if request.client else "unknown"

        # Read & cache request body for logging without breaking route handlers
        try:
            req_body = await request.body()
            body_preview = format_body_preview(req_body)
        except Exception:
            body_preview = "(unable to read body)"

        query_str = f"?{query}" if query else ""
        http_logger.info(
            f"\033[95m📥 [HTTP REQ]\033[0m {method} {path}{query_str} | Client: {client_ip} | Body: {body_preview}"
        )

        try:
            response = await call_next(request)
        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000
            http_logger.error(
                f"\033[91m❌ [HTTP ERR]\033[0m {method} {path}{query_str} failed after {duration_ms:.1f}ms: {exc}"
            )
            raise exc

        duration_ms = (time.perf_counter() - start_time) * 1000
        status_code = response.status_code
        content_type = response.headers.get("content-type", "")

        status_color = "\033[92m" if status_code < 400 else "\033[91m"

        # Handle Server-Sent Events (SSE) streaming endpoints
        if "text/event-stream" in content_type:
            http_logger.info(
                f"\033[96m⚡ [HTTP STREAM START]\033[0m {method} {path} -> {status_color}{status_code}\033[0m (SSE stream active)"
            )
            original_iterator = response.body_iterator

            async def logged_streaming_iterator():
                event_count = 0
                try:
                    async for chunk in original_iterator:
                        chunk_str = chunk.decode("utf-8", errors="replace") if isinstance(chunk, bytes) else str(chunk)
                        # Parse SSE data lines for high-visibility terminal logs
                        for line in chunk_str.split("\n"):
                            line = line.strip()
                            if line.startswith("data:"):
                                event_count += 1
                                raw_json = line[5:].strip()
                                try:
                                    evt = json.loads(raw_json)
                                    step = evt.get("step")
                                    agent_name = evt.get("agent_name", "")
                                    msg = evt.get("message", "")
                                    done = evt.get("done", False)
                                    if step:
                                        http_logger.info(
                                            f"\033[96m📤 [STREAM SENT {step}/6]\033[0m Agent: '{agent_name}' | Note: '{msg}' (done={done})"
                                        )
                                    else:
                                        http_logger.info(f"\033[96m📤 [STREAM SENT]\033[0m {raw_json[:120]}")
                                except Exception:
                                    http_logger.info(f"\033[96m📤 [STREAM SENT]\033[0m {raw_json[:120]}")
                        yield chunk
                finally:
                    total_time = (time.perf_counter() - start_time) * 1000
                    http_logger.info(
                        f"\033[92m🏁 [HTTP STREAM END]\033[0m {method} {path} -> {event_count} events delivered in {total_time:.1f}ms"
                    )

            response.body_iterator = logged_streaming_iterator()
            return response

        else:
            # Standard HTTP responses: capture body chunks and restore iterator
            chunks = []
            async for chunk in response.body_iterator:
                chunks.append(chunk)
            full_response_bytes = b"".join(chunks)

            async def async_gen():
                yield full_response_bytes

            response.body_iterator = async_gen()

            res_preview = format_body_preview(full_response_bytes, max_len=400)
            http_logger.info(
                f"\033[92m📤 [HTTP RES]\033[0m {method} {path} -> {status_color}{status_code}\033[0m ({duration_ms:.1f}ms) | Body: {res_preview}"
            )
            return response
