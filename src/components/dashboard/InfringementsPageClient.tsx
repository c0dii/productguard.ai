'use client';

import { useState, useMemo } from 'react';
import { InfringementList } from '@/components/dashboard/InfringementList';
import Link from 'next/link';
import { getPlatformDisplayName } from '@/lib/utils/platform-display';

interface Infringement {
  id: string;
  source_url: string;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  platform: string;
  audience_size: string;
  est_revenue_loss: number;
  priority: 'P0' | 'P1' | 'P2';
  severity_score: number;
  status: string;
  infrastructure: {
    country?: string | null;
    [key: string]: any;
  } | null;
  products?: {
    name: string;
    price: number;
  } | null;
  [key: string]: any;
}

interface InfringementsPageClientProps {
  infringements: Infringement[];
  allProducts: Array<{ id: string; name: string }>;
  totalRevenueLoss: number;
}

type FilterOption = 'actionable' | 'in_progress' | 'resolved' | 'dismissed' | 'all';

const STATUS_FILTERS: { key: FilterOption; label: string; statuses: string[]; activeClass: string }[] = [
  {
    key: 'actionable',
    label: 'Actionable',
    statuses: ['pending_verification', 'active'],
    activeClass: 'bg-pg-accent text-white shadow-lg shadow-pg-accent/30',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    statuses: ['takedown_sent', 'disputed'],
    activeClass: 'bg-blue-600 text-white shadow-lg shadow-blue-600/30',
  },
  {
    key: 'resolved',
    label: 'Resolved',
    statuses: ['removed'],
    activeClass: 'bg-green-600 text-white shadow-lg shadow-green-600/30',
  },
  {
    key: 'dismissed',
    label: 'Dismissed',
    statuses: ['false_positive', 'archived'],
    activeClass: 'bg-gray-500 text-white shadow-lg shadow-gray-500/30',
  },
  {
    key: 'all',
    label: 'All',
    statuses: [],
    activeClass: 'bg-gray-600 text-white shadow-lg shadow-gray-600/30',
  },
];

export function InfringementsPageClient({ infringements, allProducts, totalRevenueLoss }: InfringementsPageClientProps) {
  const [filter, setFilter] = useState<FilterOption>('actionable');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');

  // All products with infringement counts (shows all products, even those with 0 infringements)
  const availableProducts = useMemo(() => {
    const counts = new Map<string, number>();
    infringements.forEach((inf) => {
      if (inf.product_id) {
        counts.set(inf.product_id, (counts.get(inf.product_id) || 0) + 1);
      }
    });
    return allProducts
      .map((p) => [p.id, p.name, counts.get(p.id) || 0] as [string, string, number])
      .sort((a, b) => a[1].localeCompare(b[1]));
  }, [infringements, allProducts]);

  // Extract unique platforms from infringement URLs, sorted by count (top 20 + Other)
  const availablePlatforms = useMemo(() => {
    const platformCounts = new Map<string, number>();
    infringements.forEach((inf) => {
      const name = getPlatformDisplayName(inf.source_url);
      platformCounts.set(name, (platformCounts.get(name) || 0) + 1);
    });
    const sorted = Array.from(platformCounts.entries())
      .sort((a, b) => b[1] - a[1]);
    const top20 = sorted.slice(0, 20);
    const otherCount = sorted.slice(20).reduce((sum, [, count]) => sum + count, 0);
    return { top20, otherCount, otherNames: new Set(sorted.slice(20).map(([name]) => name)) };
  }, [infringements]);

  // Extract unique countries from infringements
  const availableCountries = useMemo(() => {
    const countryCounts = new Map<string, number>();
    infringements.forEach((inf) => {
      const country = inf.infrastructure?.country;
      if (country) {
        countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
      }
    });
    return Array.from(countryCounts.entries())
      .sort((a, b) => b[1] - a[1]);
  }, [infringements]);

  // Apply product, platform, and country filters first
  const baseFiltered = useMemo(() => {
    let result = infringements;

    if (selectedProduct !== 'all') {
      result = result.filter((i) => i.product_id === selectedProduct);
    }
    if (selectedPlatform !== 'all') {
      if (selectedPlatform === '__other__') {
        result = result.filter((i) => availablePlatforms.otherNames.has(getPlatformDisplayName(i.source_url)));
      } else {
        result = result.filter((i) => getPlatformDisplayName(i.source_url) === selectedPlatform);
      }
    }
    if (selectedCountry !== 'all') {
      result = result.filter((i) => i.infrastructure?.country === selectedCountry);
    }

    return result;
  }, [infringements, selectedProduct, selectedPlatform, selectedCountry, availablePlatforms]);

  // Then apply status filter
  const filteredInfringements = useMemo(() => {
    const activeFilter = STATUS_FILTERS.find((f) => f.key === filter);
    if (!activeFilter || activeFilter.key === 'all') return baseFiltered;
    return baseFiltered.filter((i) => activeFilter.statuses.includes(i.status));
  }, [baseFiltered, filter]);

  const getTitle = () => {
    switch (filter) {
      case 'actionable': return 'Needs Your Attention';
      case 'in_progress': return 'In Progress';
      case 'resolved': return 'Resolved';
      case 'dismissed': return 'Dismissed';
      default: return 'All Infringements';
    }
  };

  const getEmptyMessage = () => {
    switch (filter) {
      case 'actionable': return 'Nothing needs your attention right now. All detected threats have been addressed.';
      case 'in_progress': return 'No takedowns in progress.';
      case 'resolved': return 'No resolved infringements yet.';
      case 'dismissed': return 'No dismissed or whitelisted items.';
      default: return 'No infringements found. Run a scan to start detecting threats.';
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        {/* Product Filter */}
        {availableProducts.length > 0 && (
          <div>
            <label htmlFor="product-filter" className="block text-sm font-medium text-pg-text-muted mb-2">
              Filter by Product
            </label>
            <select
              id="product-filter"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="input-field w-full sm:w-72"
            >
              <option value="all">All Products ({availableProducts.length})</option>
              {availableProducts.map(([productId, productName, count]) => (
                <option key={productId} value={productId}>
                  {productName} ({count})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Platform Filter */}
        {availablePlatforms.top20.length > 1 && (
          <div>
            <label htmlFor="platform-filter" className="block text-sm font-medium text-pg-text-muted mb-2">
              Filter by Platform
            </label>
            <select
              id="platform-filter"
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="input-field w-full sm:w-72"
            >
              <option value="all">All Platforms</option>
              {availablePlatforms.top20.map(([name, count]) => (
                <option key={name} value={name}>
                  {name} ({count})
                </option>
              ))}
              {availablePlatforms.otherCount > 0 && (
                <option value="__other__">Other ({availablePlatforms.otherCount})</option>
              )}
            </select>
          </div>
        )}

        {/* Country Filter */}
        {availableCountries.length > 0 && (
          <div>
            <label htmlFor="country-filter" className="block text-sm font-medium text-pg-text-muted mb-2">
              Filter by Country
            </label>
            <select
              id="country-filter"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="input-field w-full sm:w-64"
            >
              <option value="all">All Countries ({infringements.length})</option>
              {availableCountries.map(([country, count]) => (
                <option key={country} value={country}>
                  {country} ({count})
                </option>
              ))}
            </select>
            <p className="text-xs text-pg-text-muted mt-1">
              US-based sites are typically easier to take down (DMCA laws)
            </p>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {STATUS_FILTERS.map((tab) => {
            const count = tab.key === 'all'
              ? baseFiltered.length
              : baseFiltered.filter((i) => tab.statuses.includes(i.status)).length;

            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                  filter === tab.key
                    ? tab.activeClass
                    : 'bg-pg-surface text-pg-text-muted hover:bg-pg-surface-light hover:text-pg-text border border-pg-border'
                }`}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Infringements List */}
      {filteredInfringements.length > 0 ? (
        <InfringementList
          infringements={filteredInfringements}
          productPrice={0}
          title={getTitle()}
          emptyMessage={getEmptyMessage()}
          showProductName={true}
          hideCountryFilter={true}
        />
      ) : (
        <div className="p-6 sm:p-12 rounded-xl sm:rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border">
          <div className="text-center">
            <p className="text-lg sm:text-xl font-semibold mb-2 text-pg-text">{getTitle()}</p>
            <p className="text-sm sm:text-base text-pg-text-muted mb-4">{getEmptyMessage()}</p>
            <Link
              href="/dashboard/scans"
              className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
            >
              Run New Scan
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
