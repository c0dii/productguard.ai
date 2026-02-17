import { Suspense } from 'react';
import DMCAReviewPage from './client';

export default function ReviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#060A11] text-[#E6EBF2] font-sans flex items-center justify-center">
        <div className="text-[#8293AA]">Loading...</div>
      </div>
    }>
      <DMCAReviewPage />
    </Suspense>
  );
}
