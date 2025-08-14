import React, { useEffect, useState } from 'react';
import { User, Settings, Bell, Shield, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserService, UserProfile } from '../services/UserService';
import { AuthService } from '../services/AuthService';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const me = await UserService.getMyProfile();
        setProfile(me);
      } catch (e: any) {
        setError(e?.message || 'Failed to load profile');
      }
    })();
  }, []);

  const saveProfile = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      setError(null);
      const updated = await UserService.updateMyProfile({
        name: profile.name,
        phone: profile.phone ?? null,
        age: profile.age ?? null,
        height_cm: profile.height_cm ?? null,
        weight_kg: profile.weight_kg ?? null
      });
      setProfile(updated);
    } catch (e: any) {
      setError(e?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 rounded-xl shadow-sm">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center">
            <User className="w-12 h-12 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{profile?.name || '—'}</h2>
            <p className="text-gray-600 dark:text-gray-300">{profile?.email || '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Personal Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profile?.name || ''}
                  onChange={(e) => setProfile(p => (p ? { ...p, name: e.target.value } : p))}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 disabled:opacity-70"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={profile?.phone || ''}
                  onChange={(e) => setProfile(p => (p ? { ...p, phone: e.target.value } : p))}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                />
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Health Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  value={profile?.age ?? ''}
                  onChange={(e) => setProfile(p => (p ? { ...p, age: e.target.value ? Number(e.target.value) : null } : p))}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Height (cm)
                </label>
                <input
                  type="number"
                  value={profile?.height_cm ?? ''}
                  onChange={(e) => setProfile(p => (p ? { ...p, height_cm: e.target.value ? Number(e.target.value) : null } : p))}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  value={profile?.weight_kg ?? ''}
                  onChange={(e) => setProfile(p => (p ? { ...p, weight_kg: e.target.value ? Number(e.target.value) : null } : p))}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                />
              </div>
            </div>
          </motion.section>
        </div>

        {error && (
          <div className="mt-6 p-3 rounded bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div>
        )}

        <div className="mt-8 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Preferences & Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              <Settings className="w-5 h-5 text-gray-600" />
              <span>Account Settings</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              <span>Notifications</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              <Shield className="w-5 h-5 text-gray-600" />
              <span>Privacy</span>
            </motion.button>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t">
          <div className="flex items-center gap-3">
            <button
              onClick={saveProfile}
              disabled={saving || !profile}
              className={`px-4 py-2 rounded-lg text-white ${saving ? 'bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
            <button
              onClick={() => { AuthService.logout(); navigate('/login', { replace: true }); }}
              className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100"
            >
              Logout
            </button>
            <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100">
            <Download className="w-5 h-5" />
            <span>Download My Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}