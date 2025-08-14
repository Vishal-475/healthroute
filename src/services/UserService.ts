import { AuthService } from './AuthService';

const BASE_URL = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8080/api';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  age?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  created_at?: string;
}

export const UserService = {
  async getMyProfile(): Promise<UserProfile | null> {
    const user = AuthService.currentUser();
    if (!user) return null;
    const res = await fetch(`${BASE_URL}/users/${user.id}`);
    if (!res.ok) throw new Error(`Profile fetch failed (${res.status})`);
    return res.json();
  },

  async updateMyProfile(payload: Partial<UserProfile>): Promise<UserProfile> {
    const user = AuthService.currentUser();
    if (!user) throw new Error('Not authenticated');
    const res = await fetch(`${BASE_URL}/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || `Profile update failed (${res.status})`);
    }
    const updated = await res.json();
    // keep local name/email in AuthService synced for header display
    const current = AuthService.currentUser();
    if (current) {
      const merged = { ...current, name: updated.name ?? current.name, email: updated.email ?? current.email };
      localStorage.setItem('hr_user', JSON.stringify(merged));
    }
    return updated;
  }
};


