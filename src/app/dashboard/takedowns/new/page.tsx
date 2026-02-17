import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TakedownForm } from '@/components/dashboard/TakedownForm';

export default async function NewTakedownPage({
  searchParams,
}: {
  searchParams: Promise<{ infringement_id?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // If infringement_id is provided, fetch the infringement data
  let infringement = null;
  let product = null;

  if (params.infringement_id) {
    const { data } = await supabase
      .from('infringements')
      .select('*, products(*)')
      .eq('id', params.infringement_id)
      .eq('user_id', user.id)
      .single();

    if (data) {
      infringement = data;
      product = data.products;
    }
  }

  // Fetch all user's products for the dropdown
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', user.id)
    .order('name');

  const isManual = !infringement;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-pg-text">
          {isManual ? 'Report Infringing URL' : 'Send DMCA Takedown Notice'}
        </h1>
        <p className="text-xs sm:text-sm text-pg-text-muted">
          {isManual
            ? 'Manually report an infringing URL and generate a DMCA takedown notice'
            : 'Complete this form to generate a legally-compliant DMCA takedown notice'}
        </p>
      </div>

      <TakedownForm
        prefilledInfringement={infringement}
        prefilledProduct={product}
        availableProducts={products || []}
        userId={user.id}
      />
    </div>
  );
}
