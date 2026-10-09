import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';

export default function Login() {
  const { isAuthenticated, user, login, signup } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('candidate');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'recruiter' ? '/recruiter/jobs' : '/candidate/jobs'} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const loggedInUser =
        mode === 'login'
          ? await login({ email, password })
          : await signup({ name, email, password, role });
      navigate(loggedInUser.role === 'recruiter' ? '/recruiter/jobs' : '/candidate/jobs');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-2xl text-paper">
            Sift<span className="text-signal">.</span>
          </p>
          <p className="mt-1 text-sm text-ink-600">
            {mode === 'login' ? 'Sign in to your account' : 'Create an account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          {error && (
            <p className="rounded-sm border border-flag/50 bg-flag/10 px-3 py-2 text-sm text-flag">{error}</p>
          )}

          {mode === 'signup' && (
            <div>
              <label className="field-label" htmlFor="name">
                Full name
              </label>
              <input
                id="name"
                className="field-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label className="field-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="field-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            {mode === 'signup' && password.length > 0 && (
              <PasswordStrength password={password} />
            )}
          </div>

          {mode === 'signup' && (
            <div>
              <span className="field-label">I am a</span>
              <div className="flex gap-2">
                {(['candidate', 'recruiter'] as UserRole[]).map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setRole(r)}
                    className={`flex-1 rounded-sm border px-3 py-2 text-sm capitalize transition ${
                      role === r ? 'border-signal text-signal' : 'border-line text-ink-600'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-ink-600">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            className="text-signal hover:underline"
            onClick={() => {
              setError(null);
              setMode(mode === 'login' ? 'signup' : 'login');
            }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

/** Lightweight password strength meter for the signup form. */
function PasswordStrength({ password }: { password: string }) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: 'Too short', color: 'text-flag', bar: 'bg-flag', width: '20%' },
    { label: 'Weak', color: 'text-flag', bar: 'bg-flag', width: '40%' },
    { label: 'Fair', color: 'text-flag', bar: 'bg-flag', width: '60%' },
    { label: 'Good', color: 'text-signal', bar: 'bg-signal', width: '80%' },
    { label: 'Strong', color: 'text-signal', bar: 'bg-signal', width: '100%' },
  ];
  const level = levels[score];

  return (
    <div className="mt-2">
      <div className="h-1 w-full overflow-hidden rounded-sm bg-ink-800">
        <div className={`h-full transition-all ${level.bar}`} style={{ width: level.width }} />
      </div>
      <p className={`mt-1 text-xs ${level.color}`}>
        Password strength: {level.label} — use 8+ characters with mixed case & numbers.
      </p>
    </div>
  );
}