"""Agent 1: Idea Extraction & Structuring Agent."""

import json
import logging
from typing import Dict, Any, List
from utils.llm import get_llm, extract_text
from state.schema import IdeaExtraction

logger = logging.getLogger(__name__)


class IdeaExtractionAgent:
    """Dissects raw founder inputs into structured problems, solutions, and search keywords."""

    def __init__(self):
        self.llm = get_llm()

    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        startup_idea = state.get("startup_idea") or state.get("raw_idea") or state.get("idea") or ""
        target_audience = state.get("target_audience", "")
        industry = state.get("industry", "")
        constraints = state.get("constraints", [])

        if not startup_idea:
            return {
                "status": "error",
                "message": "Missing startup_idea in state."
            }

        from utils.guardrails import check_heuristic_guardrails
        is_valid, reason = check_heuristic_guardrails(startup_idea)
        if not is_valid:
            return {
                "status": "error",
                "message": f"Input guardrail rejected: {reason}"
            }

        prompt = f"""You are an elite startup analyst. Analyze this startup idea carefully:

Startup Idea: {startup_idea}
Target Audience (optional): {target_audience}
Industry (optional): {industry}
Constraints: {", ".join(constraints) if constraints else "None"}

Extract the following in strictly valid JSON format:
{{
  "problem": "The core, validated pain point being solved",
  "solution": "The exact product/service mechanism proposed",
  "target_audience": "Specific ideal customer profile and market segment",
  "value_proposition": "Clear unique differentiation and benefit",
  "keywords": ["3 to 5 targeted keywords for market search and trend analysis"]
}}
"""
        if self.llm:
            try:
                response = self.llm.invoke(prompt)
                content = extract_text(response.content if hasattr(response, "content") else str(response))
                # Clean code blocks
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0].strip()
                parsed = json.loads(content)
                return {
                    "status": "success",
                    "data": parsed
                }
            except Exception as e:
                logger.warning(f"LLM idea extraction failed ({e}), using heuristic fallback.")

        # Heuristic fallback for zero-dependency or offline environments
        words = startup_idea.split()
        kw = [w.lower().strip(",.") for w in words if len(w) > 4][:4]
        if not kw:
            kw = ["software", "startup", "platform"]

        fallback_data = {
            "problem": f"Lack of streamlined, data-backed solutions in {industry or 'the target sector'}.",
            "solution": startup_idea,
            "target_audience": target_audience or "Entrepreneurs, modern consumers, and business operators",
            "value_proposition": "Automated, cost-effective workflow saving founders critical time and capital.",
            "keywords": kw
        }
        return {
            "status": "success",
            "data": fallback_data
        }
