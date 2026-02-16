'use client';

import { useState } from 'react';
import { TagInput } from '@/components/ui/TagInput';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { ProductImageUpload } from './ProductImageUpload';
import type { Product, ProductType, AIExtractedData, ProductImage } from '@/types';

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

  // URL Fetching state
  const [productUrl, setProductUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [fetchSuccess, setFetchSuccess] = useState(false);

  // AI and Image state
  const [aiExtractedData, setAiExtractedData] = useState<AIExtractedData | null>(
    product?.ai_extracted_data || null
  );
  const [aiDataPendingApproval, setAiDataPendingApproval] = useState(false);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(
    product?.last_analyzed_at || null
  );
  const [isRefreshingAI, setIsRefreshingAI] = useState(false);
  const [productImages, setProductImages] = useState<ProductImage[]>(
    product?.product_images || []
  );
  const [fullTextContent, setFullTextContent] = useState<string | null>(
    product?.full_text_content || null
  );

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

    // If AI data exists and is pending approval, set last_analyzed_at to now
    const analysisTimestamp = aiExtractedData
      ? (aiDataPendingApproval ? new Date().toISOString() : lastAnalyzedAt)
      : null;

    onSave({
      ...formData,
      ai_extracted_data: aiExtractedData,
      product_images: productImages,
      full_text_content: fullTextContent,
      last_analyzed_at: analysisTimestamp,
    });

    // Clear pending approval flag after save
    setAiDataPendingApproval(false);
    if (aiExtractedData && aiDataPendingApproval) {
      setLastAnalyzedAt(new Date().toISOString());
    }
  };

  const handleFetchDetails = async () => {
    if (!productUrl.trim()) {
      setFetchError('Please enter a product URL');
      return;
    }

    setIsFetching(true);
    setFetchError('');
    setFetchSuccess(false);

    try {
      const response = await fetch('/api/products/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: productUrl }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch product details');
      }

      const data = await response.json();

      // Auto-fill form with extracted data
      setFormData((prev) => ({
        ...prev,
        name: data.name || prev.name,
        description: data.description || prev.description,
        price: data.price || prev.price,
        product_image_url: data.image_url || prev.product_image_url,
        url: data.url || prev.url,
        keywords: data.keywords && data.keywords.length > 0 ? data.keywords : prev.keywords,
        type: data.type || prev.type,
      }));

      // Store AI-extracted data
      if (data.ai_extracted_data) {
        setAiExtractedData(data.ai_extracted_data);
        setAiDataPendingApproval(true); // Mark as pending until user saves
      }

      // Store full text content
      if (data.full_text_content) {
        setFullTextContent(data.full_text_content);
      }

      setFetchSuccess(true);
      setTimeout(() => setFetchSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error fetching product details:', error);
      setFetchError(error.message || 'Failed to fetch product details. Please enter manually.');
    } finally {
      setIsFetching(false);
    }
  };

  // Refresh AI Analysis (24-hour cooldown)
  const handleRefreshAI = async () => {
    if (!formData.url) {
      alert('Product URL is required to refresh AI analysis');
      return;
    }

    setIsRefreshingAI(true);
    setFetchError('');

    try {
      const response = await fetch('/api/products/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formData.url }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to refresh AI analysis');
      }

      const data = await response.json();

      // Update AI-extracted data
      if (data.ai_extracted_data) {
        setAiExtractedData(data.ai_extracted_data);
        setAiDataPendingApproval(true); // Requires approval again
        setLastAnalyzedAt(new Date().toISOString());
      }

      // Update full text content
      if (data.full_text_content) {
        setFullTextContent(data.full_text_content);
      }

      // Optionally update other fields if they've changed
      setFormData((prev) => ({
        ...prev,
        keywords: data.keywords && data.keywords.length > 0 ? data.keywords : prev.keywords,
      }));

    } catch (error: any) {
      console.error('Error refreshing AI analysis:', error);
      setFetchError(error.message || 'Failed to refresh AI analysis');
    } finally {
      setIsRefreshingAI(false);
    }
  };

  // Check if refresh is available (24 hours since last analysis)
  const canRefreshAI = () => {
    if (!lastAnalyzedAt) return true; // Never analyzed, can refresh
    const lastAnalyzed = new Date(lastAnalyzedAt);
    const hoursSinceAnalysis = (Date.now() - lastAnalyzed.getTime()) / (1000 * 60 * 60);
    return hoursSinceAnalysis >= 24;
  };

  // Get time remaining until refresh is available
  const getRefreshTimeRemaining = () => {
    if (!lastAnalyzedAt) return '';
    const lastAnalyzed = new Date(lastAnalyzedAt);
    const hoursSinceAnalysis = (Date.now() - lastAnalyzed.getTime()) / (1000 * 60 * 60);
    const hoursRemaining = Math.ceil(24 - hoursSinceAnalysis);
    return hoursRemaining > 0 ? `${hoursRemaining}h` : '';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Quick Setup: Auto-Fill from URL */}
      {!product && !aiExtractedData && (
        <div className="p-6 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-2 border-cyan-500/30 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🚀</span>
            <h3 className="text-lg font-semibold text-pg-text">Quick Setup</h3>
          </div>
          <p className="text-sm text-pg-text-muted">
            Enter your product page URL to automatically extract details like title, description, price, and images.
          </p>

          <div className="flex gap-3">
            <input
              type="url"
              value={productUrl}
              onChange={(e) => {
                setProductUrl(e.target.value);
                setFetchError('');
              }}
              placeholder="https://example.com/my-product"
              className="flex-1 px-4 py-3 rounded-lg bg-pg-surface border border-pg-border text-pg-text placeholder:text-pg-text-muted focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-20"
              disabled={isFetching}
            />
            <button
              type="button"
              onClick={handleFetchDetails}
              disabled={isFetching || !productUrl.trim()}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isFetching ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Fetching...
                </span>
              ) : (
                '✨ Fetch Details'
              )}
            </button>
          </div>

          {fetchError && (
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
              ⚠️ {fetchError}
            </div>
          )}

          {fetchSuccess && (
            <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-sm">
              ✅ Product details fetched successfully! Review and edit below.
            </div>
          )}
        </div>
      )}

      {/* AI-Extracted Data Display */}
      {aiExtractedData && (
        <div className="p-6 rounded-xl bg-white border-2 border-blue-500 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">AI Product Analysis</h3>
            <div className="flex items-center gap-2">
              {aiDataPendingApproval && (
                <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">
                  Pending Approval
                </span>
              )}
              {product && formData.url && (
                <button
                  type="button"
                  onClick={handleRefreshAI}
                  disabled={!canRefreshAI() || isRefreshingAI}
                  title={
                    canRefreshAI()
                      ? 'Refresh AI analysis (requires re-approval)'
                      : `Available in ${getRefreshTimeRemaining()}`
                  }
                  className="px-3 py-1.5 rounded-md bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {isRefreshingAI ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      🔄 Refresh
                      {!canRefreshAI() && (
                        <span className="text-blue-200">({getRefreshTimeRemaining()})</span>
                      )}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {aiDataPendingApproval && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
              ℹ️ Review and edit the AI-extracted data below. Hover over any item to remove it. Click "Save Product" to approve this data for use in scans.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Brand Identifiers */}
            {aiExtractedData.brand_identifiers.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-gray-900">Brand Identifiers</h4>
                <div className="flex flex-wrap gap-2">
                  {aiExtractedData.brand_identifiers.map((brand, idx) => (
                    <span
                      key={idx}
                      className="group relative px-3 py-1.5 pr-8 rounded bg-gray-100 text-gray-900 text-sm font-medium border border-gray-300 hover:bg-gray-200 transition-colors"
                    >
                      {brand}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = aiExtractedData.brand_identifiers.filter((_, i) => i !== idx);
                          setAiExtractedData({ ...aiExtractedData, brand_identifiers: updated });
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-800 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Copyrighted Terms */}
            {aiExtractedData.copyrighted_terms.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-gray-900">Copyrighted Terms</h4>
                <div className="flex flex-wrap gap-2">
                  {aiExtractedData.copyrighted_terms.map((term, idx) => (
                    <span
                      key={idx}
                      className="group relative px-3 py-1.5 pr-8 rounded bg-gray-100 text-gray-900 text-sm font-medium border border-gray-300 hover:bg-gray-200 transition-colors"
                    >
                      {term}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = aiExtractedData.copyrighted_terms.filter((_, i) => i !== idx);
                          setAiExtractedData({ ...aiExtractedData, copyrighted_terms: updated });
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-800 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Unique Phrases */}
            {aiExtractedData.unique_phrases.length > 0 && (
              <div className="space-y-2 md:col-span-2">
                <h4 className="text-sm font-bold text-gray-900">Unique Marketing Phrases</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {aiExtractedData.unique_phrases.map((phrase, idx) => (
                    <div
                      key={idx}
                      className="group relative px-3 py-2 pr-8 rounded bg-gray-100 text-gray-900 text-sm border border-gray-300 italic hover:bg-gray-200 transition-colors"
                    >
                      "{phrase}"
                      <button
                        type="button"
                        onClick={() => {
                          const updated = aiExtractedData.unique_phrases.filter((_, i) => i !== idx);
                          setAiExtractedData({ ...aiExtractedData, unique_phrases: updated });
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-800 font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Keywords */}
            {aiExtractedData.keywords.length > 0 && (
              <div className="space-y-2 md:col-span-2">
                <h4 className="text-sm font-bold text-gray-900">AI-Detected Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {aiExtractedData.keywords.map((keyword, idx) => (
                    <span
                      key={idx}
                      className="group relative px-3 py-1.5 pr-8 rounded bg-gray-100 text-gray-900 text-sm font-medium border border-gray-300 hover:bg-gray-200 transition-colors"
                    >
                      {keyword}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = aiExtractedData.keywords.filter((_, i) => i !== idx);
                          setAiExtractedData({ ...aiExtractedData, keywords: updated });
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-800 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-700 font-medium mt-4 border-t border-gray-200 pt-4">
            {aiDataPendingApproval ?
              'This data will be saved and used for infringement detection once you save the product' :
              '✓ This AI data has been approved and will be used to detect infringements with high accuracy'
            }
          </p>
        </div>
      )}

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
              placeholder="Your Company Name"
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

        {/* Multiple Product Images for Reverse Image Search */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-pg-text">
            Additional Product Images (for Reverse Image Search)
          </label>
          <ProductImageUpload
            productId={product?.id}
            userId={userId}
            existingImages={productImages}
            onImagesChange={setProductImages}
            maxImages={4}
            maxSizeMB={2}
          />
        </div>

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
          placeholder="e.g., Product Name v2, ProductName, PN"
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
