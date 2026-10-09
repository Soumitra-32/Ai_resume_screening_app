import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  to: string;
  label: string;
  short: string;
}

const RECRUITER_NAV: NavItem[] = [
  { to: '/recruiter/jobs', label: 'Jobs', short: 'Jobs' },
  { to: '/profile', label: 'Profile', short: 'Profile' },
];

const CANDIDATE_NAV: NavItem[] = [
  { to: '/candidate/jobs', label: 'Browse jobs', short: 'Jobs' },
  { to: '/candidate/applications', label: 'My applications', short: 'Apps' },
  { to: '/candidate/resumes', label: 'My resumes', short: 'Resumes' },
  { to: '/profile', label: 'Profile', short: 'Profile' },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const nav = user?.role === 'recruiter' ? RECRUITER_NAV : CANDIDATE_NAV;

  return (
    <div className="flex min-h-screen bg-ink-950 text-paper">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 flex-col justify-between border-r border-line bg-ink-950 p-6 md:flex">
        <div>
          <p className="font-display text-lg tracking-tight text-paper">
            Sift<span className="text-signal">.</span>
          </p>
          <nav className="mt-10 flex flex-col gap-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-sm px-3 py-2 text-sm transition ${
                    isActive ? 'bg-ink-800 text-signal' : 'text-ink-600 hover:text-paper'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="border-t border-line pt-4">
          <p className="truncate text-sm text-paper">{user?.name}</p>
          <p className="truncate text-xs capitalize text-ink-600">{user?.role}</p>
          <button onClick={logout} className="btn-secondary mt-3 w-full">
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar with a real drawer so nav links aren't lost on phones */}
        <header className="flex items-center justify-between border-b border-line px-4 py-3 md:hidden">
          <p className="font-display text-lg text-paper">
            Sift<span className="text-signal">.</span>
          </p>
          <MobileMenuButton nav={nav} user={user} logout={logout} />
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-20 sm:px-6 md:pb-10">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Main navigation"
        className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-line bg-ink-900 md:hidden"
      >
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] transition ${
                isActive ? 'text-signal' : 'text-ink-600'
              }`
            }
          >
            {item.short}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function MobileMenuButton({
  nav,
  user,
  logout,
}: {
  nav: NavItem[];
  user: { name?: string; role?: string } | null;
  logout: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-sm border border-line px-3 py-1.5 text-xs text-paper"
        aria-expanded={open}
        aria-label="Toggle navigation"
      >
        Menu
      </button>
      {open && (
        <div className="fixed inset-0 top-[57px] z-40 bg-ink-950/95 md:hidden">
          <nav className="flex flex-col gap-1 p-4">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-sm px-3 py-3 text-sm transition ${
                    isActive ? 'bg-ink-800 text-signal' : 'text-ink-600'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="mt-3 border-t border-line pt-3">
              <p className="truncate text-xs text-ink-600">
                {user?.name} · <span className="capitalize">{user?.role}</span>
              </p>
              <button onClick={logout} className="btn-secondary mt-2 w-full">
                Log out
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

