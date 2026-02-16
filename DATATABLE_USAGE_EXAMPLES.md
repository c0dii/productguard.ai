# DataTable Usage Examples

## Overview

You now have a professional **TanStack React Table** component integrated into ProductGuard.ai with:

- ✅ **Sorting** - Click column headers to sort
- ✅ **Pagination** - Navigate through large datasets
- ✅ **Search/Filtering** - Global search across all columns
- ✅ **Responsive** - Mobile-friendly design
- ✅ **Type-Safe** - Full TypeScript support
- ✅ **Tailwind Styled** - Matches your design system perfectly

---

## Basic Usage

### Example 1: Simple Infringements Table

```tsx
'use client';

import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import type { ColumnDef } from '@tanstack/react-table';

interface Infringement {
  id: string;
  platform: string;
  source_url: string;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  detected_at: string;
  status: 'pending' | 'investigating' | 'resolved';
}

const columns: ColumnDef<Infringement>[] = [
  {
    accessorKey: 'platform',
    header: 'Platform',
    cell: ({ getValue }) => {
      const platform = getValue() as string;
      return <span className="font-medium capitalize">{platform}</span>;
    },
  },
  {
    accessorKey: 'source_url',
    header: 'URL',
    cell: ({ getValue }) => {
      const url = getValue() as string;
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 hover:underline truncate block max-w-md"
        >
          {url.length > 60 ? url.substring(0, 60) + '...' : url}
        </a>
      );
    },
  },
  {
    accessorKey: 'risk_level',
    header: 'Risk Level',
    cell: ({ getValue }) => {
      const level = getValue() as string;
      const variants: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
        critical: 'critical',
        high: 'high',
        medium: 'medium',
        low: 'low',
      };
      return <Badge variant={variants[level]}>{level}</Badge>;
    },
  },
  {
    accessorKey: 'detected_at',
    header: 'Detected',
    cell: ({ getValue }) => {
      const date = getValue() as string;
      return (
        <span className="text-pg-text-muted">
          {new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => {
      const status = getValue() as string;
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            status === 'resolved'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : status === 'investigating'
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}
        >
          {status}
        </span>
      );
    },
  },
];

export default function InfringementsTable({ infringements }: { infringements: Infringement[] }) {
  return (
    <DataTable
      columns={columns}
      data={infringements}
      pageSize={20}
      showPagination
      showSearch
      searchPlaceholder="Search infringements..."
    />
  );
}
```

---

## Example 2: Scans History Table

```tsx
'use client';

import { DataTable } from '@/components/ui/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';

interface Scan {
  id: string;
  product_name: string;
  created_at: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  infringement_count: number;
  est_revenue_loss: number;
}

const columns: ColumnDef<Scan>[] = [
  {
    accessorKey: 'product_name',
    header: 'Product',
    cell: ({ row, getValue }) => {
      const name = getValue() as string;
      return (
        <Link
          href={`/dashboard/scans/${row.original.id}`}
          className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline"
        >
          {name}
        </Link>
      );
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Scan Date',
    cell: ({ getValue }) => {
      const date = getValue() as string;
      return (
        <div className="flex flex-col">
          <span className="text-pg-text">
            {new Date(date).toLocaleDateString()}
          </span>
          <span className="text-xs text-pg-text-muted">
            {new Date(date).toLocaleTimeString()}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => {
      const status = getValue() as string;
      const statusConfig = {
        completed: { color: 'cyan', text: 'Completed' },
        running: { color: 'yellow', text: 'Running' },
        pending: { color: 'blue', text: 'Pending' },
        failed: { color: 'red', text: 'Failed' },
      };
      const config = statusConfig[status as keyof typeof statusConfig];
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${config.color}-500/20 text-${config.color}-400 border border-${config.color}-500/30`}
        >
          {config.text}
        </span>
      );
    },
  },
  {
    accessorKey: 'infringement_count',
    header: 'Infringements',
    cell: ({ getValue }) => {
      const count = getValue() as number;
      return (
        <span className="font-semibold text-pg-text">
          {count.toLocaleString()}
        </span>
      );
    },
  },
  {
    accessorKey: 'est_revenue_loss',
    header: 'Est. Revenue Loss',
    cell: ({ getValue }) => {
      const loss = getValue() as number;
      return (
        <span className="font-semibold text-red-400">
          ${loss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      );
    },
  },
];

export default function ScansTable({ scans }: { scans: Scan[] }) {
  return (
    <DataTable
      columns={columns}
      data={scans}
      pageSize={15}
      showPagination
      showSearch
      searchPlaceholder="Search scans..."
    />
  );
}
```

---

## Example 3: Products Table with Actions

```tsx
'use client';

import { DataTable } from '@/components/ui/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';

interface Product {
  id: string;
  name: string;
  type: 'ebook' | 'course' | 'software' | 'template' | 'audio';
  created_at: string;
  scan_count: number;
  last_scan: string | null;
}

export default function ProductsTable({ products }: { products: Product[] }) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    setDeletingId(id);
    // Your delete logic here
    setDeletingId(null);
  };

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: 'name',
      header: 'Product Name',
      cell: ({ getValue }) => (
        <span className="font-medium text-pg-text">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ getValue }) => (
        <span className="capitalize text-pg-text-muted">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'scan_count',
      header: 'Total Scans',
      cell: ({ getValue }) => (
        <span className="text-pg-text">{getValue() as number}</span>
      ),
    },
    {
      accessorKey: 'last_scan',
      header: 'Last Scan',
      cell: ({ getValue }) => {
        const date = getValue() as string | null;
        return date ? (
          <span className="text-pg-text-muted">
            {new Date(date).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-pg-text-muted italic">Never</span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => alert(`Edit ${row.original.name}`)}
            className="px-3 py-1 rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors text-sm"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(row.original.id)}
            disabled={deletingId === row.original.id}
            className="px-3 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm disabled:opacity-50"
          >
            {deletingId === row.original.id ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={products}
      pageSize={10}
      showPagination
      showSearch
      searchPlaceholder="Search products..."
    />
  );
}
```

---

## Example 4: Server Component Integration (Recommended)

```tsx
// app/dashboard/infringements/page.tsx
import { createClient } from '@/lib/supabase/server';
import InfringementsTable from './InfringementsTable';

export default async function InfringementsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch infringements
  const { data: infringements } = await supabase
    .from('infringements')
    .select('*')
    .eq('user_id', user.id)
    .order('detected_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-pg-text">
          Infringements
        </h1>
        <p className="text-sm sm:text-base text-pg-text-muted">
          Monitor and manage detected infringements
        </p>
      </div>

      <InfringementsTable infringements={infringements || []} />
    </div>
  );
}
```

```tsx
// app/dashboard/infringements/InfringementsTable.tsx
'use client';

import { DataTable } from '@/components/ui/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
// ... column definitions from Example 1 ...

export default function InfringementsTable({ infringements }) {
  return <DataTable columns={columns} data={infringements} />;
}
```

---

## Advanced Features

### Sortable Columns

Enable sorting by setting `enableSorting: true` in column definition:

```tsx
{
  accessorKey: 'detected_at',
  header: 'Detected',
  enableSorting: true, // Enable sorting for this column
  cell: ({ getValue }) => {
    const date = getValue() as string;
    return new Date(date).toLocaleDateString();
  },
}
```

By default, all columns are sortable. Disable with `enableSorting: false`.

### Custom Cell Rendering

```tsx
{
  accessorKey: 'risk_level',
  header: 'Risk',
  cell: ({ getValue, row }) => {
    const level = getValue() as string;
    const count = row.original.infringement_count;

    return (
      <div className="flex items-center gap-2">
        <Badge variant={level}>{level}</Badge>
        <span className="text-xs text-pg-text-muted">({count} total)</span>
      </div>
    );
  },
}
```

### Conditional Row Styling

Modify the DataTable component or wrap rows:

```tsx
// In your table component
<tr
  className={`border-b border-pg-border transition-colors ${
    row.original.status === 'critical'
      ? 'bg-red-500/10 hover:bg-red-500/20'
      : 'hover:bg-pg-surface-light'
  }`}
>
```

### Row Actions (Click Handler)

```tsx
const columns: ColumnDef<Infringement>[] = [
  // ... other columns ...
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Link href={`/dashboard/infringements/${row.original.id}`}>
        <button className="text-cyan-400 hover:text-cyan-300">
          View Details →
        </button>
      </Link>
    ),
  },
];
```

---

## Component Props Reference

```tsx
interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];      // Column definitions
  data: TData[];                     // Data array
  pageSize?: number;                 // Items per page (default: 10)
  showPagination?: boolean;          // Show pagination controls (default: true)
  showSearch?: boolean;              // Show search bar (default: false)
  searchPlaceholder?: string;        // Search input placeholder
  className?: string;                // Additional CSS classes
}
```

---

## Performance Tips

1. **Server Components** - Fetch data in Server Components when possible
2. **Memoization** - Memoize column definitions to avoid re-renders:
   ```tsx
   const columns = useMemo<ColumnDef<Infringement>[]>(() => [...], []);
   ```
3. **Pagination** - Use smaller page sizes for better performance (10-25 items)
4. **Lazy Loading** - Consider server-side pagination for very large datasets

---

## Next Steps

1. ✅ Replace existing table in `/dashboard/scans/page.tsx`
2. ✅ Update infringements display
3. ✅ Add to products management page
4. ✅ Customize columns per your needs
5. ✅ Add row click handlers if needed

The DataTable component is production-ready and fully integrated with your design system!
