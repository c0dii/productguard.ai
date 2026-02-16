'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EnhancedProductForm } from '@/components/dashboard/EnhancedProductForm';
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

  const supabase = createClient();

  useEffect(() => {
    fetchUserAndProducts();
  }, []);

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

    try {
      if (editingProduct) {
        // Update existing product
        console.log('Updating product:', editingProduct.id);
        const { error: updateError, data } = await supabase
          .from('products')
          .update(productData)
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
            ...productData,
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

      if (response.ok) {
        alert('Scan started! Check the Scans page to see results.');
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
          <Button
            onClick={() => {
              setEditingProduct(null);
              setShowForm(!showForm);
            }}
            className="w-full sm:w-auto"
          >
          {showForm ? 'Cancel' : '+ Add Product'}
        </Button>
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
        <div className="p-12 rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border">
          <div className="text-center">
            <p className="text-xl font-semibold mb-2 text-pg-text">No products yet</p>
            <p className="text-pg-text-muted mb-4">
              Add your first product to start monitoring for piracy
            </p>
            <Button onClick={() => setShowForm(true)}>+ Add Your First Product</Button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedProducts.map((product) => (
            <Link
              key={product.id}
              href={`/dashboard/products/${product.id}`}
              className="group relative p-6 rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border hover:bg-pg-surface-light hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 block cursor-pointer"
            >
              <div className="mb-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-lg text-pg-text">{product.name}</h3>
                  <Badge variant="default" className="capitalize bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    {product.type}
                  </Badge>
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

              <div
                className="flex flex-col gap-2 mt-4 pt-4 border-t border-pg-border"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleScan(product.id);
                  }}
                  className="w-full"
                >
                  🔍 Run Scan
                </Button>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleEdit(product);
                    }}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(product.id);
                    }}
                    className="flex-1"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
