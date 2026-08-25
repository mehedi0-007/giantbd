'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { User, Gender } from '@/types/auth';
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
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    } catch (err: any) {
      setProfileMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update profile.',
      });
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
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload avatar.');
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
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload signature.');
    } finally {
      setIsUploadingSig(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordMsg(null);

    try {
      await api.patch(`/users/${currentUser.id}`, {
        password: newPassword,
      });

      setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to change password.',
      });
    } finally {
      setIsUpdatingPassword(false);
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
                  {currentUser.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}

              <label className="absolute bottom-0 right-0 rounded-full bg-slate-900 p-2 text-white hover:bg-blue-600 transition cursor-pointer shadow-md">
                <Camera className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <h3 className="font-bold text-base text-slate-900">{currentUser.name}</h3>
              <p className="text-xs text-slate-500">{currentUser.email}</p>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200/80 px-3 py-1 text-xs font-bold text-purple-700">
              <Shield className="h-3.5 w-3.5" />
              <span>{currentUser.role?.name || 'SUPER_ADMIN'}</span>
            </div>

            {isUploadingAvatar && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-blue-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Uploading photo...</span>
              </div>
            )}
          </div>

          {/* Digital Signature Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <FileSignature className="h-4 w-4 text-purple-600" />
              <span>Challan Digital Signature</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Appears automatically on official delivery challans issued by your account.
            </p>

            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50">
              {currentUser.signature ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/${currentUser.signature}`}
                  alt="Signature"
                  className="h-14 object-contain"
                />
              ) : (
                <div className="text-center py-2 text-slate-400 text-xs font-serif italic">
                  No signature uploaded yet
                </div>
              )}

              <label className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer">
                <Upload className="h-3.5 w-3.5 text-slate-400" />
                <span>Upload Signature</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSignatureChange}
                  className="hidden"
                />
              </label>
            </div>

            {isUploadingSig && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-purple-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Uploading signature...</span>
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Columns: Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* Personal Details Form */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Personal Information</h3>
              <p className="text-xs text-slate-500">Update your public profile details</p>
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

          {/* Password Security Form */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Security & Credentials</h3>
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
