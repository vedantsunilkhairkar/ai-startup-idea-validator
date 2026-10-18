"""PostgreSQL database connection module using asyncpg."""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

import asyncpg
from app.config import settings

logger = logging.getLogger(__name__)

pool: Optional[asyncpg.Pool] = None


async def get_pool() -> Optional[asyncpg.Pool]:
    """Get or create the global asyncpg connection pool."""
    global pool
    if pool is None or pool._closed:
        try:
            pool = await asyncpg.create_pool(
                dsn=settings.postgres_dsn,
                min_size=2,
                max_size=10,
                command_timeout=10,
            )
        except Exception as e:
            logger.error(f"Failed to create asyncpg connection pool: {e}")
            return None
    return pool


async def check_db_connection() -> bool:
    """Verifies that the PostgreSQL server is reachable."""
    try:
        p = await get_pool()
        if p is None:
            return False
        async with p.acquire() as conn:
            val = await conn.fetchval("SELECT 1")
            return val == 1
    except Exception as e:
        logger.warning(f"PostgreSQL connection check failed: {e}")
        return False


async def setup_database() -> bool:
    """Initializes PostgreSQL tables and indexes."""
    try:
        p = await get_pool()
        if p is None:
            return False
        async with p.acquire() as conn:
            # Create users table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id VARCHAR(36) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role VARCHAR(50) NOT NULL DEFAULT 'user',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            """)

            # Create validations table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS validations (
                    id VARCHAR(36) PRIMARY KEY,
                    user_id VARCHAR(36),
                    title TEXT,
                    idea TEXT NOT NULL,
                    target_audience TEXT,
                    industry TEXT,
                    constraints JSONB DEFAULT '[]'::jsonb,
                    validation_score INT,
                    launch_readiness_verdict TEXT,
                    scores_breakdown JSONB DEFAULT '{}'::jsonb,
                    idea_extraction JSONB DEFAULT '{}'::jsonb,
                    market_trends JSONB DEFAULT '{}'::jsonb,
                    news_headlines JSONB DEFAULT '[]'::jsonb,
                    competitors JSONB DEFAULT '[]'::jsonb,
                    swot_analysis JSONB DEFAULT '{}'::jsonb,
                    mvp_recommendation JSONB DEFAULT '{}'::jsonb,
                    risks JSONB DEFAULT '[]'::jsonb,
                    visual_statistics JSONB DEFAULT '{}'::jsonb,
                    report JSONB DEFAULT '{}'::jsonb,
                    errors JSONB DEFAULT '[]'::jsonb,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_validations_user_created ON validations(user_id, created_at DESC);
                CREATE INDEX IF NOT EXISTS idx_validations_created_at ON validations(created_at DESC);
            """)
        logger.info("PostgreSQL tables and indexes successfully initialized.")
        return True
    except Exception as e:
        logger.warning(f"Database setup error: {e}")
        return False


def _to_json_str(val: Any) -> str:
    if isinstance(val, (dict, list)):
        return json.dumps(val)
    if val is None:
        return "{}"
    return str(val)


def _row_to_dict(row: asyncpg.Record) -> Dict[str, Any]:
    if not row:
        return {}
    d = dict(row)
    for json_col in [
        "constraints", "scores_breakdown", "idea_extraction", "market_trends",
        "news_headlines", "competitors", "swot_analysis", "mvp_recommendation",
        "risks", "visual_statistics", "report", "errors"
    ]:
        if json_col in d and isinstance(d[json_col], str):
            try:
                d[json_col] = json.loads(d[json_col])
            except Exception:
                pass
    if "created_at" in d and isinstance(d["created_at"], datetime):
        d["created_at"] = d["created_at"].isoformat()
    if "last_login_at" in d and isinstance(d["last_login_at"], datetime):
        d["last_login_at"] = d["last_login_at"].isoformat()
    return d


class UsersRepository:
    @staticmethod
    async def find_one(filter_dict: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        p = await get_pool()
        if not p:
            return None
        async with p.acquire() as conn:
            if "id" in filter_dict or "_id" in filter_dict:
                user_id = str(filter_dict.get("id") or filter_dict.get("_id"))
                row = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
            elif "email" in filter_dict:
                row = await conn.fetchrow("SELECT * FROM users WHERE email = $1", filter_dict["email"].lower())
            else:
                return None
            return _row_to_dict(row) if row else None

    @staticmethod
    async def insert_one(user_doc: Dict[str, Any]) -> str:
        p = await get_pool()
        if not p:
            raise RuntimeError("Database pool not available")
        user_id = user_doc.get("id") or str(uuid.uuid4())
        created_at = user_doc.get("created_at") or datetime.now(timezone.utc)
        last_login_at = user_doc.get("last_login_at") or created_at
        async with p.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO users (id, name, email, password_hash, role, created_at, last_login_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                user_id,
                user_doc.get("name", ""),
                user_doc.get("email", "").lower(),
                user_doc.get("password_hash", ""),
                user_doc.get("role", "user"),
                created_at,
                last_login_at,
            )
        return user_id

    @staticmethod
    async def update_one(filter_dict: Dict[str, Any], update_dict: Dict[str, Any]):
        p = await get_pool()
        if not p:
            return
        sets = update_dict.get("$set", {})
        user_id = str(filter_dict.get("id") or filter_dict.get("_id", ""))
        email = filter_dict.get("email")

        async with p.acquire() as conn:
            if user_id:
                for k, v in sets.items():
                    await conn.execute(f"UPDATE users SET {k} = $1 WHERE id = $2", v, user_id)
            elif email:
                for k, v in sets.items():
                    await conn.execute(f"UPDATE users SET {k} = $1 WHERE email = $2", v, email.lower())

    @staticmethod
    async def count_documents(filter_dict: Optional[Dict[str, Any]] = None) -> int:
        p = await get_pool()
        if not p:
            return 0
        filter_dict = filter_dict or {}
        role = filter_dict.get("role")
        async with p.acquire() as conn:
            if role:
                return await conn.fetchval("SELECT COUNT(*) FROM users WHERE role = $1", role)
            query = filter_dict.get("query")
            if query:
                pattern = f"%{query}%"
                return await conn.fetchval(
                    "SELECT COUNT(*) FROM users WHERE name ILIKE $1 OR email ILIKE $1", pattern
                )
            return await conn.fetchval("SELECT COUNT(*) FROM users")

    @staticmethod
    async def find(query: str = "", skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        p = await get_pool()
        if not p:
            return []
        async with p.acquire() as conn:
            if query.strip():
                pattern = f"%{query.strip()}%"
                rows = await conn.fetch(
                    """
                    SELECT id, name, email, role, created_at, last_login_at
                    FROM users
                    WHERE name ILIKE $1 OR email ILIKE $1
                    ORDER BY created_at DESC
                    OFFSET $2 LIMIT $3
                    """,
                    pattern, skip, limit
                )
            else:
                rows = await conn.fetch(
                    """
                    SELECT id, name, email, role, created_at, last_login_at
                    FROM users
                    ORDER BY created_at DESC
                    OFFSET $1 LIMIT $2
                    """,
                    skip, limit
                )
            return [_row_to_dict(r) for r in rows]


class ValidationsRepository:
    @staticmethod
    async def insert_one(doc: Dict[str, Any]) -> str:
        p = await get_pool()
        if not p:
            raise RuntimeError("Database pool not available")
        val_id = doc.get("id") or str(uuid.uuid4())
        created_at = doc.get("created_at")
        if isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at)
            except Exception:
                created_at = datetime.now(timezone.utc)
        elif not isinstance(created_at, datetime):
            created_at = datetime.now(timezone.utc)

        async with p.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO validations (
                    id, user_id, title, idea, target_audience, industry,
                    constraints, validation_score, launch_readiness_verdict,
                    scores_breakdown, idea_extraction, market_trends,
                    news_headlines, competitors, swot_analysis,
                    mvp_recommendation, risks, visual_statistics,
                    report, errors, created_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6,
                    $7::jsonb, $8, $9,
                    $10::jsonb, $11::jsonb, $12::jsonb,
                    $13::jsonb, $14::jsonb, $15::jsonb,
                    $16::jsonb, $17::jsonb, $18::jsonb,
                    $19::jsonb, $20::jsonb, $21
                )
                """,
                val_id,
                doc.get("user_id"),
                doc.get("title", "Untitled Venture"),
                doc.get("idea", ""),
                doc.get("target_audience", ""),
                doc.get("industry", ""),
                _to_json_str(doc.get("constraints", [])),
                doc.get("validation_score", 70),
                doc.get("launch_readiness_verdict", "Requires Refinement"),
                _to_json_str(doc.get("scores_breakdown", {})),
                _to_json_str(doc.get("idea_extraction", {})),
                _to_json_str(doc.get("market_trends", {})),
                _to_json_str(doc.get("news_headlines", [])),
                _to_json_str(doc.get("competitors", [])),
                _to_json_str(doc.get("swot_analysis", {})),
                _to_json_str(doc.get("mvp_recommendation", {})),
                _to_json_str(doc.get("risks", [])),
                _to_json_str(doc.get("visual_statistics", {})),
                _to_json_str(doc.get("report", {})),
                _to_json_str(doc.get("errors", [])),
                created_at,
            )
        return val_id

    @staticmethod
    async def find_one(filter_dict: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        p = await get_pool()
        if not p:
            return None
        val_id = str(filter_dict.get("id") or filter_dict.get("_id") or "")
        async with p.acquire() as conn:
            if val_id:
                row = await conn.fetchrow("SELECT * FROM validations WHERE id = $1", val_id)
            elif "user_id" in filter_dict and "created_at_gte" in filter_dict:
                row = await conn.fetchrow(
                    """
                    SELECT * FROM validations
                    WHERE user_id = $1 AND title = $2 AND idea = $3 AND created_at >= $4
                    ORDER BY created_at DESC LIMIT 1
                    """,
                    filter_dict["user_id"],
                    filter_dict.get("title"),
                    filter_dict.get("idea"),
                    filter_dict["created_at_gte"],
                )
            else:
                return None
            return _row_to_dict(row) if row else None

    @staticmethod
    async def find_by_user(user_id: str) -> List[Dict[str, Any]]:
        p = await get_pool()
        if not p:
            return []
        async with p.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM validations WHERE user_id = $1 ORDER BY created_at DESC",
                str(user_id)
            )
            return [_row_to_dict(r) for r in rows]

    @staticmethod
    async def delete_one(val_id: str, user_id: str) -> bool:
        p = await get_pool()
        if not p:
            return False
        async with p.acquire() as conn:
            res = await conn.execute(
                "DELETE FROM validations WHERE id = $1 AND user_id = $2",
                str(val_id), str(user_id)
            )
            return res.endswith("1")

    @staticmethod
    async def count_documents(since: Optional[datetime] = None, query: str = "") -> int:
        p = await get_pool()
        if not p:
            return 0
        async with p.acquire() as conn:
            if since:
                return await conn.fetchval("SELECT COUNT(*) FROM validations WHERE created_at >= $1", since)
            if query.strip():
                pattern = f"%{query.strip()}%"
                return await conn.fetchval(
                    """
                    SELECT COUNT(*) FROM validations
                    WHERE title ILIKE $1 OR idea ILIKE $1 OR industry ILIKE $1
                    """,
                    pattern
                )
            return await conn.fetchval("SELECT COUNT(*) FROM validations")

    @staticmethod
    async def get_overview_stats() -> Dict[str, Any]:
        p = await get_pool()
        if not p:
            return {}
        now = datetime.now(timezone.utc)
        seven_days_ago = now - asyncio.get_event_loop().time() if False else now
        from datetime import timedelta
        seven_days_ago = now - timedelta(days=7)
        thirty_days_ago = now - timedelta(days=30)

        async with p.acquire() as conn:
            total_validations = await conn.fetchval("SELECT COUNT(*) FROM validations") or 0
            validations_7d = await conn.fetchval("SELECT COUNT(*) FROM validations WHERE created_at >= $1", seven_days_ago) or 0
            validations_30d = await conn.fetchval("SELECT COUNT(*) FROM validations WHERE created_at >= $1", thirty_days_ago) or 0
            avg_score = await conn.fetchval("SELECT AVG(validation_score) FROM validations") or 0
            active_users_30d = await conn.fetchval(
                "SELECT COUNT(DISTINCT user_id) FROM validations WHERE created_at >= $1 AND user_id IS NOT NULL",
                thirty_days_ago
            ) or 0

            # Daily validations for last 14 days
            daily_rows = await conn.fetch(
                """
                SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS day, COUNT(*) AS count
                FROM validations
                WHERE created_at >= $1
                GROUP BY day
                """,
                now - timedelta(days=13)
            )
            daily_counts = {r["day"]: r["count"] for r in daily_rows}
            daily_validations = [
                {
                    "date": (now.date() - timedelta(days=offset)).isoformat(),
                    "count": daily_counts.get((now.date() - timedelta(days=offset)).isoformat(), 0)
                }
                for offset in range(13, -1, -1)
            ]

            # Top industries
            industry_rows = await conn.fetch(
                """
                SELECT industry, COUNT(*) AS count
                FROM validations
                WHERE industry IS NOT NULL AND industry != ''
                GROUP BY industry
                ORDER BY count DESC
                LIMIT 6
                """
            )
            top_industries = [{"industry": r["industry"], "count": r["count"]} for r in industry_rows]

            # Recent 8 validations with owner info
            recent_rows = await conn.fetch(
                """
                SELECT v.id, v.title, v.idea, v.industry, v.validation_score,
                       v.launch_readiness_verdict, v.created_at, v.user_id,
                       u.name AS user_name, u.email AS user_email
                FROM validations v
                LEFT JOIN users u ON v.user_id = u.id
                ORDER BY v.created_at DESC
                LIMIT 8
                """
            )
            recent_validations = []
            for r in recent_rows:
                rd = dict(r)
                if isinstance(rd["created_at"], datetime):
                    rd["created_at"] = rd["created_at"].isoformat()
                if not rd.get("user_name"):
                    rd["user_name"] = "Guest / deleted account"
                recent_validations.append(rd)

            return {
                "total_validations": total_validations,
                "validations_7d": validations_7d,
                "validations_30d": validations_30d,
                "average_score": round(float(avg_score), 1),
                "active_users_30d": active_users_30d,
                "daily_validations": daily_validations,
                "top_industries": top_industries,
                "recent_validations": recent_validations,
            }

    @staticmethod
    async def list_admin_validations(query: str = "", skip: int = 0, limit: int = 30) -> List[Dict[str, Any]]:
        p = await get_pool()
        if not p:
            return []
        async with p.acquire() as conn:
            if query.strip():
                pattern = f"%{query.strip()}%"
                rows = await conn.fetch(
                    """
                    SELECT v.id, v.title, v.idea, v.industry, v.validation_score,
                           v.launch_readiness_verdict, v.created_at, v.user_id,
                           u.name AS user_name, u.email AS user_email
                    FROM validations v
                    LEFT JOIN users u ON v.user_id = u.id
                    WHERE v.title ILIKE $1 OR v.idea ILIKE $1 OR v.industry ILIKE $1
                          OR u.name ILIKE $1 OR u.email ILIKE $1
                    ORDER BY v.created_at DESC
                    OFFSET $2 LIMIT $3
                    """,
                    pattern, skip, limit
                )
            else:
                rows = await conn.fetch(
                    """
                    SELECT v.id, v.title, v.idea, v.industry, v.validation_score,
                           v.launch_readiness_verdict, v.created_at, v.user_id,
                           u.name AS user_name, u.email AS user_email
                    FROM validations v
                    LEFT JOIN users u ON v.user_id = u.id
                    ORDER BY v.created_at DESC
                    OFFSET $1 LIMIT $2
                    """,
                    skip, limit
                )
            result = []
            for r in rows:
                d = dict(r)
                if isinstance(d["created_at"], datetime):
                    d["created_at"] = d["created_at"].isoformat()
                if not d.get("user_name"):
                    d["user_name"] = "Guest / deleted account"
                result.append(d)
            return result


def format_doc(doc: dict) -> dict:
    """Helper to ensure clean dict for JSON serialization."""
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc
