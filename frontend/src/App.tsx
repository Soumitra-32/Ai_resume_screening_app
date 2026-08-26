import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import Login from '@/pages/Login';
import JobsList from '@/pages/Recruiter/JobsList';
import CandidateRanking from '@/pages/Recruiter/CandidateRanking';
import CandidateJobsList from '@/pages/Candidate/JobsList';
import ApplyPage from '@/pages/Candidate/ApplyPage';
import MyApplications from '@/pages/Candidate/MyApplications';

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950">
        <p className="font-mono text-sm text-ink-600">Loading…</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute allowedRoles={['recruiter']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/recruiter/jobs" element={<JobsList />} />
          <Route path="/recruiter/jobs/:jobId/candidates" element={<CandidateRanking />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['candidate']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/candidate/jobs" element={<CandidateJobsList />} />
          <Route path="/candidate/jobs/:jobId" element={<ApplyPage />} />
          <Route path="/candidate/applications" element={<MyApplications />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}