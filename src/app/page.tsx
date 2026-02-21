'use client';

import Link from 'next/link';
import { PLAN_LIMITS } from '@/types';
import { useState } from 'react';

export default function HomePage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  const plans = [
    { tier: 'scout' as const, name: 'Scout', description: 'Try it free — no card needed' },
    { tier: 'starter' as const, name: 'Starter', description: 'For solo creators protecting their work', popular: true },
    { tier: 'pro' as const, name: 'Pro', description: 'For creators with multiple products' },
    { tier: 'business' as const, name: 'Business', description: 'For teams and agencies' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0E1A] via-[#0F1629] to-[#0A0A0F] text-white overflow-hidden">
      {/* Enhanced Gradient Mesh Background */}
      <div className="fixed inset-0 -z-10">
        {/* Primary blue glow - top right */}
        <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-gradient-to-br from-blue-600/30 via-blue-500/20 to-transparent rounded-full blur-3xl"></div>
        {/* Secondary blue glow - center */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-cyan-500/20 via-blue-600/25 to-purple-600/20 rounded-full blur-3xl"></div>
        {/* Bottom left accent */}
        <div className="absolute bottom-0 left-0 w-[700px] h-[700px] bg-gradient-to-tr from-blue-700/25 via-cyan-600/15 to-transparent rounded-full blur-3xl"></div>
        {/* Additional ambient glow */}
        <div className="absolute top-1/2 right-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0A0A0F]/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="text-white font-bold text-2xl relative z-10">P</span>
              </div>
              <span className="text-2xl font-bold">
                ProductGuard<span className="text-cyan-400">.ai</span>
              </span>
            </Link>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-400 hover:text-white transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-gray-400 hover:text-white transition-colors">
                How It Works
              </a>
              <a href="#pricing" className="text-gray-400 hover:text-white transition-colors">
                Pricing
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-4">
              <Link
                href="/auth/login"
                className="text-gray-400 hover:text-white transition-colors font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="relative px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative z-10">Get Started</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-5xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-8">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              <span className="text-sm text-gray-300">AI-Powered Piracy Protection for Creators</span>
            </div>

            {/* Headline */}
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight">
              Stop Losing Revenue to
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                Digital Piracy
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto">
              Find stolen copies of your courses, software, and digital products across 50+ platforms — then take them down with one click.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link
                href="/auth/signup"
                className="group relative px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold text-lg overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Start Free Scan
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </Link>
              <Link
                href="#how-it-works"
                className="px-8 py-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 font-semibold text-lg hover:bg-white/10 transition-colors"
              >
                See How It Works
              </Link>
            </div>

            <p className="text-sm text-gray-500">
              ✓ No credit card required  •  ✓ 2-minute setup  •  ✓ Cancel anytime
            </p>
          </div>

          {/* Dashboard Mockup */}
          <div className="mt-24 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-transparent to-transparent z-10"></div>
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl p-1">
              <div className="bg-[#0F0F14] rounded-xl p-8">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {/* Stat Card 1 - Total Scans */}
                  <div className="h-32 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 p-4 flex flex-col justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-2xl">🔍</div>
                      <span className="text-xs text-gray-400 uppercase tracking-wide">Total Scans</span>
                    </div>
                    <div className="text-3xl font-bold text-cyan-400">1,247</div>
                  </div>

                  {/* Stat Card 2 - Infringements Found */}
                  <div className="h-32 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 p-4 flex flex-col justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-2xl">🚨</div>
                      <span className="text-xs text-gray-400 uppercase tracking-wide">Infringements</span>
                    </div>
                    <div className="text-3xl font-bold text-red-400">342</div>
                  </div>

                  {/* Stat Card 3 - Takedowns Sent */}
                  <div className="h-32 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 p-4 flex flex-col justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-2xl">⚡</div>
                      <span className="text-xs text-gray-400 uppercase tracking-wide">Takedowns</span>
                    </div>
                    <div className="text-3xl font-bold text-green-400">89</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { value: '$2.5M+', label: 'Revenue Protected' },
              { value: '15K+', label: 'Infringements Removed' },
              { value: '500+', label: 'Creators Protected' },
            ].map((stat, i) => (
              <div key={i} className="text-center group">
                <div className="text-6xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                  {stat.value}
                </div>
                <div className="text-gray-400 text-lg">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Find It. Flag It. Take It Down.
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Everything you need to detect piracy and protect your revenue
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: '🔍',
                title: 'Automated Scanning',
                description: 'We scan Google, Telegram, Discord, torrents, and 50+ platforms so you don\'t have to',
              },
              {
                icon: '🤖',
                title: 'AI-Powered Detection',
                description: 'Our AI spots piracy patterns, name variations, and sneaky repackaging others miss',
              },
              {
                icon: '📧',
                title: 'One-Click Takedowns',
                description: 'Generate and send legally compliant DMCA notices in seconds — not hours',
              },
              {
                icon: '💬',
                title: 'Telegram Monitoring',
                description: 'Track the channels where 40% of digital product piracy actually happens',
              },
              {
                icon: '📊',
                title: 'Revenue Impact',
                description: 'See exactly how much piracy is costing you — and how much you\'ve recovered',
              },
              {
                icon: '⚡',
                title: 'Real-Time Alerts',
                description: 'Get notified the moment a new unauthorized copy appears',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group relative p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-blue-500/0 group-hover:from-cyan-500/10 group-hover:to-blue-500/10 rounded-2xl transition-all"></div>
                <div className="relative z-10">
                  <div className="text-5xl mb-4">{feature.icon}</div>
                  <h3 className="text-2xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">How It Works</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              From setup to takedown in under 5 minutes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { step: '01', title: 'Add Your Product', desc: 'Paste your product URL and we\'ll auto-fill the details — name, price, keywords, everything' },
              { step: '02', title: 'We Scan the Web', desc: 'Our AI searches 50+ platforms for unauthorized copies, torrents, and leaked downloads' },
              { step: '03', title: 'Take It Down', desc: 'Review what we found, then send DMCA takedown notices with one click' },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="absolute -top-6 -left-6 text-9xl font-bold text-white/5 select-none">
                  {item.step}
                </div>
                <div className="relative z-10">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-3xl font-bold mb-6">
                    {i + 1}
                  </div>
                  <h3 className="text-3xl font-bold mb-4">{item.title}</h3>
                  <p className="text-gray-400 text-lg leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">Trusted by Creators</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Hear from creators who stopped losing revenue to piracy
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Sarah Chen',
                role: 'Course Creator',
                avatar: '👩‍💼',
                content: 'ProductGuard.ai recovered over $50K in lost revenue in just 3 months. The AI detection is incredibly accurate and saved me countless hours of manual searching.',
                rating: 5,
              },
              {
                name: 'Marcus Rodriguez',
                role: 'SaaS Founder',
                avatar: '👨‍💻',
                content: 'Best investment for my digital products. The one-click DMCA takedowns are a game changer. I can focus on creating instead of chasing pirates.',
                rating: 5,
              },
              {
                name: 'Emily Thompson',
                role: 'Digital Artist',
                avatar: '👩‍🎨',
                content: 'Finally, a solution that actually works. The Telegram monitoring alone has been worth every penny. Highly recommend to any digital creator!',
                rating: 5,
              },
            ].map((testimonial, i) => (
              <div
                key={i}
                className="p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
              >
                {/* Rating Stars */}
                <div className="flex gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-5 h-5 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* Content */}
                <p className="text-gray-300 text-lg leading-relaxed mb-8">
                  "{testimonial.content}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-2xl">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{testimonial.name}</div>
                    <div className="text-sm text-gray-400">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-400 mb-8">Start free. Upgrade when you're ready for more protection.</p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-4 p-1 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-2 rounded-full transition-all ${
                  billingPeriod === 'monthly'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={`px-6 py-2 rounded-full transition-all ${
                  billingPeriod === 'annual'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Annual <span className="text-green-400 text-xs ml-1">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan) => {
              const limits = PLAN_LIMITS[plan.tier];
              const price = billingPeriod === 'annual' && limits.priceUsd
                ? Math.round(limits.priceUsd * 0.8)
                : limits.priceUsd;

              return (
                <div
                  key={plan.tier}
                  className={`relative p-8 rounded-2xl backdrop-blur-xl transition-all duration-300 ${
                    plan.popular
                      ? 'bg-gradient-to-br from-blue-600/30 via-cyan-500/20 to-blue-700/30 border-2 border-blue-500/50 scale-105 shadow-2xl shadow-blue-500/30'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-0 right-0 flex justify-center">
                      <span className="px-4 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-sm font-semibold shadow-lg shadow-cyan-500/50">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-8">
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-gray-400 text-sm">{plan.description}</p>
                  </div>

                  <div className="mb-8">
                    {price ? (
                      <>
                        <span className="text-5xl font-bold">${price}</span>
                        <span className="text-gray-400">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                      </>
                    ) : (
                      <span className="text-5xl font-bold">Free</span>
                    )}
                  </div>

                  <ul className="space-y-4 mb-8">
                    <li className="flex items-center gap-3 text-gray-300">
                      <svg className="w-5 h-5 text-cyan-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {limits.products === 999999 ? 'Unlimited' : limits.products} products
                    </li>
                    <li className="flex items-center gap-3 text-gray-300">
                      <svg className="w-5 h-5 text-cyan-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {limits.scanFrequency}
                    </li>
                    <li className="flex items-center gap-3 text-gray-300">
                      <svg className="w-5 h-5 text-cyan-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      DMCA takedowns
                    </li>
                  </ul>

                  <Link
                    href="/auth/signup"
                    className={`block text-center py-4 rounded-xl font-semibold transition-all ${
                      plan.popular
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    Get Started
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 blur-3xl"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            Ready to Protect Your Revenue?
          </h2>
          <p className="text-xl text-gray-400 mb-10">
            Every day you wait, pirates are profiting from your work. Start scanning for free.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block px-10 py-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-xl hover:scale-105 transition-transform"
          >
            Start Free Scan →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">P</span>
                </div>
                <span className="text-xl font-bold">ProductGuard.ai</span>
              </div>
              <p className="text-gray-400 text-sm">
                AI-powered piracy protection for digital creators
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><Link href="/auth/signup" className="hover:text-white transition-colors">Get Started</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">DMCA</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <p>&copy; 2026 ProductGuard.ai. All rights reserved.</p>
            <p>Built by Ease Web Development • Odessa, Texas</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
