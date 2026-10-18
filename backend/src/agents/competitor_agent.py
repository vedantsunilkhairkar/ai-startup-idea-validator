"""Agent 3: Competitor Intelligence Agent (Tavily Search API / SerpAPI + LLM)."""

import json
import logging
from typing import Dict, Any, List
from utils.llm import get_llm, extract_text
from utils.search_tool import search_competitors

logger = logging.getLogger(__name__)


class CompetitorAgent:
    """Discovers and benchmarks direct and indirect market competitors."""

    def __init__(self):
        self.llm = get_llm()

    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        idea = state.get("startup_idea", "")
        idea_extraction = state.get("idea_extraction", {})
        keywords = idea_extraction.get("keywords", [])
        search_query = " ".join(keywords[:3]) if keywords else idea[:60]

        # 1. Search competitors via Tavily / SerpAPI / DuckDuckGo
        search_results = search_competitors(search_query, max_results=5)
        references = [r.get("url") for r in search_results if r.get("url")]

        # 2. Extract structured competitor matrix
        competitors = []

        if self.llm:
            try:
                snippets_text = "\n".join([
                    f"- Title: {r.get('title')}\n  Snippet: {r.get('snippet')}\n  URL: {r.get('url')}"
                    for r in search_results
                ])
                prompt = f"""You are a Competitive Intelligence Strategist. Given this startup idea and recent search results, identify 3-4 distinct competitors (direct or indirect):

Startup Idea: {idea}

Search Results:
{snippets_text}

Return strictly a JSON array of competitor objects in this format:
[
  {{
    "name": "Company Name",
    "website": "URL or domain",
    "description": "Concise summary of their product offering",
    "strengths": ["Key strength 1", "Key strength 2"],
    "weaknesses": ["Key weakness or gap 1", "Key weakness 2"],
    "feature_breadth": 85,
    "ux_focus": 65,
    "price_accessibility": 45,
    "source_urls": ["URL"]
  }}
]
Note: feature_breadth, ux_focus, and price_accessibility should each be an integer from 0 to 100 assessing that competitor's product depth, design polish, and affordability.
"""
                response = self.llm.invoke(prompt)
                content = extract_text(response.content if hasattr(response, "content") else str(response))
                content = content.strip()
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0].strip()
                start_idx = content.find("[")
                end_idx = content.rfind("]")
                if start_idx != -1 and end_idx != -1:
                    content = content[start_idx:end_idx + 1]
                parsed = json.loads(content)
                if isinstance(parsed, list):
                    competitors = parsed
            except Exception as e:
                logger.warning(f"LLM competitor extraction failed ({e}), constructing baseline competitor matrix.")

        # Baseline fallback if LLM is unavailable
        if not competitors:
            import re
            for idx, r in enumerate(search_results[:3], 1):
                raw_title = r.get("title", f"Competitor {idx}")
                clean_name = raw_title.split("-")[0].split("|")[0].strip()
                raw_snippet = r.get("snippet", "Established solution in the market space.")

                # Clean markdown artifacts, pagination tokens, and checkboxes
                clean_snippet = re.sub(r'##+|\[[xX ]\]|Showing Result \d+-\d+ of \d+|\b\d+\s*\.\.\.\s*\d+\b|Add to Compare\s*\d*|Compare with.*', '', raw_snippet, flags=re.IGNORECASE)
                clean_snippet = re.sub(r'\s+', ' ', clean_snippet).strip()
                if not clean_snippet or len(clean_snippet) < 15:
                    clean_snippet = f"Established market solution and notable player in the {clean_name} space."

                competitors.append({
                    "name": clean_name,
                    "website": r.get("url", ""),
                    "description": clean_snippet,
                    "strengths": ["Market brand recognition", "Existing customer base"],
                    "weaknesses": ["Complex legacy workflow", "Higher pricing tiers"],
                    "feature_breadth": 80 - (idx * 5),
                    "ux_focus": 60 + (idx * 6),
                    "price_accessibility": 40 + (idx * 8),
                    "source_urls": [r.get("url", "")]
                })

        return {
            "status": "success",
            "data": {
                "competitors": competitors,
                "references": references
            }
        }
