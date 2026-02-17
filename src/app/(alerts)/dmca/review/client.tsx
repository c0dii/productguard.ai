// ============================================================
// DMCA Review & Send Page
// src/app/(alerts)/dmca/review/page.tsx
//
// After signup, the user reviews and sends their DMCA notice.
// Loads prospect data, shows full letter preview, requires
// sworn statement checkbox, then fires the takedown.
//
// After sending:
//   - Creates takedown record in DB
//   - Updates marketing_outreach.dmca_sent_at
//   - Shows success screen with upsell
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import type { AlertsPageData } from '@/types/marketing';

export default function DMCAReviewPage() {
  const searchParams = useSearchParams();
  const prospectId = searchParams.get('ref');
  const [data, setData] = useState<AlertsPageData | null>(null);
  const [sworn, setSworn] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [upsellLoading, setUpsellLoading] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Load prospect data
  useEffect(() => {
    if (!prospectId) return;
    fetch(`/api/marketing/prospects?id=${prospectId}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {});
  }, [prospectId]);

  const handleSend = async () => {
    if (!sworn || !data) return;
    setSending(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Send DMCA via API
      await fetch('/api/marketing/prospects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_id: prospectId,
          event: 'dmca_sent',
          user_id: user?.id,
        }),
      });

      // Brief delay for UX
      await new Promise(r => setTimeout(r, 1500));
      setSent(true);
    } catch {
      setSending(false);
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-[#060A11] text-[#E6EBF2] font-sans flex items-center justify-center">
        <div className="text-[#8293AA]">Loading...</div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  // ── Success / Upsell screen ─────────────────────────────
  if (sent) {
    return (
      <div className="min-h-screen bg-[#060A11] text-[#E6EBF2] font-sans">
        <div className="max-w-xl mx-auto px-5 py-12">
          {/* Success */}
          <div className="bg-[#0F1525] border border-[rgba(0,228,184,0.25)] rounded-2xl p-8 text-center mb-6 shadow-[0_0_32px_rgba(0,228,184,0.06)]">
            <div className="text-5xl mb-3">✅</div>
            <h2 className="text-xl font-extrabold mb-2">DMCA Notice Sent</h2>
            <p className="text-sm text-[#8293AA] mb-5">
              Your takedown request for &ldquo;{data.product_name}&rdquo; has been submitted. Most platforms respond within 24–72 hours.
            </p>
            <div className="inline-flex items-center gap-3 bg-[rgba(255,173,32,0.08)] border border-[rgba(255,173,32,0.2)] rounded-xl px-5 py-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFAD20]" />
              <span className="text-sm font-bold text-[#FFAD20]">Status: Pending Review</span>
            </div>
          </div>

          {/* More infringements teaser */}
          <div className="bg-[rgba(255,59,83,0.06)] border border-[rgba(255,59,83,0.2)] rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚨</span>
              <div>
                <div className="text-base font-extrabold">We found more infringements</div>
                <div className="text-sm text-[#8293AA] leading-relaxed">
                  During our scan, we detected your product on <strong className="text-[#FF3B53]">additional platforms</strong>.
                  Pirates re-upload within hours of removal.
                </div>
              </div>
            </div>
          </div>

          {/* Upsell */}
          <div className="bg-[#0F1525] border border-[rgba(0,228,184,0.2)] rounded-2xl p-6 text-center">
            <h3 className="text-lg font-extrabold mb-1">Automate your protection</h3>
            <p className="text-sm text-[#8293AA] mb-5">
              Stop playing whack-a-mole. Let ProductGuard monitor and take down piracy 24/7.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={async () => {
                  setUpsellLoading('starter');
                  try {
                    const res = await fetch('/api/subscription/change', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ planTier: 'starter' }),
                    });
                    const result = await res.json();
                    if (result.url) window.location.href = result.url;
                    else if (result.action === 'updated') window.location.href = '/dashboard/settings?upgrade=success';
                  } catch { /* ignore */ }
                  setUpsellLoading(null);
                }}
                disabled={upsellLoading !== null}
                className="bg-[#0B1018] border border-[#172033] rounded-xl p-4 text-center cursor-pointer hover:border-[#00E4B8] transition-all disabled:opacity-50"
              >
                <div className="text-xs text-[#8293AA] font-semibold">Starter</div>
                <div className="text-2xl font-extrabold text-[#00E4B8]">$29<span className="text-xs text-[#8293AA]">/mo</span></div>
                <div className="text-[10px] text-[#4D5E74] mb-3">5 products · Weekly scans</div>
                <div className="bg-[#00E4B8] text-[#060A11] font-extrabold text-xs py-2 rounded-lg">
                  {upsellLoading === 'starter' ? 'Loading...' : 'Get Starter'}
                </div>
              </button>
              <button
                onClick={async () => {
                  setUpsellLoading('pro');
                  try {
                    const res = await fetch('/api/subscription/change', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ planTier: 'pro' }),
                    });
                    const result = await res.json();
                    if (result.url) window.location.href = result.url;
                    else if (result.action === 'updated') window.location.href = '/dashboard/settings?upgrade=success';
                  } catch { /* ignore */ }
                  setUpsellLoading(null);
                }}
                disabled={upsellLoading !== null}
                className="bg-[#0B1018] border-2 border-[#00E4B8] rounded-xl p-4 text-center cursor-pointer hover:shadow-[0_0_20px_rgba(0,228,184,0.15)] transition-all disabled:opacity-50"
              >
                <div className="text-xs text-[#00E4B8] font-semibold">Pro · Best Value</div>
                <div className="text-2xl font-extrabold text-[#00E4B8]">$99<span className="text-xs text-[#8293AA]">/mo</span></div>
                <div className="text-[10px] text-[#4D5E74] mb-3">25 products · Daily scans</div>
                <div className="bg-[#00E4B8] text-[#060A11] font-extrabold text-xs py-2 rounded-lg">
                  {upsellLoading === 'pro' ? 'Loading...' : 'Get Pro'}
                </div>
              </button>
            </div>
          </div>

          <p className="text-center text-[10px] text-[#4D5E74] mt-6">
            Free credits remaining: 0 of 1
          </p>
        </div>
      </div>
    );
  }

  // ── Review screen ───────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#060A11] text-[#E6EBF2] font-sans">
      <div className="max-w-xl mx-auto px-5 py-12">
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
          Review Your DMCA Notice
        </h1>
        <p className="text-[#8293AA] text-sm mb-6 leading-relaxed">
          Review the generated takedown letter below. Confirm ownership, then send.
        </p>

        {/* Full DMCA Letter */}
        <div className="bg-[#0B1018] border border-[#172033] rounded-xl p-6 font-mono text-xs leading-relaxed text-[#8293AA] max-h-80 overflow-y-auto mb-6">
          <div className="text-[#E6EBF2] font-bold text-sm mb-2">DMCA TAKEDOWN NOTICE</div>
          <div>Date: {today}</div>
          <br />
          <div>To: Abuse Department / Designated DMCA Agent</div>
          <div>Re: Copyright Infringement — Urgent Removal Request</div>
          <br />
          <div className="text-[#E6EBF2]">
            I, <strong>{data.owner_name || '[Your Name]'}</strong>, am the copyright owner
            (or authorized agent) of the original work described below. I have identified material
            on your platform that infringes my copyright. This letter constitutes formal notification
            under the Digital Millennium Copyright Act (17 U.S.C. &sect; 512(c)).
          </div>
          <br />
          <div><strong className="text-[#E6EBF2]">Original Work:</strong> {data.product_name}</div>
          <div><strong className="text-[#E6EBF2]">Infringing Material:</strong></div>
          <div className="text-[#FF3B53] break-all">{data.infringing_url}</div>
          <br />
          <div className="text-[#E6EBF2]">
            I have a good faith belief that the use of the copyrighted material described above
            is not authorized by the copyright owner, its agent, or the law. The information in
            this notification is accurate, and under penalty of perjury, I am the copyright owner
            or authorized to act on behalf of the owner.
          </div>
          <br />
          <div className="text-[#E6EBF2]">
            I request that the infringing material be removed or access disabled immediately
            in accordance with 17 U.S.C. &sect; 512(c).
          </div>
          <br />
          <div className="text-[#E6EBF2] font-semibold">
            Signature: {data.owner_name || '[Your Name]'}
          </div>
        </div>

        {/* Sworn statement */}
        <div
          onClick={() => setSworn(!sworn)}
          className={`p-5 rounded-xl cursor-pointer transition-all mb-6 flex gap-3 items-start ${
            sworn
              ? 'bg-[rgba(0,228,184,0.07)] border-2 border-[#00E4B8]'
              : 'bg-[#151D30] border-2 border-[#172033]'
          }`}
        >
          <div className={`w-5 h-5 rounded-md flex-shrink-0 mt-0.5 flex items-center justify-center text-xs font-bold transition-all ${
            sworn
              ? 'bg-[#00E4B8] text-[#060A11] border-2 border-[#00E4B8]'
              : 'bg-transparent border-2 border-[#253046]'
          }`}>
            {sworn && '✓'}
          </div>
          <div className="text-xs text-[#8293AA] leading-relaxed">
            I swear, under penalty of perjury, that the information in this notification is
            accurate and that I am the copyright owner, or am authorized to act on behalf of
            the owner, of an exclusive right that is allegedly infringed.
          </div>
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!sworn || sending}
          className="w-full bg-[#00E4B8] text-[#060A11] font-extrabold text-base py-4 rounded-xl shadow-[0_0_24px_rgba(0,228,184,0.22)] disabled:opacity-35 cursor-pointer border-none transition-all"
        >
          {sending ? '⚡ Sending DMCA Notice...' : '⚡ Send DMCA Takedown'}
        </button>
      </div>
    </div>
  );
}
