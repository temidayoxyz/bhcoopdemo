import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import { User, Shield, Lock, Check } from 'lucide-react';

export function AdminProfile() {
  const { user } = useOutletContext<{ user: any }>();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error('Please enter a new password');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch('/api/admin/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Password updated successfully');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(data.error || 'Failed to update password');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-seed-950">Admin Profile & Security</h1>
        <p className="text-ink-600 mt-1">Manage your administrative account credentials and preferences.</p>
      </header>

      <div className="bg-white rounded-[14px] border border-ink-200 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-ink-100">
          <div className="w-16 h-16 rounded-full bg-seed-950 text-gold-500 flex items-center justify-center text-xl font-bold">
            <Shield className="w-8 h-8 text-gold-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-seed-950">{user?.email}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gold-500/10 text-gold-600 border border-gold-500/20">
                {user?.role || 'SUPER_ADMIN'}
              </span>
              <span className="text-xs text-ink-500">Blessed Hands staff</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-base font-semibold text-seed-950 flex items-center gap-2">
            <User className="w-4 h-4 text-seed-700" /> Account Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Email Address</label>
              <input 
                type="email" 
                value={user?.email || ''} 
                disabled 
                className="w-full px-3 py-2 text-sm border border-ink-200 rounded-[8px] bg-ink-50 text-ink-600 cursor-not-allowed" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Administrative Role</label>
              <input 
                type="text" 
                value={user?.role || 'SUPER_ADMIN'} 
                disabled 
                className="w-full px-3 py-2 text-sm border border-ink-200 rounded-[8px] bg-ink-50 text-ink-600 cursor-not-allowed" 
              />
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdatePassword} className="pt-6 border-t border-ink-100 space-y-4">
          <h3 className="text-base font-semibold text-seed-950 flex items-center gap-2">
            <Lock className="w-4 h-4 text-seed-700" /> Security Settings
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">New Password</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-3 py-2 text-sm border border-ink-200 rounded-[8px] outline-none focus:border-seed-500 focus:ring-1 focus:ring-seed-500" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Confirm New Password</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-3 py-2 text-sm border border-ink-200 rounded-[8px] outline-none focus:border-seed-500 focus:ring-1 focus:ring-seed-500" 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isUpdating}
            className="mt-2 bg-seed-800 text-white px-5 py-2.5 rounded-[8px] text-sm font-medium hover:bg-seed-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {isUpdating ? 'Updating...' : 'Update Security Credentials'}
          </button>
        </form>
      </div>
    </div>
  );
}
