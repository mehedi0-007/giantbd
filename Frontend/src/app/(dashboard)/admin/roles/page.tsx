'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Role, Permission } from '@/types/auth';
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
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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
  const permissions: Permission[] = Array.isArray(permissionsData?.data)
    ? permissionsData.data
    : Array.isArray(permissionsData)
    ? permissionsData
    : [];

  // Group Permissions by Module
  const groupedPermissions: Record<string, Permission[]> = {};
  permissions.forEach((p) => {
    const mod = p.module || 'GENERAL';
    if (!groupedPermissions[mod]) groupedPermissions[mod] = [];
    groupedPermissions[mod].push(p);
  });

  const handleOpenCreate = () => {
    setEditingRole(null);
    setName('');
    setDescription('');
    setSelectedPermissions([]);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role: Role) => {
    setEditingRole(role);
    setName(role.name);
    setDescription(role.description || '');

    // Extract current permission names or IDs
    const permIds =
      role.rolePermissions?.map((rp: any) => rp.permission?.id || rp.permissionId) ||
      [];
    setSelectedPermissions(permIds);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const togglePermission = (permId: string) => {
    if (selectedPermissions.includes(permId)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== permId));
    } else {
      setSelectedPermissions([...selectedPermissions, permId]);
    }
  };

  const toggleModuleAll = (moduleName: string) => {
    const modPermIds = groupedPermissions[moduleName]?.map((p) => p.id) || [];
    const allSelected = modPermIds.every((id) => selectedPermissions.includes(id));

    if (allSelected) {
      setSelectedPermissions(selectedPermissions.filter((id) => !modPermIds.includes(id)));
    } else {
      const combined = Array.from(new Set([...selectedPermissions, ...modPermIds]));
      setSelectedPermissions(combined);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    setErrorMsg('');

    try {
      const payload = {
        name: name.trim().toUpperCase(),
        description,
        permissionIds: selectedPermissions,
      };

      if (editingRole) {
        await api.patch(`/roles/${editingRole.id}`, payload);
      } else {
        await api.post('/roles', payload);
      }

      queryClient.invalidateQueries({ queryKey: ['roles-management'] });
      queryClient.invalidateQueries({ queryKey: ['roles-dropdown'] });
      setIsModalOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save role.';
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async (id: string, roleName: string) => {
    if (roleName === 'SUPER_ADMIN') {
      alert('SUPER_ADMIN role cannot be deleted.');
      return;
    }
    if (!confirm(`Are you sure you want to delete role ${roleName}?`)) return;

    try {
      await api.delete(`/roles/${id}`);
      queryClient.invalidateQueries({ queryKey: ['roles-management'] });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete role.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Roles & Security Matrix
            </h1>
            <span className="rounded-md bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
              RBAC Governance
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure role definitions and fine-grained access control permissions across all ERP modules
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Create Custom Role</span>
        </button>
      </div>

      {/* Roles Grid Cards */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
          <p className="text-xs font-medium text-slate-500">Loading security roles...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {roles.map((r) => {
            const isSuper = r.name === 'SUPER_ADMIN';
            const permCount = r.rolePermissions?.length || r.permissions?.length || 0;

            return (
              <div
                key={r.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 border border-purple-200/80 px-2.5 py-1 text-xs font-bold text-purple-800">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>{r.name}</span>
                    </span>
                    {isSuper && (
                      <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        SYSTEM ROOT
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 min-h-[36px] leading-relaxed">
                    {r.description || 'Custom access tier for designated enterprise operations.'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Assigned Permissions:</span>
                    <span className="font-bold text-slate-900">
                      {isSuper ? 'ALL (Unrestricted)' : `${permCount} Grants`}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(r)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Permissions</span>
                  </button>

                  {!isSuper && (
                    <button
                      type="button"
                      onClick={() => handleDeleteRole(r.id, r.name)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                      title="Delete Role"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Permissions Matrix Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl my-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingRole ? `Edit Role: ${editingRole.name}` : 'Create Security Role'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Role Code Identifier *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    placeholder="e.g. AUDITOR"
                    disabled={editingRole?.name === 'SUPER_ADMIN'}
                    className="w-full font-mono font-bold rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Role Description
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. View stock reports and audit movement history"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Granular Module Matrix */}
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
                            const isChecked = selectedPermissions.includes(p.name);
                            return (
                              <label
                                key={p.id || p.name}
                                className={`flex items-start gap-2 p-1.5 rounded-lg border cursor-pointer transition ${
                                  isChecked
                                    ? 'border-blue-500 bg-blue-50/50 font-semibold text-slate-900'
                                    : 'border-slate-100 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermission(p.name)}
                                  className="mt-0.5 rounded text-blue-600"
                                />
                                <div>
                                  <div className="font-mono text-[11px]">{p.name}</div>
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
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !name.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving Role...</span>
                    </>
                  ) : (
                    <span>Save Role Permissions</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
