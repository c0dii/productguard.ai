'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Scan {
  id: string;
  status: string;
  results_count?: number;
  created_at: string;
  archived_at?: string | null;
}

export function AdminUserScans({ scans }: { scans: Scan[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (scan: Scan) => {
    if (
      !confirm(
        `Delete this scan?\n\nThis will permanently remove the scan and all associated scan history and infringements. This cannot be undone.`
      )
    )
      return;

    setDeleting(scan.id);
    try {
      const response = await fetch(`/api/admin/scans/${scan.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete scan');
      }
    } catch {
      alert('Failed to delete scan');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Recent Scans</h2>
      {scans.length === 0 ? (
        <p className="text-sm text-pg-text-muted">No scans yet</p>
      ) : (
        <div className="space-y-2">
          {scans.map((scan) => (
            <div
              key={scan.id}
              className="text-sm p-2 bg-pg-surface-light rounded flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex justify-between mr-3">
                  <span className="capitalize text-pg-accent">
                    {scan.status}
                    {scan.archived_at && (
                      <span className="text-pg-text-muted ml-1">(archived)</span>
                    )}
                  </span>
                  <span className="text-pg-text-muted">
                    {scan.results_count || 0} results
                  </span>
                </div>
                <p className="text-xs text-pg-text-muted">
                  {new Date(scan.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleDelete(scan)}
                disabled={deleting === scan.id}
                className="px-2.5 py-1 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-all disabled:opacity-50 shrink-0"
              >
                {deleting === scan.id ? '...' : 'Delete'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
