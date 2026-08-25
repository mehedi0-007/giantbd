'use client';

import { MovementTrendItem } from '@/types/dashboard';
import { formatNumber } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface MovementChartProps {
  data?: MovementTrendItem[];
  isLoading: boolean;
}

export function MovementChart({ data, isLoading }: MovementChartProps) {
  if (isLoading || !data) {
    return (
      <div className="h-80 w-full animate-pulse rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="h-5 w-48 rounded-md bg-slate-100 mb-2" />
        <div className="h-3 w-64 rounded-md bg-slate-100 mb-6" />
        <div className="h-52 w-full rounded-xl bg-slate-50" />
      </div>
    );
  }

  // Custom Clean Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-xs">
          <p className="font-semibold text-slate-800 mb-1.5">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                Stock-In:
              </span>
              <span className="font-bold text-slate-900">
                {formatNumber(payload[0]?.value)} prs
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-rose-500 font-medium">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Stock-Out:
              </span>
              <span className="font-bold text-slate-900">
                {formatNumber(payload[1]?.value)} prs
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Inventory Flow Trends
          </h3>
          <p className="text-xs text-slate-500">
            Monthly Stock-In vs. Stock-Out volume over the past 6 months
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            <span>Stock-In</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span>Stock-Out</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorStockIn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorStockOut" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickFormatter={(val) => (val >= 1000 ? `${val / 1000}k` : val)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="stockIn"
              stroke="#2563eb"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorStockIn)"
            />
            <Area
              type="monotone"
              dataKey="stockOut"
              stroke="#ef4444"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorStockOut)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
