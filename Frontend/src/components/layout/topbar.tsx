'use client';

import { useAuthStore } from '@/store/auth.store';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { LogOut, User as UserIcon, Bell, ChevronDown } from 'lucide-react';
import api from '@/lib/api';
import NextLink from 'next/link';

export function Topbar() {
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
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md">
      {/* Breadcrumb Title */}
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-slate-800">
          {getBreadcrumbTitle()}
        </h2>
      </div>

      {/* Right Controls: Notifications & User Profile */}
      <div className="flex items-center gap-4">
        {/* Alerts Bell (Placeholder) */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600" />
        </button>

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-2 pr-3 hover:bg-slate-100 transition"
          >
            {user?.image ? (
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/${user.image}`}
                alt={user.name}
                className="h-7 w-7 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                {getInitials(user?.name)}
              </div>
            )}
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-800 leading-tight">
                {user?.name || 'Administrator'}
              </div>
              <div className="text-[10px] font-medium text-slate-500 leading-none">
                {user?.role?.name || 'Staff'}
              </div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-lg border border-slate-200 bg-white py-1.5 shadow-lg shadow-slate-200/50">
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="text-xs font-semibold text-slate-800">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>

              <NextLink
                href="/system/profile"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <UserIcon className="h-4 w-4 text-slate-400" />
                <span>My Profile & Settings</span>
              </NextLink>

              <div className="border-t border-slate-100 my-1" />

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition"
              >
                <LogOut className="h-4 w-4 text-red-500" />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
