'use client';

import { useAuthStore } from '@/store/auth.store';
import {
  Boxes,
  Users,
  FileText,
  ShoppingBag,
  Package,
  Warehouse,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import NextLink from 'next/link';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const quickLinks = [
    {
      title: 'Commercial Module',
      description: 'Manage Buyers, Letters of Credit, and Purchase Orders',
      href: '/commercial/po',
      icon: ShoppingBag,
      color: 'bg-blue-50 text-blue-600 border-blue-100',
    },
    {
      title: 'Product Catalog',
      description: 'View Master Products, size matrices, and attributes',
      href: '/catalog/products',
      icon: Package,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    },
    {
      title: 'Warehouse & Locations',
      description: 'Explore warehouse bins and print barcode sticker labels',
      href: '/warehouse',
      icon: Warehouse,
      color: 'bg-amber-50 text-amber-600 border-amber-100',
    },
    {
      title: 'Stock-In Operations',
      description: 'Receive goods, auto-resolve sizes, and generate batches',
      href: '/inventory/stock-in',
      icon: ArrowDownToLine,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    {
      title: 'Stock-Out Challans',
      description: 'Dispatch orders using FIFO and print official Challans',
      href: '/inventory/stock-out',
      icon: ArrowUpFromLine,
      color: 'bg-rose-50 text-rose-600 border-rose-100',
    },
    {
      title: 'User Management',
      description: 'Manage staff accounts, digital signatures, and roles',
      href: '/system/users',
      icon: Users,
      color: 'bg-purple-50 text-purple-600 border-purple-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                Phase 1 Shell Active
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-medium text-slate-500">
                {user?.role?.name || 'Administrator'}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome back, {user?.name || 'User'}! 👋
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Giant BD ERP & WMS platform is operational. Select a module below to get started.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-right">
              <div className="text-[11px] font-medium text-slate-400">Backend API</div>
              <div className="flex items-center justify-end gap-1.5 text-xs font-semibold text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Connected (Port 3000)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Operation Modules
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link, idx) => {
            const Icon = link.icon;
            return (
              <NextLink
                key={idx}
                href={link.href}
                className="group flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-blue-300 hover:shadow-md transition-all duration-150"
              >
                <div>
                  <div
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border ${link.color} mb-3`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {link.title}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    {link.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-blue-600">
                  <span>Open Module</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </NextLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}
