'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Role, Permission } from '@/types/auth';
import { Modal, ConfirmDialog, CardSkeleton, EmptyState } from '@/components/common';
import { toast } from 'sonner';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Check,
  X,
  AlertCircle,
  Loader2,
  CheckSquare,
  Square,
} from 'lucide-react';

export default function RolesPage() {
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isTwoFactorRequired, setIsTwoFactorRequired] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 1. Fetch All Roles
  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['roles-management'],
    queryFn: async () => {
      const res = await api.get('/roles', { params: { per_page: 50 } });
      return res.data?.data;
    },
  });

  // 2. Fetch All Permissions
  const { data: permissionsData } = useQuery({
    queryKey: ['permissions-list'],
    queryFn: async () => {
      const res = await api.get('/permissions');
      return res.data?.data;
    },
  });

  const roles: Role[] = Array.isArray(rolesData?.data) ? rolesData.data : Array.isArray(rolesData) ? rolesData : [];
  const permissions: Permission[] = Array.isArray(permissionsData) ? permissionsData : [];

  // Group permissions by module prefix
  const groupedPermissions: Record<string, Permission[]> = {};
  permissions.forEach((perm) => {
    const mod = perm.module || perm.name.split(':')[0]?.toUpperCase() || 'GENERAL';
    if (!groupedPermissions[mod]) {
      groupedPermissions[mod] = [];
    }
    groupedPermissions[mod].push(perm);
  });

  const handleOpenCreate = () => {
    setEditingRole(null);
    setName('');
    setDescription('');
    setIsTwoFactorRequired(false);
    setSelectedPermissions([]);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role: Role) => {
    setEditingRole(role);
    setName(role.name);
    setDescription(role.description || '');
    setIsTwoFactorRequired(Boolean(role.isTwoFactorRequired));
    const permIds = role.permissions?.map((p: any) => p.id || p.permissionId || (typeof p === 'string' ? p : '')) || [];
    setSelectedPermissions(permIds.filter(Boolean));
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const togglePermission = (permId: string) => {
    if (selectedPermissions.includes(permId)) {
      setSelectedPermissions(selectedPermissions.filter((id) => id !== permId));
    } else {
      setSelectedPermissions([...selectedPermissions, permId]);
    }
  };

  const toggleModuleAll = (moduleName: string) => {
    const modPermIds = groupedPermissions[moduleName]?.map((p) => p.id) || [];
    const allSelected = modPermIds.length > 0 && modPermIds.every((id) => selectedPermissions.includes(id));

    if (allSelected) {
      setSelectedPermissions(selectedPermissions.filter((id) => !modPermIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedPermissions, ...modPermIds]));
      setSelectedPermissions(merged);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    setErrorMsg('');

    try {
      if (editingRole) {
        await api.patch(`/roles/${editingRole.id}`, {
          name: name.trim().toUpperCase(),
          description: description.trim() || undefined,
          isTwoFactorRequired,
          permissionIds: selectedPermissions,
        });
        toast.success(`Role ${name.trim().toUpperCase()} updated successfully`);
      } else {
        await api.post('/roles', {
          name: name.trim().toUpperCase(),
          description: description.trim() || undefined,
          isTwoFactorRequired,
          permissionIds: selectedPermissions,
        });
        toast.success(`Role ${name.trim().toUpperCase()} created successfully`);
      }

      queryClient.invalidateQueries({ queryKey: ['roles-management'] });
      setIsModalOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save role configuration.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/roles/${id}`);
    },
    onSuccess: () => {
      toast.success('Role deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['roles-management'] });
      setRoleToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete role.');
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Roles & Security Permissions
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure system roles, enforce Two-Factor Authentication policies, and manage permissions
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer min-h-[40px]"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Role</span>
        </button>
      </div>

      {/* Role Cards Grid */}
      {isLoading ? (
        <CardSkeleton count={3} className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3" />
      ) : roles.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <EmptyState
            icon={<ShieldCheck className="h-7 w-7 text-blue-600" />}
            title="No custom roles configured"
            description="Create custom security roles to configure fine-grained permissions for warehouse and commercial staff."
            action={{
              label: 'Create First Role',
              onClick: handleOpenCreate,
              icon: <Plus className="h-3.5 w-3.5" />,
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {roles.map((role) => {
            const isSuperAdmin = role.name === 'SUPER_ADMIN';
            const permCount = role.permissions?.length || 0;

            return (
              <div
                key={role.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{role.name}</h3>
                        {role.isTwoFactorRequired ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-full mt-0.5">
                            <Lock className="h-2.5 w-2.5" />
                            <span>2FA Enforced</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">2FA Optional</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(role)}
                        className="p-2 text-slate-400 hover:text-blue-600 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-blue-50"
                        title="Edit Permissions"
                        aria-label={`Edit permissions for role ${role.name}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {!isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => setRoleToDelete(role)}
                          className="p-2 text-slate-400 hover:text-red-600 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-red-50"
                          title="Delete Role"
                          aria-label={`Delete role ${role.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-500 line-clamp-2">
                    {role.description || 'No description provided for this role.'}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <span className="text-slate-500">Active Permissions:</span>
                    <span className="font-bold font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                      {isSuperAdmin ? 'ALL (*)' : `${permCount} Grants`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Role Edit/Create Accessible Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        icon={<ShieldCheck className="h-5 w-5" />}
        title={editingRole ? `Edit Role: ${editingRole.name}` : 'Create Security Role'}
        description="Configure role name, 2FA policy, and RBAC granular permission access"
        size="2xl"
      >
        <form onSubmit={handleSaveRole} className="space-y-4" id="role-form">
          {errorMsg && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Role Name */}
          <div>
            <label htmlFor="role-name-input" className="mb-1 block text-xs font-semibold text-slate-700">
              Role Name Identifier <span className="text-red-500">*</span>
            </label>
            <input
              id="role-name-input"
              type="text"
              required
              aria-required="true"
              value={name}
              disabled={editingRole?.name === 'SUPER_ADMIN'}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              placeholder="e.g. INVENTORY_MANAGER"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 font-mono uppercase min-h-[40px] disabled:bg-slate-100"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="role-desc-input" className="mb-1 block text-xs font-semibold text-slate-700">
              Role Purpose & Description
            </label>
            <textarea
              id="role-desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Responsible for warehouse receiving, dispatch, and physical cycle counts"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* 2FA Enforce Switch */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 bg-slate-50/50">
            <div>
              <label htmlFor="role-2fa-toggle" className="text-xs font-bold text-slate-900 block cursor-pointer">
                Mandatory Two-Factor Authentication (2FA)
              </label>
              <p className="text-[11px] text-slate-500">
                Requires all users assigned to this role to provide TOTP authentication upon sign-in.
              </p>
            </div>
            <input
              id="role-2fa-toggle"
              type="checkbox"
              checked={isTwoFactorRequired}
              onChange={(e) => setIsTwoFactorRequired(e.target.checked)}
              className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {/* Permissions Matrix */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">
                Module Permission Grants ({selectedPermissions.length} active)
              </label>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-3 rounded-xl border border-slate-200 p-3 bg-slate-50/50">
              {Object.entries(groupedPermissions).map(([moduleName, perms]) => {
                const modPermNames = perms.map((p) => p.name);
                const allSelected = modPermNames.every((p) => selectedPermissions.includes(p));

                return (
                  <div key={moduleName} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="font-bold text-xs text-slate-900 tracking-wider">
                        {moduleName} MODULE
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleModuleAll(moduleName)}
                        className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                      >
                        {allSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {perms.map((p) => {
                        const isChecked = selectedPermissions.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition min-h-[38px] ${
                              isChecked
                                ? 'border-blue-500 bg-blue-50/50 font-semibold text-slate-900'
                                : 'border-slate-100 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(p.id)}
                              className="mt-0.5 rounded text-blue-600"
                            />
                            <div>
                              <div className="font-mono text-xs">{p.name}</div>
                              {p.description && (
                                <div className="text-[10px] text-slate-400 font-normal">
                                  {p.description}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer min-h-[40px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer min-h-[40px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Role...</span>
                </>
              ) : (
                <span>Save Role Permissions</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Accessible Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(roleToDelete)}
        onClose={() => setRoleToDelete(null)}
        onConfirm={async () => {
          if (roleToDelete) {
            await deleteMutation.mutateAsync(roleToDelete.id);
          }
        }}
        title="Delete Security Role"
        description={
          <>
            Are you sure you want to permanently delete role <strong className="text-slate-900">{roleToDelete?.name}</strong>?
            Users assigned to this role will lose their permission grants.
          </>
        }
        confirmText="Delete Role"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
