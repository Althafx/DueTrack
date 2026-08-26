import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, LogOut, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser, useLogout } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";

export function EmployeeLayout() {
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogout();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-primary px-4 py-3 text-primary-foreground">
        <div>
          <p className="font-semibold">Due<span className="text-secondary">Track</span></p>
          <p className="text-xs text-primary-foreground/60">{user?.name}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-white/10"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10" onClick={() => logoutMutation.mutate()}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 px-4 pb-24">
        <div className="animate-page">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card/95 backdrop-blur-sm">
        <NavLink
          to="/employee/dashboard"
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium text-muted-foreground transition-colors duration-150",
              isActive && "text-secondary"
            )
          }
        >
          <LayoutDashboard className="h-5 w-5" />
          My Collections
        </NavLink>
      </nav>
    </div>
  );
}
