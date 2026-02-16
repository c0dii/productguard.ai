'use client';

import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import type { ColumnDef } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';

interface Scan {
  id: string;
  created_at: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  infringement_count: number;
  est_revenue_loss: number;
  products: {
    name: string;
  } | null;
}

const columns: ColumnDef<Scan>[] = [
  {
    accessorKey: 'products.name',
    header: 'Product',
    cell: ({ row }) => {
      const name = row.original.products?.name || 'Unknown Product';
      return (
        <span className="font-semibold text-cyan-400">
          {name}
        </span>
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
            {new Date(date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <span className="text-xs text-pg-text-muted">
            {new Date(date).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
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
      return (
        <Badge
          variant="default"
          className={
            status === 'completed'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : status === 'failed'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : status === 'running'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
          }
        >
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'infringement_count',
    header: 'Infringements',
    cell: ({ getValue }) => {
      const count = getValue() as number;
      return (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-pg-text">{count.toLocaleString()}</span>
          {count > 0 && (
            <span className="text-xs text-pg-text-muted">found</span>
          )}
        </div>
      );
    },
  },
  // Temporarily disabled - revenue loss calculations need refinement
  // {
  //   accessorKey: 'est_revenue_loss',
  //   header: 'Est. Revenue Loss',
  //   cell: ({ getValue }) => {
  //     const loss = getValue() as number;
  //     return loss > 0 ? (
  //       <span className="font-semibold text-red-400">
  //         ${loss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
  //       </span>
  //     ) : (
  //       <span className="text-pg-text-muted">$0.00</span>
  //     );
  //   },
  // },
];

interface ScansTableProps {
  scans: Scan[];
}

export default function ScansTable({ scans }: ScansTableProps) {
  const router = useRouter();

  const handleRowClick = (scan: Scan) => {
    router.push(`/dashboard/scans/${scan.id}`);
  };

  return (
    <DataTable
      columns={columns}
      data={scans}
      pageSize={15}
      showPagination
      showSearch
      searchPlaceholder="Search scans by product name, status..."
      onRowClick={handleRowClick}
    />
  );
}
