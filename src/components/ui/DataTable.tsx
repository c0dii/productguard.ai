'use client';

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { useState } from 'react';

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  pageSize?: number;
  showPagination?: boolean;
  showSearch?: boolean;
  searchPlaceholder?: string;
  className?: string;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData>({
  columns,
  data,
  pageSize = 10,
  showPagination = true,
  showSearch = false,
  searchPlaceholder = 'Search...',
  className = '',
  onRowClick,
}: DataTableProps<TData>) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    state: {
      pagination,
      sorting,
      columnFilters,
      globalFilter,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar */}
      {showSearch && (
        <div className="flex items-center justify-between">
          <input
            type="search"
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="px-4 py-2 rounded-lg bg-pg-surface border border-pg-border text-pg-text placeholder:text-pg-text-muted focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-pg-border overflow-hidden bg-pg-surface">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-pg-surface-light">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      scope="col"
                      aria-sort={
                        header.column.getIsSorted() === 'asc' ? 'ascending'
                          : header.column.getIsSorted() === 'desc' ? 'descending'
                          : header.column.getCanSort() ? 'none' : undefined
                      }
                      className="px-4 py-3 text-left text-sm font-semibold text-pg-text border-b border-pg-border"
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={
                            header.column.getCanSort()
                              ? 'flex items-center gap-2 cursor-pointer select-none hover:text-cyan-400 transition-colors'
                              : ''
                          }
                          role={header.column.getCanSort() ? 'button' : undefined}
                          tabIndex={header.column.getCanSort() ? 0 : undefined}
                          onKeyDown={header.column.getCanSort() ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              header.column.getToggleSortingHandler()?.(e);
                            }
                          } : undefined}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className="text-pg-text-muted">
                              {header.column.getIsSorted() === 'asc' ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              ) : header.column.getIsSorted() === 'desc' ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                </svg>
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-pg-text-muted"
                  >
                    No data found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row.original)}
                    className={`border-b border-pg-border hover:bg-pg-surface-light transition-colors ${
                      onRowClick ? 'cursor-pointer' : ''
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-sm text-pg-text">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {showPagination && table.getPageCount() > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Page Info */}
          <div className="text-sm text-pg-text-muted">
            Showing{' '}
            <span className="font-medium text-pg-text">
              {table.getState().pagination.pageIndex * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-medium text-pg-text">
              {Math.min((table.getState().pagination.pageIndex + 1) * pageSize, data.length)}
            </span>{' '}
            of <span className="font-medium text-pg-text">{data.length}</span> results
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              aria-label="First page"
              className="px-3 py-2 rounded-lg bg-pg-surface border border-pg-border text-pg-text disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pg-surface-light hover:border-cyan-500 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-4 py-2 rounded-lg bg-pg-surface border border-pg-border text-pg-text disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pg-surface-light hover:border-cyan-500 transition-all"
            >
              Previous
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, table.getPageCount()) }, (_, i) => {
                const currentPage = table.getState().pagination.pageIndex;
                const totalPages = table.getPageCount();

                // Show first, last, and pages around current
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i;
                } else if (currentPage < 3) {
                  pageNum = i;
                } else if (currentPage > totalPages - 4) {
                  pageNum = totalPages - 5 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={i}
                    onClick={() => table.setPageIndex(pageNum)}
                    className={`w-10 h-10 rounded-lg border transition-all ${
                      pageNum === currentPage
                        ? 'bg-cyan-500 border-cyan-500 text-white'
                        : 'bg-pg-surface border-pg-border text-pg-text hover:bg-pg-surface-light hover:border-cyan-500'
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-4 py-2 rounded-lg bg-pg-surface border border-pg-border text-pg-text disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pg-surface-light hover:border-cyan-500 transition-all"
            >
              Next
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              aria-label="Last page"
              className="px-3 py-2 rounded-lg bg-pg-surface border border-pg-border text-pg-text disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pg-surface-light hover:border-cyan-500 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
