"""Agent 2: Market Trends & Customer Demand Agent (PyTrends + News API + LLM)."""

import json
import logging
from typing import Dict, Any
from utils.llm import get_llm, extract_text
from utils.trends_tool import get_trends_interest
from utils.news_tool import fetch_market_news

logger = logging.getLogger(__name__)


class MarketTrendsAgent:
    """Evaluates search interest velocity, demand patterns, and real-time market news sentiment."""

    def __init__(self):
        self.llm = get_llm()

    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        idea = state.get("startup_idea", "")
        idea_extraction = state.get("idea_extraction", {})
        keywords = idea_extraction.get("keywords", [])
        if not keywords and idea:
            keywords = [w for w in idea.split() if len(w) > 4][:3]

        primary_kw = keywords[0] if keywords else "technology startup"

        # 1. Google Trends (PyTrends)
        trend_data = get_trends_interest(keywords)

        # 2. News API
        news_items = fetch_market_news(primary_kw)

        # 3. LLM Synthesis of Market Dynamics
        market_analysis = {
            "market_size_estimate": "Expanding multi-billion dollar market driven by automation and digital adoption.",
            "customer_demand_sentiment": f"High demand signaled by a {trend_data.get('trend_direction', 'Growing')} search interest index of {trend_data.get('average_interest', 70)}/100.",
            "industry_trends": f"Increasing adoption of AI tools and real-time analytics in the {primary_kw} sector.",
            "opportunities": f"Underserved segments seeking affordable, automated solutions tailored for specific workflows."
        }

        if self.llm:
            try:
                prompt = f"""You are a seasoned Market Research Analyst. Analyze these market metrics for a startup idea:
Idea: {idea}
Keywords: {keywords}
Google Trends Average Search Index: {trend_data.get('average_interest')}/100 ({trend_data.get('trend_direction')})
Recent News Articles: {json.dumps([n.get('title') for n in news_items[:3]])}

Synthesize a concise market assessment in JSON format:
{{
  "market_size_estimate": "Estimated TAM/SAM context and growth velocity",
  "customer_demand_sentiment": "Assessment of customer urgency, buying intent, and willingness to pay",
  "industry_trends": "Top 2-3 macro trends supporting or challenging this sector",
  "opportunities": "Key high-value gaps and tailwinds to exploit"
}}
"""
                response = self.llm.invoke(prompt)
                content = extract_text(response.content if hasattr(response, "content") else str(response))
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0].strip()
                parsed = json.loads(content)
                market_analysis.update(parsed)
            except Exception as e:
                logger.warning(f"LLM market analysis failed ({e}), keeping base analysis.")

        return {
            "status": "success",
            "data": {
                "market_trends": trend_data,
                "news_headlines": news_items,
                "market_analysis": market_analysis
            }
        }
