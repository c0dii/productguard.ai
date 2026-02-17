'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProductWizard } from './ProductWizard';

interface ReassignProductButtonProps {
  infringementId: string;
  currentProductId: string;
  currentProductName: string;
  sourceUrl: string;
}

interface ProductOption {
  id: string;
  name: string;
  type: string;
}

export function ReassignProductButton({
  infringementId,
  currentProductId,
  currentProductName,
  sourceUrl,
}: ReassignProductButtonProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProducts, setIsFetchingProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Fetch user's products when modal opens
  useEffect(() => {
    if (!showModal) return;

    const fetchProducts = async () => {
      setIsFetchingProducts(true);
      try {
        const supabase = createClient();

        // Get user ID for wizard
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);

        const { data, error: fetchError } = await supabase
          .from('products')
          .select('id, name, type')
          .order('name', { ascending: true });

        if (fetchError) throw fetchError;

        // Filter out the current product
        const otherProducts = (data || []).filter((p) => p.id !== currentProductId);
        setProducts(otherProducts);
      } catch (err: any) {
        console.error('Error fetching products:', err);
        setError('Failed to load products');
      } finally {
        setIsFetchingProducts(false);
      }
    };

    fetchProducts();
  }, [showModal, currentProductId]);

  const handleReassign = async () => {
    if (!selectedProductId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/infringements/${infringementId}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: selectedProductId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reassign infringement');
      }

      setSuccess(`Infringement reassigned to "${data.new_product_name}"`);

      // Refresh the page after a short delay so user sees success message
      setTimeout(() => {
        router.refresh();
        setShowModal(false);
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error('Error reassigning infringement:', err);
      setError(err.message || 'Failed to reassign. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setSelectedProductId('');
    setError(null);
    setSuccess(null);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 text-sm text-pg-text-muted hover:text-pg-accent transition-colors w-full py-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        Link to Different Product
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 sm:p-4">
          <Card className="max-w-lg w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto rounded-b-none sm:rounded-b-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-pg-text">Reassign Infringement</h2>
              <button
                onClick={handleClose}
                className="text-pg-text-muted hover:text-pg-text transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Current Info */}
            <div className="mb-4 p-3 rounded-lg bg-pg-bg border border-pg-border">
              <p className="text-xs text-pg-text-muted mb-1">Currently linked to</p>
              <p className="text-sm font-semibold text-pg-text">{currentProductName}</p>
              <p className="text-xs text-pg-text-muted mt-1 break-all">{sourceUrl}</p>
            </div>

            {/* Description */}
            <p className="text-sm text-pg-text-muted mb-4">
              If this infringement belongs to a different product, select the correct product below to reassign it.
            </p>

            {/* Product Selector */}
            {isFetchingProducts ? (
              <div className="flex items-center gap-2 py-4 justify-center">
                <div className="w-5 h-5 rounded-full border-2 border-pg-accent border-t-transparent animate-spin" />
                <span className="text-sm text-pg-text-muted">Loading products...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-sm text-pg-text-muted mb-3">
                  No other products found. Create a new product to reassign this infringement.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowCreateWizard(true)}
                  >
                    + Create New Product
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      handleClose();
                      router.push('/dashboard/products');
                    }}
                  >
                    Go to Products
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <label htmlFor="product-select" className="block text-sm font-medium text-pg-text mb-2">
                  Select Product
                </label>
                <select
                  id="product-select"
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    setError(null);
                  }}
                  className="input-field w-full mb-3"
                >
                  <option value="">Choose a product...</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.type})
                    </option>
                  ))}
                </select>

                {/* Create New Product option */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 h-px bg-pg-border" />
                  <span className="text-xs text-pg-text-muted">or</span>
                  <div className="flex-1 h-px bg-pg-border" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateWizard(true)}
                  className="w-full text-sm text-pg-accent hover:text-pg-accent/80 font-medium transition-colors py-2 mb-4"
                >
                  + Create New Product
                </button>

                {/* Error/Success Messages */}
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <p className="text-xs text-green-400">{success}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleReassign}
                    disabled={!selectedProductId || isLoading || !!success}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <span className="animate-spin mr-2">&#9203;</span>
                        Reassigning...
                      </>
                    ) : (
                      'Reassign'
                    )}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* Product Creation Wizard (opens over the reassign modal) */}
      {showCreateWizard && currentUserId && (
        <ProductWizard
          isOpen={showCreateWizard}
          onClose={() => setShowCreateWizard(false)}
          onComplete={(product) => {
            setShowCreateWizard(false);
            router.push(`/dashboard/products/${product.id}`);
          }}
          userId={currentUserId}
        />
      )}
    </>
  );
}
