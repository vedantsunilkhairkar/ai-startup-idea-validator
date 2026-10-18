import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Command,
  LogOut,
  Radar,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { adminApi, type AdminSummary, type AdminUser, type AdminValidation } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin intelligence — PitchProof" },
      { name: "description", content: "Platform analytics and founder activity." },
    ],
  }),
  component: Admin,
});

type Section = "overview" | "users" | "validations";
const PAGE_SIZE = 25;

function Admin() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("overview");
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [daily, setDaily] = useState<Array<{ date: string; count: number }>>([]);
  const [industries, setIndustries] = useState<Array<{ industry: string; count: number }>>([]);
  const [recent, setRecent] = useState<AdminValidation[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [validations, setValidations] = useState<AdminValidation[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate({ to: "/auth", search: { mode: "in", redirect: "/admin" } });
    } else if (user?.role !== "admin") {
      navigate({ to: "/workspace" });
    }
  }, [authLoading, isAuthenticated, user?.role, navigate]);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await adminApi.getOverview();
      setSummary(result.summary);
      setDaily(result.daily_validations);
      setIndustries(result.top_industries);
      setRecent(result.recent_validations);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load admin analytics.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role === "admin") void loadOverview();
  }, [authLoading, user?.role, loadOverview]);

  useEffect(() => {
    if (section === "overview" || user?.role !== "admin") return;
    setLoading(true);
    setError("");
    const timer = window.setTimeout(() => {
      const request = section === "users"
        ? adminApi.getUsers(query, offset, PAGE_SIZE)
        : adminApi.getValidations(query, offset, PAGE_SIZE);
      request
        .then((result) => {
          setTotalRows(result.total);
          if (section === "users") setUsers(result.data as AdminUser[]);
          else setValidations(result.data as AdminValidation[]);
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : "Could not load records.";
          setError(message);
          toast.error(message);
        })
        .finally(() => setLoading(false));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [section, query, offset, refreshTick, user?.role]);

  const selectSection = (next: Section) => {
    setSection(next);
    setOffset(0);
  };

  const openValidation = async (id: string) => {
    try {
      const result = await adminApi.getValidation(id);
      sessionStorage.setItem("antigravity.report", JSON.stringify(result));
      sessionStorage.setItem("antigravity.idea", JSON.stringify({
        title: result.title,
        idea: result.idea,
        industry: result.industry,
      }));
      navigate({ to: "/report" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load this startup report.");
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Signed out successfully");
    navigate({ to: "/" });
  };

  const pageLabel = totalRows ? `${offset + 1}–${Math.min(offset + PAGE_SIZE, totalRows)} of ${totalRows}` : "0 records";
  const refresh = () => {
    if (section === "overview") void loadOverview();
    else setRefreshTick((value) => value + 1);
  };

  if (authLoading || !isAuthenticated || user?.role !== "admin") {
    return <div className="flex min-h-screen items-center justify-center bg-[#f3f5ef] text-sm text-muted-foreground">Opening the admin workspace…</div>;
  }

  return (
    <div className="min-h-screen bg-[#f3f5ef] text-[#203229] lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="relative z-20 flex flex-col bg-[#14261e] text-[#f0f3e9] lg:sticky lg:top-0 lg:h-screen lg:self-start">
        <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-5 sm:px-7 lg:px-6">
          <button onClick={() => selectSection("overview")} className="flex items-center gap-3 text-left">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#a8d7b1] text-[#15281f]"><Sparkles className="size-4" /></span>
            <span><span className="block font-display text-lg leading-none">PitchProof</span><span className="mt-1 block text-[9px] uppercase tracking-[0.2em] text-white/45">Control room</span></span>
          </button>
          <div className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 font-mono text-[10px] text-white/45 lg:hidden"><Command className="size-3" /> ADMIN</div>
        </div>
        <div className="hidden flex-1 flex-col px-4 pt-8 lg:flex">
          <p className="px-3 font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">Workspace</p>
          <nav className="mt-3 space-y-1">
            <SideNav active={section === "overview"} icon={<BarChart3 />} label="Overview" onClick={() => selectSection("overview")} />
            <SideNav active={section === "users"} icon={<Users />} label="People" onClick={() => selectSection("users")} badge={summary ? String(summary.total_users) : undefined} />
            <SideNav active={section === "validations"} icon={<ClipboardList />} label="Idea analyses" onClick={() => selectSection("validations")} />
          </nav>
          <div className="mt-auto mb-5 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <div className="flex items-center gap-2 text-xs font-medium"><ShieldCheck className="size-4 text-[#a8d7b1]" /> Admin access</div>
            <p className="mt-2 break-all text-[10px] leading-4 text-white/45">{user?.email}</p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-[#a8d7b1]"><span className="size-1.5 rounded-full bg-[#a8d7b1]" /> Private operations</p>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto border-t border-white/10 px-3 py-2 lg:hidden">
          <MobileNav active={section === "overview"} icon={<BarChart3 />} label="Overview" onClick={() => selectSection("overview")} />
          <MobileNav active={section === "users"} icon={<Users />} label="People" onClick={() => selectSection("users")} />
          <MobileNav active={section === "validations"} icon={<ClipboardList />} label="Analyses" onClick={() => selectSection("validations")} />
        </div>
        <button onClick={handleLogout} className="hidden h-[58px] items-center gap-3 border-t border-white/10 px-7 text-xs text-white/60 transition-colors hover:bg-white/5 hover:text-white lg:flex"><LogOut className="size-4" /> Sign out</button>
      </aside>

      <main className="min-w-0 px-4 pb-12 sm:px-7 lg:px-10">
        <header className="flex min-h-[76px] items-center justify-between border-b border-[#dfe5da]">
          <div><div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#6f8074]">PitchProof / Admin</div><h1 className="mt-1 font-display text-xl sm:text-2xl">{section === "overview" ? "Platform overview" : section === "users" ? "Founder directory" : "Idea analyses"}</h1></div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} className="flex size-9 items-center justify-center rounded-full border border-[#dfe5da] bg-white text-[#6f8074] transition hover:text-[#203229]" aria-label="Refresh analytics"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></button>
            <div className="hidden items-center gap-2 rounded-full border border-[#dfe5da] bg-white px-3 py-1.5 sm:flex"><span className="flex size-6 items-center justify-center rounded-full bg-[#e4efe4] text-[10px] font-semibold text-[#315c42]">{user?.name?.[0]?.toUpperCase() || "A"}</span><span className="max-w-36 truncate text-xs font-medium">{user?.name || "Administrator"}</span></div>
            <button onClick={handleLogout} className="flex size-9 items-center justify-center rounded-full border border-[#dfe5da] bg-white text-[#6f8074] lg:hidden" aria-label="Sign out"><LogOut className="size-4" /></button>
          </div>
        </header>

        {section === "overview" ? (
          <div className="mx-auto max-w-[1420px] pt-7">
            <div className="relative overflow-hidden rounded-[1.65rem] bg-[#203b2e] p-6 text-[#f3f5ef] sm:p-8">
              <div className="absolute -right-8 -top-28 size-72 rounded-full border border-white/10" /><div className="absolute -right-1 -top-20 size-56 rounded-full border border-white/10" />
              <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                <div><div className="inline-flex items-center gap-2 rounded-full border border-[#b8e1c1]/20 bg-[#b8e1c1]/10 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[#b8e1c1]"><span className="size-1.5 animate-pulse rounded-full bg-[#b8e1c1]" /> Platform pulse</div><h2 className="mt-4 max-w-xl font-display text-3xl leading-tight sm:text-4xl">The signal behind every founder decision.</h2><p className="mt-2 max-w-xl text-xs leading-5 text-white/55 sm:text-sm">A live read on who is building, what they are exploring and how the validation engine is performing.</p></div>
                <div className="shrink-0 text-left sm:text-right"><div className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">Today · local time</div><div className="mt-1 flex items-center gap-2 text-sm text-white/85 sm:justify-end"><CalendarDays className="size-4 text-[#b8e1c1]" />{new Intl.DateTimeFormat("en-IN", { dateStyle: "full" }).format(new Date())}</div></div>
              </div>
            </div>

            {error && <InlineError message={error} onRetry={() => void loadOverview()} />}
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Total accounts" value={summary?.total_users} detail={`${summary?.admin_users ?? 0} admin account${summary?.admin_users === 1 ? "" : "s"} included`} icon={<Users />} accent="sage" loading={loading && !summary} />
              <MetricCard label="Idea analyses" value={summary?.total_validations} detail={`${summary?.validations_7d ?? 0} submitted this week`} icon={<Radar />} accent="amber" loading={loading && !summary} />
              <MetricCard label="Active founders" value={summary?.active_users_30d} detail="Validated an idea in 30 days" icon={<Activity />} accent="blue" loading={loading && !summary} />
              <MetricCard label="Average score" value={summary ? `${summary.average_score}` : undefined} detail="Across all validation reports" icon={<TrendingIcon />} accent="rose" loading={loading && !summary} />
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[1.65fr_0.85fr]">
              <section className="rounded-[1.4rem] border border-[#e0e6dc] bg-white p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4"><div><h3 className="font-display text-lg">Validation activity</h3><p className="mt-1 text-xs text-[#7b897e]">Daily submissions · last 14 days</p></div><div className="rounded-full bg-[#eaf2e9] px-3 py-1.5 font-mono text-[10px] text-[#3b714e]">{summary?.validations_30d ?? 0} / 30d</div></div>
                <div className="mt-5 h-[230px] w-full">
                  {daily.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={daily} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}><defs><linearGradient id="adminActivityFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#4c9063" stopOpacity={0.25} /><stop offset="100%" stopColor="#4c9063" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="#edf0eb" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} axisLine={false} tickLine={false} tick={{ fill: "#89958b", fontSize: 10 }} dy={10} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#89958b", fontSize: 10 }} /><Tooltip labelFormatter={(value) => new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} contentStyle={{ border: "1px solid #e3e8df", borderRadius: 12, fontSize: 12, boxShadow: "0 8px 30px #20322912" }} /><Area type="monotone" dataKey="count" name="Analyses" stroke="#4c9063" strokeWidth={2.5} fill="url(#adminActivityFill)" activeDot={{ r: 5, strokeWidth: 0 }} /></AreaChart></ResponsiveContainer> : <ChartEmpty loading={loading} />}
                </div>
              </section>
              <section className="rounded-[1.4rem] border border-[#e0e6dc] bg-white p-5 sm:p-6">
                <div><h3 className="font-display text-lg">Popular industries</h3><p className="mt-1 text-xs text-[#7b897e]">Where founders are exploring</p></div>
                <div className="mt-5 h-[230px] w-full">{industries.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={industries} layout="vertical" margin={{ top: 2, right: 10, bottom: 2, left: 0 }}><CartesianGrid stroke="#edf0eb" strokeDasharray="3 5" horizontal={false} /><XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#89958b", fontSize: 10 }} /><YAxis type="category" dataKey="industry" width={98} axisLine={false} tickLine={false} tick={{ fill: "#5d6d61", fontSize: 10 }} /><Tooltip cursor={{ fill: "#f4f7f2" }} contentStyle={{ border: "1px solid #e3e8df", borderRadius: 12, fontSize: 12 }} /><Bar dataKey="count" name="Analyses" fill="#5d9a6e" radius={[0, 6, 6, 0]} barSize={17} /></BarChart></ResponsiveContainer> : <ChartEmpty loading={loading} />}</div>
              </section>
            </div>

            <section className="mt-5 overflow-hidden rounded-[1.4rem] border border-[#e0e6dc] bg-white">
              <div className="flex items-center justify-between border-b border-[#edf0eb] px-5 py-4 sm:px-6"><div><h3 className="font-display text-lg">Latest idea analyses</h3><p className="mt-1 text-xs text-[#7b897e]">Recent founder research submissions</p></div><button onClick={() => selectSection("validations")} className="inline-flex items-center gap-1.5 text-xs font-medium text-[#3b714e] hover:text-[#203b2e]">All analyses <ArrowRight className="size-3.5" /></button></div>
              <div className="divide-y divide-[#edf0eb]">{recent.length ? recent.slice(0, 6).map((item) => <ValidationRow key={item.id} item={item} compact onToggle={() => void openValidation(item.id)} />) : <ChartEmpty loading={loading} />}</div>
            </section>
          </div>
        ) : (
          <div className="mx-auto max-w-[1420px] pt-7">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#748479]">Directory / {section === "users" ? "People" : "Analyses"}</div><h2 className="mt-2 font-display text-3xl">{section === "users" ? "Every founder, in view." : "Every idea, in context."}</h2><p className="mt-2 max-w-xl text-sm text-[#748479]">{section === "users" ? "Account activity, signup dates and validation history across the platform." : "Search the startup concepts submitted to PitchProof and inspect each analysis."}</p></div><div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#829086]">{totalRows.toLocaleString()} records</div></div>
            <div className="relative mt-6 max-w-xl"><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#8b988e]" /><input value={query} onChange={(event) => { setQuery(event.target.value); setOffset(0); }} placeholder={section === "users" ? "Search founder name or email…" : "Search idea, market, name or email…"} className="w-full rounded-full border border-[#dfe5da] bg-white py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-[#649676] focus:ring-4 focus:ring-[#649676]/10" /></div>
            {error && <InlineError message={error} onRetry={() => setOffset((n) => n)} />}
            <section className="mt-5 overflow-hidden rounded-[1.4rem] border border-[#e0e6dc] bg-white">
              <div className="overflow-x-auto">
                {section === "users" ? <UsersTable rows={users} loading={loading} /> : <ValidationsTable rows={validations} loading={loading} onToggle={(id) => void openValidation(id)} />}
              </div>
              <div className="flex items-center justify-between border-t border-[#edf0eb] px-4 py-3 sm:px-6"><span className="font-mono text-[10px] text-[#839087]">{pageLabel}</span><div className="flex gap-2"><button disabled={offset === 0 || loading} onClick={() => setOffset((n) => Math.max(0, n - PAGE_SIZE))} className="flex size-8 items-center justify-center rounded-full border border-[#dfe5da] disabled:opacity-30" aria-label="Previous page"><ChevronLeft className="size-4" /></button><button disabled={offset + PAGE_SIZE >= totalRows || loading} onClick={() => setOffset((n) => n + PAGE_SIZE)} className="flex size-8 items-center justify-center rounded-full border border-[#dfe5da] disabled:opacity-30" aria-label="Next page"><ChevronRight className="size-4" /></button></div></div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function SideNav({ active, icon, label, onClick, badge }: { active: boolean; icon: ReactNode; label: string; onClick: () => void; badge?: string | undefined }) {
  return <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs transition-colors ${active ? "bg-[#a8d7b1] text-[#183122]" : "text-white/60 hover:bg-white/[0.06] hover:text-white"}`}><span className="[&>svg]:size-4">{icon}</span><span className="flex-1">{label}</span>{badge && <span className={`font-mono text-[9px] ${active ? "text-[#315c42]" : "text-white/35"}`}>{badge}</span>}</button>;
}

function MobileNav({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button onClick={onClick} className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-[10px] ${active ? "bg-[#a8d7b1] text-[#183122]" : "text-white/65"}`}><span className="[&>svg]:size-3.5">{icon}</span>{label}</button>;
}

function MetricCard({ label, value, detail, icon, accent, loading }: { label: string; value: string | number | undefined; detail: string; icon: ReactNode; accent: string; loading: boolean }) {
  const tone: Record<string, string> = { sage: "bg-[#eaf2e9] text-[#477855]", amber: "bg-[#f8f0df] text-[#a8752f]", blue: "bg-[#e7eff0] text-[#47737a]", rose: "bg-[#f5e8e2] text-[#a2614c]" };
  return <div className="rounded-[1.2rem] border border-[#e0e6dc] bg-white p-4 sm:p-5"><div className="flex items-center justify-between"><span className="text-[11px] font-medium text-[#738176]">{label}</span><span className={`flex size-8 items-center justify-center rounded-lg ${tone[accent]} [&>svg]:size-4`}>{icon}</span></div><div className="mt-4 font-display text-3xl tracking-tight">{loading ? <span className="inline-block h-8 w-20 animate-pulse rounded-md bg-[#edf0eb]" /> : value ?? "—"}</div><div className="mt-1 text-[10px] text-[#879389]">{detail}</div></div>;
}

function ValidationRow({ item, compact = false, onToggle }: { item: AdminValidation; compact?: boolean; onToggle: () => void }) {
  return <button onClick={onToggle} className={`block w-full text-left transition-colors hover:bg-[#f8faf6] ${compact ? "px-5 py-3.5 sm:px-6" : "px-4 py-4 sm:px-6"}`} aria-label={`Open generated report for ${item.title}`}>
    <div className="grid items-center gap-3 md:grid-cols-[minmax(180px,1.25fr)_minmax(150px,1fr)_100px_125px]">
      <div className="min-w-0"><div className="truncate text-xs font-semibold">{item.title}</div><div className="mt-1 truncate text-[10px] text-[#89958b]">{item.industry} · {dateText(item.created_at)}</div></div>
      <div className="min-w-0"><div className="truncate text-[10px] font-medium">{item.user_name}</div><div className="mt-1 truncate text-[10px] text-[#89958b]">{item.user_email || "No account"}</div></div>
      <div><span className="rounded-full bg-[#eaf2e9] px-2.5 py-1 font-mono text-[10px] text-[#3b714e]">{item.validation_score ?? "—"}<span className="text-[#859488]"> / 100</span></span></div>
      <div className="text-[10px] text-[#6f8074]">{item.launch_readiness_verdict || "—"}</div>
    </div>
    <div className="mt-2 text-[9px] font-medium text-[#477855]">Open full startup report <ArrowRight className="ml-1 inline size-3" /></div>
  </button>;
}

function UsersTable({ rows, loading }: { rows: AdminUser[]; loading: boolean }) {
  if (loading && !rows.length) return <TableLoading />;
  if (!rows.length) return <TableEmpty label="No founder accounts match this search." />;
  return <table className="w-full min-w-[760px] text-left"><thead className="bg-[#f8faf6] text-[9px] uppercase tracking-[0.15em] text-[#829086]"><tr><th className="px-5 py-2.5 font-medium sm:px-6">Founder</th><th className="px-4 py-2.5 font-medium">Joined</th><th className="px-4 py-2.5 font-medium">Last login</th><th className="px-4 py-2.5 font-medium">Analyses</th><th className="px-4 py-2.5 font-medium">Role</th></tr></thead><tbody className="divide-y divide-[#edf0eb]">{rows.map((row) => <tr key={row.id} className="hover:bg-[#fbfcfa]"><td className="px-5 py-2.5 sm:px-6"><div className="flex items-center gap-2.5"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eaf2e9] font-display text-xs text-[#3b714e]">{row.name?.[0]?.toUpperCase() || "?"}</span><span className="min-w-0"><span className="block truncate text-xs font-semibold">{row.name || "Unnamed founder"}</span><span className="mt-0.5 block truncate text-[10px] text-[#89958b]">{row.email}</span></span></div></td><td className="px-4 py-2.5 text-[10px] text-[#66766b]">{dateText(row.created_at)}</td><td className="px-4 py-2.5 text-[10px] text-[#66766b]">{dateText(row.last_login_at, "Never")}</td><td className="px-4 py-2.5"><span className="rounded-full bg-[#f1f5ef] px-2.5 py-1 font-mono text-[10px]">{row.validation_count}</span><span className="mt-0.5 block text-[9px] leading-3 text-[#89958b]">Last: {dateText(row.last_validation_at, "none")}</span></td><td className="px-4 py-2.5"><span className={`rounded-full px-2.5 py-1 text-[9px] uppercase tracking-wider ${row.role === "admin" ? "bg-[#e7eff0] text-[#47737a]" : "bg-[#f1f5ef] text-[#758379]"}`}>{row.role}</span></td></tr>)}</tbody></table>;
}

function ValidationsTable({ rows, loading, onToggle }: { rows: AdminValidation[]; loading: boolean; onToggle: (id: string) => void }) {
  if (loading && !rows.length) return <TableLoading />;
  if (!rows.length) return <TableEmpty label="No analyses match this search." />;
  return <div className="min-w-[760px]"><div className="grid grid-cols-[minmax(180px,1.25fr)_minmax(150px,1fr)_100px_125px] gap-3 bg-[#f8faf6] px-4 py-3 text-[9px] uppercase tracking-[0.15em] text-[#829086] sm:px-6"><span>Idea / market</span><span>Founder</span><span>Score</span><span>Verdict</span></div><div className="divide-y divide-[#edf0eb]">{rows.map((item) => <ValidationRow key={item.id} item={item} onToggle={() => onToggle(item.id)} />)}</div></div>;
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-[#e7c3b7] bg-[#fff6f1] px-4 py-3 text-xs text-[#89523f]"><span>{message}</span><button onClick={onRetry} className="shrink-0 underline underline-offset-2">Retry</button></div>;
}

function ChartEmpty({ loading }: { loading: boolean }) {
  return <div className="flex h-full min-h-24 items-center justify-center text-xs text-[#879389]">{loading ? "Loading analytics…" : "No activity to chart yet."}</div>;
}

function TableLoading() {
  return <div className="space-y-3 p-6">{[0, 1, 2, 3].map((row) => <div key={row} className="h-12 animate-pulse rounded-lg bg-[#f2f5f0]" />)}</div>;
}

function TableEmpty({ label }: { label: string }) {
  return <div className="p-12 text-center text-sm text-[#879389]">{label}</div>;
}

function dateText(value?: string, empty = "—") {
  if (!value) return empty;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? empty : date.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

function TrendingIcon() {
  return <TrendingUp className="size-4" />;
}
