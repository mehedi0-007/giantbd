'use client';

import { useState, useEffect } from 'react';
import { User, Role, Gender, Status } from '@/types/auth';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  Loader2,
  User as UserIcon,
  Shield,
  Upload,
  AlertCircle,
  Edit2,
  FileSignature,
} from 'lucide-react';

interface UserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userToEdit?: User | null;
}

export function UserDrawer({
  isOpen,
  onClose,
  onSuccess,
  userToEdit,
}: UserDrawerProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<Gender>('MALE');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch Roles
  const { data: rolesData } = useQuery({
    queryKey: ['roles-dropdown'],
    queryFn: async () => {
      const res = await api.get('/roles', { params: { per_page: 50 } });
      return res.data?.data;
    },
    enabled: isOpen,
  });

  const roles: Role[] = Array.isArray(rolesData?.data) ? rolesData.data : Array.isArray(rolesData) ? rolesData : [];

  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name);
      setEmail(userToEdit.email);
      setPhone(userToEdit.phone || '');
      setGender(userToEdit.gender || 'MALE');
      setRoleId(userToEdit.roleId || userToEdit.role?.id || '');
      setPassword('');
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setGender('MALE');
      setPassword('');
      setRoleId(roles[0]?.id || '');
    }
    setAvatarFile(null);
    setSignatureFile(null);
    setErrorMsg('');
  }, [userToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      let userId = userToEdit?.id;

      if (userToEdit) {
        // Update user
        const payload: any = {
          name,
          email,
          phone: phone || undefined,
          gender,
          roleId,
        };
        if (password) payload.password = password;

        await api.patch(`/users/${userToEdit.id}`, payload);
      } else {
        // Create user
        const res = await api.post('/users/register', {
          name,
          email,
          phone: phone || undefined,
          gender,
          password,
          roleId,
        });
        userId = res.data?.data?.id || res.data?.id;
      }

      // Upload Avatar if selected
      if (avatarFile && userId) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        await api.post(`/users/${userId}/avatar`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // Upload Signature if selected
      if (signatureFile && userId) {
        const formData = new FormData();
        formData.append('signature', signatureFile);
        await api.post(`/users/${userId}/signature`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.message)
          ? err.response.data.message.join(', ')
          : 'Failed to save user account.');
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md border-l border-slate-200 bg-white shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                {userToEdit ? <Edit2 className="h-5 w-5" /> : <UserIcon className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {userToEdit ? 'Edit User Account' : 'Create User Account'}
                </h3>
                <p className="text-xs text-slate-500">
                  {userToEdit ? `Updating ${userToEdit.email}` : 'Add team member and set RBAC role'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Work Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. john@giantbd.com"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01700000000"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="MALE">MALE</option>
                  <option value="FEMALE">FEMALE</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Assigned RBAC Role <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="" disabled>Select Role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                {userToEdit ? 'New Password (leave blank to keep current)' : 'Password *'}
              </label>
              <input
                type="password"
                required={!userToEdit}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={userToEdit ? '••••••••' : 'Min 6 characters'}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Avatar Upload */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                User Avatar Photo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>

            {/* Digital Signature Upload */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Digital Signature (for Challan PDF stamps)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSignatureFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
              />
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !name || !email || !roleId}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{userToEdit ? 'Save Changes' : 'Create User'}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
