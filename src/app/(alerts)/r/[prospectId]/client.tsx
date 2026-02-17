// ============================================================
// Alerts Landing — Client Component
// src/app/(alerts)/r/[prospectId]/client.tsx
//
// Renders the pre-filled infringement analysis, blurred DMCA
// preview, and account creation CTA.
// ============================================================

'use client';

import { useRouter } from 'next/navigation';
import type { AlertsPageData } from '@/types/marketing';

const platformLabels: Record<string, { label: string; icon: string }> = {
  telegram: { label: 'Telegram Channel', icon: '💬' },
  cyberlocker: { label: 'Cyberlocker / File Host', icon: '📦' },
  torrent: { label: 'Torrent Site', icon: '🏴‍☠️' },
  discord: { label: 'Discord Server', icon: '🎮' },
  forum: { label: 'Pirate Forum', icon: '🕸️' },
  social_media: { label: 'Social Media', icon: '📱' },
  google_indexed: { label: 'Google Indexed Page', icon: '🔍' },
  other: { label: 'File Sharing', icon: '🌐' },
};

export default function AlertsLandingClient({ data }: { data: AlertsPageData }) {
  const router = useRouter();
  const platform = platformLabels[data.infringing_platform] ?? { label: 'File Sharing', icon: '🌐' };

  return (
    <div className="min-h-screen bg-[#060A11] text-[#E6EBF2] font-sans">
      <div className="max-w-2xl mx-auto px-5 py-12">

        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00E4B8] to-[#00B894] flex items-center justify-center text-sm font-black text-[#060A11]">
            P
          </div>
          <span className="text-base font-extrabold tracking-tight">
            ProductGuard<span className="text-[#00E4B8]">.ai</span>
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-extrabold mb-2 tracking-tight">
          Infringement Detected
        </h1>
        <p className="text-[#8293AA] text-sm mb-8 leading-relaxed">
          Our monitoring systems found unauthorized copies of your product being distributed online.
        </p>

        {/* Analysis Card */}
        <div className="bg-[rgba(255,59,83,0.06)] border border-[rgba(255,59,83,0.2)] rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[rgba(255,59,83,0.15)] text-[#FF3B53]">
              Infringement Detected
            </span>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#8293AA] mb-1">Platform</div>
              <div className="text-sm font-semibold">{platform.icon} {platform.label}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#8293AA] mb-1">Risk Level</div>
              <div className="text-sm font-bold text-[#FF3B53]">● Critical</div>
            </div>
            <div className="col-span-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#8293AA] mb-1">Your Product</div>
              <div className="text-base font-bold text-[#00E4B8]">{data.product_name}</div>
              {data.company_name && (
                <div className="text-xs text-[#8293AA] mt-0.5">by {data.company_name}</div>
              )}
            </div>
            <div className="col-span-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#8293AA] mb-1">Infringing URL</div>
              <div className="text-xs font-mono text-[#E6EBF2] bg-[#0B1018] px-3 py-2 rounded-lg break-all">
                {data.infringing_url}
              </div>
            </div>
            {data.audience_size && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8293AA] mb-1">Audience</div>
                <div className="text-sm font-bold text-[#FF3B53]">{data.audience_size}</div>
              </div>
            )}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#8293AA] mb-1">Confidence</div>
              <div className="text-sm font-bold text-[#00E4B8]">{data.confidence_score}%</div>
            </div>
            {data.est_revenue_loss && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8293AA] mb-1">Est. Revenue Loss</div>
                <div className="text-sm font-bold text-[#FF3B53]">{data.est_revenue_loss}</div>
              </div>
            )}
          </div>
        </div>

        {/* Screenshot evidence (if available) */}
        {data.screenshot_url && (
          <div className="bg-[#0F1525] border border-[#172033] rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-lg">📸</span>
              <div>
                <div className="text-sm font-bold">Screenshot Evidence</div>
                <div className="text-xs text-[#4D5E74]">Captured during detection scan</div>
              </div>
            </div>
            <img
              src={data.screenshot_url}
              alt="Infringement screenshot"
              className="w-full rounded-lg border border-[#172033]"
            />
          </div>
        )}

        {/* Blurred DMCA Preview */}
        <div className="relative rounded-xl overflow-hidden mb-6">
          <div className="blur-[5px] p-6 bg-[#0B1018] font-mono text-xs leading-relaxed text-[#4D5E74] select-none pointer-events-none">
            <div className="font-bold text-[#E6EBF2] mb-1">DMCA TAKEDOWN NOTICE</div>
            <div>Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div className="mt-1">To: Abuse Department / Designated DMCA Agent</div>
            <div className="mt-1">
              I am the copyright owner of &ldquo;{data.product_name}&rdquo;. I have identified
              infringing material hosted at the URL below. This letter constitutes formal
              notification under the DMCA (17 U.S.C. &sect; 512).
            </div>
            <div className="mt-1">Infringing URL: [REDACTED]</div>
            <div className="mt-1">
              I declare under penalty of perjury that this information is accurate and that I am
              authorized to act on behalf of the copyright owner.
            </div>
            <div className="mt-2 font-semibold">Signature: ________________________</div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(6,10,17,0.55)] backdrop-blur-sm">
            <div className="bg-[#0F1525] border border-[rgba(0,228,184,0.25)] rounded-2xl px-8 py-6 text-center shadow-[0_0_40px_rgba(0,228,184,0.08)]">
              <div className="text-2xl mb-2">🔒</div>
              <div className="text-base font-extrabold">Your DMCA letter is ready</div>
              <div className="text-xs text-[#8293AA] mt-1">Create a free account to unlock &amp; send</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={() => router.push(`/signup?ref=${data.prospect_id}`)}
            className="w-full max-w-sm bg-[#00E4B8] text-[#060A11] font-extrabold text-base py-4 px-8 rounded-xl shadow-[0_0_24px_rgba(0,228,184,0.22)] hover:shadow-[0_0_32px_rgba(0,228,184,0.35)] transition-shadow cursor-pointer border-none"
          >
            🔓 Create Free Account to Unlock
          </button>
          <p className="text-xs text-[#4D5E74] mt-3">
            No credit card required · 1 free DMCA takedown included
          </p>
        </div>
      </div>
    </div>
  );
}
