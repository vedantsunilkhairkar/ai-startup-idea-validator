import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Sparkles, Loader2, Mail, LockKeyhole, UserRound, Search, ChartNoAxesCombined, Shield } from "lucide-react";
import { toast } from "sonner";
import { gsap } from "@/lib/anim";
import { useAuth } from "@/lib/auth";
import { hasPendingValidationIntent } from "@/lib/validation-intent";
import founderIllustration from "@/assets/founder-illustration.png";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: typeof search.redirect === "string" ? search.redirect : undefined,
      mode: typeof search.mode === "string" ? search.mode : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Sign in — PitchProof" },
      { name: "description", content: "Sign in or create an account to keep your validations." },
      { property: "og:title", content: "Sign in — PitchProof" },
      { property: "og:description", content: "Keep every validation in one quiet archive." },
    ],
  }),
  component: Auth,
});

function Auth() {
  const search = Route.useSearch();
  const [mode, setMode] = useState<"in" | "up">(
    search.mode === "signup" || search.mode === "up" ? "up" : "in"
  );
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated, login, register } = useAuth();
  const submitted = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !submitted.current && currentUser) {
      if (currentUser.role === "admin") {
        navigate({ to: "/admin" });
      } else if (search.redirect === "/validate" && hasPendingValidationIntent()) {
        navigate({ to: "/validate" });
      } else if (search.redirect) {
        navigate({ to: search.redirect === "/validate" ? "/workspace" : search.redirect as any });
      } else {
        navigate({ to: "/workspace" });
      }
    }
  }, [isAuthenticated, currentUser, search.redirect, navigate]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".auth-item", {
        y: 20,
        opacity: 0,
        duration: 0.8,
        stagger: 0.07,
        ease: "power3.out",
      });
    }, panel);
    return () => ctx.revert();
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    submitted.current = true;
    setLoading(true);

    try {
      let authenticatedUser;
      if (mode === "in") {
        authenticatedUser = await login(email, password);
        toast.success("Welcome back!");
      } else {
        authenticatedUser = await register(name, email, password);
        toast.success(`Account created! Welcome, ${authenticatedUser.name || "Founder"}!`);
      }

      if (authenticatedUser.role === "admin") {
        navigate({ to: "/admin" });
        return;
      }

      if (search.redirect === "/trends") {
        navigate({ to: "/trends" });
      } else if (search.redirect === "/validate" && hasPendingValidationIntent()) {
        navigate({ to: "/validate" });
      } else if (search.redirect === "/validate") {
        navigate({ to: "/workspace" });
      } else if (search.redirect) {
        navigate({ to: search.redirect as any });
      } else {
        navigate({ to: "/workspace" });
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => setMode(mode === "in" ? "up" : "in");

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-24 left-[39%] size-56 rounded-full bg-secondary blur-[1px]" />
        <div className="absolute -bottom-52 -right-28 size-[440px] rounded-full bg-primary/10" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-[1440px] items-center justify-between px-6 py-5 sm:px-10 lg:px-16">
        <Link to="/" className="flex items-center gap-3 text-foreground transition-opacity hover:opacity-80">
          <span className="flex size-10 items-center justify-center rounded-[14px] bg-primary text-primary-foreground shadow-md shadow-primary/15"><Sparkles className="size-5" /></span>
          <span className="font-display text-2xl font-semibold tracking-tight">PitchProof</span>
        </Link>
        <div className="text-right text-xs text-muted-foreground sm:text-sm">
          {mode === "in" ? "New to PitchProof?" : "Already have an account?"}{" "}
          <button type="button" onClick={toggleMode} className="ml-1 font-semibold text-primary hover:text-primary/80">
            {mode === "in" ? "Create an account" : "Sign in"}
          </button>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid max-w-[1440px] items-center gap-10 px-6 pb-10 pt-4 sm:px-10 lg:min-h-[calc(100vh-88px)] lg:grid-cols-[1.04fr_0.96fr] lg:gap-12 lg:px-16 lg:pb-16 lg:pt-0">
        <section className="hidden min-w-0 pb-4 lg:block">
          <div className="auth-item max-w-xl">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Smarter ideas. Better decisions.</div>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.05] tracking-[-0.045em] xl:text-[4.25rem]">
              Turn your idea into<br /><span className="text-primary">a solid plan.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground xl:text-lg">
              PitchProof helps you evaluate your startup idea before you invest time and money. Get a clear analysis of demand, competition, risks and more—all in one place.
            </p>
          </div>

          <div className="auth-item mt-8 grid max-w-xl grid-cols-3 divide-x divide-border">
            {[
              { icon: Search, title: "Check demand", copy: "See if people are interested." },
              { icon: ChartNoAxesCombined, title: "Know your competition", copy: "Find out what others are doing." },
              { icon: Shield, title: "Spot risks", copy: "Be aware before you invest." },
            ].map(({ icon: Icon, title, copy }) => (
              <div key={title} className="px-4 first:pl-0 last:pr-0">
                <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary"><Icon className="size-5" /></span>
                <h2 className="mt-3 max-w-28 text-sm font-semibold leading-5 text-foreground">{title}</h2>
                <p className="mt-1 text-xs leading-4 text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>

          <div className="auth-item relative mt-8 h-48 max-w-[590px] overflow-hidden rounded-[2rem] border border-border bg-secondary xl:mt-10 xl:h-56">
            <img
              src={founderIllustration}
              alt="A woman founder reviewing her startup idea on a laptop"
              className="size-full object-cover object-top"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent" />
          </div>
        </section>

        <section ref={panel} className="mx-auto w-full max-w-[540px] rounded-[1.8rem] border border-border bg-card p-6 shadow-xl shadow-foreground/5 sm:p-9 lg:p-10">
          <div className="auth-item mb-6 flex items-center gap-3 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="size-4" /></span>
            <span className="font-display text-xl font-semibold">PitchProof</span>
          </div>
          <div className="auth-item">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{mode === "in" ? "Welcome back" : "Get started"}</div>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-4xl">
              {mode === "in" ? "Sign in to PitchProof" : "Create your account"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {mode === "in" ? "Continue evaluating your startup ideas." : "Save your ideas and keep every report in one place."}
            </p>
          </div>

          <form className="auth-item mt-7 space-y-4" onSubmit={handleSubmit}>
            {mode === "up" && (
              <label className="block space-y-2 text-sm font-medium text-foreground">
                Full name
                <span className="relative block"><UserRound className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" /><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={`${field} pl-11`} aria-label="Full name" disabled={loading} /></span>
              </label>
            )}
            <label className="block space-y-2 text-sm font-medium text-foreground">
              Email address
              <span className="relative block"><Mail className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" /><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={`${field} pl-11`} aria-label="Email address" disabled={loading} /></span>
            </label>
            <label className="block space-y-2 text-sm font-medium text-foreground">
              Password
              <span className="relative block"><LockKeyhole className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" /><input required type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "in" ? "Enter your password" : "Create a password"} className={`${field} pl-11 pr-12`} aria-label="Password" disabled={loading} /><button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-3 flex items-center px-1 text-muted-foreground transition-colors hover:text-primary" aria-label={show ? "Hide password" : "Show password"} disabled={loading}>{show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}</button></span>
            </label>
            <button type="submit" disabled={loading} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-primary/90 disabled:opacity-50">
              {loading && <Loader2 className="size-4 animate-spin" />}
              {mode === "in" ? loading ? "Signing in..." : "Sign in" : loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="auth-item mt-6 text-center text-sm text-muted-foreground">
            {mode === "in" ? "New to PitchProof? " : "Already have an account? "}
            <button type="button" onClick={toggleMode} className="font-semibold text-primary hover:text-primary/80">
              {mode === "in" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </section>
      </div>
    </main>
  );
}

const field =
  "w-full rounded-xl border border-input bg-background px-4 py-3.5 text-sm font-normal text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10";
