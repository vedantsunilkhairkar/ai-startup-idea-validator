import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Page } from "@/components/Page";
import { useReveal } from "@/lib/anim";
import { trendsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Search, Loader2, ArrowRight, Activity, Sparkles, Lock } from "lucide-react";
import { toast } from "sonner";

const POPULAR_TRENDS = [
  "AI Agents",
  "Autonomous Coding",
  "AI Voice Agents",
  "Vertical AI SaaS",
  "Open Source LLMs",
  "AI Cybersecurity",
  "Climate Tech",
  "Spatial Computing",
  "Fintech Automation",
];

export const Route = createFileRoute("/trends")({
  head: () => ({
    meta: [
      { title: "Market trends explorer — PitchProof" },
      { name: "description", content: "Query real-time 12-month search interest for any market keyword." },
      { property: "og:title", content: "Market trends explorer — PitchProof" },
      { property: "og:description", content: "Twelve months of real market demand for any keyword." },
    ],
  }),
  component: Trends,
});

interface TrendPoint {
  month: string;
  fullDate: string;
  interest: number;
}

interface ActiveTrendData {
  keyword: string;
  interest: number;
  label: string;
  source: string;
  series: TrendPoint[];
}

function Trends() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [customKey, setCustomKey] = useState<string>("");
  const [selectedKey, setSelectedKey] = useState<string>("AI Agents");
  const [loading, setLoading] = useState(false);
  const [activeData, setActiveData] = useState<ActiveTrendData | null>(null);

  const fetchTrend = async (query: string) => {
    setLoading(true);
    try {
      const res = await trendsApi.getTrends(query);
      const data = res?.data;
      if (data) {
        const points: number[] = Array.isArray(data.data_points)
          ? data.data_points
          : Array.isArray(data.timeline)
            ? data.timeline.map((t: any) => Number(t.value) || 0)
            : [];
        const labels: string[] = Array.isArray(data.labels)
          ? data.labels
          : Array.isArray(data.timeline)
            ? data.timeline.map((t: any) => t.month || t.date)
            : [];

        const series: TrendPoint[] = points.map((val: number, i: number) => ({
          month: labels[i] ? labels[i].split(" ")[0] : `M${i + 1}`,
          fullDate: labels[i] || `Month ${i + 1}`,
          interest: val,
        }));

        setActiveData({
          keyword: data.keyword || query,
          interest: Math.round(Number(data.average_interest) || 50),
          label: data.trend_direction || "Stable Interest",
          source: data.source || "Google Trends (Live)",
          series,
        });
        setSelectedKey(data.keyword || query);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to query real-time market trends.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      navigate({ to: "/admin" });
      return;
    }
    // Check if user came from a saved custom search before signin
    const savedQuery = sessionStorage.getItem("antigravity.trend_query");
    if (savedQuery) {
      sessionStorage.removeItem("antigravity.trend_query");
      fetchTrend(savedQuery);
    } else {
      fetchTrend("AI Agents");
    }
  }, [user?.role]);

  const scope = useReveal<HTMLDivElement>([activeData?.keyword, loading]);

  const handleSelectPreset = (k: string) => {
    fetchTrend(k);
  };

  const handleSearchCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = customKey.trim();
    if (!query) return;

    if (!isAuthenticated) {
      // Save draft search and route to signup
      sessionStorage.setItem("antigravity.trend_query", query);
      toast.info(`Sign up to run custom queries for "${query}".`, {
        id: "auth-trend-redirect",
      });
      navigate({ to: "/auth", search: { redirect: "/trends", mode: "signup" } });
      return;
    }

    await fetchTrend(query);
    setCustomKey("");
  };

  return (
    <Page>
      <section ref={scope} className="mx-auto max-w-4xl px-5 py-20">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h1 className="font-display text-4xl">Market trends explorer.</h1>
            <p className="mt-2 text-muted-foreground">
              Real-time 12-month search momentum and market interest signals powered by live Google Trends.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-primary/20 bg-primary/5 px-3 py-1 font-mono text-xs text-primary sm:self-auto">
            <Activity className="size-3 animate-pulse" /> Live Telemetry
          </span>
        </div>

        {/* Guest Preview Notice */}
        {!isAuthenticated && (
          <div className="surface mt-6 flex flex-col items-start justify-between gap-4 border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">Viewing live market signals</p>
                <p className="text-xs text-muted-foreground">
                  Browse trending tech niches below. Create a free founder account to run custom queries.
                </p>
              </div>
            </div>
            <Link
              to="/auth"
              search={{ redirect: "/trends", mode: "signup" }}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-all hover:brightness-95 shrink-0"
            >
              Sign up <ArrowRight className="size-3" />
            </Link>
          </div>
        )}

        {/* Custom Search Box */}
        <form onSubmit={handleSearchCustom} className="relative mt-8">
          <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={customKey}
            onChange={(e) => setCustomKey(e.target.value)}
            placeholder={
              isAuthenticated
                ? "Search any market or niche (e.g. Agentic Workflows, Solar IoT)..."
                : "Search any market keyword (Sign up required to explore custom)..."
            }
            className="w-full rounded-full border border-input bg-card py-3 pr-28 pl-11 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
          <button
            type="submit"
            disabled={loading || !customKey.trim()}
            className="absolute top-1.5 right-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-all hover:brightness-95 disabled:opacity-40 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : !isAuthenticated ? (
              <>
                <Lock className="size-3" /> Explore
              </>
            ) : (
              "Explore"
            )}
          </button>
        </form>

        {/* Real Popular Trends */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground mr-1 flex items-center gap-1">
            <Sparkles className="size-3 text-primary" />
            Trending:
          </span>
          {POPULAR_TRENDS.map((k) => (
            <button
              key={k}
              type="button"
              disabled={loading}
              onClick={() => handleSelectPreset(k)}
              className={`rounded-full border px-3.5 py-1.5 text-xs transition-all duration-300 cursor-pointer ${
                k.toLowerCase() === selectedKey.toLowerCase()
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card hover:-translate-y-0.5 text-muted-foreground hover:text-foreground hover:border-primary/40"
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Results Card */}
        <div data-reveal className="surface mt-8 p-6 relative min-h-[380px]">
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-card/70 backdrop-blur-[2px]">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="mt-3 font-mono text-xs text-muted-foreground">
                Querying live Google Trends index...
              </p>
            </div>
          )}

          {activeData ? (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-4xl">{activeData.interest}</span>
                  <span className="font-display text-lg text-foreground">
                    "{activeData.keyword}"
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    avg relative search index
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {activeData.source}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs ${
                      activeData.label === "Rapidly Growing"
                        ? "border-success/30 bg-success/10 text-success"
                        : activeData.label === "Moderate Growth"
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : activeData.label === "Declining"
                            ? "border-destructive/30 bg-destructive/10 text-danger"
                            : "border-muted/30 bg-muted/20 text-muted-foreground"
                    }`}
                  >
                    {activeData.label}
                  </span>
                </div>
              </div>

              <div className="mt-6 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={activeData.series}
                    margin={{ left: -20, right: 8, top: 8 }}
                  >
                    <defs>
                      <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      stroke="var(--muted-foreground)"
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      stroke="var(--muted-foreground)"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const dataPoint = payload[0].payload as TrendPoint;
                          return (
                            <div className="surface rounded-xl border border-border bg-card p-3 shadow-xl text-xs">
                              <p className="font-medium text-foreground">{dataPoint.fullDate}</p>
                              <p className="mt-1 font-mono text-primary">
                                Search Interest: <span className="font-bold">{dataPoint.interest}/100</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="interest"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      dot={false}
                      fill="url(#tg)"
                      animationDuration={700}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </section>
    </Page>
  );
}
