import { NavLink, Outlet } from "react-router-dom";
import { History, LayoutDashboard, LogOut, Moon, Sun, Users, UserSquare2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser, useLogout } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clients", label: "Clients", icon: UserSquare2 },
  { to: "/employees", label: "Employees", icon: Users },
  { to: "/collections", label: "Collections", icon: Wallet },
  { to: "/history", label: "History", icon: History },
];

export function DealerLayout() {
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogout();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-white/5 bg-primary text-primary-foreground md:flex md:flex-col">
        <div className="flex items-start justify-between px-6 py-5">
          <div>
            <p className="text-lg font-semibold">
              Due<span className="text-secondary">Track</span>
            </p>
            <p className="text-xs text-primary-foreground/60">Payment Collection System</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-primary-foreground/70 transition-all duration-150 hover:bg-white/10 hover:text-primary-foreground",
                  isActive && "bg-white/10 text-primary-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-secondary transition-all duration-200",
                      isActive ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <Icon className="h-4 w-4" />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-medium">{user?.name}</p>
          <p className="truncate text-xs text-primary-foreground/60">{user?.email}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full justify-start gap-2 text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
          <p className="font-semibold">
            Due<span className="text-secondary">Track</span>
          </p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle dark mode">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => logoutMutation.mutate()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-20 md:px-8 md:pb-8 lg:px-10">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card/95 backdrop-blur-sm md:hidden">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors duration-150",
                  isActive && "text-secondary"
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
