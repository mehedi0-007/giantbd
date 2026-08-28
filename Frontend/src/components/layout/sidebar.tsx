'use client';

import { usePathname } from 'next/navigation';
import NextLink from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  FileText,
  ShoppingBag,
  Package,
  Tags,
  Warehouse,
  ArrowDownToLine,
  ArrowUpFromLine,
  Layers,
  History,
  ShieldCheck,
  UserCheck,
  User,
  Boxes,
  X,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        label: 'Dashboard',
        href: '/',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: 'Commercial',
    items: [
      {
        label: 'Buyers',
        href: '/commercial/buyers',
        icon: Users,
        permission: 'commercial:read',
      },
      {
        label: 'Letters of Credit',
        href: '/commercial/lc',
        icon: FileText,
        permission: 'commercial:read',
      },
      {
        label: 'Purchase Orders',
        href: '/commercial/po',
        icon: ShoppingBag,
        permission: 'commercial:read',
      },
    ],
  },
  {
    title: 'Catalog',
    items: [
      {
        label: 'Products',
        href: '/catalog/products',
        icon: Package,
        permission: 'catalog:read',
      },
      {
        label: 'Attributes',
        href: '/catalog/attributes',
        icon: Tags,
        permission: 'catalog:read',
      },
    ],
  },
  {
    title: 'Warehouse',
    items: [
      {
        label: 'Warehouses & Locations',
        href: '/warehouse',
        icon: Warehouse,
        permission: 'warehouse:read',
      },
    ],
  },
  {
    title: 'Inventory Operations',
    items: [
      {
        label: 'Stock-In (Receipts)',
        href: '/inventory/stock-in',
        icon: ArrowDownToLine,
        permission: 'inventory:receive',
      },
      {
        label: 'Stock-Out (Challans)',
        href: '/inventory/stock-out',
        icon: ArrowUpFromLine,
        permission: 'inventory:issue',
      },
      {
        label: 'Current Stock',
        href: '/inventory/stock',
        icon: Layers,
        permission: 'inventory:read',
      },
      {
        label: 'Movements Ledger',
        href: '/inventory/movements',
        icon: History,
        permission: 'inventory:read',
      },
    ],
  },
  {
    title: 'System & Admin',
    items: [
      {
        label: 'User Management',
        href: '/admin/users',
        icon: UserCheck,
        permission: 'users:read',
      },
      {
        label: 'Roles & Access',
        href: '/admin/roles',
        icon: ShieldCheck,
        permission: 'roles:read',
      },
      {
        label: 'My Profile',
        href: '/profile',
        icon: User,
      },
    ],
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { hasPermission } = useAuthStore();

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white">
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 shadow-sm shadow-blue-500/20">
            <Boxes className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 leading-none">
              Giant BD
            </h1>
            <span className="text-[11px] font-medium text-slate-400">
              ERP & WMS Platform
            </span>
          </div>
        </div>

        {/* Mobile close button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation Links (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section, idx) => {
          const visibleItems = section.items.filter((item) =>
            item.permission ? hasPermission(item.permission) : true,
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="mb-5 last:mb-0">
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {section.title}
              </div>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const isActive =
                    item.href === '/'
                      ? pathname === '/'
                      : pathname === item.href || pathname.startsWith(item.href + '/');

                  const Icon = item.icon;

                  return (
                    <NextLink
                      key={item.href}
                      href={item.href}
                      onClick={() => {
                        if (onClose) onClose();
                      }}
                      className={cn(
                        'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150',
                        isActive
                          ? 'bg-blue-50 font-semibold text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          isActive
                            ? 'text-blue-600'
                            : 'text-slate-400 group-hover:text-slate-600',
                        )}
                      />
                      <span>{item.label}</span>
                    </NextLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer System Status */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium">System Online (v1.0)</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
