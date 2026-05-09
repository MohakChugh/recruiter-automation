import { Outlet, Link, useLocation } from 'react-router-dom'
import { Briefcase, Settings, Home, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusIndicator } from './StatusIndicator'

export function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <Link to="/" className="flex items-center gap-2 mr-6">
            <Sparkles className="h-5 w-5" />
            <span className="font-semibold">Recruiter</span>
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink to="/" active={location.pathname === '/'}>
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/settings" active={location.pathname === '/settings'}>
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </NavLink>
          </nav>

          <div className="ml-auto">
            <StatusIndicator />
          </div>
        </div>
      </header>

      <main className="container max-w-screen-2xl py-6">
        <Outlet />
      </main>
    </div>
  )
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
      )}
    >
      {children}
    </Link>
  )
}
