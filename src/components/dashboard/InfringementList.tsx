'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { InfringementListItem } from '@/components/dashboard/InfringementListItem';

interface Infringement {
  id: string;
  source_url: string;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  platform: string;
  audience_size: string;
  est_revenue_loss: number;
  priority: 'P0' | 'P1' | 'P2';
  severity_score: number;
  infrastructure: {
    country?: string | null;
    [key: string]: any;
  } | null;
  [key: string]: any;
}

interface InfringementListProps {
  infringements: Infringement[];
  productPrice: number;
  scanId?: string;
  title: string;
  emptyMessage?: string;
  showProductName?: boolean;
}

export function InfringementList({
  infringements,
  productPrice,
  scanId,
  title,
  emptyMessage = 'No infringements found',
  showProductName = false,
}: InfringementListProps) {
  const [selectedCountry, setSelectedCountry] = useState<string>('all');

  // Extract unique countries from infringements
  const availableCountries = useMemo(() => {
    const countries = new Set<string>();
    infringements.forEach((inf) => {
      const country = inf.infrastructure?.country;
      if (country) {
        countries.add(country);
      }
    });
    return Array.from(countries).sort();
  }, [infringements]);

  // Filter infringements by selected country
  const filteredInfringements = useMemo(() => {
    if (selectedCountry === 'all') {
      return infringements;
    }
    return infringements.filter(
      (inf) => inf.infrastructure?.country === selectedCountry
    );
  }, [infringements, selectedCountry]);

  // Group by risk level
  const critical = filteredInfringements.filter((i) => i.risk_level === 'critical');
  const high = filteredInfringements.filter((i) => i.risk_level === 'high');
  const medium = filteredInfringements.filter((i) => i.risk_level === 'medium');
  const low = filteredInfringements.filter((i) => i.risk_level === 'low');

  return (
    <div>
      {/* Country Filter */}
      {availableCountries.length > 0 && (
        <div className="mb-6">
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
            {availableCountries.map((country) => {
              const count = infringements.filter(
                (inf) => inf.infrastructure?.country === country
              ).length;
              return (
                <option key={country} value={country}>
                  {country} ({count})
                </option>
              );
            })}
          </select>
          <p className="text-xs text-pg-text-muted mt-1">
            💡 Tip: US-based sites are typically easier to take down (DMCA laws)
          </p>
        </div>
      )}

      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">{title}</h2>

      {filteredInfringements.length === 0 ? (
        <Card>
          <p className="text-pg-text-muted text-center py-8">{emptyMessage}</p>
        </Card>
      ) : (
        <>
          {/* Critical */}
          {critical.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-pg-danger flex items-center">
                <span className="inline-block w-3 h-3 bg-pg-danger rounded-full mr-2"></span>
                Critical Risk ({critical.length})
              </h3>
              <div className="space-y-4">
                {critical.map((infringement) => (
                  <InfringementListItem key={infringement.id} infringement={infringement} productPrice={productPrice} scanId={scanId} showProductName={showProductName} />
                ))}
              </div>
            </div>
          )}

          {/* High */}
          {high.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-orange-500 flex items-center">
                <span className="inline-block w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                High Risk ({high.length})
              </h3>
              <div className="space-y-4">
                {high.map((infringement) => (
                  <InfringementListItem key={infringement.id} infringement={infringement} productPrice={productPrice} scanId={scanId} showProductName={showProductName} />
                ))}
              </div>
            </div>
          )}

          {/* Medium */}
          {medium.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-pg-warning flex items-center">
                <span className="inline-block w-3 h-3 bg-pg-warning rounded-full mr-2"></span>
                Medium Risk ({medium.length})
              </h3>
              <div className="space-y-4">
                {medium.map((infringement) => (
                  <InfringementListItem key={infringement.id} infringement={infringement} productPrice={productPrice} scanId={scanId} showProductName={showProductName} />
                ))}
              </div>
            </div>
          )}

          {/* Low */}
          {low.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-500 flex items-center">
                <span className="inline-block w-3 h-3 bg-gray-500 rounded-full mr-2"></span>
                Low Risk ({low.length})
              </h3>
              <div className="space-y-4">
                {low.map((infringement) => (
                  <InfringementListItem key={infringement.id} infringement={infringement} productPrice={productPrice} scanId={scanId} showProductName={showProductName} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
