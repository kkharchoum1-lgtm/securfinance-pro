import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  FolderKanban,
  Receipt,
  TrendingUp,
  Menu,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/cash-flow', label: 'Cash flow', icon: TrendingUp },
];

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 py-6">
      <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-sidebar-primary text-sidebar-primary-foreground">
        <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </div>
      <div className="leading-none">
        <div className="font-heading text-[15px] font-medium tracking-[0.18em] text-sidebar-accent-foreground">
          LEDGER
        </div>
        <div className="mt-1.5 text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/45">
          Security Solutions
        </div>
      </div>
    </div>
  );
}

function NavItems({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  'absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-sidebar-primary transition-opacity',
                  isActive ? 'opacity-100' : 'opacity-0'
                )}
              />
              <Icon className="h-[16px] w-[16px]" strokeWidth={1.7} />
              <span className="tracking-[0.01em]">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarBody({ onNavigate }) {
  return (
    <>
      <Brand />
      <NavItems onNavigate={onNavigate} />
      <div className="mt-auto px-3 pb-5">
        <button
          onClick={() => base44.auth.logout()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-[16px] w-[16px]" strokeWidth={1.7} />
          Sign out
        </button>
      </div>
    </>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-sidebar lg:flex">
        <SidebarBody />
      </aside>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3 lg:hidden">
          <Brand />
          <button
            onClick={() => setOpen(true)}
            className="rounded-md p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="mx-auto w-full max-w-[1180px] px-5 pb-16 pt-7 sm:px-8 sm:pt-10">
          <Outlet />
        </main>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex w-[264px] flex-col border-0 bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}