import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Sparkles, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type NavPath = "/" | "/admin" | "/workspace" | "/history" | "/trends";

export function SiteHeader() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success("Signed out successfully");
    navigate({ to: "/" });
  };

  const homePath = user?.role === "admin" ? "/admin" : isAuthenticated ? "/workspace" : "/";
  const links: Array<{ to: NavPath; label: string }> = user?.role === "admin"
    ? [{ to: "/admin", label: "Overview" }]
    : isAuthenticated
      ? [
          { to: "/workspace", label: "New validation" },
          { to: "/history", label: "Past validations" },
          { to: "/trends", label: "Market trends" },
        ]
      : [
          { to: "/", label: "Home" },
          { to: "/trends", label: "Market trends" },
        ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
        <Link to={homePath} className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <span className="font-display text-xl leading-none">PitchProof</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-sm text-foreground" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 font-medium text-primary">
                  {user.name ? user.name[0].toUpperCase() : <UserIcon className="size-3" />}
                </span>
                <span className="hidden font-medium text-foreground sm:inline">
                  {user.name || user.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          ) : isAuthenticated ? (
            <Link to={homePath} className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:brightness-105">
              Open workspace
            </Link>
          ) : (
            <Link
              to="/auth"
              search={{ mode: "signup", redirect: "/workspace" }}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent"
            >
              Get started
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 text-sm text-muted-foreground">
        <span className="font-display text-base text-foreground">PitchProof AI</span>
        <span>Sample data shown for demonstration.</span>
      </div>
    </footer>
  );
}
