import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';

/** Read-only account overview. There's no profile-update endpoint yet, so this
 *  simply surfaces the authenticated user from the auth store. */
export default function Profile() {
  usePageTitle('Profile');
  const { user, logout } = useAuth();
  const home = user?.role === 'recruiter' ? '/recruiter/jobs' : '/candidate/jobs';

  return (
    <div className="max-w-md">
      <h1 className="font-display text-2xl text-paper">Your profile</h1>
      <p className="mt-1 text-sm text-ink-600">Account details for this session.</p>

      <div className="card mt-6 divide-y divide-line">
        <Row label="Name" value={user?.name ?? '—'} />
        <Row label="Email" value={user?.email ?? '—'} />
        <Row label="Role" value={user?.role ? capitalize(user.role) : '—'} />
      </div>

      <div className="mt-6 flex gap-3">
        <Link to={home} className="btn-secondary">
          Back to dashboard
        </Link>
        <button className="btn-danger" onClick={logout}>
          Log out
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs uppercase tracking-wide text-ink-600">{label}</span>
      <span className="text-sm text-paper">{value}</span>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
