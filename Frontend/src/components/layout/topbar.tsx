'use client';

import { useAuthStore } from '@/store/auth.store';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { LogOut, User as UserIcon, Bell, ChevronDown, Menu } from 'lucide-react';
import api from '@/lib/api';
import { getFileUrl } from '@/lib/utils';
import NextLink from 'next/link';

interface TopbarProps {
  onOpenMobileSidebar?: () => void;
}

export function Topbar({ onOpenMobileSidebar }: TopbarProps) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      logout();
      router.push('/login');
    }
  };

  // Convert pathname to clean breadcrumb title
  const getBreadcrumbTitle = () => {
    if (pathname === '/dashboard' || pathname === '/') return 'Executive Dashboard';
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) return 'Dashboard';
    const lastPart = parts[parts.length - 1];
    return lastPart
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-4 sm:px-6 backdrop-blur-md">
      {/* Left Area: Mobile Hamburger + Breadcrumb Title */}
      <div className="flex items-center gap-3">
        {onOpenMobileSidebar && (
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            aria-label="Open navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <h2 className="text-base sm:text-lg font-semibold tracking-tight text-slate-800 truncate max-w-[200px] sm:max-w-none">
          {getBreadcrumbTitle()}
        </h2>
      </div>

      {/* Right Controls: Notifications & User Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Alerts Bell */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-[#f4f7fc] text-slate-500 hover:bg-[#3b66b7]/10 hover:text-[#3b66b7] transition cursor-pointer"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#3b66b7] ring-2 ring-white" />
        </button>

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            className="flex items-center gap-2 sm:gap-3 rounded-xl border border-slate-200/80 bg-[#f4f7fc] py-1.5 pl-2 pr-2.5 sm:pr-3 hover:bg-slate-100 transition cursor-pointer"
          >
            {user?.image ? (
              <img
                src={getFileUrl(user.image)}
                alt={user.name}
                className="h-7 w-7 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3b66b7] text-xs font-semibold text-white shadow-xs shadow-[#3b66b7]/30">
                {getInitials(user?.name)}
              </div>
            )}
            <div className="hidden text-left md:block">
              <p className="text-xs font-semibold text-slate-900 leading-tight">
                {user?.name || 'Administrator'}
              </p>
              <p className="text-[10px] font-medium text-slate-500 leading-tight">
                {user?.role?.name || 'User'}
              </p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl shadow-slate-200/60 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="border-b border-slate-100 px-3 py-2 md:hidden">
                <p className="text-xs font-semibold text-slate-900">{user?.name}</p>
                <p className="text-[10px] text-slate-500">{user?.email}</p>
                <span className="mt-1 inline-block rounded-md bg-[#3b66b7]/10 px-2 py-0.5 text-[10px] font-semibold text-[#3b66b7]">
                  {user?.role?.name}
                </span>
              </div>

              <NextLink
                href="/profile"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-[#3b66b7]/8 hover:text-[#3b66b7] transition"
              >
                <UserIcon className="h-4 w-4 text-slate-400" />
                <span>My Profile</span>
              </NextLink>

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              >
                <LogOut className="h-4 w-4 text-rose-500" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
