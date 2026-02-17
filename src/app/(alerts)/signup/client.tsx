// ============================================================
// Alerts Signup Page
// src/app/(alerts)/signup/page.tsx
//
// Account creation for prospects arriving from marketing emails.
// The ?ref={prospect_id} param links the new account back to
// the marketing pipeline for attribution.
//
// After signup:
//   - Creates user via Supabase Auth
//   - Updates marketing_outreach.signed_up_at
//   - Updates marketing_outreach.user_id
//   - Updates prospect status to 'account_created'
//   - Adds exclusion entries (so engine never contacts them again)
//   - Redirects to /dmca/review?ref={prospect_id}
// ============================================================

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function AlertsSignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prospectId = searchParams.get('ref');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSignup = async () => {
    if (!fullName || !email || !password) return;
    setLoading(true);
    setError('');

    try {
      // 1. Create user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            signup_source: 'alerts',
            prospect_id: prospectId,
          },
        },
      });

      if (authError) throw authError;

      // 2. Record signup attribution via server endpoint
      if (prospectId) {
        await fetch('/api/marketing/prospects', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prospect_id: prospectId,
            event: 'account_created',
            user_id: authData.user?.id,
          }),
        });
      }

      // 3. Redirect to DMCA review
      router.push(`/dmca/review?ref=${prospectId}`);
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060A11] text-[#E6EBF2] font-sans">
      <div className="max-w-md mx-auto px-5 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00E4B8] to-[#00B894] flex items-center justify-center text-sm font-black text-[#060A11]">
            P
          </div>
          <span className="text-base font-extrabold tracking-tight">
            ProductGuard<span className="text-[#00E4B8]">.ai</span>
          </span>
        </div>

        <h1 className="text-2xl font-extrabold mb-2 tracking-tight">
          Create Your Free Account
        </h1>
        <p className="text-[#8293AA] text-sm mb-8 leading-relaxed">
          Unlock your DMCA takedown letter and start protecting your digital products.
        </p>

        <div className="bg-[#0F1525] border border-[#172033] rounded-2xl p-6">
          {error && (
            <div className="bg-[rgba(255,59,83,0.08)] border border-[rgba(255,59,83,0.2)] rounded-xl p-3 mb-4 text-sm text-[#FF3B53]">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8293AA] mb-1.5">
              Full Name (Copyright Owner)
            </label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your legal name"
              className="w-full p-3 rounded-xl bg-[#151D30] border border-[#172033] text-[#E6EBF2] text-sm outline-none focus:border-[rgba(0,228,184,0.4)] transition-colors"
            />
          </div>

          <div className="mb-4">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8293AA] mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full p-3 rounded-xl bg-[#151D30] border border-[#172033] text-[#E6EBF2] text-sm outline-none focus:border-[rgba(0,228,184,0.4)] transition-colors"
            />
          </div>

          <div className="mb-6">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8293AA] mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full p-3 rounded-xl bg-[#151D30] border border-[#172033] text-[#E6EBF2] text-sm outline-none focus:border-[rgba(0,228,184,0.4)] transition-colors"
            />
          </div>

          <button
            onClick={handleSignup}
            disabled={loading || !fullName || !email || !password}
            className="w-full bg-[#00E4B8] text-[#060A11] font-extrabold text-sm py-3.5 rounded-xl shadow-[0_0_20px_rgba(0,228,184,0.22)] disabled:opacity-35 cursor-pointer border-none transition-opacity"
          >
            {loading ? 'Creating account...' : 'Create Account & Continue →'}
          </button>

          <p className="text-[10px] text-[#4D5E74] text-center mt-4 leading-relaxed">
            By creating an account you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
