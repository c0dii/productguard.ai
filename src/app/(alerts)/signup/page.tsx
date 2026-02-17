import { Suspense } from 'react';
import AlertsSignupPage from './client';

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#060A11] text-[#E6EBF2] font-sans flex items-center justify-center">
        <div className="text-[#8293AA]">Loading...</div>
      </div>
    }>
      <AlertsSignupPage />
    </Suspense>
  );
}
