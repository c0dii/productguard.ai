import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/products/[id]/pending
 * Fetch paginated pending infringements for a product with sorting
 *
 * Query params:
 *   page     - Page number (default: 1)
 *   pageSize - Items per page: 10, 20, 50, 100 (default: 10)
 *   sort     - Sort field: severity, newest, traffic, most_seen (default: severity)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify product ownership
  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  // Parse query params
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const rawPageSize = parseInt(searchParams.get('pageSize') || '10', 10);
  const pageSize = [10, 20, 50, 100].includes(rawPageSize) ? rawPageSize : 10;
  const sort = searchParams.get('sort') || 'severity';

  // Build sort config
  let orderColumn: string;
  let ascending: boolean;
  switch (sort) {
    case 'newest':
      orderColumn = 'first_seen_at';
      ascending = false;
      break;
    case 'traffic':
      orderColumn = 'audience_size';
      ascending = false;
      break;
    case 'most_seen':
      orderColumn = 'seen_count';
      ascending = false;
      break;
    case 'severity':
    default:
      orderColumn = 'severity_score';
      ascending = false;
      break;
  }

  const offset = (page - 1) * pageSize;

  // Fetch total count
  const { count } = await supabase
    .from('infringements')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', id)
    .eq('status', 'pending_verification');

  // Fetch paginated data
  const { data: infringements, error } = await supabase
    .from('infringements')
    .select('*')
    .eq('product_id', id)
    .eq('status', 'pending_verification')
    .order(orderColumn, { ascending })
    .range(offset, offset + pageSize - 1);

  if (error) {
    console.error('Error fetching pending infringements:', error);
    return NextResponse.json({ error: 'Failed to fetch infringements' }, { status: 500 });
  }

  return NextResponse.json({
    infringements: infringements || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  });
}
