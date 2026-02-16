# Template Integration Examples

## Example 1: Converting the Progress Bar Component

### Original Component (JSX + Bootstrap)
**File**: `@hk-progressbar/@hk-progressbar.jsx`

```jsx
import classNames from 'classnames';
import { useEffect, useState } from 'react'
import { ProgressBar } from 'react-bootstrap';
import PropTypes from 'prop-types';

const HkProgressBar = ({
    now,
    max = 100,
    min = 0,
    variant,
    size,
    animated,
    rounded,
    className,
}) => {
    const [currentValue, setcurrentValue] = useState(0);

    useEffect(() => {
        setTimeout(() => setcurrentValue(now), 500);
    }, [now])

    return (
        <ProgressBar
            variant={variant}
            now={currentValue}
            max={max}
            min={min}
            animated={animated}
            className={classNames(className,
                { "progress-bar-rounded": rounded },
                (size ? `progress-bar-${size}` : "")
            )}
        />
    )
}
```

### Converted Component (TSX + Tailwind)
**File**: `src/components/ui/ProgressBar.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';

interface ProgressBarProps {
  value: number;
  max?: number;
  min?: number;
  variant?: 'default' | 'success' | 'danger' | 'warning';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  animated?: boolean;
  rounded?: boolean;
  className?: string;
  label?: string;
}

export function ProgressBar({
  value,
  max = 100,
  min = 0,
  variant = 'default',
  size = 'md',
  animated = false,
  rounded = true,
  className,
  label,
}: ProgressBarProps) {
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    setTimeout(() => setCurrentValue(value), 500);
  }, [value]);

  const percentage = ((currentValue - min) / (max - min)) * 100;

  const sizeClasses = {
    xs: 'h-1',
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const variantClasses = {
    default: 'bg-cyan-500',
    success: 'bg-green-500',
    danger: 'bg-red-500',
    warning: 'bg-yellow-500',
  };

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1 text-sm text-pg-text-muted">{label}</div>
      )}
      <div
        className={cn(
          'w-full bg-pg-surface overflow-hidden',
          rounded ? 'rounded-full' : 'rounded',
          sizeClasses[size],
          className
        )}
      >
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out',
            variantClasses[variant],
            animated && 'animate-pulse'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Wrapper component (matches template pattern)
interface ProgressBarWrapperProps {
  children: React.ReactNode;
  className?: string;
}

ProgressBar.Wrapper = function Wrapper({ children, className }: ProgressBarWrapperProps) {
  return <div className={cn('space-y-1', className)}>{children}</div>;
};

ProgressBar.Label = function Label({ children, className }: ProgressBarWrapperProps) {
  return <div className={cn('text-sm font-medium text-pg-text', className)}>{children}</div>;
};
```

### Usage Comparison

**Template (Bootstrap)**:
```jsx
<HkProgressBar.Wrapper>
  <HkProgressBar.Label>United States</HkProgressBar.Label>
  <div className="d-flex align-items-center">
    <HkProgressBar now={80} variant="blue-dark-3" rounded size="xs" className="flex-1" />
    <div className="fs-8 mnw-30p ms-3">80%</div>
  </div>
</HkProgressBar.Wrapper>
```

**ProductGuard.ai (Tailwind)**:
```tsx
<ProgressBar.Wrapper>
  <ProgressBar.Label>United States</ProgressBar.Label>
  <div className="flex items-center gap-3">
    <ProgressBar value={80} variant="default" rounded size="xs" className="flex-1" />
    <div className="text-xs min-w-[30px]">80%</div>
  </div>
</ProgressBar.Wrapper>
```

---

## Example 2: Data Table Integration Approach

The template has a sophisticated data table component with:
- ✅ Sorting
- ✅ Pagination
- ✅ Search/filtering
- ✅ Row selection
- ✅ Custom cell formatters

### Recommendation: **Use as Reference, Rebuild with Tailwind**

**Why Not Direct Conversion?**
1. Heavily dependent on React Bootstrap
2. Complex hooks system
3. Would require installing multiple dependencies

**Better Approach - Extract the Logic:**

```tsx
// Create ProductGuard.ai version
'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils/cn';

interface Column<T> {
  title: string;
  accessor: keyof T;
  sortable?: boolean;
  formatter?: (value: any) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchable?: boolean;
  pageSize?: number;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchable = true,
  pageSize = 10,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter logic (copied from template)
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter((item) =>
      Object.values(item).some((value) =>
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);

  // Sort logic (inspired by template's useSortableData hook)
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Pagination logic (inspired by template's useTablePageSize hook)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: keyof T) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      {searchable && (
        <input
          type="search"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 rounded-lg bg-pg-surface border border-pg-border text-pg-text focus:outline-none focus:border-cyan-500"
        />
      )}

      {/* Table */}
      <div className="rounded-lg border border-pg-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-pg-surface-light">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.accessor)}
                  onClick={() => column.sortable && handleSort(column.accessor)}
                  className={cn(
                    'px-4 py-3 text-left text-sm font-semibold text-pg-text',
                    column.sortable && 'cursor-pointer hover:bg-pg-surface',
                    column.className
                  )}
                >
                  <div className="flex items-center gap-2">
                    {column.title}
                    {column.sortable && sortConfig?.key === column.accessor && (
                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => (
              <tr
                key={idx}
                className="border-t border-pg-border hover:bg-pg-surface-light transition-colors"
              >
                {columns.map((column) => (
                  <td
                    key={String(column.accessor)}
                    className="px-4 py-3 text-sm text-pg-text"
                  >
                    {column.formatter
                      ? column.formatter(row[column.accessor])
                      : row[column.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-pg-text-muted">
          Showing {(currentPage - 1) * pageSize + 1} to{' '}
          {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded bg-pg-surface border border-pg-border text-pg-text disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={currentPage * pageSize >= sortedData.length}
            className="px-3 py-1 rounded bg-pg-surface border border-pg-border text-pg-text disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Usage in ProductGuard.ai

```tsx
// In infringements page
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';

const columns = [
  {
    title: 'Platform',
    accessor: 'platform' as const,
    sortable: true,
  },
  {
    title: 'URL',
    accessor: 'source_url' as const,
    formatter: (url: string) => (
      <a href={url} target="_blank" className="text-cyan-400 hover:underline">
        {url.substring(0, 50)}...
      </a>
    ),
  },
  {
    title: 'Risk Level',
    accessor: 'risk_level' as const,
    sortable: true,
    formatter: (level: string) => (
      <Badge variant={level === 'critical' ? 'danger' : 'warning'}>
        {level}
      </Badge>
    ),
  },
  {
    title: 'Found At',
    accessor: 'detected_at' as const,
    sortable: true,
    formatter: (date: string) => new Date(date).toLocaleDateString(),
  },
];

<DataTable
  columns={columns}
  data={infringements}
  searchable
  pageSize={20}
/>
```

---

## Example 3: Using Template Chart Components Directly

**Charts are worth keeping as-is** because:
- ApexCharts is industry-standard
- Well-maintained library
- Better than building custom charts
- Bundle size is justified by features

### Install Dependencies

```bash
npm install apexcharts react-apexcharts
```

### Copy Chart Component Pattern

**Template Pattern** (from `AudienceReviewChart.jsx`):
```jsx
import ReactApexChart from 'react-apexcharts';

const chartOptions = {
  chart: { type: 'line', height: 350 },
  stroke: { curve: 'smooth', width: 3 },
  colors: ['#00D4AA'],
  // ... more options
};

<ReactApexChart
  options={chartOptions}
  series={[{ name: 'Revenue Loss', data: [10, 41, 35, 51] }]}
  type="line"
  height={350}
/>
```

### Create ProductGuard.ai Chart Component

```tsx
// src/components/dashboard/RevenueChart.tsx
'use client';

import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/Card';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface RevenueChartProps {
  data: { date: string; loss: number }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const chartOptions = {
    chart: {
      type: 'area' as const,
      height: 350,
      toolbar: { show: false },
      background: 'transparent',
    },
    theme: { mode: 'dark' as const },
    stroke: {
      curve: 'smooth' as const,
      width: 2,
    },
    colors: ['#00D4AA'], // pg-accent
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
      },
    },
    xaxis: {
      categories: data.map((d) => d.date),
      labels: { style: { colors: '#7B8CA8' } }, // pg-text-muted
    },
    yaxis: {
      labels: {
        style: { colors: '#7B8CA8' },
        formatter: (val: number) => `$${val}`,
      },
    },
    grid: {
      borderColor: '#1E2A3F', // pg-border
    },
    tooltip: {
      theme: 'dark',
      y: { formatter: (val: number) => `$${val.toFixed(2)}` },
    },
  };

  const series = [
    {
      name: 'Revenue Loss',
      data: data.map((d) => d.loss),
    },
  ];

  return (
    <Card>
      <Card.Header>
        <h6 className="text-pg-text font-semibold">Estimated Revenue Loss</h6>
      </Card.Header>
      <Card.Body>
        <ReactApexChart
          options={chartOptions}
          series={series}
          type="area"
          height={350}
        />
      </Card.Body>
    </Card>
  );
}
```

---

## Summary: What to Integrate

### ✅ High Value - Direct Integration
1. **ApexCharts** - Copy chart patterns, adapt colors to pg-* system
2. **Card Layouts** - Study dashboard card structure and recreate

### ✅ Medium Value - Extract Logic
3. **Data Table** - Extract sorting/pagination logic, rebuild UI with Tailwind
4. **Progress Bars** - Simple conversion from Bootstrap to Tailwind

### ❌ Low Value - Reference Only
5. **Bootstrap Components** - Don't copy directly, too much conversion work
6. **Complex Dependencies** - Gantt charts, rich text editors, etc.

---

## Quick Start: Add Charts Now

**1. Install ApexCharts:**
```bash
npm install apexcharts react-apexcharts
```

**2. Copy template chart data:**
- Study `ChartData/` folder in template
- Copy chart configuration patterns
- Adapt colors to ProductGuard.ai theme

**3. Create revenue loss chart on dashboard:**
- Use the `RevenueChart` component above
- Fetch data from Supabase
- Display trend over time

This gives you professional charts in 1-2 hours with minimal dependencies.
