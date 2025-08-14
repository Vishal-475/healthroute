import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Define the database schema
interface HealthRouteDB extends DBSchema {
  healthData: {
    key: number;
    value: HealthDataRecord;
    indexes: { 'by-date': Date };
  };
  deficiencyData: {
    key: number;
    value: DeficiencyRecord;
    indexes: { 'by-date': Date; 'by-nutrient': string };
  };
  mealPlans: {
    key: number;
    value: MealPlanRecord;
    indexes: { 'by-date': Date; 'by-userId': string };
  };
}

// Define the health data record structure
export interface HealthDataRecord {
  id?: number;
  date: Date;
  bloodPressure?: string;
  bloodSugar?: string;
  weight?: number;
  height?: number;
  bmi?: number;
  diseases?: string[];
  allergens?: string[];
  userId: string;
  source: 'manual' | 'import';
  fileName?: string;
}

// Define the deficiency record structure
export interface DeficiencyRecord {
  id?: number;
  date: Date;
  nutrient: string;
  value: number;
  unit: string;
  referenceRange?: string;
  status: 'normal' | 'deficient' | 'excess';
  userId: string;
}

// Define meal plan related interfaces
export interface Nutrient {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Meal {
  id: string;
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  nutrients: Nutrient;
  prepTime: number;
  ingredients: string[];
}

export interface DayPlan {
  id: string;
  dayName: string;
  date: Date;
  meals: Meal[];
}

export interface WeekPlan {
  id: string;
  days: DayPlan[];
}

// Define the meal plan record structure
export interface MealPlanRecord {
  id?: number;
  date: Date;
  name: string;
  weekPlan: WeekPlan;
  userId: string;
  source: 'chatbot' | 'manual' | 'import';
}

// Database version
// Bump this to trigger upgrade and ensure all object stores exist
const DB_VERSION = 2;

// Database name
const DB_NAME = 'healthroute-db';

let dbPromise: Promise<IDBPDatabase<HealthRouteDB>>;

// Initialize the database
export const initDB = async (): Promise<IDBPDatabase<HealthRouteDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<HealthRouteDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create health data store
        if (!db.objectStoreNames.contains('healthData')) {
          const healthDataStore = db.createObjectStore('healthData', {
            keyPath: 'id',
            autoIncrement: true,
          });
          healthDataStore.createIndex('by-date', 'date');
        }

        // Create deficiency data store
        if (!db.objectStoreNames.contains('deficiencyData')) {
          const deficiencyStore = db.createObjectStore('deficiencyData', {
            keyPath: 'id',
            autoIncrement: true,
          });
          deficiencyStore.createIndex('by-date', 'date');
          deficiencyStore.createIndex('by-nutrient', 'nutrient');
        }
        
        // Create meal plans store
        if (!db.objectStoreNames.contains('mealPlans')) {
          const mealPlansStore = db.createObjectStore('mealPlans', {
            keyPath: 'id',
            autoIncrement: true,
          });
          mealPlansStore.createIndex('by-date', 'date');
          mealPlansStore.createIndex('by-userId', 'userId');
        }
      },
    });
  }
  return dbPromise;
};

// Health Data Methods
export const addHealthData = async (data: HealthDataRecord): Promise<number> => {
  const db = await initDB();
  return db.add('healthData', data);
};

export const getHealthData = async (id: number): Promise<HealthDataRecord | undefined> => {
  const db = await initDB();
  return db.get('healthData', id);
};

export const getAllHealthData = async (userId: string): Promise<HealthDataRecord[]> => {
  const db = await initDB();
  const allData = await db.getAll('healthData');
  return allData.filter(record => record.userId === userId);
};

export const updateHealthData = async (data: HealthDataRecord): Promise<number> => {
  const db = await initDB();
  return db.put('healthData', data);
};

export const deleteHealthData = async (id: number): Promise<void> => {
  const db = await initDB();
  return db.delete('healthData', id);
};

// Deficiency Data Methods
export const addDeficiencyData = async (data: DeficiencyRecord): Promise<number> => {
  const db = await initDB();
  return db.add('deficiencyData', data);
};

export const getDeficiencyData = async (id: number): Promise<DeficiencyRecord | undefined> => {
  const db = await initDB();
  return db.get('deficiencyData', id);
};

export const getAllDeficiencyData = async (userId: string): Promise<DeficiencyRecord[]> => {
  const db = await initDB();
  const allData = await db.getAll('deficiencyData');
  return allData.filter(record => record.userId === userId);
};

export const getDeficiencyByNutrient = async (nutrient: string, userId: string): Promise<DeficiencyRecord[]> => {
  const db = await initDB();
  const tx = db.transaction('deficiencyData', 'readonly');
  const index = tx.store.index('by-nutrient');
  const allData = await index.getAll(nutrient);
  return allData.filter(record => record.userId === userId);
};

export const getDeficiencyHistory = async (nutrient: string, userId: string): Promise<DeficiencyRecord[]> => {
  const records = await getDeficiencyByNutrient(nutrient, userId);
  return records.sort((a, b) => a.date.getTime() - b.date.getTime());
};

export const updateDeficiencyData = async (data: DeficiencyRecord): Promise<number> => {
  const db = await initDB();
  return db.put('deficiencyData', data);
};

export const deleteDeficiencyData = async (id: number): Promise<void> => {
  const db = await initDB();
  return db.delete('deficiencyData', id);
};

// Meal Plan Methods
export const addMealPlan = async (data: MealPlanRecord): Promise<number> => {
  const db = await initDB();
  return db.add('mealPlans', data);
};

export const getMealPlan = async (id: number): Promise<MealPlanRecord | undefined> => {
  const db = await initDB();
  return db.get('mealPlans', id);
};

export const getAllMealPlans = async (userId: string): Promise<MealPlanRecord[]> => {
  const db = await initDB();
  const allData = await db.getAll('mealPlans');
  return allData.filter(record => record.userId === userId);
};

export const getLatestMealPlan = async (userId: string): Promise<MealPlanRecord | undefined> => {
  const db = await initDB();
  const tx = db.transaction('mealPlans', 'readonly');
  const index = tx.store.index('by-userId');
  const allData = await index.getAll(userId);
  
  // Sort by date (newest first) and return the first one
  return allData
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .shift();
};

export const updateMealPlan = async (data: MealPlanRecord): Promise<number> => {
  const db = await initDB();
  return db.put('mealPlans', data);
};

export const deleteMealPlan = async (id: number): Promise<void> => {
  const db = await initDB();
  return db.delete('mealPlans', id);
};

// Database Utility Methods
export const viewAllDatabaseData = async (userId: string) => {
  const healthData = await getAllHealthData(userId);
  const deficiencyData = await getAllDeficiencyData(userId);
  const mealPlans = await getAllMealPlans(userId);
  
  return {
    healthData,
    deficiencyData,
    mealPlans
  };
};