import Link from 'next/link';
import type { Metadata } from 'next';
import { ForceDarkMode } from '@/components/landing/ForceDarkMode';
import { MobileNav } from '@/components/landing/MobileNav';
import { PricingSection } from '@/components/landing/PricingSection';
import { FAQSection } from '@/components/landing/FAQSection';

export const metadata: Metadata = {
  title: 'ProductGuard.ai — Find Where Your Content Is Being Pirated & Take It Down',
  description:
    'AI-powered piracy protection for digital creators. Find unauthorized copies of your courses, templates, and digital products across Telegram, Google, torrents & 50+ platforms. One-click DMCA takedowns. Start free.',
  openGraph: {
    title: 'ProductGuard.ai — AI-Powered Piracy Protection for Creators',
    description:
      'Find where your digital products are being pirated and take them down. Automated monitoring across 50+ platforms. Start with a free scan.',
    type: 'website',
    siteName: 'ProductGuard.ai',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ProductGuard.ai — Stop Digital Piracy',
    description: 'Find and take down pirated copies of your courses, templates, and digital products. AI-powered. Start free.',
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-pg-bg text-pg-text overflow-hidden">
      {/* Force dark theme on landing page regardless of user preference */}
      <ForceDarkMode />
      {/* Gradient Mesh Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-gradient-to-br from-blue-600/20 via-blue-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-cyan-500/10 via-blue-600/15 to-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[700px] h-[700px] bg-gradient-to-tr from-blue-700/15 via-cyan-600/10 to-transparent rounded-full blur-3xl" />
      </div>

      {/* ================================================================ */}
      {/* NAVIGATION                                                       */}
      {/* ================================================================ */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-pg-bg/80 border-b border-pg-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-xl">P</span>
              </div>
              <span className="text-xl font-bold">
                ProductGuard<span className="text-cyan-400">.ai</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <a href="#problem" className="text-pg-text-muted hover:text-pg-text transition-colors text-sm">Why ProductGuard</a>
              <a href="#features" className="text-pg-text-muted hover:text-pg-text transition-colors text-sm">Features</a>
              <a href="#how-it-works" className="text-pg-text-muted hover:text-pg-text transition-colors text-sm">How It Works</a>
              <a href="#pricing" className="text-pg-text-muted hover:text-pg-text transition-colors text-sm">Pricing</a>
              <a href="#faq" className="text-pg-text-muted hover:text-pg-text transition-colors text-sm">FAQ</a>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/auth/login" className="hidden sm:block text-pg-text-muted hover:text-pg-text transition-colors text-sm font-medium">
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="hidden sm:block px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold text-sm hover:from-cyan-400 hover:to-blue-500 transition-all"
              >
                Scan for Piracy — Free
              </Link>
              <MobileNav />
            </div>
          </div>
        </div>
      </nav>

      {/* ================================================================ */}
      {/* HERO                                                              */}
      {/* ================================================================ */}
      <section className="relative pt-20 sm:pt-28 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-pg-border mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-pg-text-muted">AI-Powered Piracy Protection for Digital Creators</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1]">
            Someone Is Selling{' '}
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Your Work Right Now
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-pg-text-muted mb-10 max-w-2xl mx-auto leading-relaxed">
            ProductGuard finds unauthorized copies of your courses, templates, software,
            and digital products across Telegram, Google, torrents & 50+ platforms —
            then helps you take them down with one click.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Link
              href="/auth/signup"
              className="group px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold text-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20"
            >
              <span className="flex items-center justify-center gap-2">
                Scan for Piracy — Free
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-4 rounded-xl bg-white/5 border border-pg-border font-semibold text-lg hover:bg-white/10 hover:border-pg-border-light transition-all"
            >
              See How It Works
            </a>
          </div>

          <p className="text-sm text-pg-text-muted/60">
            No credit card required &nbsp;·&nbsp; 2-minute setup &nbsp;·&nbsp; Cancel anytime
          </p>

          {/* Dashboard Mockup — Light theme to pop against dark background */}
          <div className="mt-16 sm:mt-20 relative">
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-pg-bg via-pg-bg/80 to-transparent z-10" />
            {/* Glow effect behind the card */}
            <div className="absolute inset-4 bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-purple-500/10 rounded-3xl blur-2xl" />
            <div className="relative rounded-2xl overflow-hidden border border-white/20 bg-white shadow-2xl shadow-cyan-500/10 p-1">
              <div className="bg-gray-50 rounded-xl p-4 sm:p-8">
                {/* Window chrome */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <div className="flex-1 mx-4">
                    <div className="h-7 bg-white rounded-lg flex items-center px-3 border border-gray-200">
                      <svg className="w-3 h-3 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      <span className="text-xs text-gray-500 font-mono">app.productguard.ai/dashboard</span>
                    </div>
                  </div>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="rounded-xl bg-white border border-gray-200 p-3 sm:p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-cyan-50 flex items-center justify-center">
                        <svg className="w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      </div>
                      <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide font-semibold">Scans Run</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-cyan-600">24</div>
                  </div>
                  <div className="rounded-xl bg-white border border-gray-200 p-3 sm:p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                        <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                      </div>
                      <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide font-semibold">Pirated Copies</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-red-500">17</div>
                  </div>
                  <div className="rounded-xl bg-white border border-gray-200 p-3 sm:p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide font-semibold">Taken Down</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-green-500">12</div>
                  </div>
                </div>

                {/* Infringement feed */}
                <div className="rounded-xl bg-white border border-gray-200 p-3 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Recent Infringements</span>
                    <span className="text-xs text-cyan-600 font-semibold cursor-pointer hover:text-cyan-700">View All</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { platform: 'Telegram', name: 'Premium Trading Course 2025 [FREE]', severity: 'high', time: '2h ago' },
                      { platform: 'Mega.nz', name: 'complete-course-bundle-download.zip', severity: 'critical', time: '5h ago' },
                      { platform: 'Google', name: 'Your Product Name free download torrent', severity: 'medium', time: '1d ago' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-50 border border-gray-100 text-xs sm:text-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            item.severity === 'critical' ? 'bg-red-500' :
                            item.severity === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
                          }`} />
                          <span className="text-gray-500 font-semibold w-16 flex-shrink-0">{item.platform}</span>
                          <span className="text-gray-800 font-medium truncate">{item.name}</span>
                        </div>
                        <span className="text-gray-400 flex-shrink-0 ml-2 hidden sm:block text-xs">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* TRUST BAR                                                         */}
      {/* ================================================================ */}
      <section className="py-16 border-y border-pg-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Capabilities */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-12">
            {[
              { value: '50+', label: 'Platforms Monitored' },
              { value: '30s', label: 'Avg. Takedown Time' },
              { value: '24/7', label: 'Automated Scanning' },
              { value: '100%', label: 'DMCA Compliant' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-pg-text-muted">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Platform logos */}
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-pg-text-muted/50 mb-4">
              Protects creators selling on
            </p>
            <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-3 text-pg-text-muted/40">
              {['Teachable', 'Gumroad', 'Kajabi', 'TradingView', 'Etsy', 'Creative Market', 'Udemy', 'Podia'].map((platform) => (
                <span key={platform} className="text-sm font-medium tracking-wide">{platform}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* PROBLEM SECTION                                                   */}
      {/* ================================================================ */}
      <section id="problem" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
              Piracy Is Costing You More Than You Think
            </h2>
            <p className="text-lg text-pg-text-muted leading-relaxed">
              Right now, someone is sharing your digital product for free. Your course is on Telegram channels.
              Your templates are on file-sharing sites. Your trading indicators have been cracked.
              And you probably don&apos;t even know about most of it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'You can\'t fight what you can\'t see',
                description: 'Most creators only discover a fraction of piracy. Unauthorized copies live on Telegram, Discord, torrent sites, cyberlockers, and forums you\'ve never heard of.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Manual DMCA is a full-time job',
                description: 'Each takedown notice takes 2-4 hours to research, draft, and send. With dozens of infringements across platforms, it\'s impossible to keep up.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Enterprise tools aren\'t built for you',
                description: 'Anti-piracy firms charge $1,000+/month and require sales calls. They\'re built for legal departments, not independent creators selling $29-$299 products.',
              },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-xl bg-pg-surface/30 border border-pg-border">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-pg-text-muted text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>

          {/* Transition to solution */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              There&apos;s a better way
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* FEATURES                                                          */}
      {/* ================================================================ */}
      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Find It. Flag It. Take It Down.
            </h2>
            <p className="text-lg text-pg-text-muted max-w-2xl mx-auto">
              Everything you need to detect piracy and protect your revenue — without the enterprise price tag
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                ),
                iconClass: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
                title: 'Find Every Pirated Copy',
                description: 'Automated scanning across Google, Telegram, Discord, torrents, cyberlockers, and 50+ platforms. We look where you\'d never think to.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ),
                iconClass: 'from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-400',
                title: 'AI That Thinks Like a Pirate',
                description: 'Our AI catches name variations, repackaging, and evasion tactics that simple keyword searches miss entirely.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                iconClass: 'from-green-500/10 to-green-500/5 border-green-500/20 text-green-400',
                title: 'One-Click DMCA Takedowns',
                description: 'Generate and send legally compliant takedown notices in 30 seconds — not the 2-4 hours it takes manually.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                ),
                iconClass: 'from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-400',
                title: 'Telegram Deep Monitoring',
                description: 'Over 40% of creator content piracy happens on Telegram. Most tools don\'t even look there. We do.',
                highlight: true,
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                iconClass: 'from-orange-500/10 to-orange-500/5 border-orange-500/20 text-orange-400',
                title: 'See the Dollar Impact',
                description: 'Revenue impact reporting shows exactly what piracy is costing you — and how much you\'ve recovered through takedowns.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                ),
                iconClass: 'from-yellow-500/10 to-yellow-500/5 border-yellow-500/20 text-yellow-400',
                title: 'Real-Time Alerts',
                description: 'Get notified the moment a new unauthorized copy appears. Catch infringements within hours, not weeks.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className={`group relative p-6 rounded-xl bg-pg-surface/30 border border-pg-border hover:border-pg-border-light transition-all duration-300 ${
                  feature.highlight ? 'md:ring-1 md:ring-blue-500/30' : ''
                }`}
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br border flex items-center justify-center mb-4 ${feature.iconClass}`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-pg-text-muted text-sm leading-relaxed">{feature.description}</p>
                {feature.highlight && (
                  <div className="mt-3 inline-flex items-center gap-1 text-xs text-blue-400 font-medium">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                    Key differentiator
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* HOW IT WORKS                                                      */}
      {/* ================================================================ */}
      <section id="how-it-works" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              From Setup to Takedown in Minutes
            </h2>
            <p className="text-lg text-pg-text-muted max-w-2xl mx-auto">
              No technical skills needed. No legal knowledge required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                step: '1',
                title: 'Add Your Product',
                description: 'Paste your product URL and we auto-fill the details — name, price, keywords, everything. Takes about 30 seconds.',
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                ),
              },
              {
                step: '2',
                title: 'We Scan the Internet',
                description: 'Our AI searches 50+ platforms for unauthorized copies — Telegram, Google, torrents, cyberlockers, forums, and more.',
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                ),
              },
              {
                step: '3',
                title: 'Take Them Down',
                description: 'Review what we found, then send legally compliant DMCA takedown notices with one click. Track removal status in real time.',
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
              },
            ].map((item, i) => (
              <div key={i} className="relative text-center md:text-left">
                {/* Connector line (desktop only) */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-10 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px bg-gradient-to-r from-pg-border to-pg-border/0" />
                )}

                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 mb-6">
                  {item.icon}
                </div>
                <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2">Step {item.step}</div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-pg-text-muted leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* COMPARISON                                                        */}
      {/* ================================================================ */}
      <section className="py-24 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Enterprise Protection, Creator-Friendly Price
            </h2>
            <p className="text-lg text-pg-text-muted max-w-2xl mx-auto">
              You shouldn&apos;t need a legal department to protect your work
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pg-border">
                  <th className="text-left py-4 pr-4 text-pg-text-muted font-medium" />
                  <th className="py-4 px-4 text-pg-text-muted font-medium text-center">DIY / Manual</th>
                  <th className="py-4 px-4 text-pg-text-muted font-medium text-center">Enterprise Firms</th>
                  <th className="py-4 px-4 text-center">
                    <span className="text-cyan-400 font-bold">ProductGuard</span>
                  </th>
                </tr>
              </thead>
              <tbody className="text-pg-text-muted">
                {[
                  { label: 'Price', diy: '$0 (your time)', enterprise: '$199–$1,000+/mo', pg: '$29–$299/mo', pgHighlight: true },
                  { label: 'Setup', diy: 'N/A', enterprise: 'Sales call required', pg: '2 minutes' },
                  { label: 'Monitoring', diy: 'Manual search', enterprise: 'Automated', pg: 'Automated + AI' },
                  { label: 'Telegram', diy: 'No', enterprise: 'Rarely', pg: 'Yes — deep monitoring' },
                  { label: 'Takedowns', diy: '2-4 hrs each', enterprise: 'Managed (slow)', pg: 'One-click, 30 sec' },
                  { label: 'Built for', diy: 'Anyone', enterprise: 'Legal teams', pg: 'Creators like you' },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-pg-border/50">
                    <td className="py-3 pr-4 font-medium text-pg-text whitespace-nowrap">{row.label}</td>
                    <td className="py-3 px-4 text-center">{row.diy}</td>
                    <td className="py-3 px-4 text-center">{row.enterprise}</td>
                    <td className={`py-3 px-4 text-center font-medium ${row.pgHighlight ? 'text-cyan-400' : 'text-pg-text'}`}>
                      {row.pg}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* TESTIMONIALS                                                      */}
      {/* ================================================================ */}
      {/* TODO: Replace with real testimonial data once available */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Creators Who Took Back Control
            </h2>
            <p className="text-lg text-pg-text-muted max-w-2xl mx-auto">
              Join creators who stopped losing revenue to piracy
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* TODO: Replace placeholder testimonials with real customer stories */}
            {[
              {
                name: 'Sarah C.',
                role: 'Course Creator • Teachable',
                content: 'I had no idea my course was on 8 different Telegram channels. ProductGuard found them all in the first scan and helped me send takedowns the same day. I wish I\'d found this months ago.',
                metric: '8 pirated copies found & removed',
              },
              {
                name: 'Marcus R.',
                role: 'Trading Indicator Developer • TradingView',
                content: 'My indicators were being cracked and shared everywhere. The automated monitoring catches new copies within hours now, not weeks. The one-click DMCA saves me hours every week.',
                metric: 'Saves 5+ hours per week',
              },
              {
                name: 'Emily T.',
                role: 'Template Designer • Creative Market',
                content: 'I was spending entire evenings searching for stolen copies of my templates and drafting takedown notices. Now it takes me 5 minutes a week. Game changer for solo creators.',
                metric: 'From hours to minutes',
              },
            ].map((testimonial, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-pg-surface/30 border border-pg-border"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                <p className="text-pg-text/90 leading-relaxed mb-4">
                  &ldquo;{testimonial.content}&rdquo;
                </p>

                <div className="text-xs font-semibold text-cyan-400 mb-4">
                  {testimonial.metric}
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-pg-border/50">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-sm font-bold">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{testimonial.name}</div>
                    <div className="text-xs text-pg-text-muted">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* PRICING                                                           */}
      {/* ================================================================ */}
      <PricingSection />

      {/* ================================================================ */}
      {/* FAQ                                                               */}
      {/* ================================================================ */}
      <FAQSection />

      {/* ================================================================ */}
      {/* FINAL CTA                                                         */}
      {/* ================================================================ */}
      <section className="py-24 sm:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 blur-3xl" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            Your Content Is Being Stolen Right Now.
            <br />
            <span className="text-pg-text-muted">Find Out Where.</span>
          </h2>
          <p className="text-lg text-pg-text-muted mb-10 max-w-xl mx-auto">
            Every day you wait, pirates are profiting from your work.
            Run your first scan free — no credit card, no commitment.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20"
            >
              Scan for Piracy — Free
            </Link>
            <a
              href="#pricing"
              className="px-8 py-4 rounded-xl bg-white/5 border border-pg-border font-semibold text-lg hover:bg-white/10 transition-all"
            >
              View Pricing
            </a>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* FOOTER                                                            */}
      {/* ================================================================ */}
      <footer className="border-t border-pg-border py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">P</span>
                </div>
                <span className="text-lg font-bold">ProductGuard.ai</span>
              </div>
              <p className="text-pg-text-muted text-sm leading-relaxed">
                AI-powered piracy protection for digital creators. Find it. Flag it. Take it down.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-4">Product</h3>
              <ul className="space-y-2.5 text-sm text-pg-text-muted">
                <li><a href="#features" className="hover:text-pg-text transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-pg-text transition-colors">Pricing</a></li>
                <li><a href="#how-it-works" className="hover:text-pg-text transition-colors">How It Works</a></li>
                <li><a href="#faq" className="hover:text-pg-text transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-4">Company</h3>
              <ul className="space-y-2.5 text-sm text-pg-text-muted">
                {/* TODO: Add real links when pages exist */}
                <li><a href="#" className="hover:text-pg-text transition-colors">About</a></li>
                <li><a href="#" className="hover:text-pg-text transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-pg-text transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-4">Legal</h3>
              <ul className="space-y-2.5 text-sm text-pg-text-muted">
                {/* TODO: Add real links when pages exist */}
                <li><a href="#" className="hover:text-pg-text transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-pg-text transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-pg-text transition-colors">DMCA Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-pg-border pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-pg-text-muted">
            <p>&copy; 2026 ProductGuard.ai. All rights reserved.</p>
            <p>Built by Ease Web Development &bull; Odessa, Texas</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
