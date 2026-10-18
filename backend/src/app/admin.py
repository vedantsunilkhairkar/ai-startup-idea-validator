"""Administrator-only analytics endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from app.auth.security import get_current_admin_user
from app.database import UsersRepository, ValidationsRepository

router = APIRouter(prefix="/admin", tags=["Administration"])


@router.get("/overview")
async def get_overview(_: dict = Depends(get_current_admin_user)):
    """Aggregate platform-wide activity and recent validation history."""
    total_users = await UsersRepository.count_documents()
    admin_users = await UsersRepository.count_documents({"role": "admin"})
    stats = await ValidationsRepository.get_overview_stats()

    return {
        "summary": {
            "total_users": total_users,
            "admin_users": admin_users,
            "total_validations": stats.get("total_validations", 0),
            "validations_7d": stats.get("validations_7d", 0),
            "validations_30d": stats.get("validations_30d", 0),
            "active_users_30d": stats.get("active_users_30d", 0),
            "average_score": stats.get("average_score", 0),
        },
        "daily_validations": stats.get("daily_validations", []),
        "top_industries": stats.get("top_industries", []),
        "recent_validations": stats.get("recent_validations", []),
    }


@router.get("/users")
async def list_users(
    q: str = Query(default="", max_length=120),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=25, ge=1, le=100),
    _: dict = Depends(get_current_admin_user),
):
    total = await UsersRepository.count_documents({"query": q})
    docs = await UsersRepository.find(query=q, skip=skip, limit=limit)

    return {
        "total": total,
        "data": docs,
    }


@router.get("/validations")
async def list_validations(
    q: str = Query(default="", max_length=160),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=30, ge=1, le=100),
    _: dict = Depends(get_current_admin_user),
):
    total = await ValidationsRepository.count_documents(query=q)
    docs = await ValidationsRepository.list_admin_validations(query=q, skip=skip, limit=limit)

    return {
        "total": total,
        "data": docs,
    }


@router.get("/validations/{validation_id}")
async def get_validation_detail(validation_id: str, _: dict = Depends(get_current_admin_user)):
    """Return a saved startup analysis report to administrators."""
    doc = await ValidationsRepository.find_one({"id": validation_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Analysis not found")

    owner = None
    owner_id = doc.get("user_id")
    if owner_id:
        owner = await UsersRepository.find_one({"id": owner_id})

    fields = (
        "title", "idea", "target_audience", "industry", "constraints",
        "validation_score", "launch_readiness_verdict", "scores_breakdown",
        "idea_extraction", "market_analysis", "market_trends", "news_headlines",
        "competitors", "swot_analysis", "mvp_recommendation", "risks",
        "visual_statistics", "report", "errors",
    )
    result = {key: doc.get(key) for key in fields if key in doc}
    result.update({
        "id": str(doc["id"]),
        "created_at": doc.get("created_at"),
        "user_id": str(owner_id) if owner_id else None,
        "user_name": (owner or {}).get("name", "Guest / deleted account"),
        "user_email": (owner or {}).get("email", ""),
    })
    return result
