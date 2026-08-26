import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const RECRUITER_NAV = [
  { to: '/recruiter/jobs', label: 'Jobs' },
];

const CANDIDATE_NAV = [
  { to: '/candidate/jobs', label: 'Browse jobs' },
  { to: '/candidate/applications', label: 'My applications' },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const nav = user?.role === 'recruiter' ? RECRUITER_NAV : CANDIDATE_NAV;

  return (
    <div className="flex min-h-screen bg-ink-950 text-paper">
      <aside className="hidden w-60 flex-col justify-between border-r border-line bg-ink-950 p-6 sm:flex">
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

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-line px-6 py-4 sm:hidden">
          <p className="font-display text-lg text-paper">
            Sift<span className="text-signal">.</span>
          </p>
          <button onClick={logout} className="text-xs text-ink-600">
            Log out
          </button>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}