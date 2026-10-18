"""Competitor and web search using Tavily Search API with SerpAPI and DuckDuckGo fallbacks."""

import logging
from typing import List, Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)


def search_competitors(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    """
    Discovers competitors and market alternatives using Tavily, SerpAPI, or DuckDuckGo.
    """
    search_prompt = f"{query} competitors alternatives companies startups"

    # 1. Tavily Search API
    if settings.TAVILY_API_KEY:
        try:
            from tavily import TavilyClient
            client = TavilyClient(api_key=settings.TAVILY_API_KEY)
            response = client.search(query=search_prompt, max_results=max_results, search_depth="basic")
            results = []
            for item in response.get("results", []):
                results.append({
                    "title": item.get("title", ""),
                    "snippet": item.get("content", ""),
                    "url": item.get("url", "")
                })
            if results:
                logger.info(f"Tavily search succeeded with {len(results)} results.")
                return results
        except Exception as e:
            logger.warning(f"Tavily search failed ({e}). Falling back to SerpAPI/DuckDuckGo...")

    # 2. SerpAPI
    if settings.SERPAPI_API_KEY:
        try:
            import requests
            resp = requests.get(
                "https://serpapi.com/search",
                params={"q": search_prompt, "api_key": settings.SERPAPI_API_KEY, "num": max_results},
                timeout=5
            )
            if resp.status_code == 200:
                data = resp.json()
                results = []
                for item in data.get("organic_results", []):
                    results.append({
                        "title": item.get("title", ""),
                        "snippet": item.get("snippet", ""),
                        "url": item.get("link", "")
                    })
                if results:
                    return results
        except Exception as e:
            logger.warning(f"SerpAPI search failed ({e}). Falling back to DuckDuckGo...")

    # 3. DuckDuckGo Search Fallback
    try:
        from duckduckgo_search import DDGS
        results = []
        with DDGS() as ddgs:
            raw_results = list(ddgs.text(search_prompt, max_results=max_results))
            for item in raw_results:
                results.append({
                    "title": item.get("title", ""),
                    "snippet": item.get("body", ""),
                    "url": item.get("href", "")
                })
        if results:
            return results
    except Exception as e:
        logger.warning(f"DuckDuckGo search error: {e}")

    return [
        {
            "title": f"Key Industry Players in {query}",
            "snippet": f"Leading established software and service providers serving customers in {query}.",
            "url": "https://www.g2.com"
        },
        {
            "title": f"Top Alternatives & Startups in {query}",
            "snippet": f"Direct and indirect competitors addressing customer pain points in {query}.",
            "url": "https://www.producthunt.com"
        }
    ]
