'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EnhancedProductForm } from '@/components/dashboard/EnhancedProductForm';
import { ProductWizard } from '@/components/dashboard/ProductWizard';
import { ProductListView } from '@/components/dashboard/ProductListView';
import Link from 'next/link';
import type { Product, ProductWithStats } from '@/types';

type ViewMode = 'card' | 'list';
type SortOption = 'recent' | 'oldest' | 'name-asc' | 'name-desc' | 'most-risk' | 'safest' | 'most-infringements';

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithStats | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showWizard, setShowWizard] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  // Check for ?edit=<id> URL param on mount (from product detail Edit button)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (editId) {
      setPendingEditId(editId);
      // Clean up URL without triggering navigation
      window.history.replaceState({}, '', '/dashboard/products');
    }
  }, []);

  useEffect(() => {
    fetchUserAndProducts();
  }, []);

  // Open edit form when pendingEditId is set and products are loaded
  useEffect(() => {
    if (pendingEditId && !loading && products.length > 0) {
      const product = products.find(p => p.id === pendingEditId);
      if (product) {
        setEditingProduct(product);
        setShowForm(true);
        setPendingEditId(null);
      }
    }
  }, [pendingEditId, loading, products]);

  // Close kebab menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const fetchUserAndProducts = async () => {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setUserId(user.id);
    }

    await fetchProducts();
  };

  const fetchProducts = async () => {
    console.log('Fetching products...');
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      setLoading(false);
      return;
    }

    // Fetch infringement stats for each product
    const productsWithStats: ProductWithStats[] = await Promise.all(
      (data || []).map(async (product) => {
        const { data: infringements } = await supabase
          .from('infringements')
          .select('status')
          .eq('product_id', product.id);

        const { data: lastScan } = await supabase
          .from('scans')
          .select('created_at')
          .eq('product_id', product.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const infringement_count = infringements?.length || 0;
        const pending_count = infringements?.filter((i) => i.status === 'pending_verification').length || 0;
        const active_count = infringements?.filter((i) => i.status === 'active').length || 0;

        return {
          ...product,
          infringement_count,
          pending_count,
          active_count,
          last_scan_at: lastScan?.created_at || null,
        };
      })
    );

    console.log('Products fetched with stats:', productsWithStats);
    setProducts(productsWithStats);
    setLoading(false);
  };

  // Sort products based on selected filter
  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'most-risk':
        // Most risk = highest active infringement count
        return (b.active_count || 0) - (a.active_count || 0);
      case 'safest':
        // Safest = lowest total infringement count
        return (a.infringement_count || 0) - (b.infringement_count || 0);
      case 'most-infringements':
        return (b.infringement_count || 0) - (a.infringement_count || 0);
      default:
        return 0;
    }
  });

  const handleSave = async (productData: Partial<Product>) => {
    console.log('Saving product:', productData);

    // Sanitize: convert empty strings to null for timestamp and nullable fields
    const sanitized = { ...productData } as Record<string, any>;
    const timestampFields = ['release_date', 'last_analyzed_at', 'created_at', 'updated_at'];
    const nullableStringFields = ['url', 'description', 'copyright_number', 'copyright_owner', 'file_hash', 'internal_notes', 'brand_name', 'language', 'product_image_url'];
    for (const field of [...timestampFields, ...nullableStringFields]) {
      if (field in sanitized && sanitized[field] === '') {
        sanitized[field] = null;
      }
    }

    try {
      if (editingProduct) {
        // Update existing product
        console.log('Updating product:', editingProduct.id);
        const { error: updateError, data } = await supabase
          .from('products')
          .update(sanitized)
          .eq('id', editingProduct.id)
          .select();

        if (updateError) {
          console.error('Update error:', updateError);
          alert('Failed to update product: ' + updateError.message);
          return;
        }

        console.log('Product updated successfully:', data);
        alert('Product updated successfully!');
      } else {
        // Create new product
        console.log('Creating new product...');
        const { error: insertError, data } = await supabase
          .from('products')
          .insert({
            ...sanitized,
            user_id: userId,
          })
          .select();

        if (insertError) {
          console.error('Insert error:', insertError);
          alert('Failed to create product: ' + insertError.message);
          return;
        }

        console.log('Product created successfully:', data);
        alert('Product created successfully!');
      }

      setShowForm(false);
      setEditingProduct(null);
      await fetchProducts();
    } catch (err: any) {
      console.error('Form submit error:', err);
      alert('An error occurred: ' + err.message);
    }
  };

  const handleEdit = (product: ProductWithStats) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      const { error } = await supabase.from('products').delete().eq('id', id);

      if (error) {
        console.error('Delete error:', error);
        alert('Failed to delete product: ' + error.message);
      } else {
        alert('Product deleted successfully!');
        fetchProducts();
      }
    }
  };

  const handleScan = async (productId: string) => {
    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product_id: productId }),
      });

      const data = await response.json();

      if (response.ok && data.scan_id) {
        // Redirect to scan detail page to monitor progress
        window.location.href = `/dashboard/scans/${data.scan_id}`;
      } else {
        alert(data.error || 'Failed to start scan');
      }
    } catch (error) {
      console.error('Scan error:', error);
      alert('Failed to start scan');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-pg-text">Products</h1>
            <p className="text-sm sm:text-base text-pg-text-muted">Manage your digital products</p>
          </div>
          {showForm ? (
            <Button
              onClick={handleCancel}
              variant="secondary"
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          ) : (
            <Button
              onClick={() => setShowWizard(true)}
              className="w-full sm:w-auto"
            >
              + Add Product
            </Button>
          )}
      </div>

        {/* View Toggle and Filters */}
        {!showForm && products.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-pg-surface rounded-lg p-1 border border-pg-border">
              <button
                onClick={() => setViewMode('card')}
                className={`px-3 py-2 rounded-md transition-all text-sm font-medium ${
                  viewMode === 'card'
                    ? 'bg-pg-accent text-white'
                    : 'text-pg-text-muted hover:text-pg-text hover:bg-pg-bg'
                }`}
                title="Card View"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-md transition-all text-sm font-medium ${
                  viewMode === 'list'
                    ? 'bg-pg-accent text-white'
                    : 'text-pg-text-muted hover:text-pg-text hover:bg-pg-bg'
                }`}
                title="List View"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              </button>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
              <label htmlFor="sort-filter" className="text-sm font-medium text-pg-text-muted whitespace-nowrap">
                Sort by:
              </label>
              <select
                id="sort-filter"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="input-field flex-1 sm:flex-none sm:w-auto"
              >
                <option value="recent">Recently Added</option>
                <option value="oldest">Oldest First</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="most-risk">Most at Risk</option>
                <option value="most-infringements">Most Infringements</option>
                <option value="safest">Safest Products</option>
              </select>
            </div>

            {/* Product Count */}
            <div className="text-sm text-pg-text-muted whitespace-nowrap">
              {sortedProducts.length} product{sortedProducts.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="mb-8 p-6 rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border">
          <h2 className="text-xl font-bold mb-6 text-pg-text">
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h2>
          <EnhancedProductForm
            product={editingProduct || undefined}
            onSave={handleSave}
            onCancel={handleCancel}
            userId={userId}
          />
        </div>
      )}

      {/* Products List */}
      {products.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-xl sm:rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border">
          <div className="text-center">
            <p className="text-lg sm:text-xl font-semibold mb-2 text-pg-text">No products yet</p>
            <p className="text-sm text-pg-text-muted mb-4">
              Add your first product to start monitoring for piracy
            </p>
            <Button onClick={() => setShowWizard(true)}>+ Add Your First Product</Button>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        <ProductListView
          products={sortedProducts}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onScan={handleScan}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {sortedProducts.map((product) => (
            <Link
              key={product.id}
              href={`/dashboard/products/${product.id}`}
              className="group relative p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border hover:bg-pg-surface-light hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 block cursor-pointer"
            >
              <div className="mb-3 sm:mb-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-base sm:text-lg text-pg-text pr-8 line-clamp-2">{product.name}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="capitalize bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      {product.type}
                    </Badge>
                    {/* Kebab menu */}
                    <div className="relative" ref={openMenuId === product.id ? menuRef : undefined}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === product.id ? null : product.id);
                        }}
                        className="p-1 rounded-md hover:bg-pg-bg text-pg-text-muted hover:text-pg-text transition-colors"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                      {openMenuId === product.id && (
                        <div className="absolute right-0 top-8 z-50 w-36 rounded-lg bg-pg-surface border border-pg-border shadow-xl shadow-black/30 py-1">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setOpenMenuId(null);
                              handleEdit(product);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-pg-text hover:bg-pg-bg transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setOpenMenuId(null);
                              handleDelete(product.id);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">${product.price}</p>
              </div>

              {product.description && (
                <p className="text-sm text-pg-text-muted mb-4 line-clamp-2">
                  {product.description}
                </p>
              )}

              {product.url && (
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(product.url!, '_blank');
                  }}
                  className="text-sm bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent hover:from-cyan-300 hover:to-blue-400 block mb-4 truncate transition-all cursor-pointer"
                >
                  {product.url}
                </span>
              )}

              {/* Scan Status */}
              <div className="mt-4 pt-4 border-t border-pg-border space-y-2">
                {product.last_scan_at ? (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-pg-text-muted">Last Scanned:</span>
                      <span className="text-pg-text font-medium">
                        {(() => {
                          const now = new Date();
                          const scanTime = new Date(product.last_scan_at);
                          const diffMs = now.getTime() - scanTime.getTime();
                          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                          const diffDays = Math.floor(diffHours / 24);

                          if (diffHours < 1) return 'Just now';
                          if (diffHours < 24) return `${diffHours}h ago`;
                          if (diffDays < 7) return `${diffDays}d ago`;
                          return `${Math.floor(diffDays / 7)}w ago`;
                        })()}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {product.pending_count! > 0 && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded px-2 py-1 text-center">
                          <div className="text-yellow-400 font-semibold">{product.pending_count}</div>
                          <div className="text-yellow-400/70">Pending</div>
                        </div>
                      )}
                      {product.active_count! > 0 && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded px-2 py-1 text-center">
                          <div className="text-red-400 font-semibold">{product.active_count}</div>
                          <div className="text-red-400/70">Active</div>
                        </div>
                      )}
                      {product.infringement_count! > 0 && (
                        <div className="bg-pg-bg border border-pg-border rounded px-2 py-1 text-center">
                          <div className="text-pg-text font-semibold">{product.infringement_count}</div>
                          <div className="text-pg-text-muted">Total</div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleScan(product.id);
                      }}
                      className="text-sm font-medium text-pg-accent hover:text-pg-accent/80 transition-colors"
                    >
                      Run your first scan now →
                    </button>
                  </div>
                )}
              </div>

            </Link>
          ))}
        </div>
      )}

      {/* Product Creation Wizard */}
      <ProductWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={(product) => {
          setShowWizard(false);
          setPendingEditId(product.id);
          fetchProducts();
        }}
        userId={userId}
      />
    </div>
  );
}
