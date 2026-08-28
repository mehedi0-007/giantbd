'use client';

import React, { useState, useEffect } from 'react';
import { User, Role, Gender } from '@/types/auth';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Drawer } from '@/components/common/drawer';
import {
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

  const roles: Role[] = Array.isArray(rolesData?.data)
    ? rolesData.data
    : Array.isArray(rolesData)
    ? rolesData
    : [];

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
      setRoleId('');
    }
    setAvatarFile(null);
    setSignatureFile(null);
    setErrorMsg('');
  }, [userToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      let userId = userToEdit?.id;

      if (userToEdit) {
        const payload: Record<string, any> = {
          name,
          email,
          phone: phone || undefined,
          gender,
          roleId,
        };
        if (password) payload.password = password;

        await api.patch(`/users/${userToEdit.id}`, payload);
      } else {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('email', email);
        if (phone) formData.append('phone', phone);
        formData.append('gender', gender);
        formData.append('password', password);
        formData.append('roleId', roleId);
        if (avatarFile) formData.append('image', avatarFile);
        if (signatureFile) formData.append('signature', signatureFile);

        await api.post('/users/register', formData, {
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
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      icon={userToEdit ? <Edit2 className="h-5 w-5" /> : <UserIcon className="h-5 w-5" />}
      title={userToEdit ? 'Edit User Account' : 'Create User Account'}
      description={
        userToEdit
          ? `Updating ${userToEdit.email}`
          : 'Add team member and set RBAC role permissions'
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4" id="user-drawer-form">
        {errorMsg && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Name */}
        <div>
          <label htmlFor="user-name" className="mb-1 block text-xs font-semibold text-slate-700">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="user-name"
            type="text"
            required
            aria-required="true"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. John Doe"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="user-email" className="mb-1 block text-xs font-semibold text-slate-700">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            id="user-email"
            type="email"
            required
            aria-required="true"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@giantbd.com"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="user-phone" className="mb-1 block text-xs font-semibold text-slate-700">
            Phone Number
          </label>
          <input
            id="user-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+880 1700 000000"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
          />
        </div>

        {/* Gender & Role Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="user-gender" className="mb-1 block text-xs font-semibold text-slate-700">
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              id="user-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>

          <div>
            <label htmlFor="user-role" className="mb-1 block text-xs font-semibold text-slate-700">
              RBAC Role <span className="text-red-500">*</span>
            </label>
            <select
              id="user-role"
              required
              aria-required="true"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
            >
              <option value="" disabled>Select Role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.isTwoFactorRequired ? '(2FA Enforced)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="user-password" className="mb-1 block text-xs font-semibold text-slate-700">
            {userToEdit ? 'New Password (leave blank to retain)' : 'Password'} {!userToEdit && <span className="text-red-500">*</span>}
          </label>
          <input
            id="user-password"
            type="password"
            required={!userToEdit}
            aria-required={!userToEdit}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
          />
        </div>

        {/* Avatar Upload */}
        <div>
          <label htmlFor="user-avatar" className="mb-1 block text-xs font-semibold text-slate-700">
            Profile Avatar Image
          </label>
          <input
            id="user-avatar"
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer min-h-[40px]"
          />
        </div>

        {/* Signature Stamp Upload */}
        <div>
          <label htmlFor="user-signature" className="mb-1 block text-xs font-semibold text-slate-700">
            Official Signature (For Challan / Dispatch Stamp)
          </label>
          <input
            id="user-signature"
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={(e) => setSignatureFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer min-h-[40px]"
          />
        </div>

        {/* Form Action Buttons */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer min-h-[40px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition cursor-pointer shadow-sm shadow-blue-500/20 disabled:opacity-50 min-h-[40px]"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{userToEdit ? 'Save Changes' : 'Create User'}</span>
          </button>
        </div>
      </form>
    </Drawer>
  );
}
