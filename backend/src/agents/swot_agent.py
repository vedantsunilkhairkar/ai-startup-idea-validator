"""Agent 4: SWOT & Business Feasibility Agent."""

import json
import logging
from typing import Dict, Any, List
from utils.llm import get_llm, extract_text

logger = logging.getLogger(__name__)


class SWOTRiskAgent:
    """Evaluates internal/external dynamics (SWOT) and flags high-priority operational risks."""

    def __init__(self):
        self.llm = get_llm()

    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        idea = state.get("startup_idea", "")
        idea_extraction = state.get("idea_extraction", {})
        market_analysis = state.get("market_analysis", {})
        competitors = state.get("competitors", [])

        swot_data = {
            "strengths": [
                "Targeted solution focused on specific user pain points",
                "Agile execution with lower operational overhead than legacy competitors",
                "Modern AI-driven workflow that can scale rapidly"
            ],
            "weaknesses": [
                "Early brand presence and initial cold-start customer trust deficit",
                "Reliance on continuous API integrations or specialized tech talent",
                "Limited initial marketing budget compared to incumbent players"
            ],
            "opportunities": [
                "High organic search demand in underserved niche customer segments",
                "Disrupting incumbent pricing models through lightweight, automated SaaS",
                "Partnerships with complementary industry tooling and platforms"
            ],
            "threats": [
                "Feature replication by well-funded direct or indirect competitors",
                "Shifts in platform policies, search rankings, or API access pricing",
                "Customer inertia and friction in switching from existing manual habits"
            ]
        }

        risks_data = [
            {
                "risk": "Customer Acquisition Cost (CAC) Inflation",
                "severity": "High",
                "mitigation": "Focus on product-led growth, programmatic SEO, and community referral loops."
            },
            {
                "risk": "Incumbent Copycat Threat",
                "severity": "Medium",
                "mitigation": "Build proprietary workflow integrations, superior UX, and high-touch customer onboarding."
            },
            {
                "risk": "Technical Feasibility & Scalability",
                "severity": "Low",
                "mitigation": "Deploy on serverless cloud architecture with modular service separation."
            }
        ]

        if self.llm:
            try:
                comp_names = [c.get("name") for c in competitors[:3]] if competitors else ["General incumbents"]
                prompt = f"""You are a Startup Risk & Strategy Consultant. Evaluate the following venture:

Startup Idea: {idea}
Value Proposition: {idea_extraction.get('value_proposition', 'N/A')}
Market Context: {market_analysis.get('customer_demand_sentiment', 'N/A')}
Competitors Identified: {", ".join(comp_names)}

Produce a rigorous SWOT and Risk Assessment in JSON format:
{{
  "swot": {{
    "strengths": ["3 bullet points"],
    "weaknesses": ["3 bullet points"],
    "opportunities": ["3 bullet points"],
    "threats": ["3 bullet points"]
  }},
  "risks": [
    {{
      "risk": "Risk name",
      "severity": "High / Medium / Low",
      "mitigation": "Actionable defense tactic"
    }}
  ]
}}
"""
                response = self.llm.invoke(prompt)
                content = extract_text(response.content if hasattr(response, "content") else str(response))
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0].strip()
                parsed = json.loads(content)
                if "swot" in parsed:
                    swot_data = parsed["swot"]
                if "risks" in parsed:
                    risks_data = parsed["risks"]
            except Exception as e:
                raise

        return {
            "status": "success",
            "data": {
                "swot_analysis": swot_data,
                "risks": risks_data
            }
        }
