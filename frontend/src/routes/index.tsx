import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Check,
  Compass,
  Layers3,
  Radar,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Page } from "@/components/Page";
import { gsap, useReveal } from "@/lib/anim";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PitchProof — Evidence for your next big idea" },
      {
        name: "description",
        content: "Pressure-test a startup idea with live market signals, competitor research and a clear next step.",
      },
      { property: "og:title", content: "PitchProof — Evidence for your next big idea" },
      { property: "og:description", content: "A sharper first step for founders: validate the idea before you build." },
    ],
  }),
  component: Index,
});

function Index() {
  const hero = useRef<HTMLDivElement>(null);
  const revealScope = useReveal<HTMLDivElement>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const destination = user?.role === "admin" ? "/admin" : "/workspace";

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(".landing-copy > *", { y: 24, opacity: 0, duration: 0.8, stagger: 0.1 })
        .from(".hero-console", { y: 30, opacity: 0, scale: 0.97, duration: 1 }, "-=0.65")
        .from(".hero-chip", { y: 12, opacity: 0, duration: 0.6, stagger: 0.12 }, "-=0.45");
      gsap.to(".orbit-dot", { rotate: 360, transformOrigin: "50% 50%", duration: 18, repeat: -1, ease: "none" });
      gsap.to(".signal-pulse", { scale: 1.08, opacity: 0.65, duration: 1.8, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.to(".floating-note", { y: -8, duration: 2.8, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: 0.45 });
    }, hero);
    return () => ctx.revert();
  }, []);

  const openWorkspace = () => {
    if (isAuthenticated) {
      navigate({ to: destination });
    } else {
      navigate({ to: "/auth", search: { mode: "signup", redirect: "/workspace" } });
    }
  };

  return (
    <Page>
      <div ref={(node) => { hero.current = node; revealScope.current = node; }}>
        <section className="relative isolate overflow-hidden px-5 pt-14 pb-20 md:pt-24 md:pb-28">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[740px] overflow-hidden">
            <div className="absolute -top-60 right-[-15%] size-[720px] rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute top-52 left-[-20%] size-[540px] rounded-full bg-accent/10 blur-3xl" />
          </div>
          <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1fr_0.95fr] lg:gap-10">
            <div className="landing-copy relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-3.5 py-2 text-xs font-medium text-primary shadow-sm">
                <span className="signal-pulse size-1.5 rounded-full bg-primary" />
                Evidence before enthusiasm
              </div>
              <h1 className="mt-7 font-display text-[3.25rem] leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-[4.5rem]">
                Your next big idea.
                <span className="mt-1 block text-primary">Put it to the test.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                Get a clear-eyed read on the market before you commit months to building. PitchProof brings demand, competitors and execution risks into one grounded decision.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button onClick={openWorkspace} className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_12px_30px_-14px_var(--color-primary)] transition-all hover:-translate-y-0.5 hover:brightness-105">
                  {isAuthenticated ? "Open your workspace" : "Validate your idea"}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </button>
                <a href="#how-it-works" className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card/70 px-6 py-3.5 text-sm font-medium transition-colors hover:bg-card">
                  See how it works <ArrowUpRight className="size-4" />
                </a>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                {["Six focused research agents", "Live market signals", "A practical next step"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2"><Check className="size-3.5 text-primary" />{item}</span>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[550px] lg:ml-auto">
              <div className="orbit-dot pointer-events-none absolute -inset-5 rounded-[2.7rem] border border-primary/15" />
              <div className="hero-console surface relative overflow-hidden rounded-[2rem] border-primary/15 bg-[#12251e] p-5 text-[#f5f4e9] shadow-[0_36px_90px_-40px_rgba(17,43,32,0.6)] sm:p-7">
                <div className="absolute inset-0 opacity-[0.13]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.7) .7px, transparent .7px)", backgroundSize: "14px 14px" }} />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/50"><Activity className="size-3.5 text-[#9bd4ac]" /> PitchProof signal report</div>
                      <div className="mt-2 font-display text-xl sm:text-2xl">Niche finance copilot</div>
                    </div>
                    <span className="rounded-full border border-[#9bd4ac]/25 bg-[#9bd4ac]/10 px-3 py-1.5 font-mono text-[10px] text-[#b7e9c3]">REPORT PREVIEW</span>
                  </div>
                  <div className="mt-7 grid grid-cols-[auto_1fr] items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.045] p-4 sm:p-5">
                    <div className="relative flex size-[82px] items-center justify-center rounded-full border-[5px] border-[#8dd2a1]/25 sm:size-[94px]">
                      <div className="absolute inset-[-5px] rounded-full border-[5px] border-transparent border-t-[#8dd2a1] border-r-[#8dd2a1] rotate-[30deg]" />
                      <div className="text-center"><strong className="font-display text-3xl leading-none">82</strong><span className="mt-1 block text-[9px] uppercase tracking-wider text-white/45">score</span></div>
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-[#9bd4ac]/15 px-2.5 py-1 text-[10px] font-medium text-[#b7e9c3]"><TrendingUp className="size-3" /> Strong signal</div>
                      <p className="mt-2 text-xs leading-5 text-white/65">Demand is climbing. A focused wedge can stand out in a crowded category.</p>
                    </div>
                  </div>
                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] px-4 pt-4 pb-3 sm:px-5">
                    <div className="flex items-center justify-between text-[10px] text-white/45"><span>Search interest · past 12 months</span><span className="font-mono text-[#b7e9c3]">+38.4%</span></div>
                    <div className="mt-3 h-28 w-full">
                      <svg viewBox="0 0 480 112" className="size-full overflow-visible" role="img" aria-label="Illustrative rising market demand chart" preserveAspectRatio="none">
                        <defs><linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#9bd4ac" stopOpacity=".34" /><stop offset="100%" stopColor="#9bd4ac" stopOpacity="0" /></linearGradient></defs>
                        {[28, 56, 84].map((y) => <line key={y} x1="0" x2="480" y1={y} y2={y} stroke="white" strokeOpacity=".1" strokeDasharray="3 6" />)}
                        <path d="M0 91 C35 87 45 72 76 79 S125 91 158 67 S202 79 239 58 S290 64 324 48 S370 63 402 29 S449 40 480 13 L480 112 L0 112Z" fill="url(#areaFill)" />
                        <path d="M0 91 C35 87 45 72 76 79 S125 91 158 67 S202 79 239 58 S290 64 324 48 S370 63 402 29 S449 40 480 13" fill="none" stroke="#9bd4ac" strokeWidth="3" strokeLinecap="round" />
                        <circle cx="480" cy="13" r="5" fill="#d7f4de" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[{ label: "Competitors", value: "12 mapped" }, { label: "Opportunity", value: "Clear wedge" }, { label: "Next step", value: "Pilot with 5" }].map((metric) => (
                      <div key={metric.label} className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5"><div className="text-[9px] uppercase tracking-wider text-white/40">{metric.label}</div><div className="mt-1 text-[10px] font-medium text-white/85 sm:text-xs">{metric.value}</div></div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="floating-note hero-chip surface absolute -left-5 top-16 hidden items-center gap-2.5 p-3 shadow-lg sm:flex"><span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Radar className="size-4" /></span><span><b className="block text-xs">Market mapped</b><small className="text-[10px] text-muted-foreground">12 months of demand</small></span></div>
              <div className="floating-note hero-chip surface absolute -right-4 bottom-12 hidden items-center gap-2.5 p-3 shadow-lg sm:flex"><span className="flex size-8 items-center justify-center rounded-lg bg-accent/15 text-accent"><ShieldCheck className="size-4" /></span><span><b className="block text-xs">Risks surfaced</b><small className="text-[10px] text-muted-foreground">With mitigation paths</small></span></div>
            </div>
          </div>
        </section>

        <section className="border-y border-border/70 bg-card/45 py-7">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-5 text-center sm:flex-row sm:text-left">
            <span className="text-xs font-medium uppercase tracking-[0.17em] text-muted-foreground">A stronger first step for founders</span>
            <div className="flex flex-wrap justify-center gap-x-10 gap-y-3 font-display text-sm text-foreground/75"><span>Market demand</span><span>Competitor map</span><span>Risk & feasibility</span><span>Lean MVP plan</span></div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20 md:py-28">
          <div className="mx-auto max-w-2xl text-center" data-reveal>
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-primary">From hunch to next step</span>
            <h2 className="mt-4 font-display text-3xl leading-tight sm:text-5xl">A little more signal.<br className="hidden sm:block" /> A lot less guessing.</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">A coordinated research pass turns your pitch into an evidence-backed view of the opportunity and a focused plan to learn more.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              { number: "01", icon: Compass, title: "Frame the opportunity", body: "Clarify the customer, their pain point and the promise your product makes." },
              { number: "02", icon: Radar, title: "Read the market", body: "Surface demand signals, relevant competitors, substitutes and unmet needs." },
              { number: "03", icon: Layers3, title: "Choose your next move", body: "Get a viability score, key risks and a small, testable MVP roadmap." },
            ].map((step) => <article key={step.number} data-reveal className="surface group p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-7"><div className="flex items-center justify-between"><span className="font-mono text-xs text-muted-foreground">{step.number} / 03</span><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:rotate-[-6deg]"><step.icon className="size-5" /></span></div><h3 className="mt-8 font-display text-xl">{step.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p></article>)}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-20 md:pb-28">
          <div className="surface relative grid overflow-hidden bg-[#e8efe8] p-7 sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:p-14">
            <div className="absolute -right-12 -top-16 size-64 rounded-full border border-primary/10" /><div className="absolute -right-2 -top-6 size-44 rounded-full border border-primary/10" />
            <div className="relative z-10" data-reveal><span className="font-mono text-xs uppercase tracking-[0.18em] text-primary">A useful answer, not a magic answer</span><h2 className="mt-4 max-w-md font-display text-3xl leading-tight sm:text-4xl">Know what to validate next.</h2><p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">PitchProof gives you a sharper starting point: evidence to explore, assumptions to test and a first experiment you can actually run.</p><button onClick={openWorkspace} className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-all hover:-translate-y-0.5 hover:brightness-105">{isAuthenticated ? "Go to workspace" : "Start with your idea"}<ArrowRight className="size-4" /></button></div>
            <div className="relative mt-10 grid grid-cols-2 gap-3 lg:mt-0 lg:pl-10" data-reveal>
              {[{ icon: TrendingUp, label: "Demand", detail: "Momentum and direction" }, { icon: ShieldCheck, label: "Feasibility", detail: "Risks and mitigations" }, { icon: Radar, label: "Competition", detail: "Incumbents and gaps" }, { icon: Sparkles, label: "MVP", detail: "A focused first release" }].map((item) => <div key={item.label} className="surface flex min-h-28 flex-col justify-between bg-background/85 p-4 sm:p-5"><item.icon className="size-5 text-primary" /><div><div className="font-display text-base">{item.label}</div><div className="mt-1 text-[11px] text-muted-foreground">{item.detail}</div></div></div>)}
            </div>
          </div>
        </section>
      </div>
    </Page>
  );
}
