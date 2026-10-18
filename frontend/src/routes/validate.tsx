import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Page } from "@/components/Page";
import { AGENTS } from "@/data/report";
import { gsap } from "@/lib/anim";
import { validationApi, type ValidationResultData } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { consumeValidationIntent } from "@/lib/validation-intent";

export const Route = createFileRoute("/validate")({
  head: () => ({
    meta: [
      { title: "Running the agents — PitchProof" },
      { name: "description", content: "Live progress as six research agents work through your idea." },
      { property: "og:title", content: "Running the agents — PitchProof" },
      { property: "og:description", content: "Live multi-agent validation progress." },
    ],
  }),
  component: Validate,
});

function Validate() {
  const [step, setStep] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const scope = useRef<HTMLDivElement>(null);
  const apiResultRef = useRef<ValidationResultData | null>(null);

  const [agentStatusNotes, setAgentStatusNotes] = useState<Record<number, string>>({});

  // Timer counter
  useEffect(() => {
    if (error || isDone) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [error, isDone]);

  // Execute Agent Pipeline via real-time SSE
  const runValidation = async () => {
    setError(null);
    setStep(0);
    setSeconds(0);
    setIsDone(false);
    setAgentStatusNotes({});

    let rawIdea: string | null = null;
    try {
      rawIdea = sessionStorage.getItem("antigravity.idea");
    } catch {
      // ignore
    }

    if (!rawIdea) {
      toast.error("No idea found. Please describe your venture first.");
      navigate({ to: "/workspace" });
      return;
    }

    let parsed: { title?: string; idea: string; industry?: string };
    try {
      parsed = JSON.parse(rawIdea);
    } catch {
      toast.error("Invalid idea format. Please start over.");
      navigate({ to: "/workspace" });
      return;
    }

    try {
      const finalResult = await validationApi.validateStream(
        {
          title: parsed.title,
          idea: parsed.idea,
          industry: parsed.industry,
        },
        (progress) => {
          if (progress.step !== undefined) {
            setStep(progress.step);
          }
          if (progress.message && progress.step !== undefined) {
            setAgentStatusNotes((prev) => ({
              ...prev,
              [progress.step! - 1]: progress.message!,
            }));
          }
        }
      );

      apiResultRef.current = finalResult;
      sessionStorage.setItem("antigravity.report", JSON.stringify(finalResult));

      // Complete all steps
      setStep(AGENTS.length);
      setIsDone(true);

      setTimeout(() => {
        toast.success("Validation report generated!");
        navigate({ to: "/report" });
      }, 900);
    } catch (err: any) {
      try { sessionStorage.removeItem("antigravity.report"); } catch { /* ignore */ }
      setError(err.message || "Multi-agent evaluation encountered an error.");
      toast.error(err.message || "Failed to validate startup idea.");
    }
  };

  const hasRedirectedRef = useRef(false);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (user?.role === "admin") {
      navigate({ to: "/admin" });
      return;
    }
    if (!isAuthenticated) {
      if (!hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        toast.info("Please sign in or create an account to run the validation engine.", {
          id: "auth-validate-redirect",
        });
        navigate({ to: "/auth", search: { redirect: "/validate" } });
      }
      return;
    }
    if (hasStartedRef.current) return;
    if (!consumeValidationIntent()) {
      navigate({ to: "/workspace" });
      return;
    }
    hasStartedRef.current = true;
    runValidation();
  }, [isAuthenticated, authLoading, user?.role]);

  // Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".agent-row", { opacity: 0, y: 18, duration: 0.7, stagger: 0.08, ease: "power3.out" });
    }, scope);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    gsap.to(".progress-bar", {
      width: `${(Math.min(step, AGENTS.length) / AGENTS.length) * 100}%`,
      duration: 0.8,
      ease: "power2.out",
    });
  }, [step]);

  return (
    <Page>
      <section ref={scope} className="mx-auto max-w-3xl px-5 py-20">
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-4xl">
            {error ? "Analysis interrupted." : isDone ? "All agents completed." : "Working through it."}
          </h1>
          <span className="font-mono text-sm text-muted-foreground">{seconds}s elapsed</span>
        </div>

        <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={`progress-bar h-full w-0 rounded-full transition-colors ${error ? "bg-danger" : "bg-primary"
              }`}
          />
        </div>

        {error ? (
          <div className="surface mt-8 border-danger/30 bg-danger/5 p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="size-6 shrink-0 text-danger" />
              <div className="flex-1">
                <h3 className="font-medium text-danger">
                  {error.toLowerCase().includes("guardrail") ||
                    error.toLowerCase().includes("pitch") ||
                    error.toLowerCase().includes("input") ||
                    error.toLowerCase().includes("unrecognizable") ||
                    error.toLowerCase().includes("words")
                    ? "Pitch Guardrail Alert"
                    : "Validation Pipeline Error"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={runValidation}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:brightness-95"
                  >
                    <RefreshCw className="size-4" /> Try again
                  </button>
                  <Link
                    to="/workspace"
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm transition-colors hover:bg-accent"
                  >
                    <ArrowLeft className="size-4" /> Edit pitch
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ol className="mt-10 space-y-3">
            {AGENTS.map((a, i) => {
              const done = i < step;
              const active = i === step && !isDone && !error;
              return (
                <li
                  key={a.name}
                  className={`agent-row surface flex items-start gap-4 p-5 transition-all duration-500 ${active ? "border-primary/40 bg-accent/15 shadow-sm" : done ? "" : "opacity-50"
                    }`}
                >
                  <span
                    className={`relative mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-mono font-medium ${done
                        ? "border-success/40 bg-success/10 text-success"
                        : active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground"
                      }`}
                  >
                    {active && (
                      <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
                    )}
                    {done ? <Check className="size-4" /> : i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{a.name} Agent</p>
                      {active && (
                        <span className="text-xs font-mono text-primary animate-pulse font-medium">Running...</span>
                      )}
                      {done && (
                        <span className="text-xs font-mono text-success font-medium">Completed</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {agentStatusNotes[i] || a.note}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </Page>
  );
}
