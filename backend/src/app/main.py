"""FastAPI Main Application Entry Point for AI Startup Idea Validator."""

from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Depends, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import json
from pydantic import BaseModel, Field

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config import settings
from utils.logger import setup_logging, RequestResponseLoggingMiddleware
from app.database import (
    check_db_connection,
    setup_database,
    ValidationsRepository,
    format_doc
)
from app.auth.security import get_current_user, get_optional_user
from app.auth.routes import router as auth_router
from app.admin import router as admin_router
from graph.workflow import graph as validation_graph
from utils.trends_tool import get_trends_interest
from utils.guardrails import validate_startup_idea_guardrail

# Initialize colorized structured logging
logger = setup_logging(settings.LOG_LEVEL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure database reachable and initialize tables
    logger.info("🚀 Starting AI Startup Idea Validator Backend with PostgreSQL...")
    await check_db_connection()
    await setup_database()
    logger.info("✨ Backend services, PostgreSQL & LangGraph pipeline ready to accept traffic.")
    yield
    # Shutdown
    logger.info("🛑 Shutting down AI Startup Idea Validator Backend...")


app = FastAPI(
    title="AI Startup Idea Validator API",
    description="Backend API powered by a 5-agent LangGraph workflow, PostgreSQL, and FastAPI.",
    version="1.0.0",
    lifespan=lifespan
)

# Intercept and log all inbound HTTP requests & outbound responses
app.add_middleware(RequestResponseLoggingMiddleware)

# Enable CORS for Frontend (React + Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Authentication Routes
app.include_router(auth_router, prefix="/api")
app.include_router(admin_router, prefix="/api")


# ==========================================================
# Pydantic Request / Response Schemas
# ==========================================================

class ValidateIdeaRequest(BaseModel):
    title: Optional[str] = "Untitled Venture"
    idea: str = Field(..., min_length=5, description="Core elevator pitch or description of the startup idea")
    target_audience: Optional[str] = ""
    industry: Optional[str] = ""
    constraints: Optional[List[str]] = Field(default_factory=list)


# ==========================================================
# API Endpoints
# ==========================================================

@app.get("/api/health")
async def health_check():
    """Health check verifying database connection and agent pipeline."""
    db_connected = await check_db_connection()
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database_connected": db_connected,
        "database_type": "PostgreSQL",
        "llm_provider": settings.LLM_PROVIDER,
        "active_agents": 6,
        "agents": [
            "IdeaExtractionAgent",
            "MarketTrendsAgent",
            "CompetitorAgent",
            "SWOTRiskAgent",
            "MVPRecommendationAgent",
            "ValidationReportAgent"
        ]
    }


@app.post("/api/validate")
async def validate_idea(
    req: ValidateIdeaRequest,
    user: Optional[dict] = Depends(get_optional_user)
):
    """
    Executes the multi-agent LangGraph research & evaluation pipeline,
    persists the output in PostgreSQL, and returns the validation report.
    """
    # Guardrail: protect against gibberish, spam, and non-business inputs
    is_valid, reason = await validate_startup_idea_guardrail(req.idea)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=reason
        )

    initial_state = {
        "startup_idea": req.idea,
        "target_audience": req.target_audience or "",
        "industry": req.industry or "",
        "constraints": req.constraints or [],
        "errors": []
    }

    try:
        # Run multi-agent LangGraph pipeline
        final_state = validation_graph.invoke(initial_state)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent workflow execution failed: {str(e)}"
        )

    report = final_state.get("report", {})
    score = final_state.get("validation_score", 70)
    verdict = final_state.get("launch_readiness_verdict", "Requires Refinement")
    breakdown = final_state.get("scores_breakdown", {
        "market_demand": 70,
        "feasibility": 70,
        "competition_barrier": 65,
        "business_viability": 75
    })

    # Prepare document for PostgreSQL
    doc = {
        "user_id": user.get("user_id") if user else None,
        "title": req.title or "Startup Idea",
        "idea": req.idea,
        "target_audience": req.target_audience,
        "industry": req.industry,
        "constraints": req.constraints,
        "validation_score": score,
        "launch_readiness_verdict": verdict,
        "scores_breakdown": breakdown,
        "idea_extraction": final_state.get("idea_extraction", {}),
        "market_trends": final_state.get("market_trends", {}),
        "news_headlines": final_state.get("news_headlines", []),
        "competitors": final_state.get("competitors", []),
        "swot_analysis": final_state.get("swot_analysis", {}),
        "mvp_recommendation": final_state.get("mvp_recommendation", {}),
        "risks": final_state.get("risks", []),
        "visual_statistics": report.get("visual_statistics", {}),
        "report": report,
        "errors": final_state.get("errors", []),
        "created_at": datetime.now(timezone.utc)
    }

    inserted_id = None
    try:
        # Deduplication: check if exact same validation by this user was stored within 30 seconds
        recent = None
        if user and user.get("user_id"):
            recent = await ValidationsRepository.find_one({
                "user_id": user["user_id"],
                "title": doc.get("title"),
                "idea": doc.get("idea"),
                "created_at_gte": datetime.now(timezone.utc) - timedelta(seconds=30)
            })
        if recent:
            inserted_id = str(recent["id"])
            logger.info(f"🔁 [DATABASE] Reusing existing validation record {inserted_id} to avoid duplicate insertion")
        else:
            inserted_id = await ValidationsRepository.insert_one(doc)
            logger.info(f"\033[93m💾 [DATABASE]\033[0m Persisted validation report to PostgreSQL with ID: {inserted_id}")
    except Exception as e:
        logger.warning(f"⚠️ [DATABASE] Failed to insert validation into PostgreSQL: {e}")

    doc["id"] = inserted_id or "temp-id"
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()

    return {
        "status": "success",
        "data": doc
    }


@app.post("/api/validate/stream")
async def validate_idea_stream(
    req: ValidateIdeaRequest,
    user: Optional[dict] = Depends(get_optional_user)
):
    """
    Real-time streaming validation pipeline. Emits SSE progress events as each
    agent completes, followed by the final validation report and database persistence.
    """
    # Guardrail: protect against gibberish, spam, and non-business inputs
    is_valid, reason = await validate_startup_idea_guardrail(req.idea)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=reason
        )

    initial_state = {
        "startup_idea": req.idea,
        "target_audience": req.target_audience or "",
        "industry": req.industry or "",
        "constraints": req.constraints or [],
        "errors": []
    }

    agent_steps = {
        "idea_extraction": {
            "step": 1,
            "agent_name": "Idea Extraction",
            "message": "Dissected problem, solution and keywords"
        },
        "market_trends": {
            "step": 2,
            "agent_name": "Market Trends",
            "message": "Analyzed search interest trajectory and live industry headlines"
        },
        "competitor_analysis": {
            "step": 3,
            "agent_name": "Competitor Intelligence",
            "message": "Scanned and benchmarked direct & indirect competitors"
        },
        "swot_analysis": {
            "step": 4,
            "agent_name": "SWOT & Feasibility",
            "message": "Evaluated strengths, vulnerabilities and operational risks"
        },
        "mvp_recommendation": {
            "step": 5,
            "agent_name": "MVP Recommendation",
            "message": "Scoped must-have and nice-to-have MVP deliverables"
        },
        "validation_report": {
            "step": 6,
            "agent_name": "Report & Scoring",
            "message": "Computed 0–100 score, verdict, and visual statistics"
        }
    }

    async def event_generator():
        try:
            async for step_output in validation_graph.astream(initial_state):
                for node_name, state_data in step_output.items():
                    if node_name in agent_steps:
                        meta = agent_steps[node_name]
                        event_payload = {
                            "type": "agent_progress",
                            "agent": node_name,
                            "step": meta["step"],
                            "agent_name": meta["agent_name"],
                            "status": "completed",
                            "message": meta["message"],
                        }

                        if node_name == "validation_report":
                            final_state = state_data
                            report = final_state.get("report", {})
                            score = final_state.get("validation_score", 70)
                            verdict = final_state.get("launch_readiness_verdict", "Requires Refinement")
                            breakdown = final_state.get("scores_breakdown", {
                                "market_demand": 70,
                                "feasibility": 70,
                                "competition_barrier": 65,
                                "business_viability": 75
                            })

                            doc = {
                                "user_id": user.get("user_id") if user else None,
                                "title": req.title or "Startup Idea",
                                "idea": req.idea,
                                "target_audience": req.target_audience,
                                "industry": req.industry,
                                "constraints": req.constraints,
                                "validation_score": score,
                                "launch_readiness_verdict": verdict,
                                "scores_breakdown": breakdown,
                                "idea_extraction": final_state.get("idea_extraction", {}),
                                "market_trends": final_state.get("market_trends", {}),
                                "news_headlines": final_state.get("news_headlines", []),
                                "competitors": final_state.get("competitors", []),
                                "swot_analysis": final_state.get("swot_analysis", {}),
                                "mvp_recommendation": final_state.get("mvp_recommendation", {}),
                                "risks": final_state.get("risks", []),
                                "visual_statistics": report.get("visual_statistics", {}),
                                "report": report,
                                "errors": final_state.get("errors", []),
                                "created_at": datetime.now(timezone.utc)
                            }

                            inserted_id = None
                            try:
                                # Deduplication: check if exact same validation by this user was stored within 30 seconds
                                recent = None
                                if user and user.get("user_id"):
                                    recent = await ValidationsRepository.find_one({
                                        "user_id": user["user_id"],
                                        "title": doc.get("title"),
                                        "idea": doc.get("idea"),
                                        "created_at_gte": datetime.now(timezone.utc) - timedelta(seconds=30)
                                    })
                                if recent:
                                    inserted_id = str(recent["id"])
                                    logger.info(f"🔁 [DATABASE] Reusing existing streaming validation record {inserted_id} to avoid duplicate insertion")
                                else:
                                    inserted_id = await ValidationsRepository.insert_one(doc)
                                    logger.info(f"\033[93m💾 [DATABASE]\033[0m Persisted streaming validation to PostgreSQL with ID: {inserted_id}")
                            except Exception as e:
                                logger.warning(f"⚠️ [DATABASE] Failed to insert stream validation into PostgreSQL: {e}")

                            doc["id"] = inserted_id or "temp-id"
                            if isinstance(doc.get("created_at"), datetime):
                                doc["created_at"] = doc["created_at"].isoformat()

                            event_payload["done"] = True
                            event_payload["result"] = doc

                        yield f"data: {json.dumps(event_payload)}\n\n"

        except Exception as e:
            error_payload = {
                "type": "error",
                "error": str(e)
            }
            logger.error(f"❌ [STREAM ERR] Validation stream encountered error: {e}")
            yield f"data: {json.dumps(error_payload)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@app.get("/api/ideas")
async def list_user_ideas(current_user: dict = Depends(get_current_user)):
    """Fetches all past validation runs for the authenticated user from PostgreSQL."""
    items = await ValidationsRepository.find_by_user(current_user["user_id"])
    logger.info(f"\033[93m💾 [DATABASE]\033[0m Retrieved {len(items)} validation runs for user: '{current_user.get('email')}'")
    return {
        "status": "success",
        "count": len(items),
        "data": items
    }


@app.get("/api/ideas/{idea_id}")
async def get_idea_details(idea_id: str, user: Optional[dict] = Depends(get_optional_user)):
    """Retrieves full validation details by ID from PostgreSQL."""
    doc = await ValidationsRepository.find_one({"id": idea_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Validation record not found")
    logger.info(f"\033[93m💾 [DATABASE]\033[0m Retrieved validation details for idea ID: {idea_id}")
    return {"status": "success", "data": doc}


@app.delete("/api/ideas/{idea_id}")
async def delete_idea(idea_id: str, current_user: dict = Depends(get_current_user)):
    """Deletes a saved validation record owned by current user."""
    deleted = await ValidationsRepository.delete_one(idea_id, current_user["user_id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Record not found or unauthorized")
    logger.info(f"\033[93m💾 [DATABASE]\033[0m Deleted validation record {idea_id} for user: '{current_user.get('email')}'")
    return {"status": "success", "message": "Validation record deleted successfully."}


@app.get("/api/trends")
async def query_trends(
    keyword: str = Query(..., min_length=1),
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """Direct lookup endpoint for Google Trends (PyTrends & SerpAPI) keyword analysis."""
    user_str = current_user.get('email') if current_user else 'anonymous visitor'
    logger.info(f"\033[94m🔎 [TRENDS TOOL]\033[0m Querying Google Trends for keyword: '{keyword}' ({user_str})")
    data = get_trends_interest([keyword])
    logger.info(
        f"\033[94m🔎 [TRENDS TOOL]\033[0m Trends result for '{keyword}': Direction={data.get('trend_direction')}, AvgInterest={data.get('average_interest')}"
    )
    return {
        "status": "success",
        "data": data
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
