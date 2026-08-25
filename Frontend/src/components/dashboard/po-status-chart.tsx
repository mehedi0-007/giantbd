'use client';

import { PoStatusDistribution } from '@/types/dashboard';
import { formatNumber } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ShoppingBag } from 'lucide-react';

interface PoStatusChartProps {
  data?: PoStatusDistribution[];
  isLoading: boolean;
}

export function PoStatusChart({ data, isLoading }: PoStatusChartProps) {
  if (isLoading || !data) {
    return (
      <div className="h-80 w-full animate-pulse rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="h-5 w-40 rounded-md bg-slate-100 mb-2" />
        <div className="h-3 w-48 rounded-md bg-slate-100 mb-6" />
        <div className="flex h-52 items-center justify-center">
          <div className="h-36 w-36 rounded-full border-4 border-slate-100" />
        </div>
      </div>
    );
  }

  const totalPos = data.reduce((sum, item) => sum + item.count, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const pct = totalPos > 0 ? Math.round((item.count / totalPos) * 100) : 0;
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-lg text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.name}</span>
          </div>
          <p className="mt-1 text-slate-600">
            <strong>{formatNumber(item.count)}</strong> POs ({pct}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col justify-between">
      <div>
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          PO Status Pipeline
        </h3>
        <p className="text-xs text-slate-500">
          Distribution across active and completed orders
        </p>
      </div>

      {totalPos === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <ShoppingBag className="h-10 w-10 mb-2 stroke-1 text-slate-300" />
          <p className="text-xs font-medium">No purchase orders recorded yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4 my-auto py-2">
          {/* Donut Chart Container */}
          <div className="relative h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Center Count */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-slate-900 leading-none">
                {totalPos}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mt-0.5">
                Total POs
              </span>
            </div>
          </div>

          {/* Right Legend */}
          <div className="space-y-2 pr-2">
            {data.map((item, idx) => {
              const pct =
                totalPos > 0 ? Math.round((item.count / totalPos) * 100) : 0;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-600 truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2 font-medium text-slate-800">
                    <span>{item.count}</span>
                    <span className="text-[11px] text-slate-400">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
