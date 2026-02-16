'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { ProductTimelineData } from '@/types';

interface InfringementTrendChartProps {
  data: ProductTimelineData[];
}

export function InfringementTrendChart({ data }: InfringementTrendChartProps) {
  // Transform data for recharts format
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((d) => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: d.unique_count,
      loss: d.total_loss,
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center text-pg-text-muted">
        <svg className="w-16 h-16 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <p className="text-sm text-center">
          No verified infringements yet.
          <br />
          <span className="text-pg-accent">Verify pending items</span> to see trends.
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.3} />
        <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} tick={{ fill: '#9ca3af' }} />
        <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} tick={{ fill: '#9ca3af' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#111827',
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#f3f4f6',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
          }}
          labelStyle={{ color: '#9ca3af', marginBottom: '8px' }}
          itemStyle={{ color: '#00D4AA' }}
        />
        <Legend
          wrapperStyle={{
            fontSize: '12px',
            color: '#9ca3af',
            paddingTop: '16px',
          }}
          iconType="line"
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#00D4AA"
          strokeWidth={2.5}
          name="Unique Infringements"
          dot={{
            fill: '#00D4AA',
            r: 4,
            strokeWidth: 0,
          }}
          activeDot={{
            r: 6,
            fill: '#00D4AA',
            stroke: '#0B0F1A',
            strokeWidth: 2,
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
