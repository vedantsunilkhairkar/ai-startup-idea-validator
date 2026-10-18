"""Integration tests for FastAPI endpoints, authentication, and the 5-agent pipeline."""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["active_agents"] == 6
        assert len(data["agents"]) == 6


@pytest.mark.asyncio
async def test_trends_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Public lookup for trends succeeds
        resp = await ac.get("/api/trends?keyword=artificial+intelligence")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert "average_interest" in data["data"]
        assert "trend_direction" in data["data"]

        # Authenticated request also succeeds with user context
        email = f"trends_tester_{id(ac)}@example.com"
        reg_resp = await ac.post("/api/auth/register", json={
            "name": "Trends Tester",
            "email": email,
            "password": "SecurePassword123!"
        })
        token = reg_resp.json()["token"] if reg_resp.status_code == 200 else (
            (await ac.post("/api/auth/login", json={"email": email, "password": "SecurePassword123!"})).json()["token"]
        )

        headers = {"Authorization": f"Bearer {token}"}
        auth_resp = await ac.get("/api/trends?keyword=AI+Agents", headers=headers)
        assert auth_resp.status_code == 200
        assert auth_resp.json()["status"] == "success"



@pytest.mark.asyncio
async def test_auth_and_validation_workflow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Register
        test_email = f"founder_test_{id(ac)}@example.com"
        reg_payload = {
            "name": "Alex Founder",
            "email": test_email,
            "password": "SecurePassword123!"
        }
        reg_resp = await ac.post("/api/auth/register", json=reg_payload)
        assert reg_resp.status_code in [200, 400]  # 200 or already exists
        if reg_resp.status_code == 200:
            token = reg_resp.json()["token"]
        else:
            # Login
            login_resp = await ac.post("/api/auth/login", json={
                "email": test_email,
                "password": "SecurePassword123!"
            })
            assert login_resp.status_code == 200
            token = login_resp.json()["token"]

        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get Profile
        me_resp = await ac.get("/api/auth/me", headers=headers)
        assert me_resp.status_code == 200
        assert me_resp.json()["email"] == test_email

        # 3. Validate Startup Idea (5-agent LangGraph workflow execution)
        validate_payload = {
            "title": "B2B AI Contract Reviewer",
            "idea": "An automated AI contract reviewer that flags unfavorable clauses for seed-stage startups in real time.",
            "target_audience": "Early-stage founders and small law firms",
            "industry": "LegalTech",
            "constraints": ["Bootstrapped budget", "GDPR compliance required"]
        }
        val_resp = await ac.post("/api/validate", json=validate_payload, headers=headers)
        assert val_resp.status_code == 200
        val_data = val_resp.json()["data"]

        # Assertions on 5 agents' outputs
        assert "validation_score" in val_data
        assert 0 <= val_data["validation_score"] <= 100
        assert "launch_readiness_verdict" in val_data
        assert "scores_breakdown" in val_data
        assert "market_trends" in val_data
        assert "competitors" in val_data
        assert "swot_analysis" in val_data
        assert "mvp_recommendation" in val_data
        assert "report" in val_data

        idea_id = val_data.get("id")

        # 4. List Ideas
        list_resp = await ac.get("/api/ideas", headers=headers)
        assert list_resp.status_code == 200
        assert list_resp.json()["status"] == "success"

        # 5. Delete Idea if saved
        if idea_id and idea_id != "temp-id":
            del_resp = await ac.delete(f"/api/ideas/{idea_id}", headers=headers)
            assert del_resp.status_code == 200


@pytest.mark.asyncio
async def test_guardrail_rejections():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Case 1: Multi-word keyboard mashing / gibberish
        res_gibberish = await ac.post("/api/validate", json={
            "idea": "asdfghjkl zxcvbnm qwertyuiop"
        })
        assert res_gibberish.status_code == 400
        assert "unrecognizable" in res_gibberish.json()["detail"].lower() or "keyboard" in res_gibberish.json()["detail"].lower()

        # Case 2: Single word / insufficient words
        res_single = await ac.post("/api/validate", json={
            "idea": "singlewordtoolongtobevalid"
        })
        assert res_single.status_code == 400
        assert "at least 3 distinct words" in res_single.json()["detail"].lower()

        # Case 3: Excessive repeated characters
        res_repeat = await ac.post("/api/validate", json={
            "idea": "hellooooooooooooooo world app for testing"
        })
        assert res_repeat.status_code == 400
        assert "repeated characters" in res_repeat.json()["detail"].lower()

        # Case 4: Repetitive word spam
        res_spam = await ac.post("/api/validate", json={
            "idea": "crypto crypto crypto crypto crypto crypto"
        })
        assert res_spam.status_code == 400
        assert "repetitive words" in res_spam.json()["detail"].lower()

        # Case 5: Stream endpoint also enforces guardrail
        res_stream = await ac.post("/api/validate/stream", json={
            "idea": "asdfghjkl zxcvbnm qwertyuiop"
        })
        assert res_stream.status_code == 400

        # Case 6: Environment file / config dump rejection
        res_env = await ac.post("/api/validate", json={
            "idea": "LLM_PROVIDER=gemini\nGEMINI_API_KEY=your_key_here\nSTARTUP_VALIDATOR_MODEL=gemini-3.8-flash\nMONGODB_URL=mongodb://localhost:27017"
        })
        assert res_env.status_code == 400
        assert "environment" in res_env.json()["detail"].lower() or "configuration" in res_env.json()["detail"].lower()
