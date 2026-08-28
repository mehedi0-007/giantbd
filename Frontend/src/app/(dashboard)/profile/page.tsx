'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { User, Gender } from '@/types/auth';
import { toast } from 'sonner';
import {
  User as UserIcon,
  Shield,
  Upload,
  Lock,
  CheckCircle2,
  AlertCircle,
  FileSignature,
  Loader2,
  Camera,
} from 'lucide-react';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { user: authUser, setUser } = useAuthStore();

  // Profile Form States
  const [name, setName] = useState(authUser?.name || '');
  const [phone, setPhone] = useState(authUser?.phone || '');
  const [gender, setGender] = useState<Gender>(authUser?.gender || 'MALE');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Security Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 2FA Form States
  const [isUpdating2FA, setIsUpdating2FA] = useState(false);
  const [twoFAMsg, setTwoFAMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Upload States
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingSig, setIsUploadingSig] = useState(false);

  // Fetch Current Me
  const { data: meData } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      const u = res.data?.data;
      if (u) {
        setName(u.name);
        setPhone(u.phone || '');
        setGender(u.gender || 'MALE');
        setUser(u);
      }
      return u;
    },
  });

  const currentUser: User = meData || authUser || ({} as User);

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMsg(null);

    try {
      const res = await api.patch(`/users/${currentUser.id}`, {
        name,
        phone: phone || undefined,
        gender,
      });

      const updated = res.data?.data;
      if (updated) setUser(updated);
      setProfileMsg({ type: 'success', text: 'Personal details updated successfully.' });
      toast.success('Personal details updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update profile.';
      setProfileMsg({
        type: 'error',
        text: msg,
      });
      toast.error(msg);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Handle Avatar Upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser.id) return;

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await api.post(`/users/${currentUser.id}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updated = res.data?.data;
      if (updated) setUser(updated);
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
      toast.success('Avatar updated successfully.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload avatar.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Handle Signature Upload
  const handleSignatureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser.id) return;

    setIsUploadingSig(true);
    try {
      const formData = new FormData();
      formData.append('signature', file);
      const res = await api.post(`/users/${currentUser.id}/signature`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updated = res.data?.data;
      if (updated) setUser(updated);
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
      toast.success('Signature updated successfully.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload signature.');
    } finally {
      setIsUploadingSig(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordMsg({ type: 'error', text: 'Current password is required.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordMsg(null);

    try {
      await api.post('/auth/change-password', {
        oldPassword: currentPassword,
        newPassword,
      });

      setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
      toast.success('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to change password.';
      setPasswordMsg({
        type: 'error',
        text: msg,
      });
      toast.error(msg);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Handle 2FA Toggle
  const handleToggle2FA = async (enabled: boolean) => {
    setIsUpdating2FA(true);
    setTwoFAMsg(null);

    try {
      const res = await api.patch(`/users/${currentUser.id}`, {
        isTwoFactorEnabled: enabled,
      });

      const updated = res.data?.data;
      if (updated) setUser(updated);
      setTwoFAMsg({
        type: 'success',
        text: enabled
          ? 'Two-Factor Authentication (Email OTP) enabled successfully.'
          : 'Two-Factor Authentication disabled.',
      });
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    } catch (err: any) {
      setTwoFAMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update 2FA setting.',
      });
    } finally {
      setIsUpdating2FA(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          My Account & Profile
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your personal details, digital signature for delivery challans, and password credentials
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Digital Signature Stamp */}
        <div className="space-y-6">
          {/* Avatar Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs text-center space-y-4">
            <div className="relative inline-block">
              {currentUser.avatar ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/${currentUser.avatar}`}
                  alt={currentUser.name}
                  className="h-28 w-28 rounded-full object-cover border-4 border-slate-100 shadow-md mx-auto"
                />
              ) : (
                <div className="h-28 w-28 rounded-full bg-blue-600 text-white font-extrabold text-3xl flex items-center justify-center mx-auto shadow-md">
                  {currentUser.name ? currentUser.name[0]?.toUpperCase() : 'U'}
                </div>
              )}
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full cursor-pointer hover:bg-blue-700 shadow-md transition"
                title="Change Avatar"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={isUploadingAvatar}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900">{currentUser.name}</h2>
              <p className="text-xs font-medium text-slate-500">{currentUser.email}</p>
              <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <Shield className="h-3 w-3" />
                <span>{currentUser.role?.name || 'USER'}</span>
              </div>
            </div>
          </div>

          {/* Digital Signature Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileSignature className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Digital Signature</h3>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Your official seal applied to Delivery Challans & Commercial documents.
            </p>

            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
              {currentUser.signature ? (
                <div className="space-y-2">
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/${currentUser.signature}`}
                    alt="Digital Signature"
                    className="max-h-16 mx-auto object-contain"
                  />
                  <span className="text-[10px] font-semibold text-emerald-600 flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Active Signature
                  </span>
                </div>
              ) : (
                <div className="py-3 text-slate-400 text-xs italic">
                  No signature uploaded yet.
                </div>
              )}
            </div>

            <label
              htmlFor="sig-upload"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
            >
              {isUploadingSig ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Uploading Signature...</span>
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5 text-slate-500" />
                  <span>{currentUser.signature ? 'Replace Signature' : 'Upload Signature'}</span>
                </>
              )}
              <input
                id="sig-upload"
                type="file"
                accept="image/*"
                onChange={handleSignatureChange}
                disabled={isUploadingSig}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Right Column: Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* Personal Details Form */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Personal Information</h3>
              <p className="text-xs text-slate-500">Update your profile identity and contact details</p>
            </div>

            {profileMsg && (
              <div
                className={`flex items-center gap-2 rounded-xl p-3 text-xs ${
                  profileMsg.type === 'success'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border border-red-200 bg-red-50 text-red-800'
                }`}
              >
                {profileMsg.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                )}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Email (Read Only)</label>
                  <input
                    type="email"
                    disabled
                    value={currentUser.email || ''}
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-600 font-mono"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01700000000"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Gender</label>
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

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
                >
                  {isUpdatingProfile ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Save Profile</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Two-Factor Authentication (2FA) Security Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Two-Factor Authentication (2FA)</h3>
                <p className="text-xs text-slate-500">Require a 6-digit email OTP verification code upon login</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Shield className="h-4 w-4" />
              </div>
            </div>

            {twoFAMsg && (
              <div
                className={`flex items-center gap-2 rounded-xl p-3 text-xs ${
                  twoFAMsg.type === 'success'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border border-red-200 bg-red-50 text-red-800'
                }`}
              >
                {twoFAMsg.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                )}
                <span>{twoFAMsg.text}</span>
              </div>
            )}

            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="space-y-0.5 max-w-sm">
                <span className="text-xs font-bold text-slate-900">Email OTP Verification</span>
                <p className="text-[11px] text-slate-500">
                  {currentUser.role?.isTwoFactorRequired
                    ? '2FA is enforced by company role policy for your account (Admin/Manager).'
                    : 'Send a one-time verification PIN to your registered email on every login.'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {currentUser.role?.isTwoFactorRequired ? (
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-800">
                    Enforced by Role
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={isUpdating2FA}
                    onClick={() => handleToggle2FA(!currentUser.isTwoFactorEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50 ${
                      currentUser.isTwoFactorEnabled ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        currentUser.isTwoFactorEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Password Security Form */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Security & Password</h3>
              <p className="text-xs text-slate-500">Change your account access password</p>
            </div>

            {passwordMsg && (
              <div
                className={`flex items-center gap-2 rounded-xl p-3 text-xs ${
                  passwordMsg.type === 'success'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border border-red-200 bg-red-50 text-red-800'
                }`}
              >
                {passwordMsg.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                )}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition cursor-pointer"
                >
                  {isUpdatingPassword ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      <span>Change Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
