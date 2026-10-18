"""
State Schemas

Pydantic models for structured agent outputs and pipeline state data.
"""

from typing import List, Dict, Any, Optional, TypedDict
from pydantic import BaseModel, Field


# ==========================================================
# Input Models
# ==========================================================

class StartupIdea(BaseModel):
    idea: str
    target_audience: Optional[str] = None
    industry: Optional[str] = None
    constraints: List[str] = Field(default_factory=list)


class IdeaExtraction(BaseModel):
    problem: str
    solution: str
    target_audience: str
    value_proposition: str
    keywords: List[str] = Field(default_factory=list)


class SearchResult(BaseModel):
    title: str
    url: str
    snippet: str


# ==========================================================
# Competitor Models
# ==========================================================

class Competitor(BaseModel):
    name: str
    website: str = ""
    description: str = ""
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    source_urls: List[str] = Field(default_factory=list)


class CompetitorAgentOutput(BaseModel):
    startup_idea: str
    competitors: List[Competitor] = Field(default_factory=list)


# ==========================================================
# Final Report & Scores
# ==========================================================

class ScoresBreakdown(BaseModel):
    market_demand: int = Field(default=70, ge=0, le=100)
    feasibility: int = Field(default=70, ge=0, le=100)
    competition_barrier: int = Field(default=65, ge=0, le=100)
    business_viability: int = Field(default=75, ge=0, le=100)


class ValidationReport(BaseModel):
    executive_summary: str = ""
    validation_score: int = Field(default=72, ge=0, le=100)
    launch_readiness_verdict: str = "Requires Refinement"
    scores_breakdown: Dict[str, int] = Field(default_factory=lambda: {
        "market_demand": 75,
        "feasibility": 70,
        "competition_barrier": 65,
        "business_viability": 78
    })
    market_trends: Dict[str, Any] = Field(default_factory=dict)
    market_analysis: Dict[str, Any] = Field(default_factory=dict)
    competitor_analysis: List[Competitor] = Field(default_factory=list)
    swot_analysis: Dict[str, Any] = Field(default_factory=dict)
    mvp_recommendation: Dict[str, Any] = Field(default_factory=dict)
    visual_statistics: Dict[str, Any] = Field(default_factory=dict)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    references: List[str] = Field(default_factory=list)


# ==========================================================
# LangGraph Shared State
# ==========================================================

class GraphState(TypedDict, total=False):
    """
    Shared state that flows through the multi-agent LangGraph pipeline
    (pipeline/graph.py).
    """

    # User Inputs
    startup_idea: str
    target_audience: Optional[str]
    industry: Optional[str]
    constraints: Optional[List[str]]

    # Agent 1: Idea Extraction
    idea_extraction: Dict[str, Any]

    # Agent 2: Market Trends & Demand
    market_trends: Dict[str, Any]
    news_headlines: List[Dict[str, Any]]
    market_analysis: Dict[str, Any]

    # Agent 3: Competitor Intelligence
    competitors: List[Dict[str, Any]]
    competitor_analysis: Any
    references: List[str]

    # Agent 4: SWOT & Business Feasibility
    swot_analysis: Dict[str, Any]
    risks: List[Dict[str, Any]]

    # Agent 5: MVP Feature Recommendations
    mvp_recommendation: Dict[str, Any]

    # Agent 6: Validation Scoring & Decision Report
    validation_score: int
    launch_readiness_verdict: str
    scores_breakdown: Dict[str, int]
    visual_statistics: Dict[str, Any]
    report: Dict[str, Any]

    # Execution Metadata
    current_agent: str
    execution_status: str
    errors: List[str]

