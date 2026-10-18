"""Agent: MVP Feature Recommendation Agent.

Synthesizes SWOT analysis, market trends, and competitor intelligence
to recommend a scoped, realistic Minimum Viable Product (MVP) prioritized
into Must-Have, Nice-to-Have, and Future iterations.
"""

import json
import logging
from typing import Dict, Any, List
from utils.llm import get_llm, extract_text

logger = logging.getLogger(__name__)


class RecommendationAgent:
    """Analyzes SWOT and business feasibility to deliver structured MVP feature recommendations."""

    def __init__(self):
        self.llm = get_llm()

    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        idea_data = state.get("idea_extraction", {})
        problem = idea_data.get("problem", "")
        solution = idea_data.get("solution", state.get("startup_idea", ""))
        swot_data = state.get("swot_analysis", {})
        constraints = state.get("constraints", [])

        prompt = f"""You are an elite startup product strategist and Lean Startup mentor.
Based on the following startup idea and SWOT analysis, recommend a small, high-impact Minimum Viable Product (MVP).

Startup Idea: {solution}
Core Problem: {problem}
Constraints: {", ".join(constraints) if constraints else "Standard bootstrapped resources"}

SWOT Analysis:
{json.dumps(swot_data, indent=2, default=str)}

Your objective is to identify the smallest realistic feature set capable of validating the core customer value proposition.
Prioritize features strictly into:
1. Must Have: Essential features required for the first usable version.
2. Nice to Have: Value-add features to build after core validation.
3. Future Features: Features to postpone until product-market fit.

Respond strictly in valid JSON format matching this schema:
{{
  "must_have": [
    {{
      "feature": "Name and brief description of core feature",
      "reason": "Why this is critical for initial validation",
      "validation_goal": "What assumption or user metric this tests"
    }}
  ],
  "nice_to_have": [
    {{
      "feature": "Name and brief description",
      "reason": "Why this adds secondary value",
      "validation_goal": "What user satisfaction metric this tests"
    }}
  ],
  "future_features": [
    {{
      "feature": "Name and brief description",
      "reason": "Why this should be postponed",
      "validation_goal": "Scale or expansion goal"
    }}
  ],
  "prioritization_rationale": "Strategic reasoning explaining the feature prioritization and lean launch advice."
}}
"""
        mvp_rec = None
        if self.llm:
            try:
                response = self.llm.invoke(prompt)
                content = extract_text(response.content if hasattr(response, "content") else str(response))
                content = content.strip()
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0].strip()
                
                # Robust extraction of JSON object
                start_idx = content.find("{")
                end_idx = content.rfind("}")
                if start_idx != -1 and end_idx != -1:
                    content = content[start_idx:end_idx + 1]
                
                parsed = json.loads(content)
                if isinstance(parsed, dict) and "must_have" in parsed:
                    mvp_rec = parsed
            except Exception as e:
                raise

        # Deterministic lean MVP fallback if LLM parsing encounters issues
        if not mvp_rec:
            mvp_rec = {
                "must_have": [
                    {
                        "feature": "Core Workflow Automation Engine",
                        "reason": "Validates the primary value proposition by solving the main user friction immediately.",
                        "validation_goal": "Measure user task completion rate and time-saved metric."
                    },
                    {
                        "feature": "Essential Authentication & Onboarding",
                        "reason": "Allows test users to register securely and connect required accounts.",
                        "validation_goal": "Verify user activation and initial setup retention."
                    }
                ],
                "nice_to_have": [
                    {
                        "feature": "Summary Analytics & Activity Dashboard",
                        "reason": "Gives users visual visibility into workflow throughput.",
                        "validation_goal": "Assess user engagement and recurring login frequency."
                    }
                ],
                "future_features": [
                    {
                        "feature": "Enterprise Collaboration & Custom Integrations",
                        "reason": "Adds complexity that should only be built after proven product-market fit.",
                        "validation_goal": "Enterprise contract readiness and multi-seat account expansion."
                    }
                ],
                "prioritization_rationale": "Focus 100% on validating the primary user outcome with the simplest possible interface before building auxiliary administrative features."
            }

        return {
            "status": "success",
            "data": {
                "mvp_recommendation": mvp_rec
            },
            "message": ""
        }


# Alias for backward compatibility
MVPRecommendationAgent = RecommendationAgent
