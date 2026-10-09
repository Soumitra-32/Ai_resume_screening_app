import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import ToastHost from '@/components/ToastHost';
import { SkeletonList } from '@/components/Skeleton';
import Login from '@/pages/Login';

// Route-level code splitting: each page loads on demand for a faster first paint.
const JobsList = lazy(() => import('@/pages/Recruiter/JobsList'));
const CandidateRanking = lazy(() => import('@/pages/Recruiter/CandidateRanking'));
const CandidateJobsList = lazy(() => import('@/pages/Candidate/JobsList'));
const ApplyPage = lazy(() => import('@/pages/Candidate/ApplyPage'));
const MyApplications = lazy(() => import('@/pages/Candidate/MyApplications'));
const ResumeLibrary = lazy(() => import('@/pages/Candidate/ResumeLibrary'));
const Profile = lazy(() => import('@/pages/Profile'));

function RouteFallback() {
  return (
    <div className="py-4">
      <SkeletonList count={3} />
    </div>
  );
}

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
    <>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute allowedRoles={['recruiter']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/recruiter/jobs" element={<JobsList />} />
              <Route path="/recruiter/jobs/:jobId/candidates" element={<CandidateRanking />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['candidate']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/candidate/jobs" element={<CandidateJobsList />} />
              <Route path="/candidate/jobs/:jobId" element={<ApplyPage />} />
              <Route path="/candidate/applications" element={<MyApplications />} />
              <Route path="/candidate/resumes" element={<ResumeLibrary />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
      <ToastHost />
    </>
  );
}
