"""Agent 5: Startup Validation Scoring & Decision Report Agent."""

import json
import logging
from typing import Dict, Any, List
from utils.llm import get_llm, extract_text

logger = logging.getLogger(__name__)


class ReportAgent:
    """Synthesizes all intelligence to compute validation scores and generate the final decision report."""

    def __init__(self):
        self.llm = get_llm()

    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        idea = state.get("startup_idea", "")
        idea_extraction = state.get("idea_extraction", {})
        market_trends = state.get("market_trends", {})
        market_analysis = state.get("market_analysis", {})
        competitors = state.get("competitors", [])
        swot = state.get("swot_analysis", {})
        risks = state.get("risks", [])

        # 1. Algorithmic Base Scoring
        avg_interest = market_trends.get("average_interest", 65.0)
        direction = market_trends.get("trend_direction", "Stable")
        trend_bonus = 10 if "Growing" in direction else (0 if "Stable" in direction else -10)
        market_demand_score = min(95, max(40, int(avg_interest * 0.7 + 25 + trend_bonus)))

        comp_count = len(competitors)
        competition_score = 80 if comp_count <= 2 else (68 if comp_count <= 4 else 55)

        feasibility_score = 75
        constraints = state.get("constraints", [])
        if constraints:
            feasibility_score -= len(constraints) * 4

        business_viability_score = 78

        # Weighted calculation
        overall_score = round(
            0.30 * market_demand_score +
            0.25 * feasibility_score +
            0.20 * competition_score +
            0.25 * business_viability_score
        )

        scores_breakdown = {
            "market_demand": market_demand_score,
            "feasibility": feasibility_score,
            "competition_barrier": competition_score,
            "business_viability": business_viability_score
        }

        # 2. Launch Verdict
        if overall_score >= 75:
            verdict = "Ready to Launch"
        elif overall_score >= 55:
            verdict = "Requires Refinement"
        else:
            verdict = "High Risk / Pivot Advised"

        # 3. Recommendations & Executive Summary
        exec_summary = (
            f"The proposed startup idea addresses a legitimate market opportunity with a validation score of {overall_score}/100. "
            f"Customer demand shows {direction.lower()} interest with an average search index of {round(avg_interest, 1)}. "
            f"Key competitive differentiators must be reinforced against existing alternatives before scaling paid user acquisition."
        )

        strengths = swot.get("strengths", [
            "Clear alignment with current search interest patterns",
            "Targeted value proposition tailored to underserved segments"
        ])
        weaknesses = swot.get("weaknesses", [
            "Early dependency on user adoption velocity",
            "Need to clarify long-term defensibility against market incumbents"
        ])
        recommendations = [
            "Construct a no-code/lightweight prototype to capture 25 pre-launch customer interviews.",
            "Formulate an organic content and community distribution flywheel to protect against high ad costs.",
            "Establish direct integrations with adjacent workflow tools to deepen switching costs."
        ]

        if self.llm:
            try:
                prompt = f"""You are the Chief Investment Officer and Startup Evaluator.
Synthesize the final validation report for this idea:
Idea: {idea}
Value Proposition: {idea_extraction.get('value_proposition')}
Market Demand Index: {avg_interest} ({direction})
Competitors: {[c.get('name') for c in competitors[:3]]}
Calculated Validation Score: {overall_score}/100 ({verdict})

Return strictly valid JSON:
{{
  "executive_summary": "Comprehensive 3-sentence executive verdict",
  "scores_breakdown": {{
    "market_demand": {market_demand_score},
    "feasibility": {feasibility_score},
    "competition_barrier": {competition_score},
    "business_viability": {business_viability_score}
  }},
  "strengths": ["Top 3 standout advantages"],
  "weaknesses": ["Top 3 critical vulnerabilities"],
  "recommendations": ["3 concrete, prioritized next steps for the founder"]
}}
"""
                response = self.llm.invoke(prompt)
                content = extract_text(response.content if hasattr(response, "content") else str(response))
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0].strip()
                parsed = json.loads(content)
                if "executive_summary" in parsed:
                    exec_summary = parsed["executive_summary"]
                if "strengths" in parsed:
                    strengths = parsed["strengths"]
                if "weaknesses" in parsed:
                    weaknesses = parsed["weaknesses"]
                if "recommendations" in parsed:
                    recommendations = parsed["recommendations"]
                if "scores_breakdown" in parsed:
                    scores_breakdown = parsed["scores_breakdown"]
                    overall_score = round(
                        0.30 * scores_breakdown.get("market_demand", 70) +
                        0.25 * scores_breakdown.get("feasibility", 70) +
                        0.20 * scores_breakdown.get("competition_barrier", 65) +
                        0.25 * scores_breakdown.get("business_viability", 75)
                    )
            except Exception as e:
                raise

        # 4. Construct Rich Visual Statistics & Chart Data for Frontend
        trends_labels = market_trends.get("labels", ["Oct 2025", "Nov 2025", "Dec 2025", "Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026", "May 2026", "Jun 2026", "Jul 2026", "Aug 2026", "Sep 2026"])
        trends_points = market_trends.get("data_points", [52, 55, 58, 60, 64, 66, 70, 71, 75, 78, 82, 85])

        # Competitor chart data
        comp_labels = [c.get("name", f"Competitor {i+1}") for i, c in enumerate(competitors[:3])]
        if not comp_labels:
            comp_labels = ["Incumbent A", "Market Player B"]
        comp_labels.append("Your Venture")

        # MVP feature counts
        mvp_rec = state.get("mvp_recommendation", {})
        must_have_count = len(mvp_rec.get("must_have", [])) if isinstance(mvp_rec, dict) else 0

        # Structured Recharts-friendly arrays (for direct React Recharts binding)
        radar_chart_points = [
            {"pillar": "Demand", "you": scores_breakdown.get("market_demand", 70), "benchmark": 66},
            {"pillar": "Feasibility", "you": scores_breakdown.get("feasibility", 70), "benchmark": 70},
            {"pillar": "Moat", "you": scores_breakdown.get("competition_barrier", 65), "benchmark": 64},
            {"pillar": "Viability", "you": scores_breakdown.get("business_viability", 75), "benchmark": 62},
            {"pillar": "Speed", "you": min(95, max(45, int(feasibility_score * 1.05))), "benchmark": 58},
            {"pillar": "Regulatory", "you": min(95, max(40, int(business_viability_score * 0.85))), "benchmark": 55},
        ]

        search_trends_chart = [
            {"month": label.split()[0][:3] if " " in label else label[:3], "interest": point}
            for label, point in zip(trends_labels, trends_points)
        ]

        competitor_matrix_chart = [
            {
                "name": "Your venture",
                "breadth": min(95, max(40, int(scores_breakdown.get("feasibility", 70) * 0.8))),
                "ux": min(95, max(60, int(scores_breakdown.get("market_demand", 75) * 1.1))),
                "price": min(95, max(50, int(scores_breakdown.get("business_viability", 75) * 1.05))),
            }
        ]
        for i, c in enumerate(competitors[:3]):
            c_name = c.get("name", f"Competitor {i+1}")
            competitor_matrix_chart.append({
                "name": c_name,
                "breadth": int(c.get("feature_breadth") or (82 - i * 5)),
                "ux": int(c.get("ux_focus") or (64 + i * 7)),
                "price": int(c.get("price_accessibility") or (46 + i * 8)),
            })

        risk_profile = {
            "composite_risk_percent": max(10, 100 - overall_score),
            "risk_factors": [
                {"label": "Market Demand Risk", "value": max(5, 100 - scores_breakdown.get("market_demand", 70))},
                {"label": "Feasibility Risk", "value": max(5, 100 - scores_breakdown.get("feasibility", 70))},
                {"label": "Competitive Risk", "value": max(5, 100 - scores_breakdown.get("competition_barrier", 65))},
                {"label": "Business Model Risk", "value": max(5, 100 - scores_breakdown.get("business_viability", 75))},
            ]
        }

        visual_statistics = {
            "radar_chart": radar_chart_points,
            "search_trends_chart": search_trends_chart,
            "competitor_matrix_chart": competitor_matrix_chart,
            "risk_profile": risk_profile,
            "radar_chart_legacy": {
                "title": "Venture Viability vs Industry Benchmark",
                "categories": [
                    "Market Demand",
                    "Technical Feasibility",
                    "Competitive Moat",
                    "Business Viability",
                    "Execution Speed",
                    "Regulatory Resilience"
                ],
                "datasets": [
                    {
                        "label": "Your Startup",
                        "data": [
                            scores_breakdown.get("market_demand", 70),
                            scores_breakdown.get("feasibility", 70),
                            scores_breakdown.get("competition_barrier", 65),
                            scores_breakdown.get("business_viability", 75),
                            82,
                            76
                        ],
                        "borderColor": "#3B82F6",
                        "backgroundColor": "rgba(59, 130, 246, 0.25)"
                    },
                    {
                        "label": "Industry Median",
                        "data": [62, 65, 58, 64, 60, 65],
                        "borderColor": "#9CA3AF",
                        "backgroundColor": "rgba(156, 163, 175, 0.15)"
                    }
                ]
            },
            "trends_chart": {
                "title": f"Google Search Volume Trend ({market_trends.get('keyword', 'Market Demand')})",
                "labels": trends_labels,
                "datasets": [
                    {
                        "label": "Search Interest Index (0-100)",
                        "data": trends_points,
                        "borderColor": "#10B981",
                        "backgroundColor": "rgba(16, 185, 129, 0.15)",
                        "fill": True,
                        "tension": 0.35
                    }
                ],
                "average_interest": round(avg_interest, 1),
                "trend_direction": direction
            },
            "risk_gauge": {
                "overall_risk_score": max(10, 100 - overall_score),
                "overall_risk_label": "Low" if overall_score >= 75 else ("Moderate" if overall_score >= 55 else "High"),
                "risk_distribution": [
                    {"category": "Market Demand", "score": 100 - scores_breakdown.get("market_demand", 70), "level": "Low" if scores_breakdown.get("market_demand", 70) >= 70 else "Medium"},
                    {"category": "Technical Feasibility", "score": 100 - scores_breakdown.get("feasibility", 70), "level": "Low" if scores_breakdown.get("feasibility", 70) >= 70 else "Medium"},
                    {"category": "Competitive Barrier", "score": 100 - scores_breakdown.get("competition_barrier", 65), "level": "Medium" if scores_breakdown.get("competition_barrier", 65) >= 60 else "High"},
                    {"category": "Business Viability", "score": 100 - scores_breakdown.get("business_viability", 75), "level": "Low" if scores_breakdown.get("business_viability", 75) >= 70 else "Medium"}
                ]
            },
            "kpi_cards": [
                {
                    "title": "Viability Score",
                    "value": f"{overall_score}/100",
                    "subtitle": f"{direction} demand trajectory",
                    "badge": "Top Tier" if overall_score >= 75 else "Promising",
                    "status": "positive" if overall_score >= 70 else ("neutral" if overall_score >= 55 else "negative")
                },
                {
                    "title": "Launch Verdict",
                    "value": verdict,
                    "subtitle": "Based on 4 validation pillars",
                    "badge": "Strategic",
                    "status": "positive" if "Launch" in verdict else ("neutral" if "Refinement" in verdict else "negative")
                },
                {
                    "title": "Competitors Mapped",
                    "value": str(len(competitors)),
                    "subtitle": "Market alternatives identified",
                    "badge": "Active Market",
                    "status": "neutral"
                },
                {
                    "title": "MVP Build Scope",
                    "value": f"{must_have_count or 3} Must-Haves",
                    "subtitle": "Estimated 3-5 weeks to deploy",
                    "badge": "Lean Scope",
                    "status": "positive"
                }
            ]
        }

        final_report = {
            "executive_summary": exec_summary,
            "validation_score": overall_score,
            "launch_readiness_verdict": verdict,
            "scores_breakdown": scores_breakdown,
            "visual_statistics": visual_statistics,
            "market_trends": market_trends,
            "market_analysis": market_analysis,
            "competitor_analysis": competitors,
            "swot_analysis": swot,
            "mvp_recommendation": state.get("mvp_recommendation", {}),
            "risks": risks,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "recommendations": recommendations,
            "founder_recommendations": " ".join(recommendations) if isinstance(recommendations, list) else str(recommendations),
            "references": state.get("references", [])
        }

        return {
            "status": "success",
            "data": {
                "validation_report": final_report,
                "validation_score": overall_score,
                "launch_readiness_verdict": verdict,
                "scores_breakdown": scores_breakdown,
                "visual_statistics": visual_statistics
            }
        }
