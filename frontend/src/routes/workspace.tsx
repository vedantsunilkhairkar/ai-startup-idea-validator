import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/Page";
import { INDUSTRIES, SAMPLES } from "@/data/report";
import { gsap, useReveal } from "@/lib/anim";
import { useAuth } from "@/lib/auth";
import { markValidationIntent } from "@/lib/validation-intent";
import { motion, Reveal } from "@/components/motion";

export const Route = createFileRoute("/workspace")({
  head: () => ({
    meta: [
      { title: "Founder workspace — PitchProof" },
      {
        name: "description",
        content: "Start a new startup idea validation from your PitchProof workspace.",
      },
      { property: "og:title", content: "Founder workspace — PitchProof" },
      {
        property: "og:description",
        content: "Your private workspace for startup validation.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const scope = useReveal<HTMLDivElement>();
  const heroRef = useRef<HTMLDivElement>(null);
  const pitchRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const reduceMotion = useReducedMotion();

  const [title, setTitle] = useState("");
  const [idea, setIdea] = useState("");
  const [industry, setIndustry] = useState("");


  useEffect(() => {
    if (authLoading) return;
    if (user?.role === "admin") {
      navigate({ to: "/admin" });
    } else if (!isAuthenticated) {
      navigate({ to: "/auth", search: { redirect: "/workspace", mode: "signup" } });
    }
  }, [authLoading, isAuthenticated, user?.role, navigate]);


  useEffect(() => {
    if (reduceMotion) return;
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(".pitch-card", { y: 28, opacity: 0, scale: 0.985, duration: 0.9 });
    }, heroRef);
    return () => ctx.revert();
  }, [reduceMotion]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    // Preserve whatever input was typed so far
    if (idea.trim().length > 0 || title.trim().length > 0 || industry) {
      sessionStorage.setItem(
        "antigravity.idea",
        JSON.stringify({ title, idea, industry }),
      );
    }

    // Check if user is signed in
    if (!isAuthenticated) {
      if (idea.trim().length >= 5) markValidationIntent();
      toast.info("Please sign in or create an account to run the validation engine.", {
        id: "auth-engine-redirect",
      });
      navigate({
        to: "/auth",
        search: { redirect: idea.trim().length >= 5 ? "/validate" : "/workspace" },
      });
      return;
    }

    // Guardrail: Validate pitch quality before running the multi-agent engine
    const trimmedIdea = idea.trim();
    if (trimmedIdea.length < 15) {
      toast.error("Please enter a more descriptive elevator pitch (at least 15 characters).");
      pitchRef.current?.focus();
      return;
    }

    const words = trimmedIdea.split(/\s+/).filter(Boolean);
    if (words.length < 3) {
      toast.error("Please describe your idea with at least 3 distinct words explaining the product or problem.");
      pitchRef.current?.focus();
      return;
    }

    // Check for environment variables, credentials, or config dumps
    const envPattern = /^[A-Za-z0-9_.-]+\s*=/m;
    const equalCount = (trimmedIdea.match(/=/g) || []).length;
    if (envPattern.test(trimmedIdea) && equalCount >= 2) {
      toast.error("Input looks like environment variables or configuration code. Please describe a genuine startup idea.");
      pitchRef.current?.focus();
      return;
    }

    // Check for keyboard mashing or excessive character repetition
    if (/(.)\1{4,}/.test(trimmedIdea)) {
      toast.error("Input contains excessive repeated characters. Please enter a genuine startup concept.");
      pitchRef.current?.focus();
      return;
    }

    markValidationIntent();
    navigate({ to: "/validate" });
  };

  return (
    <Page>
      <div ref={(node) => { scope.current = node; heroRef.current = node; }} className="relative isolate min-h-[calc(100vh-4rem)] overflow-hidden bg-[#f4f5ef] pb-14">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[520px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(70,130,88,0.13),transparent_70%)]" />
        <section className="relative mx-auto max-w-6xl px-5 pt-7 md:pt-10">
          <div className="workspace-hero relative isolate overflow-hidden rounded-[2rem] bg-[#15291f] px-6 py-6 text-[#f4f5ed] shadow-[0_28px_80px_-40px_rgba(17,43,32,0.58)] sm:px-9 sm:py-7 lg:px-12 lg:py-8">
            <div className="pointer-events-none absolute right-[-6rem] top-[-11rem] z-0 size-[440px] rounded-full border border-white/[0.08]" />
            <div className="pointer-events-none absolute right-[-1.5rem] top-[-8rem] z-0 size-[330px] rounded-full border border-white/[0.08]" />
            <div className="pointer-events-none absolute right-16 -bottom-64 z-0 size-[420px] rounded-full bg-[#78b58c]/10 blur-3xl" />
            <div className="relative z-10 grid items-center gap-6 sm:grid-cols-[1fr_210px] lg:grid-cols-[1fr_260px]">
              <Reveal y={14} className="workspace-copy relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#a8d7b1]/20 bg-[#a8d7b1]/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[#b8e1c1]"><span className="size-1.5 rounded-full bg-[#a8d7b1]" /> New idea</div>
                <h1 className="mt-4 max-w-xl font-display text-3xl leading-[1.02] tracking-[-0.04em] sm:text-4xl lg:text-[2.85rem]">Start with an idea.<br /><span className="text-[#a8d7b1]">Leave with a signal.</span></h1>
                <p className="mt-3 text-sm text-white/60 sm:text-[15px]">Demand, competition, and risk—before you build.</p>
              </Reveal>
              <motion.div className="relative mx-auto hidden size-44 items-center justify-center sm:flex lg:size-52" aria-hidden="true" animate={reduceMotion ? undefined : { y: [0, -6, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
                <motion.div className="absolute inset-1 rounded-full border border-dashed border-[#a8d7b1]/25" animate={reduceMotion ? undefined : { rotate: 360 }} transition={{ duration: 36, repeat: Infinity, ease: "linear" }} />
                <div className="absolute inset-7 rounded-full border border-white/10" />
                <div className="absolute inset-14 rounded-full border border-[#a8d7b1]/20" />
                <svg viewBox="0 0 120 120" className="relative z-10 size-28 overflow-visible lg:size-32">
                  <path d="M12 86 C28 80, 31 63, 46 68 S66 78, 77 49 S96 55, 108 25" fill="none" stroke="#a8d7b1" strokeWidth="3" strokeLinecap="round" />
                  <path d="M12 86 C28 80, 31 63, 46 68 S66 78, 77 49 S96 55, 108 25 L108 108 L12 108Z" fill="url(#workspaceSignal)" opacity=".45" />
                  <defs><linearGradient id="workspaceSignal" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#a8d7b1" /><stop offset="100%" stopColor="#a8d7b1" stopOpacity="0" /></linearGradient></defs>
                  <circle cx="108" cy="25" r="4" fill="#e2f4e4" />
                </svg>
                <span className="absolute right-5 top-8 size-2 rounded-full bg-[#c9ebcf] shadow-[0_0_18px_5px_rgba(168,215,177,.45)]" />
              </motion.div>
            </div>
          </div>
        </section>

        <section className="relative mx-auto max-w-5xl px-5">
          <form onSubmit={submit} className="pitch-card surface grain relative -mt-5 overflow-hidden rounded-[1.75rem] border border-[#dfe6dc] bg-[#fbfcf8] p-5 shadow-[0_28px_70px_-45px_rgba(23,53,39,0.35)] sm:-mt-7 sm:p-8 lg:p-10">
            <div className="relative z-10">
              <div className="mb-6 flex items-center gap-3 border-b border-border/70 pb-5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="size-5" /></span>
                <div><div className="font-display text-xl sm:text-2xl">Your startup</div><div className="mt-0.5 text-xs text-muted-foreground">Add a name, market, and short pitch.</div></div>
              </div>

              <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
                <Field label="Venture name" hint="Optional">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., TheraCopilot AI" className={inputCls} />
                </Field>
                <Field label="Industry" hint="Optional">
                  <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={inputCls}>
                    <option value="">Choose a market</option>
                    {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
                  </select>
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Your pitch" hint={`${idea.length} characters`}>
                    <textarea ref={pitchRef} value={idea} onChange={(e) => setIdea(e.target.value)} rows={4} placeholder="What problem are you solving, and for whom?" className={`${inputCls} min-h-32 resize-y leading-6`} />
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Try an example</div>
                  <div className="flex flex-wrap gap-2">
                    {SAMPLES.map((s) => <button key={s} type="button" onClick={() => { setTitle(s); setIdea(`${s} — an AI product that removes the most repetitive admin work for a specific professional niche, priced for individuals rather than enterprises.`); }} className="rounded-full border border-[#dfe6dc] bg-white px-3.5 py-2 text-[11px] text-[#53645a] transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/5">{s}</button>)}
                  </div>
                </div>

                <div className="sm:col-span-2 flex flex-col gap-4 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <button type="submit" className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_12px_30px_-14px_var(--color-primary)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105">
                    Start validation <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </button>
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"><ShieldCheck className="size-3.5 text-primary" /> Private to your workspace</span>
                </div>
              </div>
            </div>
          </form>
        </section>
      </div>
    </Page>
  );
}

const inputCls =
  "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-all duration-200 placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="font-mono text-[11px] text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
