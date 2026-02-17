'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TagInput } from '@/components/ui/TagInput';
import { createClient } from '@/lib/supabase/client';
import { filterGenericKeywords } from '@/lib/utils/keyword-quality';
import type { ProductType, AIExtractedData } from '@/types';

interface ProductWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (product: { id: string; name: string }) => void;
  userId: string;
  /** Pre-fill the product URL (e.g., from infringement source URL) */
  initialUrl?: string;
}

interface WizardData {
  name: string;
  type: ProductType | '';
  url: string;
  price: number;
  description: string;
  product_image_url: string | null;
  keywords: string[];
  ai_extracted_data: AIExtractedData | null;
  full_text_content: string | null;
  negative_keywords: string[];
  whitelist_domains: string[];
  brand_name: string;
  copyright_number: string;
  copyright_owner: string;
}

const INITIAL_DATA: WizardData = {
  name: '',
  type: '',
  url: '',
  price: 0,
  description: '',
  product_image_url: null,
  keywords: [],
  ai_extracted_data: null,
  full_text_content: null,
  negative_keywords: [],
  whitelist_domains: [],
  brand_name: '',
  copyright_number: '',
  copyright_owner: '',
};

const PRODUCT_TYPES: { value: ProductType; label: string; icon: string; desc: string }[] = [
  { value: 'course', label: 'Online Course', icon: '🎓', desc: 'Video courses, coaching programs' },
  { value: 'indicator', label: 'Trading Indicator', icon: '📈', desc: 'TradingView, MT4/MT5 indicators' },
  { value: 'software', label: 'Software', icon: '💻', desc: 'Apps, tools, plugins, SaaS' },
  { value: 'template', label: 'Template', icon: '📝', desc: 'Design templates, Notion, Canva' },
  { value: 'ebook', label: 'E-Book / Guide', icon: '📚', desc: 'PDFs, digital books, manuals' },
  { value: 'other', label: 'Other Digital', icon: '📦', desc: 'Any other digital product' },
];

const STEPS = [
  { num: 1, label: 'Product' },
  { num: 2, label: 'URL & Price' },
  { num: 3, label: 'AI Review' },
  { num: 4, label: 'Detection', optional: true },
  { num: 5, label: 'Legal', optional: true },
];

export function ProductWizard({ isOpen, onClose, onComplete, userId, initialUrl }: ProductWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>(INITIAL_DATA);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeComplete, setScrapeComplete] = useState(false);
  const [scrapeError, setScrapeError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setData({ ...INITIAL_DATA, url: initialUrl || '' });
      setScrapeComplete(false);
      setScrapeError('');
      setIsSaving(false);
      setSaveError('');
    }
  }, [isOpen, initialUrl]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // ── AI Scrape ────────────────────────────────────────────────────

  const handleScrape = useCallback(async () => {
    if (!data.url.trim() || isScraping) return;

    setIsScraping(true);
    setScrapeError('');

    try {
      const response = await fetch('/api/products/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: data.url }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to analyze product page');
      }

      const result = await response.json();

      // Validate the returned type against allowed enum values
      const validTypes: ProductType[] = ['course', 'indicator', 'software', 'template', 'ebook', 'other'];
      const scrapedType = validTypes.includes(result.type) ? result.type : null;

      setData((prev) => ({
        ...prev,
        name: result.name || prev.name,
        description: result.description || prev.description,
        price: result.price || prev.price,
        product_image_url: result.image_url || prev.product_image_url,
        url: result.url || prev.url,
        keywords: result.keywords?.length > 0 ? result.keywords : prev.keywords,
        type: scrapedType || prev.type,
        ai_extracted_data: result.ai_extracted_data || prev.ai_extracted_data,
        full_text_content: result.full_text_content || prev.full_text_content,
      }));

      setScrapeComplete(true);
    } catch (error: any) {
      console.error('Scrape error:', error);
      setScrapeError(error.message || 'Failed to analyze page. You can enter details manually.');
    } finally {
      setIsScraping(false);
    }
  }, [data.url, isScraping]);

  // Auto-scrape when entering Step 2 with initialUrl
  useEffect(() => {
    if (currentStep === 2 && initialUrl && data.url === initialUrl && !scrapeComplete && !isScraping && !scrapeError) {
      const timer = setTimeout(() => handleScrape(), 500);
      return () => clearTimeout(timer);
    }
  }, [currentStep, initialUrl, data.url, scrapeComplete, isScraping, scrapeError, handleScrape]);

  // ── Save ─────────────────────────────────────────────────────────

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError('');

    try {
      const supabase = createClient();

      const productData = {
        name: data.name.trim(),
        type: data.type || 'other',
        url: data.url.trim() || null,
        price: data.price,
        description: data.description || null,
        product_image_url: data.product_image_url,
        keywords: data.keywords.length > 0 ? filterGenericKeywords(data.keywords) : null,
        ai_extracted_data: data.ai_extracted_data,
        full_text_content: data.full_text_content,
        last_analyzed_at: data.ai_extracted_data ? new Date().toISOString() : null,
        negative_keywords: data.negative_keywords.length > 0 ? data.negative_keywords : null,
        whitelist_domains: data.whitelist_domains.length > 0 ? data.whitelist_domains : null,
        brand_name: data.brand_name.trim() || null,
        copyright_number: data.copyright_number.trim() || null,
        copyright_owner: data.copyright_owner.trim() || null,
        user_id: userId,
      };

      const { data: newProduct, error } = await supabase
        .from('products')
        .insert(productData)
        .select('id, name')
        .single();

      if (error) throw error;

      onComplete({ id: newProduct.id, name: newProduct.name });
    } catch (err: any) {
      console.error('Error creating product:', err);
      setSaveError(err.message || 'Failed to create product. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Navigation ───────────────────────────────────────────────────

  const canGoNext = () => {
    if (currentStep === 1) return data.name.trim() !== '' && data.type !== '';
    return true;
  };

  const canFinish = currentStep >= 3;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-[60] sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Card className="max-w-2xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto rounded-b-none sm:rounded-b-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg sm:text-xl font-bold text-pg-text">Add New Product</h2>
          <button onClick={onClose} className="text-pg-text-muted hover:text-pg-text transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} />

        {/* Step Content */}
        {currentStep === 1 && (
          <Step1Name data={data} setData={setData} />
        )}
        {currentStep === 2 && (
          <Step2Url
            data={data}
            setData={setData}
            isScraping={isScraping}
            scrapeComplete={scrapeComplete}
            scrapeError={scrapeError}
            onScrape={handleScrape}
          />
        )}
        {currentStep === 3 && (
          <Step3Review data={data} setData={setData} />
        )}
        {currentStep === 4 && (
          <Step4Detection data={data} setData={setData} />
        )}
        {currentStep === 5 && (
          <Step5Legal data={data} setData={setData} />
        )}

        {/* Save Error */}
        {saveError && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
            {saveError}
          </div>
        )}

        {/* Navigation Footer */}
        <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-pg-border mt-4 sm:mt-6">
          <div>
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="text-sm text-pg-text-muted hover:text-pg-text transition-colors"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {currentStep >= 4 && currentStep < 5 && (
              <button
                onClick={() => setCurrentStep((s) => s + 1)}
                className="text-sm text-pg-text-muted hover:text-pg-text transition-colors"
              >
                Skip
              </button>
            )}
            {canFinish && (
              <Button onClick={handleSave} disabled={isSaving} variant="primary" size="sm">
                {isSaving ? 'Saving...' : 'Done'}
              </Button>
            )}
            {currentStep < 5 && (
              <Button
                onClick={() => setCurrentStep((s) => s + 1)}
                disabled={!canGoNext()}
                variant={canFinish ? 'secondary' : 'primary'}
                size="sm"
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Step Indicator ─────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between mb-6 px-2">
      {STEPS.map((step, idx) => (
        <div key={step.num} className="flex items-center">
          <div
            className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
              ${step.num < currentStep ? 'bg-pg-accent text-pg-bg' : ''}
              ${step.num === currentStep ? 'bg-pg-accent text-pg-bg ring-2 ring-pg-accent ring-offset-2 ring-offset-pg-surface' : ''}
              ${step.num > currentStep ? 'bg-pg-surface-light text-pg-text-muted border border-pg-border' : ''}
            `}
          >
            {step.num < currentStep ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              step.num
            )}
          </div>
          <span
            className={`ml-1.5 text-xs hidden sm:inline ${
              step.num <= currentStep ? 'text-pg-text' : 'text-pg-text-muted'
            }`}
          >
            {step.label}
            {step.optional && <span className="text-pg-text-muted"> (opt)</span>}
          </span>
          {idx < STEPS.length - 1 && (
            <div
              className={`w-6 sm:w-10 h-px mx-1.5 ${
                step.num < currentStep ? 'bg-pg-accent' : 'bg-pg-border'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Step 1: What are you protecting? ───────────────────────────────

function Step1Name({
  data,
  setData,
}: {
  data: WizardData;
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-pg-text mb-1">What are you protecting?</h3>
      <p className="text-sm text-pg-text-muted mb-6">
        Tell us the name and type of your digital product.
      </p>

      {/* Product Name */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-pg-text mb-2">Product Name</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => setData((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Squeeze Pro Indicator, My Video Course"
          className="input-field w-full"
          autoFocus
        />
      </div>

      {/* Product Type - Card Grid */}
      <div>
        <label className="block text-sm font-medium text-pg-text mb-3">What type of product is it?</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PRODUCT_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setData((prev) => ({ ...prev, type: t.value }))}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                data.type === t.value
                  ? 'border-pg-accent bg-pg-accent/10'
                  : 'border-pg-border hover:border-pg-accent/50 bg-pg-surface-light'
              }`}
            >
              <div className="text-2xl mb-2">{t.icon}</div>
              <p className="font-semibold text-pg-text text-sm">{t.label}</p>
              <p className="text-xs text-pg-text-muted mt-1">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Where is it sold? ──────────────────────────────────────

function Step2Url({
  data,
  setData,
  isScraping,
  scrapeComplete,
  scrapeError,
  onScrape,
}: {
  data: WizardData;
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
  isScraping: boolean;
  scrapeComplete: boolean;
  scrapeError: string;
  onScrape: () => void;
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-pg-text mb-1">Where is it sold?</h3>
      <p className="text-sm text-pg-text-muted mb-6">
        Paste your product&apos;s sales page URL and we&apos;ll automatically extract key details using AI.
        This step is optional — you can skip it and add details later.
      </p>

      {/* URL Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-pg-text mb-2">Product URL</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={data.url}
            onChange={(e) => setData((prev) => ({ ...prev, url: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onScrape(); } }}
            placeholder="https://www.tradingview.com/script/your-indicator/"
            className="input-field flex-1"
            disabled={isScraping}
          />
          <Button
            onClick={onScrape}
            disabled={isScraping || !data.url.trim()}
            variant="primary"
            size="sm"
          >
            {isScraping ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Analyzing...
              </span>
            ) : (
              'Fetch Details'
            )}
          </Button>
        </div>
      </div>

      {/* Scrape Status */}
      {isScraping && (
        <div className="mb-4 p-4 rounded-lg bg-pg-accent/10 border border-pg-accent/20">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-pg-accent" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-pg-text">Analyzing your product page...</p>
              <p className="text-xs text-pg-text-muted">Extracting brand identifiers, unique phrases, and keywords for piracy detection.</p>
            </div>
          </div>
        </div>
      )}

      {scrapeError && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          {scrapeError}
        </div>
      )}

      {scrapeComplete && !isScraping && (
        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm text-green-400">
          Product details extracted successfully! Review them in the next step.
        </div>
      )}

      {/* Price */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-pg-text mb-2">
          Price (USD)
          {scrapeComplete && data.price > 0 && (
            <span className="text-xs text-pg-accent ml-2">Auto-detected</span>
          )}
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={data.price || ''}
          onChange={(e) => setData((prev) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
          placeholder="29.99"
          className="input-field w-full max-w-xs"
        />
      </div>

      {/* Auto-filled preview */}
      {scrapeComplete && data.product_image_url && (
        <div className="mt-4 p-3 rounded-lg bg-pg-surface-light border border-pg-border flex items-center gap-3">
          <img
            src={data.product_image_url}
            alt={data.name}
            className="w-12 h-12 rounded-lg object-cover"
          />
          <div>
            <p className="text-sm font-medium text-pg-text">{data.name}</p>
            {data.description && (
              <p className="text-xs text-pg-text-muted line-clamp-1">{data.description}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 3: Review AI Analysis ─────────────────────────────────────

function Step3Review({
  data,
  setData,
}: {
  data: WizardData;
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
}) {
  const ai = data.ai_extracted_data;

  if (!ai) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-pg-text mb-1">Review AI Analysis</h3>
        <div className="mt-6 p-6 rounded-xl bg-pg-surface-light border border-pg-border text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-sm text-pg-text mb-2">No AI analysis available</p>
          <p className="text-xs text-pg-text-muted">
            You skipped the URL step or the analysis didn&apos;t return results.
            That&apos;s okay! You can still protect your product — our scanner will use the
            name and type you provided. You can always add more details later from the product edit page.
          </p>
        </div>
      </div>
    );
  }

  const removeItem = (field: keyof Pick<AIExtractedData, 'brand_identifiers' | 'copyrighted_terms' | 'unique_phrases' | 'keywords'>, idx: number) => {
    setData((prev) => {
      if (!prev.ai_extracted_data) return prev;
      return {
        ...prev,
        ai_extracted_data: {
          ...prev.ai_extracted_data,
          [field]: prev.ai_extracted_data[field].filter((_: string, i: number) => i !== idx),
        },
      };
    });
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-pg-text mb-1">Review AI Analysis</h3>
      <p className="text-sm text-pg-text-muted mb-4">
        We found these identifiers from your product page. Remove anything that doesn&apos;t look right.
        These are used to detect pirated copies of your content.
      </p>

      {/* Product preview */}
      {(data.product_image_url || data.description) && (
        <div className="mb-4 p-3 rounded-lg bg-pg-surface-light border border-pg-border">
          <div className="flex items-start gap-3">
            {data.product_image_url && (
              <img src={data.product_image_url} alt={data.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-pg-text">{data.name}</p>
              <Badge variant="default" className="text-xs mt-1">
                {PRODUCT_TYPES.find((t) => t.value === data.type)?.label || data.type}
              </Badge>
              {data.description && (
                <p className="text-xs text-pg-text-muted mt-2 line-clamp-2">{data.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Data Chips */}
      <div className="space-y-4">
        {ai.brand_identifiers?.length > 0 && (
          <ChipSection
            title="Brand Identifiers"
            subtitle="Trademarked names and brand mentions"
            items={ai.brand_identifiers}
            onRemove={(idx) => removeItem('brand_identifiers', idx)}
            color="pg-accent"
          />
        )}

        {ai.copyrighted_terms?.length > 0 && (
          <ChipSection
            title="Copyrighted Terms"
            subtitle="Terms with copyright, trademark, or registered marks"
            items={ai.copyrighted_terms}
            onRemove={(idx) => removeItem('copyrighted_terms', idx)}
            color="orange-400"
          />
        )}

        {ai.unique_phrases?.length > 0 && (
          <ChipSection
            title="Unique Phrases"
            subtitle="Marketing copy and distinctive language from your product"
            items={ai.unique_phrases}
            onRemove={(idx) => removeItem('unique_phrases', idx)}
            color="blue-400"
          />
        )}

        {ai.keywords?.length > 0 && (
          <ChipSection
            title="Detected Keywords"
            subtitle="Technical terms and feature names to monitor"
            items={ai.keywords}
            onRemove={(idx) => removeItem('keywords', idx)}
            color="pg-text-muted"
          />
        )}
      </div>

      {ai.brand_identifiers?.length === 0 && ai.copyrighted_terms?.length === 0 &&
       ai.unique_phrases?.length === 0 && ai.keywords?.length === 0 && (
        <div className="mt-4 p-4 rounded-lg bg-pg-surface-light border border-pg-border text-center">
          <p className="text-sm text-pg-text-muted">
            All items removed. The scanner will still use your product name and type for detection.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Chip Section (reusable for Step 3) ─────────────────────────────

function ChipSection({
  title,
  subtitle,
  items,
  onRemove,
  color,
}: {
  title: string;
  subtitle: string;
  items: string[];
  onRemove: (idx: number) => void;
  color: string;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-pg-text">{title}</h4>
      <p className="text-xs text-pg-text-muted mb-2">{subtitle}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item, idx) => (
          <span
            key={idx}
            className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pg-surface-light border border-pg-border text-sm text-pg-text hover:border-red-500/50 transition-colors"
          >
            {item}
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 font-bold ml-1"
              title="Remove"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Step 4: Fine-tune detection ────────────────────────────────────

function Step4Detection({
  data,
  setData,
}: {
  data: WizardData;
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-pg-text mb-1">Fine-tune detection</h3>
      <p className="text-sm text-pg-text-muted mb-6">
        These settings help our scanner find infringements more accurately.
        You can always adjust them later from the product edit page.
      </p>

      <div className="space-y-5">
        <TagInput
          value={data.keywords}
          onChange={(kw) => setData((prev) => ({ ...prev, keywords: kw }))}
          label="Keywords to Monitor"
          placeholder="e.g., squeeze indicator download, crack, free"
          helpText="Specific phrases to actively monitor in piracy searches"
        />

        <TagInput
          value={data.negative_keywords}
          onChange={(nk) => setData((prev) => ({ ...prev, negative_keywords: nk }))}
          label="Negative Keywords (Exclude)"
          placeholder="e.g., review, tutorial, comparison"
          helpText="Exclude results containing these terms to reduce false positives"
        />

        <TagInput
          value={data.whitelist_domains}
          onChange={(wd) => setData((prev) => ({ ...prev, whitelist_domains: wd }))}
          label="Whitelist Domains"
          placeholder="e.g., udemy.com, tradingview.com"
          helpText="Authorized domains where your product is legitimately sold"
        />
      </div>
    </div>
  );
}

// ── Step 5: Legal details ──────────────────────────────────────────

function Step5Legal({
  data,
  setData,
}: {
  data: WizardData;
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-pg-text mb-1">Legal details</h3>
      <p className="text-sm text-pg-text-muted mb-6">
        Adding legal details strengthens your DMCA takedown notices.
        You can add these later from the product edit page.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-pg-text mb-2">Brand / Creator Name</label>
          <input
            type="text"
            value={data.brand_name}
            onChange={(e) => setData((prev) => ({ ...prev, brand_name: e.target.value }))}
            placeholder="e.g., Simpler Trading, John Smith"
            className="input-field w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-pg-text mb-2">Copyright Registration Number</label>
          <input
            type="text"
            value={data.copyright_number}
            onChange={(e) => setData((prev) => ({ ...prev, copyright_number: e.target.value }))}
            placeholder="e.g., TX 1-234-567 (optional)"
            className="input-field w-full"
          />
          <p className="text-xs text-pg-text-muted mt-1">
            If you have a U.S. Copyright Office registration, enter it here.
            This significantly strengthens DMCA notices.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-pg-text mb-2">Copyright Owner</label>
          <input
            type="text"
            value={data.copyright_owner}
            onChange={(e) => setData((prev) => ({ ...prev, copyright_owner: e.target.value }))}
            placeholder="e.g., Your Name or Company LLC"
            className="input-field w-full"
          />
        </div>
      </div>
    </div>
  );
}
