'use client';

import { useState } from 'react';
import { TagInput } from '@/components/ui/TagInput';
import { ImageUpload } from '@/components/ui/ImageUpload';
import type { Product, ProductType } from '@/types';

interface EnhancedProductFormProps {
  product?: Product;
  onSave: (product: Partial<Product>) => void;
  onCancel: () => void;
  userId: string;
}

export function EnhancedProductForm({
  product,
  onSave,
  onCancel,
  userId,
}: EnhancedProductFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // Basic
    name: product?.name || '',
    brand_name: product?.brand_name || '',
    type: product?.type || 'course' as ProductType,
    price: product?.price || 0,
    release_date: product?.release_date || '',
    language: product?.language || 'English',

    // Identity
    product_image_url: product?.product_image_url || null,
    url: product?.url || '',
    description: product?.description || '',
    alternative_names: product?.alternative_names || [],
    unique_identifiers: product?.unique_identifiers || [],

    // Search Config
    keywords: product?.keywords || [],
    negative_keywords: product?.negative_keywords || [],
    min_price_threshold: product?.min_price_threshold || null,

    // Authorized Sales
    whitelist_domains: product?.whitelist_domains || [],
    authorized_sellers: product?.authorized_sellers || [],

    // Advanced
    copyright_number: product?.copyright_number || '',
    copyright_owner: product?.copyright_owner || '',
    tags: product?.tags || [],
    internal_notes: product?.internal_notes || '',
    file_hash: product?.file_hash || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Section 1: Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-pg-text border-b border-pg-border pb-2">
          Basic Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-pg-text mb-2">
              Product Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-pg-surface border border-pg-border text-pg-text placeholder:text-pg-text-muted focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-20"
              placeholder="The Squeeze Pro Indicator"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-pg-text mb-2">
              Brand / Creator Name
            </label>
            <input
              type="text"
              value={formData.brand_name}
              onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-pg-surface border border-pg-border text-pg-text placeholder:text-pg-text-muted focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-20"
              placeholder="Simpler Trading"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-pg-text mb-2">
              Product Type <span className="text-red-400">*</span>
            </label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as ProductType })}
              className="w-full px-4 py-2 rounded-lg bg-pg-surface border border-pg-border text-pg-text focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-20"
            >
              <option value="course">Course</option>
              <option value="indicator">Trading Indicator</option>
              <option value="software">Software</option>
              <option value="template">Template</option>
              <option value="ebook">E-Book</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-pg-text mb-2">
              Price (USD) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 rounded-lg bg-pg-surface border border-pg-border text-pg-text placeholder:text-pg-text-muted focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-20"
              placeholder="697.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-pg-text mb-2">
              Release Date
            </label>
            <input
              type="date"
              value={formData.release_date}
              onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-pg-surface border border-pg-border text-pg-text focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-pg-text mb-2">
              Primary Language
            </label>
            <input
              type="text"
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-pg-surface border border-pg-border text-pg-text placeholder:text-pg-text-muted focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-20"
              placeholder="English"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Product Identity */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-pg-text border-b border-pg-border pb-2">
          Product Identity
        </h3>

        <ImageUpload
          value={formData.product_image_url}
          onChange={(url) => setFormData({ ...formData, product_image_url: url })}
          userId={userId}
        />

        <div>
          <label className="block text-sm font-medium text-pg-text mb-2">
            Product URL
          </label>
          <input
            type="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            className="w-full px-4 py-2 rounded-lg bg-pg-surface border border-pg-border text-pg-text placeholder:text-pg-text-muted focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-20"
            placeholder="https://example.com/product"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-pg-text mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 rounded-lg bg-pg-surface border border-pg-border text-pg-text placeholder:text-pg-text-muted focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-20"
            placeholder="Describe your product..."
          />
        </div>

        <TagInput
          value={formData.alternative_names}
          onChange={(names) => setFormData({ ...formData, alternative_names: names })}
          label="Alternative Names / Aliases"
          placeholder="e.g., SqueezePro, Squeeze-Pro, SP Indicator"
          helpText="Add variations of your product name for better search coverage"
        />

        <TagInput
          value={formData.unique_identifiers}
          onChange={(ids) => setFormData({ ...formData, unique_identifiers: ids })}
          label="Unique Identifiers"
          placeholder="e.g., ISBN-123456, COURSE-789"
          helpText="Serial numbers, ISBNs, course IDs, or other unique identifiers"
        />
      </div>

      {/* Section 3: Search Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-pg-text border-b border-pg-border pb-2">
          Search Configuration
        </h3>

        <TagInput
          value={formData.keywords}
          onChange={(kw) => setFormData({ ...formData, keywords: kw })}
          label="Keywords to Monitor"
          placeholder="e.g., squeeze indicator download, crack, free"
          helpText="Specific phrases to actively monitor in piracy searches"
        />

        <TagInput
          value={formData.negative_keywords}
          onChange={(nkw) => setFormData({ ...formData, negative_keywords: nkw })}
          label="Negative Keywords (Exclude)"
          placeholder="e.g., review, tutorial, comparison"
          helpText="Keywords to exclude from results to reduce false positives"
        />

        <div>
          <label className="block text-sm font-medium text-pg-text mb-2">
            Minimum Price Alert Threshold (%)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={formData.min_price_threshold || 50}
              onChange={(e) => setFormData({ ...formData, min_price_threshold: parseFloat(e.target.value) })}
              className="flex-1"
            />
            <span className="text-pg-text font-semibold min-w-[60px]">
              {formData.min_price_threshold || 50}%
            </span>
          </div>
          <p className="text-xs text-pg-text-muted mt-1">
            Flag listings below this percentage of your retail price as suspicious
          </p>
        </div>
      </div>

      {/* Section 4: Authorized Sales */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-pg-text border-b border-pg-border pb-2">
          Authorized Sales Channels
        </h3>

        <TagInput
          value={formData.whitelist_domains}
          onChange={(domains) => setFormData({ ...formData, whitelist_domains: domains })}
          label="Whitelist Domains"
          placeholder="e.g., gumroad.com, udemy.com"
          helpText="Authorized domains to exclude from infringement detection"
        />

        <TagInput
          value={formData.authorized_sellers}
          onChange={(sellers) => setFormData({ ...formData, authorized_sellers: sellers })}
          label="Official Sales Platforms"
          placeholder="e.g., Udemy, Teachable, Amazon"
          helpText="Authorized platforms where your product is sold"
        />
      </div>

      {/* Section 5: Advanced (Collapsible) */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full text-lg font-semibold text-pg-text border-b border-pg-border pb-2 hover:text-cyan-400 transition-colors"
        >
          <span>Legal & Organization</span>
          <svg
            className={`w-5 h-5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-pg-text mb-2">
                  Copyright Registration Number
                </label>
                <input
                  type="text"
                  value={formData.copyright_number}
                  onChange={(e) => setFormData({ ...formData, copyright_number: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-pg-surface border border-pg-border text-pg-text placeholder:text-pg-text-muted focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-20"
                  placeholder="TXu 2-123-456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-pg-text mb-2">
                  Copyright Owner
                </label>
                <input
                  type="text"
                  value={formData.copyright_owner}
                  onChange={(e) => setFormData({ ...formData, copyright_owner: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-pg-surface border border-pg-border text-pg-text placeholder:text-pg-text-muted focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-20"
                  placeholder="Your Company Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-pg-text mb-2">
                  File Hash (MD5/SHA256)
                </label>
                <input
                  type="text"
                  value={formData.file_hash}
                  onChange={(e) => setFormData({ ...formData, file_hash: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-pg-surface border border-pg-border text-pg-text placeholder:text-pg-text-muted focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-20"
                  placeholder="For software products"
                />
              </div>
            </div>

            <TagInput
              value={formData.tags}
              onChange={(tags) => setFormData({ ...formData, tags })}
              label="Tags"
              placeholder="e.g., active, high-priority, video-course"
              helpText="Organizational tags for filtering and categorization"
            />

            <div>
              <label className="block text-sm font-medium text-pg-text mb-2">
                Internal Notes
              </label>
              <textarea
                value={formData.internal_notes}
                onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 rounded-lg bg-pg-surface border border-pg-border text-pg-text placeholder:text-pg-text-muted focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-20"
                placeholder="Internal team notes (not used in search)..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4 border-t border-pg-border">
        <button
          type="submit"
          className="px-6 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-colors"
        >
          {product ? 'Update Product' : 'Create Product'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 rounded-lg bg-pg-surface border border-pg-border text-pg-text hover:bg-pg-surface-light transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
