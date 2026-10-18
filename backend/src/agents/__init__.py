"""Multi-Agent research and evaluation squad for PitchProof."""

from agents.idea_agent import IdeaExtractionAgent
from agents.trends_agent import MarketTrendsAgent
from agents.competitor_agent import CompetitorAgent
from agents.swot_agent import SWOTRiskAgent
from agents.recommendation_agent import RecommendationAgent
from agents.report_agent import ReportAgent

__all__ = [
    "IdeaExtractionAgent",
    "MarketTrendsAgent",
    "CompetitorAgent",
    "SWOTRiskAgent",
    "RecommendationAgent",
    "ReportAgent",
]