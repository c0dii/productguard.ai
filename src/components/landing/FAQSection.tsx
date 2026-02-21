'use client';

import { useState } from 'react';

const faqs = [
  {
    q: 'Is piracy really costing me money?',
    a: 'Yes. Studies show digital piracy costs creators 20-40% of potential revenue. If you sell a $200 course and it\'s shared on 10 Telegram channels with thousands of members, that\'s tens of thousands of dollars in lost sales. ProductGuard helps you see exactly where your content is being shared and estimate the revenue impact.',
  },
  {
    q: 'Can\'t I just send DMCA notices myself?',
    a: 'You can — but it takes 2-4 hours per notice to research the host, find the right contact, draft a legally compliant notice, and follow up. Most creators have dozens of infringements across platforms they don\'t even know about. ProductGuard automates discovery and generates proper DMCA notices in about 30 seconds.',
  },
  {
    q: 'What if ProductGuard doesn\'t find any piracy?',
    a: 'That\'s actually great news! Your free Scout scan will tell you if your content is being shared without permission. If nothing turns up, you can rest easy. If it does — and for most creators with any audience, it will — you\'ll know exactly where and can take action immediately.',
  },
  {
    q: 'Is sending DMCA takedowns legal? Will I get in trouble?',
    a: 'DMCA takedown notices are a legal right for copyright holders under US law (17 U.S.C. § 512). ProductGuard generates legally compliant notices and guides you through the process. You\'re simply enforcing your existing copyright — the same thing every major publisher and studio does.',
  },
  {
    q: 'I\'m not technical — is this hard to use?',
    a: 'Not at all. Add your product (paste a URL and we auto-fill the details), click "Scan," and we do the rest. When we find unauthorized copies, you review them and send takedowns with one click. The whole process takes minutes, not hours. No legal or technical knowledge required.',
  },
  {
    q: 'Will the takedowns actually get content removed?',
    a: 'Platforms are legally required to respond to valid DMCA notices. Google, Telegram, file hosts, and most platforms comply within 24-72 hours. ProductGuard tracks each takedown so you can see when content is actually removed. For repeat offenders, our higher-tier plans include cease & desist letters for additional legal weight.',
  },
  {
    q: 'Which platforms do you monitor?',
    a: 'We scan Google Search, Telegram channels and groups, Discord servers, torrent sites, cyberlockers (Mega, MediaFire, etc.), file-sharing forums, and 50+ other platforms where digital piracy happens. Telegram monitoring is included from the Starter plan — this is where over 40% of creator content piracy occurs.',
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-pg-text-muted">
            Everything you need to know about protecting your digital products
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-xl border border-pg-border bg-pg-surface/30 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className="font-medium text-pg-text pr-4">{faq.q}</span>
                <svg
                  className={`w-5 h-5 text-pg-text-muted flex-shrink-0 transition-transform duration-200 ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === i && (
                <div className="px-6 pb-5">
                  <p className="text-pg-text-muted leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
