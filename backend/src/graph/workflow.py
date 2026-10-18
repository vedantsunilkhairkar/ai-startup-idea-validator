"""LangGraph 5-Agent Workflow Graph for AI Startup Idea Validator.

Sequential workflow executing strictly 5 agents:
1. idea_extraction (IdeaExtractionAgent)
2. market_trends (MarketTrendsAgent - PyTrends + News API)
3. competitor_analysis (CompetitorAgent - Tavily/SerpAPI/DDG)
4. swot_analysis (SWOTRiskAgent - SWOT + Feasibility & Risks)
5. validation_report (ReportAgent - 0-100 Scoring, Verdict & Recommendations)
"""

import logging
from langgraph.graph import StateGraph, START, END

from agents.idea_agent import IdeaExtractionAgent
from agents.trends_agent import MarketTrendsAgent
from agents.competitor_agent import CompetitorAgent
from agents.swot_agent import SWOTRiskAgent
from agents.recommendation_agent import RecommendationAgent
from agents.report_agent import ReportAgent
from state.schema import GraphState

logger = logging.getLogger(__name__)

# Instantiate the Core Agents
idea_agent = IdeaExtractionAgent()
trends_agent = MarketTrendsAgent()
competitor_agent = CompetitorAgent()
swot_agent = SWOTRiskAgent()
rec_agent = RecommendationAgent()
report_agent = ReportAgent()


def record_error(state: GraphState, agent_name: str, message: str) -> None:
    errors = state.get("errors", [])
    errors.append(f"{agent_name}: {message}")
    state["errors"] = errors


# ---------------------------------------------------------
# Node 1: Idea Extraction
# ---------------------------------------------------------
def idea_extraction_node(state: GraphState):
    state["current_agent"] = "idea_extraction"
    idea_snippet = (state.get("startup_idea") or "")[:80]
    logger.info(f"\033[94m🧠 [AGENT START 1/6]\033[0m Idea Extraction | Idea snippet: '{idea_snippet}'...")
    try:
        res = idea_agent.run(state)
        if res.get("status") == "success":
            data = res.get("data", {})
            state["idea_extraction"] = data
            logger.info(
                f"\033[92m✅ [AGENT DONE 1/6]\033[0m Idea Extraction | Keywords: {data.get('keywords', [])} | Value Prop: '{data.get('value_proposition', '')[:60]}...'"
            )
        else:
            record_error(state, "Idea Extraction Agent", res.get("message", "Error"))
            logger.warning(f"⚠️ [AGENT WARN 1/6] Idea Extraction: {res.get('message')}")
    except Exception as e:
        record_error(state, "Idea Extraction Agent", str(e))
        logger.error(f"❌ [AGENT ERR 1/6] Idea Extraction: {e}")
        raise
    return state


# ---------------------------------------------------------
# Node 2: Market Trends & Demand (PyTrends + News API)
# ---------------------------------------------------------
def market_trends_node(state: GraphState):
    state["current_agent"] = "market_trends"
    keywords = state.get("idea_extraction", {}).get("keywords", [])
    logger.info(f"\033[94m🧠 [AGENT START 2/6]\033[0m Market Trends & Demand | Keywords to analyze: {keywords}")
    try:
        res = trends_agent.run(state)
        if res.get("status") == "success":
            data = res.get("data", {})
            state["market_trends"] = data.get("market_trends", {})
            state["news_headlines"] = data.get("news_headlines", [])
            state["market_analysis"] = data.get("market_analysis", {})
            logger.info(
                f"\033[92m✅ [AGENT DONE 2/6]\033[0m Market Trends | Keyword: '{state['market_trends'].get('keyword')}' | Trajectory: {state['market_trends'].get('trend_direction')} (Avg: {state['market_trends'].get('average_interest')}/100) | Headlines: {len(state['news_headlines'])}"
            )
        else:
            record_error(state, "Market Trends Agent", res.get("message", "Error"))
            logger.warning(f"⚠️ [AGENT WARN 2/6] Market Trends: {res.get('message')}")
    except Exception as e:
        record_error(state, "Market Trends Agent", str(e))
        logger.error(f"❌ [AGENT ERR 2/6] Market Trends: {e}")
        raise
    return state


# ---------------------------------------------------------
# Node 3: Competitor Intelligence
# ---------------------------------------------------------
def competitor_analysis_node(state: GraphState):
    state["current_agent"] = "competitor_analysis"
    logger.info(f"\033[94m🧠 [AGENT START 3/6]\033[0m Competitor Intelligence | Searching market landscape...")
    try:
        res = competitor_agent.run(state)
        if res.get("status") == "success":
            data = res.get("data", {})
            state["competitors"] = data.get("competitors", [])
            state["references"] = data.get("references", [])
            comp_names = [c.get("name") for c in state["competitors"] if isinstance(c, dict)]
            logger.info(
                f"\033[92m✅ [AGENT DONE 3/6]\033[0m Competitor Intelligence | Mapped {len(state['competitors'])} competitors: {comp_names}"
            )
        else:
            record_error(state, "Competitor Agent", res.get("message", "Error"))
            logger.warning(f"⚠️ [AGENT WARN 3/6] Competitor Agent: {res.get('message')}")
    except Exception as e:
        record_error(state, "Competitor Agent", str(e))
        logger.error(f"❌ [AGENT ERR 3/6] Competitor Agent: {e}")
        raise
    return state


# ---------------------------------------------------------
# Node 4: SWOT & Feasibility Analysis
# ---------------------------------------------------------
def swot_analysis_node(state: GraphState):
    state["current_agent"] = "swot_analysis"
    logger.info(f"\033[94m🧠 [AGENT START 4/6]\033[0m SWOT & Feasibility | Evaluating operational vectors & risks...")
    try:
        res = swot_agent.run(state)
        if res.get("status") == "success":
            data = res.get("data", {})
            state["swot_analysis"] = data.get("swot_analysis", {})
            state["risks"] = data.get("risks", [])
            swot = state["swot_analysis"]
            logger.info(
                f"\033[92m✅ [AGENT DONE 4/6]\033[0m SWOT Analysis | Strengths: {len(swot.get('strengths', []))}, Weaknesses: {len(swot.get('weaknesses', []))}, Opportunities: {len(swot.get('opportunities', []))}, Threats: {len(swot.get('threats', []))}, Risks: {len(state['risks'])}"
            )
        else:
            record_error(state, "SWOT Agent", res.get("message", "Error"))
            logger.warning(f"⚠️ [AGENT WARN 4/6] SWOT Agent: {res.get('message')}")
    except Exception as e:
        record_error(state, "SWOT Agent", str(e))
        logger.error(f"❌ [AGENT ERR 4/6] SWOT Agent: {e}")
        raise
    return state


# ---------------------------------------------------------
# Node 5: MVP Feature Recommendations
# ---------------------------------------------------------
def mvp_recommendation_node(state: GraphState):
    state["current_agent"] = "mvp_recommendation"
    logger.info(f"\033[94m🧠 [AGENT START 5/6]\033[0m MVP Recommendation | Scoping lean feature tiers...")
    try:
        res = rec_agent.run(state)
        if res.get("status") == "success":
            data = res.get("data", {})
            state["mvp_recommendation"] = data.get("mvp_recommendation", {})
            mvp = state["mvp_recommendation"]
            logger.info(
                f"\033[92m✅ [AGENT DONE 5/6]\033[0m MVP Recommendation | Must-have: {len(mvp.get('must_have', []))}, Nice-to-have: {len(mvp.get('nice_to_have', []))}, Future: {len(mvp.get('future_features', []))}"
            )
        else:
            record_error(state, "Recommendation Agent", res.get("message", "Error"))
            logger.warning(f"⚠️ [AGENT WARN 5/6] Recommendation Agent: {res.get('message')}")
    except Exception as e:
        record_error(state, "Recommendation Agent", str(e))
        logger.error(f"❌ [AGENT ERR 5/6] Recommendation Agent: {e}")
        raise
    return state


# ---------------------------------------------------------
# Node 6: Validation Scoring & Decision Report
# ---------------------------------------------------------
def validation_report_node(state: GraphState):
    state["current_agent"] = "validation_report"
    logger.info(f"\033[94m🧠 [AGENT START 6/6]\033[0m Report & Scoring | Synthesizing validation score & verdict...")
    try:
        res = report_agent.run(state)
        if res.get("status") == "success":
            data = res.get("data", {})
            state["report"] = data.get("validation_report", {})
            state["validation_score"] = data.get("validation_score", 70)
            state["launch_readiness_verdict"] = data.get("launch_readiness_verdict", "Requires Refinement")
            state["scores_breakdown"] = data.get("scores_breakdown", {})
            state["visual_statistics"] = data.get("visual_statistics", {})
            state["execution_status"] = "completed"
            logger.info(
                f"\033[92m✅ [AGENT DONE 6/6]\033[0m Report & Scoring | Score: {state['validation_score']}/100 | Verdict: '{state['launch_readiness_verdict']}' | Demand: {state['scores_breakdown'].get('market_demand')} | Feasibility: {state['scores_breakdown'].get('feasibility')} | Moat: {state['scores_breakdown'].get('competition_barrier')} | Viability: {state['scores_breakdown'].get('business_viability')}"
            )
        else:
            record_error(state, "Report Agent", res.get("message", "Error"))
            logger.warning(f"⚠️ [AGENT WARN 6/6] Report Agent: {res.get('message')}")
    except Exception as e:
        record_error(state, "Report Agent", str(e))
        logger.error(f"❌ [AGENT ERR 6/6] Report Agent: {e}")
        raise
    return state



# ---------------------------------------------------------
# Build and Compile Graph
# ---------------------------------------------------------
builder = StateGraph(GraphState)

builder.add_node("idea_extraction", idea_extraction_node)
builder.add_node("market_trends", market_trends_node)
builder.add_node("competitor_analysis", competitor_analysis_node)
builder.add_node("swot_analysis", swot_analysis_node)
builder.add_node("mvp_recommendation", mvp_recommendation_node)
builder.add_node("validation_report", validation_report_node)

# Sequential Edges connecting the workflow agents
builder.add_edge(START, "idea_extraction")
builder.add_edge("idea_extraction", "market_trends")
builder.add_edge("market_trends", "competitor_analysis")
builder.add_edge("competitor_analysis", "swot_analysis")
builder.add_edge("swot_analysis", "mvp_recommendation")
builder.add_edge("mvp_recommendation", "validation_report")
builder.add_edge("validation_report", END)

graph = builder.compile()
