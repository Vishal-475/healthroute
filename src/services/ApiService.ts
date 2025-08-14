export interface ApiMealPlan {
  id?: number;
  name: string;
  date: string | Date;
  source?: 'chatbot' | 'manual' | 'import';
  weekPlan: {
    id: string;
    days: Array<{
      id?: string | number;
      dayName: string;
      date?: string | Date | null;
      meals: Array<{
        id?: string | number;
        name: string;
        type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
        prepTime?: number | null;
        nutrients?: { calories?: number; protein?: number; carbs?: number; fat?: number } | null;
        ingredients?: string[];
      }>;
    }>;
  };
}

const BASE_URL = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8080/api';

export const ApiService = {
  async saveHealthEntry(payload: {
    userId: string | number;
    measured_at?: string | Date;
    blood_pressure?: string | null;
    blood_sugar?: number | null;
    blood_sugar_unit?: string;
    conditions?: string[];
    allergens?: string[];
  }) {
    const res = await fetch(`${BASE_URL}/health/entry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`saveHealthEntry failed: ${res.status}`);
    return res.json();
  },
  async saveMealPlan(userId: string | number, plan: ApiMealPlan) {
    const res = await fetch(`${BASE_URL}/mealplans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name: plan.name, date: plan.date, source: plan.source || 'chatbot', weekPlan: plan.weekPlan })
    });
    if (!res.ok) throw new Error(`saveMealPlan failed: ${res.status}`);
    return res.json();
  },

  async getLatestMealPlan(userId: string | number) {
    const res = await fetch(`${BASE_URL}/mealplans/latest?userId=${userId}`);
    if (!res.ok) throw new Error(`getLatestMealPlan failed: ${res.status}`);
    return res.json();
  },

  async bulkImportNutrients(userId: string | number, rows: any[]) {
    const res = await fetch(`${BASE_URL}/nutrients/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, rows })
    });
    if (!res.ok) throw new Error(`bulkImportNutrients failed: ${res.status}`);
    return res.json();
  }
  ,
  async bulkUpsertReferenceRanges(rows: Array<{ nutrient: string; unit: string; optimal_min: number; optimal_max: number; sex?: 'male'|'female'|'any' }>) {
    const res = await fetch(`${BASE_URL}/nutrients/reference/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows })
    });
    if (!res.ok) throw new Error(`bulkUpsertReferenceRanges failed: ${res.status}`);
    return res.json();
  }
};


