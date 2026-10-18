import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Search, Trash2, Loader2, Sparkles, ArrowRight, Lock, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/Page";
import { VerdictPill } from "@/components/Verdict";
import { useReveal } from "@/lib/anim";
import { useAuth } from "@/lib/auth";
import { validationApi, type ValidationResultData } from "@/lib/api";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Past validations — PitchProof" },
      { name: "description", content: "Every idea you have validated, scored and archived." },
      { property: "og:title", content: "Past validations — PitchProof" },
      { property: "og:description", content: "Your archive of scored startup ideas." },
    ],
  }),
  component: History,
});

interface DisplayHistoryItem {
  id: string;
  title: string;
  date: string;
  score: number;
  verdict: any;
  industry: string;
  raw?: ValidationResultData;
}

function History() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<DisplayHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const hasRedirectedRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user?.role === "admin") {
      navigate({ to: "/admin" });
    } else if (!authLoading && !isAuthenticated && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      toast.info("Please sign in or create an account to view past validations.", {
        id: "auth-history-redirect",
      });
      navigate({ to: "/auth", search: { redirect: "/history" } });
    }
  }, [isAuthenticated, authLoading, user?.role, navigate]);

  useEffect(() => {
    if (!isAuthenticated || user?.role === "admin") {
      setItems([]);
      return;
    }

    setLoading(true);
    validationApi
      .getIdeas()
      .then((res) => {
        if (res.data && res.data.length > 0) {
          const mapped: DisplayHistoryItem[] = res.data.map((item) => {
            const d = item.created_at ? new Date(item.created_at) : new Date();
            const dateStr = d.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            return {
              id: item.id,
              title: item.title || "Startup Idea",
              date: dateStr,
              score: item.validation_score || 70,
              verdict: (item.launch_readiness_verdict as any) || "Requires Refinement",
              industry: item.industry || "General",
              raw: item,
            };
          });
          setItems(mapped);
        } else {
          setItems([]);
        }
      })
      .catch((err) => {
        toast.error(err.message || "Could not load validation history.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isAuthenticated, user?.role]);

  const filtered = items.filter((i) =>
    `${i.title} ${i.industry}`.toLowerCase().includes(q.toLowerCase())
  );
  const scope = useReveal<HTMLDivElement>([filtered.length, loading]);

  const handleSelectIdea = (item: DisplayHistoryItem) => {
    if (item.raw) {
      sessionStorage.setItem("antigravity.report", JSON.stringify(item.raw));
      sessionStorage.setItem(
        "antigravity.idea",
        JSON.stringify({
          title: item.title,
          idea: item.raw.idea,
          industry: item.raw.industry,
        })
      );
    }
    navigate({ to: "/report" });
  };

  const handleDelete = async (e: React.MouseEvent, item: DisplayHistoryItem) => {
    e.stopPropagation();
    if (!isAuthenticated) return;

    try {
      await validationApi.deleteIdea(item.id);
      toast.success(`Removed "${item.title}"`);
      setItems((prev) => prev.filter((x) => x.id !== item.id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete idea.");
    }
  };

  if (!authLoading && !isAuthenticated) {
    return (
      <Page>
        <section className="mx-auto max-w-xl px-5 py-28 text-center">
          <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Lock className="size-7" />
          </div>
          <h1 className="font-display text-3xl">Authentication Required</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your past validations archive is securely linked to your account. Please sign in or create an account to view and manage your validated startup ideas.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <button
              onClick={() => navigate({ to: "/auth", search: { redirect: "/history" } })}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:brightness-95 cursor-pointer"
            >
              Sign in to view archive
              <ArrowRight className="size-4" />
            </button>
          </div>
        </section>
      </Page>
    );
  }

  return (
    <Page>
      <section ref={scope} className="mx-auto max-w-4xl px-5 py-20">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <h1 className="font-display text-4xl">Past validations.</h1>
          <span className="font-mono text-xs text-muted-foreground">
            {items.length === 1 ? "1 saved validation" : `${items.length} saved validations`} in database
          </span>
        </div>

        <div className="relative mt-8">
          <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by venture name or industry"
            className="w-full rounded-full border border-input bg-card py-3 pr-4 pl-11 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {filtered.map((i) => (
              <div
                key={i.id}
                data-reveal
                onClick={() => handleSelectIdea(i)}
                className="surface flex cursor-pointer flex-wrap items-center gap-4 p-5 transition-transform duration-300 hover:-translate-y-0.5"
              >
                <span className="font-mono text-2xl">{i.score}</span>
                <div className="min-w-40 flex-1">
                  <span className="font-medium hover:text-primary transition-colors">
                    {i.title}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {i.date} · {i.industry}
                  </p>
                </div>
                <VerdictPill verdict={i.verdict} />
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, i)}
                  aria-label={`Delete ${i.title}`}
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-danger"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="surface mt-6 flex flex-col items-center justify-center p-12 text-center">
                {items.length === 0 ? (
                  <>
                    <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Sparkles className="size-6" />
                    </div>
                    <h3 className="font-display text-lg">No saved validations yet</h3>
                    <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                      Validate your first startup idea to generate an investor-grade report and automatically store it in your archive.
                    </p>
                    <Link
                      to="/workspace"
                      className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-medium text-primary-foreground transition-all hover:brightness-95"
                    >
                      <PlusCircle className="size-4" />
                      Validate an idea now
                    </Link>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No validations match your search filter.</p>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </Page>
  );
}
