'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { User, Role } from '@/types/auth';
import { UserDrawer } from '@/components/admin/user-drawer';
import { ConfirmDialog, TableSkeleton, EmptyState } from '@/components/common';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Shield,
  FileSignature,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [twoFAFilter, setTwoFAFilter] = useState<'ALL' | 'ENABLED' | 'DISABLED'>('ALL');
  const [page, setPage] = useState(1);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // 1. Fetch Roles
  const { data: rolesData } = useQuery({
    queryKey: ['roles-filter'],
    queryFn: async () => {
      const res = await api.get('/roles', { params: { per_page: 50 } });
      return res.data?.data;
    },
  });

  // 2. Fetch Users List
  const { data: usersData, isLoading, isFetching } = useQuery({
    queryKey: ['users-list', page, search, roleFilter],
    queryFn: async () => {
      const res = await api.get('/users', {
        params: {
          page,
          per_page: 25,
          search: search.trim() || undefined,
          roleId: roleFilter || undefined,
        },
      });
      return res.data?.data;
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      toast.success('User deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setUserToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    },
  });

  // Restore Mutation
  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/users/${id}/restore`);
    },
    onSuccess: () => {
      toast.success('User restored successfully');
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to restore user');
    },
  });

  const roles: Role[] = Array.isArray(rolesData?.data) ? rolesData.data : Array.isArray(rolesData) ? rolesData : [];
  const rawUsers: User[] = Array.isArray(usersData?.data) ? usersData.data : Array.isArray(usersData) ? usersData : [];

  const users = rawUsers.filter((u) => {
    const is2faActive = u.isTwoFactorEnabled || Boolean(u.role?.isTwoFactorRequired);
    if (twoFAFilter === 'ENABLED' && !is2faActive) return false;
    if (twoFAFilter === 'DISABLED' && is2faActive) return false;
    return true;
  });

  const handleOpenCreate = () => {
    setSelectedUser(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setSelectedUser(u);
    setIsDrawerOpen(true);
  };

  const hasActiveFilters = Boolean(search || roleFilter || twoFAFilter !== 'ALL');

  const handleResetFilters = () => {
    setSearch('');
    setRoleFilter('');
    setTwoFAFilter('ALL');
    setPage(1);
  };

  const getRoleBadge = (roleName: string) => {
    switch (roleName) {
      case 'SUPER_ADMIN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ADMIN':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'OPERATOR':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const handleRestoreUser = async (id: string) => {
    restoreMutation.mutate(id);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            User Accounts & Security Access
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage system access accounts, assigned roles, 2FA status, and digital sign-off seals
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New User Account</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email, or phone..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
          />
        </div>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden"
        >
          <option value="">🛡️ All Security Roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        {/* 2FA Status Filter */}
        <select
          value={twoFAFilter}
          onChange={(e) => {
            setTwoFAFilter(e.target.value as any);
            setPage(1);
          }}
          className="w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden"
        >
          <option value="ALL">🔐 All 2FA Statuses</option>
          <option value="ENABLED">🔒 2FA Active</option>
          <option value="DISABLED">🔓 Password Only</option>
        </select>

        {/* Reset Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="w-full sm:w-auto shrink-0 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            Reset
          </button>
        )}

        {isFetching && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        {isLoading ? (
          <TableSkeleton
            rows={6}
            columns={['26%', '20%', '20%', '14%', '10%', '10%']}
          />
        ) : users.length === 0 ? (
          <EmptyState
            icon={<Users className="h-7 w-7" />}
            title={hasActiveFilters ? 'No matching users found' : 'No user accounts yet'}
            description={
              hasActiveFilters
                ? 'Try adjusting your search keywords, role filters, or 2FA criteria.'
                : 'Create your first user account to grant access to warehouse and commercial staff.'
            }
            action={
              hasActiveFilters
                ? {
                    label: 'Reset Filters',
                    onClick: handleResetFilters,
                    variant: 'secondary',
                  }
                : {
                    label: 'Add New User',
                    onClick: () => {
                      setSelectedUser(null);
                      setIsDrawerOpen(true);
                    },
                    icon: <Plus className="h-3.5 w-3.5" />,
                  }
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">Role & Access Level</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5">Signature Stamp</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {users.map((u) => {
                  const isDel = u.status === 'DELETED';
                  const roleName = u.role?.name || 'USER';

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isDel ? 'bg-slate-50/40 opacity-70' : ''
                      }`}
                    >
                      {/* Avatar & Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {u.avatar ? (
                            <img
                              src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/${u.avatar}`}
                              alt={u.name}
                              className="h-9 w-9 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <div className="text-[11px] text-slate-400">{u.gender || 'MALE'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${getRoleBadge(
                            roleName,
                          )}`}
                        >
                          <Shield className="h-3 w-3" />
                          <span>{roleName}</span>
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">{u.email}</div>
                        {u.phone && <div className="text-[11px] text-slate-400">{u.phone}</div>}
                      </td>

                      {/* Signature Stamp */}
                      <td className="px-5 py-4">
                        {u.signature ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
                            <FileSignature className="h-3 w-3" />
                            <span>Uploaded</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">None</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isDel
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!isDel ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(u)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 transition cursor-pointer"
                                title="Edit User"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setUserToDelete(u)}
                                className="p-2 text-slate-400 hover:text-red-600 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-red-50"
                                title="Delete User"
                                aria-label={`Delete user ${u.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => restoreMutation.mutate(u.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition cursor-pointer min-h-[36px]"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Restore</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-Over Drawer */}
      <UserDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={() => {
          toast.success(selectedUser ? 'User updated successfully' : 'User created successfully');
          queryClient.invalidateQueries({ queryKey: ['users-list'] });
        }}
        userToEdit={selectedUser}
      />

      {/* Accessible Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(userToDelete)}
        onClose={() => setUserToDelete(null)}
        onConfirm={async () => {
          if (userToDelete) {
            await deleteMutation.mutateAsync(userToDelete.id);
          }
        }}
        title="Delete User"
        description={
          <>
            Are you sure you want to delete <strong className="text-slate-900">{userToDelete?.name}</strong>?
            This will deactivate their login and revoke active session access.
          </>
        }
        confirmText="Delete User"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
