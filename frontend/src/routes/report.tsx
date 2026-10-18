import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Copy,
  ExternalLink,
  Printer,
  FileText,
  BookOpen,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  Target,
  TrendingUp,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/Page";
import { useAuth } from "@/lib/auth";
import { VerdictPill } from "@/components/Verdict";
import { report as defaultReport } from "@/data/report";
import { gsap, useCountUp, useReveal } from "@/lib/anim";
import { Item, LiftCard, motion, Reveal, Stagger } from "@/components/motion";
import type { ValidationResultData } from "@/lib/api";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Validation report — PitchProof" },
      {
        name: "description",
        content: "Score, demand curve, competitor matrix, SWOT, risk and a lean MVP roadmap.",
      },
      { property: "og:title", content: "Validation report — PitchProof" },
      { property: "og:description", content: "An investor-grade read on a startup idea." },
    ],
  }),
  component: Report,
});

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "0 12px 30px -18px oklch(0.22 0.03 250 / 0.5)",
};

const axis = {
  tickLine: false,
  axisLine: false,
  fontSize: 12,
  stroke: "var(--muted-foreground)",
} as const;

function transformBackendReport(liveData: ValidationResultData | null) {
  if (!liveData) return defaultReport;

  const score = Number(liveData.validation_score) || defaultReport.score;
  const verdict = (liveData.launch_readiness_verdict as any) || defaultReport.verdict;
  const title = liveData.title || defaultReport.title;
  const summary =
    liveData.report?.executive_summary ||
    liveData.idea_extraction?.summary ||
    defaultReport.summary;

  const breakdown = [
    {
      label: "Market Demand",
      value: Number(liveData.scores_breakdown?.market_demand) || 75,
    },
    {
      label: "Technical Feasibility",
      value: Number(liveData.scores_breakdown?.feasibility) || 75,
    },
    {
      label: "Competitive Moat",
      value: Number(liveData.scores_breakdown?.competition_barrier) || 65,
    },
    {
      label: "Business Viability",
      value: Number(liveData.scores_breakdown?.business_viability) || 75,
    },
  ];

  const MONTHS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];

  // 1. Radar chart (Venture vs Benchmark)
  let radar = defaultReport.radar;
  if (Array.isArray(liveData.visual_statistics?.radar_chart) && liveData.visual_statistics.radar_chart.length > 0) {
    radar = liveData.visual_statistics.radar_chart;
  } else if ((liveData.visual_statistics as any)?.radar_chart_legacy?.categories && (liveData.visual_statistics as any)?.radar_chart_legacy?.datasets) {
    const legacy = (liveData.visual_statistics as any).radar_chart_legacy;
    radar = legacy.categories.map((cat: string, idx: number) => ({
      pillar: cat.replace("Technical ", "").replace("Competitive ", "").replace("Business ", "").replace("Execution ", "").replace("Regulatory ", ""),
      you: legacy.datasets[0]?.data?.[idx] ?? 70,
      benchmark: legacy.datasets[1]?.data?.[idx] ?? 60,
    }));
  } else if (liveData.scores_breakdown) {
    const d = Number(liveData.scores_breakdown.market_demand) || 75;
    const f = Number(liveData.scores_breakdown.feasibility) || 75;
    const m = Number(liveData.scores_breakdown.competition_barrier) || 65;
    const v = Number(liveData.scores_breakdown.business_viability) || 75;
    radar = [
      { pillar: "Demand", you: d, benchmark: 66 },
      { pillar: "Feasibility", you: f, benchmark: 70 },
      { pillar: "Moat", you: m, benchmark: 64 },
      { pillar: "Viability", you: v, benchmark: 62 },
      { pillar: "Speed", you: Math.min(95, Math.max(45, Math.round(f * 1.05))), benchmark: 58 },
      { pillar: "Regulatory", you: Math.min(95, Math.max(40, Math.round(v * 0.85))), benchmark: 55 },
    ];
  }

  // 2. Search trends chart (12 Months)
  let trend = defaultReport.trend;
  if (Array.isArray(liveData.visual_statistics?.search_trends_chart) && liveData.visual_statistics.search_trends_chart.length > 0) {
    trend = liveData.visual_statistics.search_trends_chart;
  } else if ((liveData.visual_statistics as any)?.trends_chart?.labels && (liveData.visual_statistics as any)?.trends_chart?.datasets?.[0]?.data) {
    const tChart = (liveData.visual_statistics as any).trends_chart;
    trend = tChart.labels.map((lbl: string, i: number) => ({
      month: lbl.split(" ")[0]?.slice(0, 3) || MONTHS[i] || `M${i + 1}`,
      interest: Number(tChart.datasets[0].data[i]) || 50,
    }));
  } else if (Array.isArray(liveData.market_trends?.interest_series) && liveData.market_trends.interest_series.length > 0) {
    trend = liveData.market_trends.interest_series.slice(-12).map((val, i) => ({
      month: MONTHS[i] || `M${i + 1}`,
      interest: val,
    }));
  } else if (liveData.market_trends?.average_interest) {
    const avg = Number(liveData.market_trends.average_interest) || 60;
    const isGrowing = (liveData.market_trends?.trend_direction || "").includes("Grow");
    trend = MONTHS.map((m, i) => ({
      month: m,
      interest: Math.min(98, Math.max(20, Math.round(avg + (isGrowing ? (i - 6) * 3.5 : (6 - i) * 2.5)))),
    }));
  }

  const trendBadge =
    liveData.market_trends?.trend_badge ||
    (liveData.market_trends?.trend_direction
      ? `${liveData.market_trends.trend_direction} Demand`
      : defaultReport.trendBadge);

  // 3. Competitor comparison chart (Real discovered competitors synced)
  let competitorChart = defaultReport.competitorChart;
  if (Array.isArray(liveData.visual_statistics?.competitor_matrix_chart) && liveData.visual_statistics.competitor_matrix_chart.length > 0) {
    competitorChart = liveData.visual_statistics.competitor_matrix_chart;
  } else {
    const f = Number(liveData.scores_breakdown?.feasibility) || 75;
    const d = Number(liveData.scores_breakdown?.market_demand) || 75;
    const v = Number(liveData.scores_breakdown?.business_viability) || 75;

    const yourVenture = {
      name: "Your venture",
      breadth: Math.min(95, Math.max(40, Math.round(f * 0.8))),
      ux: Math.min(95, Math.max(60, Math.round(d * 1.1))),
      price: Math.min(95, Math.max(50, Math.round(v * 1.05))),
    };

    const actualComps = (liveData.competitors && liveData.competitors.length > 0)
      ? liveData.competitors.slice(0, 3)
      : defaultReport.competitors;

    const competitorBars = actualComps.map((c, i) => ({
      name: c.name || `Competitor ${i + 1}`,
      breadth: 72 + ((i * 8) % 22),
      ux: 62 + ((i * 11) % 23),
      price: 44 + ((i * 14) % 28),
    }));

    competitorChart = [yourVenture, ...competitorBars];
  }

  // 4. Risk profile (Composite risk + 4 pillar risk gauges)
  const compositeRisk =
    liveData.visual_statistics?.risk_profile?.composite_risk_percent ??
    Math.max(10, 100 - score);

  let riskTiles = defaultReport.risk.tiles;
  if (Array.isArray(liveData.visual_statistics?.risk_profile?.risk_factors) && liveData.visual_statistics.risk_profile.risk_factors.length > 0) {
    riskTiles = liveData.visual_statistics.risk_profile.risk_factors;
  } else if (liveData.scores_breakdown) {
    riskTiles = [
      {
        label: "Market Demand Risk",
        value: Math.max(5, 100 - (Number(liveData.scores_breakdown.market_demand) || 75)),
      },
      {
        label: "Feasibility Risk",
        value: Math.max(5, 100 - (Number(liveData.scores_breakdown.feasibility) || 75)),
      },
      {
        label: "Competitive Risk",
        value: Math.max(5, 100 - (Number(liveData.scores_breakdown.competition_barrier) || 65)),
      },
      {
        label: "Business Model Risk",
        value: Math.max(5, 100 - (Number(liveData.scores_breakdown.business_viability) || 75)),
      },
    ];
  }

  // Competitors list (Normalized from Competitor Agent)
  const competitors =
    liveData.competitors && liveData.competitors.length > 0
      ? liveData.competitors.map((c, i) => {
        const rawUrl = (c as any).website || (c as any).url || (c as any).source_urls?.[0] || "";
        let cleanDomain = c.domain;
        if (!cleanDomain && rawUrl) {
          try {
            const u = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
            cleanDomain = u.hostname.replace(/^www\./, "");
          } catch {
            cleanDomain = rawUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
          }
        }
        if (!cleanDomain) {
          cleanDomain = `${(c.name || "competitor").toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
        }

        const cleanUrl = rawUrl
          ? (rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`)
          : `https://${cleanDomain}`;

        const cleanAbout = c.about || (c as any).description || "Active player in this market segment.";
        const cleanPoints = cleanSnippetToPoints(cleanAbout);

        const cleanStrengths = Array.isArray(c.strengths) && c.strengths.length > 0
          ? c.strengths
          : ["Market brand recognition", "Existing customer base"];
        const cleanGaps = Array.isArray(c.gaps) && c.gaps.length > 0
          ? c.gaps
          : Array.isArray((c as any).weaknesses) && (c as any).weaknesses.length > 0
            ? (c as any).weaknesses
            : ["Legacy user workflows", "High entry pricing"];

        return {
          name: c.name || `Competitor ${i + 1}`,
          domain: cleanDomain,
          url: cleanUrl,
          about: cleanAbout,
          points: cleanPoints,
          strengths: cleanStrengths,
          gaps: cleanGaps,
        };
      })
      : defaultReport.competitors.map((c) => ({
        ...c,
        url: `https://${c.domain}`,
        points: cleanSnippetToPoints(c.about),
      }));

  // Helper to ensure string array
  const ensureStringArray = (val: any, fallback: string[]): string[] => {
    if (Array.isArray(val) && val.length > 0) return val.map((x) => String(x));
    if (typeof val === "string" && val.trim().length > 0) {
      return val.split(/(?<=[.!?])\s+|\n+|;\s*/).map((s) => s.trim()).filter(Boolean);
    }
    return fallback;
  };

  // SWOT Matrix (Normalized from SWOT Risk Agent)
  const rawSwot = liveData.swot_analysis || (liveData.report as any)?.swot_analysis || {};
  const swot: Record<string, string[]> = {
    Strengths: ensureStringArray(rawSwot.Strengths || rawSwot.strengths, defaultReport.swot.Strengths),
    Weaknesses: ensureStringArray(rawSwot.Weaknesses || rawSwot.weaknesses, defaultReport.swot.Weaknesses),
    Opportunities: ensureStringArray(rawSwot.Opportunities || rawSwot.opportunities, defaultReport.swot.Opportunities),
    Threats: ensureStringArray(rawSwot.Threats || rawSwot.threats, defaultReport.swot.Threats),
  };

  // MVP Roadmap (Normalized from Recommendation Agent)
  const formatMvpList = (
    rawList: any[] | undefined,
    fallback: typeof defaultReport.mvp["Must-Have (Sprint 1–2)"]
  ) => {
    if (!rawList || rawList.length === 0) return fallback;
    return rawList.map((item, idx) => {
      if (typeof item === "string") {
        return {
          title: item,
          why: "Core functional deliverable essential for validation.",
          kpi: `Target milestone #${idx + 1}`,
        };
      }
      return {
        title: item.title || item.feature || `Phase deliverable #${idx + 1}`,
        why: item.why || item.reason || item.rationale || "Validates immediate user demand.",
        kpi: item.kpi || item.validation_goal || "Adoption & completion metric",
      };
    });
  };

  const rawMvp = liveData.mvp_recommendation || (liveData.report as any)?.mvp_recommendation || {};
  const mvp = {
    "Must-Have (Sprint 1–2)": formatMvpList(
      rawMvp.must_have || rawMvp["Must-Have (Sprint 1–2)"],
      defaultReport.mvp["Must-Have (Sprint 1–2)"]
    ),
    "Nice-to-Have (Sprint 3–4)": formatMvpList(
      rawMvp.nice_to_have || rawMvp["Nice-to-Have (Sprint 3–4)"],
      defaultReport.mvp["Nice-to-Have (Sprint 3–4)"]
    ),
    "Future (Quarterly Scale)": formatMvpList(
      rawMvp.future_features || rawMvp.future_scope || rawMvp["Future (Quarterly Scale)"],
      defaultReport.mvp["Future (Quarterly Scale)"]
    ),
  };

  // Founder Advice (Normalized from Report Agent)
  const advice =
    liveData.report?.founder_recommendations ||
      (liveData.report as any)?.recommendations && Array.isArray((liveData.report as any).recommendations)
      ? (liveData.report as any).recommendations.join(" ")
      : liveData.report?.verdict_explanation ||
      liveData.report?.executive_summary ||
      defaultReport.advice;

  // News headlines (Normalized from Trends Agent)
  const news =
    liveData.news_headlines && liveData.news_headlines.length > 0
      ? liveData.news_headlines.map((n) => {
        const rawUrl = (n as any).url || n.link || "";
        const cleanUrl = rawUrl
          ? (rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`)
          : "#";
        let cleanDomain = "";
        if (rawUrl) {
          try {
            const u = new URL(cleanUrl);
            cleanDomain = u.hostname.replace(/^www\./, "");
          } catch {
            cleanDomain = n.source || "Industry Intelligence";
          }
        }
        const rawDesc = (n as any).description || (n as any).snippet || "";
        const points = rawDesc ? cleanSnippetToPoints(rawDesc) : [];

        return {
          title: n.title,
          source: cleanDomain || n.source || "Industry Intelligence",
          date: (n as any).published_at || n.pubDate || n.date || "Recent",
          link: cleanUrl,
          points: points.length > 0 ? points : [n.title],
        };
      })
      : defaultReport.news.map((n) => ({
        ...n,
        points: [n.title],
      }));

  return {
    score,
    verdict,
    title,
    industry: liveData.industry || defaultReport.industry,
    summary,
    breakdown,
    radar,
    trend,
    trendBadge,
    competitorChart,
    risk: { composite: compositeRisk, tiles: riskTiles },
    competitors,
    swot,
    mvp,
    advice,
    news,
    ideaExtraction: liveData.idea_extraction,
    rawRisks: liveData.risks,
  };
}

function cleanSnippetToPoints(raw: string): string[] {
  if (!raw) return ["Established market solution targeting overlapping customer pain points."];

  // Strip markdown, pagination, checkboxes, and search noise
  let text = raw
    .replace(/##+/g, "")
    .replace(/\[[xX ]\]/g, "")
    .replace(/Showing Result \d+-\d+ of \d+/gi, "")
    .replace(/Add to Compare\s*\d*/gi, "")
    .replace(/Compare with.*$/gi, "")
    .replace(/\b\d+(\s+\d+)+\b/g, "")
    .replace(/\b\d+\s*\.\.\.\s*\d+\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Split on sentence boundaries, colons, or semicolons
  const parts = text.split(/(?<=[.!?])\s+|;\s+|\s+[-–—•]\s+/);
  const points: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim().replace(/^[-–—•*]\s*/, "");
    if (trimmed.length > 18 && !/^\d+[\s\d.]*$/.test(trimmed)) {
      points.push(trimmed.endsWith(".") ? trimmed : `${trimmed}.`);
    }
  }

  if (points.length === 0) {
    if (text.length > 15) {
      points.push(text.length > 160 ? text.slice(0, 160) + "..." : text);
    } else {
      points.push("Established market player offering comparable workflow tools.");
    }
  }

  return points.slice(0, 3);
}

function AgentErrorBanner({ errors }: { errors: string[] }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || errors.length === 0) return null;
  return (
    <div className="mb-6 rounded-xl border border-warning/30 bg-warning/8 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-warning">Some agents encountered errors</p>
          <p className="mt-0.5 text-xs text-muted-foreground">The report below used fallback data for the affected sections.</p>
          <ul className="mt-2 space-y-1">
            {errors.map((e, i) => (
              <li key={i} className="text-xs font-mono text-muted-foreground break-words">{e}</li>
            ))}
          </ul>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

function Report() {
  const { user } = useAuth();
  const scope = useReveal<HTMLDivElement>();
  const [liveReport, setLiveReport] = useState<ValidationResultData | null>(null);
  const [query, setQuery] = useState<{ title?: string; idea?: string; industry?: string } | null>(
    null
  );

  const [reportMissing, setReportMissing] = useState(false);

  useEffect(() => {
    try {
      const rawStored = sessionStorage.getItem("antigravity.report");
      if (rawStored) {
        setLiveReport(JSON.parse(rawStored));
      } else {
        setReportMissing(true);
      }
    } catch {
      setReportMissing(true);
    }

    try {
      const rawQuery = sessionStorage.getItem("antigravity.idea");
      if (rawQuery) {
        setQuery(JSON.parse(rawQuery));
      }
    } catch {
      // ignore
    }
  }, []);

  if (reportMissing) {
    return (
      <Page>
        <div className="mx-auto max-w-xl px-5 py-32 text-center">
          <AlertCircle className="mx-auto mb-5 size-12 text-muted-foreground" />
          <h1 className="font-display text-3xl">No report found</h1>
          <p className="mt-3 text-muted-foreground">
            The validation pipeline didn't complete successfully. Please go back and try again.
          </p>
          <Link
            to="/workspace"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:brightness-95"
          >
            Validate a new idea
          </Link>
        </div>
      </Page>
    );
  }

  const report = useMemo(() => transformBackendReport(liveReport), [liveReport]);
  const scoreRef = useCountUp(report.score);
  const ring = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!ring.current) return;
    const len = 2 * Math.PI * 52;
    gsap.fromTo(
      ring.current,
      { strokeDashoffset: len },
      {
        strokeDashoffset: len - (report.score / 100) * len,
        duration: 1.6,
        ease: "power3.out",
      }
    );
  }, [report.score]);

  const [isFeedbackDocOpen, setIsFeedbackDocOpen] = useState(false);
  const [hasCopiedDoc, setHasCopiedDoc] = useState(false);

  const isReadyToLaunch = report.score >= 75;

  const launchVerdictReasoning = useMemo(() => {
    const feasibility = report.breakdown.find((b) => b.label === "Feasibility")?.value ?? 75;
    const demand = report.breakdown.find((b) => b.label === "Market demand")?.value ?? 75;
    const weakestPillar = [...report.breakdown].sort((a, b) => a.value - b.value)[0];

    if (isReadyToLaunch) {
      return `The venture exhibits strong composite viability (${report.score}/100) supported by ${feasibility}% feasibility and ${demand}% market demand. Clear differentiation openings exist against incumbent competitors (${report.competitors[0]?.name || "legacy alternatives"}). Recommendation is to proceed immediately to closed alpha prototyping and private customer waitlist validation.`;
    } else {
      return `The venture scored ${report.score}/100 with elevated friction identified in ${weakestPillar?.label ?? "differentiation"} (${weakestPillar?.value ?? 60}%). Rather than jumping directly to full production build, the venture requires further refinement in its unique value proposition, customer acquisition wedge, and defensibility strategy before significant capital or engineering commitment.`;
    }
  }, [report, isReadyToLaunch]);

  const personalizedSuggestions = useMemo(() => {
    const topCompetitor = report.competitors[0] || { name: "incumbents", gaps: ["high enterprise pricing", "rigid workflows"] };
    const compGap = topCompetitor.gaps?.[0] || "rigid legacy architecture";
    const swotOpportunity = report.swot.Opportunities?.[0] || "unmet demand in mid-market workflows";
    const swotWeakness = report.swot.Weaknesses?.[0] || "early brand awareness barriers";
    const highestRisk = [...report.risk.tiles].sort((a, b) => b.value - a.value)[0] || { label: "Competitive Pressure", value: 45 };

    return [
      {
        pillar: "Distribution & Go-To-Market",
        icon: TrendingUp,
        summary: `Attack the "${compGap}" wedge in ${report.industry}.`,
        details: `Instead of broad horizontal marketing, concentrate on customers currently frustrated by ${topCompetitor.name}'s ${compGap}. Leverage organic founder-led outreach or product-led onboarding to acquire your initial 50 reference customers without paid ad dependency.`,
      },
      {
        pillar: "Defensibility & Competitive Moats",
        icon: ShieldAlert,
        summary: `Counter-position against ${topCompetitor.name}.`,
        details: `Neutralize ${swotWeakness} by creating tight data network effects or proprietary templates. Make migration from competitors zero-friction while making your core workflow sticky and indispensable.`,
      },
      {
        pillar: "MVP Scope & Speed-to-Market",
        icon: Target,
        summary: `Limit Sprint 1 strictly to "${report.mvp["Must-Have (Sprint 1–2)"]?.[0]?.title || "Core value feature"}".`,
        details: `Avoid feature bloat. Ship the primary value loop within 14 days to validate "${report.mvp["Must-Have (Sprint 1–2)"]?.[0]?.kpi || "Active weekly adoption"}" before developing secondary modules.`,
      },
      {
        pillar: "Monetization & Pricing Power",
        icon: Sparkles,
        summary: `Tie pricing directly to measurable ROI or time saved.`,
        details: `Capitalize on "${swotOpportunity}" with transparent tiered pricing. Offer a pilot guarantee to eliminate procurement resistance and lock in annual commitments early.`,
      },
      {
        pillar: "Risk Mitigation & Compliance",
        icon: AlertCircle,
        summary: `De-risk ${highestRisk.label} (${highestRisk.value}% index).`,
        details: `Set weekly review gates targeting your highest sensitivity factors. Establish contingency playbooks for regulatory compliance, data privacy, and incumbent retaliation before scaling user acquisition.`,
      },
    ];
  }, [report]);

  const handleCopyFullDocument = () => {
    const md = `# PitchProof Venture Intelligence Dossier: ${report.title}
Sector / Industry: ${report.industry}
Composite Validation Score: ${report.score}/100
Launch Recommendation: ${isReadyToLaunch ? "READY TO LAUNCH" : "REQUIRES FURTHER REFINEMENT"}

---

## 1. Strategic Launch Verdict
${launchVerdictReasoning}

---

## 2. Executive Founder Advisory
${report.advice}

---

## 3. Personalized Improvement Suggestions
${personalizedSuggestions.map((s) => `### ${s.pillar}: ${s.summary}\n${s.details}`).join("\n\n")}

---

## 4. Viability & Feasibility Breakdown
${report.breakdown.map((b) => `- ${b.label}: ${b.value}%`).join("\n")}

---

## 5. Competitive Benchmark & Landscape
${report.competitors.map((c) => `### ${c.name} (${c.domain})\n${((Array.isArray(c.points) ? c.points : cleanSnippetToPoints(c.about)) || []).map((p) => `- ${p}`).join("\n")}\nStrengths: ${(c.strengths || []).join(", ")}\nGaps: ${(c.gaps || []).join(", ")}`).join("\n\n")}

---

## 6. Strategic SWOT Matrix
${Object.entries(report.swot).map(([k, v]) => `### ${k}\n${(Array.isArray(v) ? v : [String(v)]).map((item) => `- ${item}`).join("\n")}`).join("\n\n")}

---

## 7. Recommendations & Lean Roadmap
Must-Have:
${report.mvp["Must-Have (Sprint 1–2)"]?.map((m) => `- ${m.title}: ${m.why} (KPI: ${m.kpi})`).join("\n")}

Nice-to-Have:
${report.mvp["Nice-to-Have (Sprint 3–4)"]?.map((m) => `- ${m.title}: ${m.why} (KPI: ${m.kpi})`).join("\n")}

Quarterly Scale:
${report.mvp["Future (Quarterly Scale)"]?.map((m) => `- ${m.title}: ${m.why} (KPI: ${m.kpi})`).join("\n")}
`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(md);
      setHasCopiedDoc(true);
      toast.success("Complete strategic dossier copied to clipboard!");
      setTimeout(() => setHasCopiedDoc(false), 2500);
    }
  };

  return (
    <Page>
      <div ref={scope} className="mx-auto max-w-6xl px-5 py-16">
        <Link
          to={user?.role === "admin" ? "/admin" : "/history"}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>
        <AgentErrorBanner errors={liveReport?.errors ?? []} />

        {/* Executive summary */}
        <section data-reveal className="surface grain p-7 md:p-10">
          <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center">
            <div className="relative shrink-0">
              <svg viewBox="0 0 120 120" className="size-36 -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="var(--secondary)" strokeWidth="10" />
                <circle
                  ref={ring}
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 52}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span ref={scoreRef} className="font-mono text-4xl">
                  0
                </span>
                <span className="text-[11px] tracking-widest text-muted-foreground uppercase">
                  score
                </span>
              </div>
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-4xl">{query?.title?.trim() || report.title}</h1>
                <VerdictPill verdict={report.verdict} />
              </div>
              <p className="mt-3 max-w-2xl text-muted-foreground">{report.summary}</p>
              {(query?.industry || query?.idea || liveReport?.idea) && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  {(query?.industry || liveReport?.industry) && (
                    <span className="rounded-full border border-border bg-background px-3 py-1 font-mono">
                      {query?.industry || liveReport?.industry}
                    </span>
                  )}
                  {(query?.idea || liveReport?.idea) && (
                    <span className="max-w-xl truncate rounded-full border border-border bg-background px-3 py-1 text-muted-foreground">
                      "{query?.idea || liveReport?.idea}"
                    </span>
                  )}
                </div>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm transition-all hover:-translate-y-0.5"
                >
                  <Printer className="size-4" /> Export PDF
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      `${report.title} — ${report.score}/100 — ${report.verdict}\n\n${report.summary}`
                    );
                    toast.success("Summary copied to clipboard");
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm transition-all hover:-translate-y-0.5"
                >
                  <Copy className="size-4" /> Copy summary
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Metric tiles */}
        <Stagger className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {report.breakdown.map((b) => (
            <Item key={b.label}>
              <LiftCard className="surface h-full p-5">
                <p className="text-sm text-muted-foreground">{b.label}</p>
                <p className="mt-2 font-mono text-3xl">{b.value}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${b.value}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </LiftCard>
            </Item>
          ))}
        </Stagger>

        {/* Charts */}
        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel title="Viability analysis" sub="Your venture vs industry benchmark">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={report.radar} outerRadius="72%">
                <PolarGrid stroke="var(--border)" strokeDasharray="3 4" />
                <PolarAngleAxis dataKey="pillar" fontSize={12} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={tooltipStyle} />
                <Radar
                  name="Benchmark"
                  dataKey="benchmark"
                  stroke="var(--chart-5)"
                  strokeWidth={1.5}
                  fill="var(--chart-5)"
                  fillOpacity={0.1}
                />
                <Radar
                  name="Your venture"
                  dataKey="you"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="var(--primary)"
                  fillOpacity={0.22}
                  animationDuration={1100}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Search demand, 12 months" sub={report.trendBadge}>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={report.trend} margin={{ left: -22, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="demand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="month" {...axis} />
                <YAxis domain={[0, 100]} {...axis} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--border)" }} />
                <Area
                  type="monotone"
                  dataKey="interest"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fill="url(#demand)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  animationDuration={1100}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Competitor comparison" sub="Feature breadth, UX focus, price accessibility">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={report.competitorChart} margin={{ left: -22, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="name" {...axis} fontSize={11} />
                <YAxis {...axis} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--secondary)", radius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="breadth"
                  name="Breadth"
                  fill="var(--chart-5)"
                  radius={[6, 6, 0, 0]}
                  barSize={14}
                  animationDuration={900}
                />
                <Bar
                  dataKey="ux"
                  name="UX"
                  fill="var(--primary)"
                  radius={[6, 6, 0, 0]}
                  barSize={14}
                  animationDuration={1000}
                />
                <Bar
                  dataKey="price"
                  name="Price access"
                  fill="var(--chart-2)"
                  radius={[6, 6, 0, 0]}
                  barSize={14}
                  animationDuration={1100}
                />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Risk profile" sub={`Composite risk ${report.risk.composite}%`}>
            <div className="space-y-4 pt-2">
              {report.risk.tiles.map((t) => (
                <div key={t.label}>
                  <div className="flex justify-between text-sm">
                    <span>{t.label}</span>
                    <span className="font-mono text-muted-foreground">{t.value}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      className={`h-full rounded-full ${t.value > 50 ? "bg-danger" : t.value > 35 ? "bg-warning" : "bg-success"
                        }`}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${t.value}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        {/* Competitors */}
        <Reveal>
          <h2 className="mt-14 font-display text-3xl">Who is already there.</h2>
        </Reveal>
        <section className="mt-4 grid gap-4 md:grid-cols-3">
          {report.competitors.map((c) => (
            <a
              key={c.name}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block h-full focus:outline-none"
            >
              <LiftCard className="surface h-full p-6 transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium transition-colors group-hover:text-primary">{c.name}</h3>
                  <ExternalLink className="size-4 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <p className="mt-1 font-mono text-xs text-primary underline underline-offset-2">{c.domain}</p>
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {((Array.isArray(c.points) ? c.points : cleanSnippetToPoints(c.about)) || []).map((pt, pIdx) => (
                    <div key={pIdx} className="flex items-start gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70" />
                      <span className="leading-snug">{pt}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {(c.strengths || []).slice(0, 2).map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] text-success"
                    >
                      {s}
                    </span>
                  ))}
                  {(c.gaps || []).slice(0, 2).map((g) => (
                    <span
                      key={g}
                      className="rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-[11px] text-warning"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </LiftCard>
            </a>
          ))}
        </section>

        {/* SWOT */}
        <h2 className="mt-14 font-display text-3xl" data-reveal>
          Strengths, gaps, openings, threats.
        </h2>
        <section className="mt-4 grid gap-4 md:grid-cols-2">
          {Object.entries(report.swot).map(([k, items]) => (
            <div key={k} data-reveal className="surface p-6">
              <h3 className={`text-lg font-medium ${swotTone[k] || "text-foreground"}`}>{k}</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {(Array.isArray(items) ? items : [String(items)]).map((i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">—</span>
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        {/* Recommendations & MVP Roadmap */}
        <h2 className="mt-14 font-display text-3xl" data-reveal>
          Recommendations.
        </h2>
        <section className="mt-4 grid gap-4 md:grid-cols-3">
          {Object.entries(report.mvp).map(([tier, feats]) => (
            <div key={tier} data-reveal className="surface p-6">
              <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">{tier}</p>
              <div className="mt-4 space-y-5">
                {feats.map((f) => (
                  <div key={f.title}>
                    <p className="font-medium">{f.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{f.why}</p>
                    <p className="mt-1 font-mono text-xs text-primary">KPI · {f.kpi}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Executive Feedback & Strategy Document Preview Card */}
        <div
          data-reveal
          onClick={() => setIsFeedbackDocOpen(true)}
          className="surface group relative mt-6 cursor-pointer overflow-hidden border-2 border-primary/25 bg-secondary/60 p-7 transition-all duration-300 hover:border-primary/60 hover:bg-secondary/90 hover:shadow-xl md:p-8"
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 font-mono text-xs font-semibold text-primary">
                  <FileText className="size-3.5" />
                  Executive Strategic Dossier
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-semibold ${isReadyToLaunch
                    ? "border border-success/30 bg-success/15 text-success"
                    : "border border-warning/30 bg-warning/15 text-warning"
                    }`}
                >
                  {isReadyToLaunch ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : (
                    <AlertTriangle className="size-3.5" />
                  )}
                  {isReadyToLaunch ? "Ready to Launch" : "Requires Further Refinement"}
                </span>
              </div>
              <p className="font-display text-2xl md:text-3xl">Validation Feedback & Strategic Memo</p>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
                {report.advice.length > 220 ? `${report.advice.slice(0, 220)}...` : report.advice}
              </p>
            </div>
            <div className="shrink-0">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 group-hover:scale-105"
              >
                <BookOpen className="size-4" />
                Read Full Feedback Doc
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-border/60 pt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Target className="size-3.5 text-primary" />
              Personalized Improvements
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="size-3.5 text-primary" />
              Launch Readiness Verdict
            </span>
            <span className="flex items-center gap-1">
              <Layers className="size-3.5 text-primary" />
              30-Day Execution Playbook
            </span>
            <span className="ml-auto font-mono text-xs text-primary group-hover:underline">
              Click anywhere to expand dossier &rarr;
            </span>
          </div>
        </div>

        {/* News */}
        <h2 className="mt-14 font-display text-3xl" data-reveal>
          What the market is saying.
        </h2>
        <section className="mt-4 grid gap-4 md:grid-cols-3">
          {report.news.map((n, idx) => (
            <a
              key={n.title + idx}
              href={(n as any).link && (n as any).link !== "#" ? (n as any).link : `https://www.google.com/search?q=${encodeURIComponent(n.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              data-reveal
              className="group surface block p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium leading-snug transition-colors group-hover:text-primary">{n.title}</p>
                <ExternalLink className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              {Array.isArray((n as any).points) && (n as any).points.length > 0 && (
                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  {(n as any).points.slice(0, 2).map((pt: string, pIdx: number) => (
                    <div key={pIdx} className="flex items-start gap-1.5">
                      <span className="mt-1 size-1 shrink-0 rounded-full bg-primary/60" />
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-3 font-mono text-xs text-muted-foreground">
                {n.source} · {n.date}
              </p>
            </a>
          ))}
        </section>

        {/* Scrollable Executive Feedback & Validation Dossier Modal */}
        {isFeedbackDocOpen && (
          <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-background/80 p-3 backdrop-blur-md sm:p-6 md:p-10 animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => setIsFeedbackDocOpen(false)} />

            <div className="surface grain relative z-10 my-auto w-full max-w-4xl rounded-2xl border border-border/80 bg-card p-6 shadow-2xl sm:p-10 md:p-12">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-border/60 pb-6">
                <div>
                  <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-primary uppercase">
                    <FileText className="size-4" />
                    Confidential · Venture Intelligence Dossier
                  </div>
                  <h2 className="mt-2 font-display text-2xl text-foreground sm:text-3xl md:text-4xl">
                    {report.title}
                  </h2>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    Sector: {report.industry} · Evaluated by PitchProof Multi-Agent Engine
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyFullDocument}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-xs font-medium transition-colors hover:bg-secondary"
                  >
                    {hasCopiedDoc ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                    {hasCopiedDoc ? "Copied" : "Copy Dossier"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFeedbackDocOpen(false)}
                    className="rounded-lg border border-border bg-secondary/60 p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <X className="size-5" />
                  </button>
                </div>
              </div>

              <div className="mt-8 space-y-10 text-foreground">
                {/* 1. Launch Readiness Recommendation */}
                <section
                  className={`rounded-xl border p-6 ${isReadyToLaunch
                    ? "border-success/30 bg-success/5"
                    : "border-warning/30 bg-warning/5"
                    }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {isReadyToLaunch ? (
                        <div className="rounded-full bg-success/20 p-2 text-success">
                          <CheckCircle2 className="size-6" />
                        </div>
                      ) : (
                        <div className="rounded-full bg-warning/20 p-2 text-warning">
                          <AlertTriangle className="size-6" />
                        </div>
                      )}
                      <div>
                        <span className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
                          Strategic Launch Verdict
                        </span>
                        <h3
                          className={`text-xl font-semibold ${isReadyToLaunch ? "text-success" : "text-warning"
                            }`}
                        >
                          {isReadyToLaunch
                            ? "Recommendation: READY TO LAUNCH"
                            : "Recommendation: REQUIRES FURTHER REFINEMENT"}
                        </h3>
                      </div>
                    </div>
                    <div className="rounded-full border border-border bg-background px-3 py-1 font-mono text-sm">
                      Validation Score: <strong className="text-primary">{report.score}/100</strong>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {launchVerdictReasoning}
                  </p>
                </section>

                {/* 2. Executive Founder Advisory */}
                <section>
                  <h3 className="font-display text-2xl">Executive Founder Advisory</h3>
                  <div className="mt-3 rounded-xl border border-border/50 bg-secondary/50 p-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {report.advice}
                  </div>
                </section>

                {/* 3. Personalized Improvement Suggestions */}
                <section>
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display text-2xl">Personalized Improvement Suggestions</h3>
                    <span className="font-mono text-xs text-muted-foreground">5 Strategic Pillars</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Actionable interventions specifically calibrated for {report.industry} and your competitive positioning.
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {personalizedSuggestions.map((item) => (
                      <div key={item.pillar} className="space-y-2 rounded-xl border border-border/70 bg-card p-5">
                        <div className="flex items-center gap-2">
                          <item.icon className="size-4 text-primary" />
                          <h4 className="text-sm font-medium text-foreground">{item.pillar}</h4>
                        </div>
                        <p className="font-mono text-xs font-semibold text-primary">{item.summary}</p>
                        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{item.details}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 4. Viability Scorecard */}
                <section>
                  <h3 className="font-display text-2xl">Viability & Feasibility Scorecard</h3>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {report.breakdown.map((b) => (
                      <div key={b.label} className="rounded-xl border border-border/70 bg-secondary/30 p-4 text-center">
                        <p className="font-mono text-2xl font-bold text-primary">{b.value}%</p>
                        <p className="mt-1 text-xs text-muted-foreground">{b.label}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 5. SWOT Synthesis */}
                <section>
                  <h3 className="font-display text-2xl">Strategic Matrix (SWOT)</h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {Object.entries(report.swot).map(([k, items]) => (
                      <div key={k} className="rounded-xl border border-border/70 bg-card p-4">
                        <h4 className={`text-sm font-semibold ${swotTone[k] || "text-foreground"}`}>{k}</h4>
                        <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                          {(Array.isArray(items) ? items : [String(items)]).map((it, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-primary">•</span>
                              <span>{it}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 6. 30-Day Execution Roadmap */}
                <section>
                  <h3 className="font-display text-2xl">30-Day Lean Execution Playbook</h3>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-border/60 bg-secondary/20 p-4">
                      <span className="font-mono text-xs font-bold text-primary">DAYS 1–10 · Smoke Test & Customer Discovery</span>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                        Deploy lean landing page with conversion tracking, conduct 10 customer discovery interviews targeting pain points unserved by {report.competitors[0]?.name || "incumbents"}.
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-secondary/20 p-4">
                      <span className="font-mono text-xs font-bold text-primary">DAYS 11–20 · Core MVP Build</span>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                        Implement must-have features ({report.mvp["Must-Have (Sprint 1–2)"]?.[0]?.title || "Core workflow deliverable"}), keeping scope tight to validate primary value exchange.
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-secondary/20 p-4">
                      <span className="font-mono text-xs font-bold text-primary">DAYS 21–30 · Pilot Launch & Metrics Review</span>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                        Onboard 15–20 alpha users, track target KPI ({report.mvp["Must-Have (Sprint 1–2)"]?.[0]?.kpi || "weekly retention"}), and iterate directly on user friction points.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-6">
                  <p className="font-mono text-xs text-muted-foreground">
                    End of Strategic Dossier · PitchProof AI Engine
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleCopyFullDocument}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/80 px-4 py-2 text-xs font-medium transition-colors hover:bg-secondary"
                    >
                      {hasCopiedDoc ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                      {hasCopiedDoc ? "Copied" : "Copy Full Markdown"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsFeedbackDocOpen(false)}
                      className="rounded-xl bg-primary px-5 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      Close Dossier
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}

const swotTone: Record<string, string> = {
  Strengths: "text-success",
  Weaknesses: "text-danger",
  Opportunities: "text-primary",
  Threats: "text-warning",
};

function Panel({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div data-reveal className="surface p-6">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-lg font-medium">{title}</h3>
        {sub && <span className="font-mono text-xs text-muted-foreground">{sub}</span>}
      </div>
      {children}
    </div>
  );
}
