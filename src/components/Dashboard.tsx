import React, { useState, useEffect } from 'react';
import { Activity, Brain, Heart, Salad, TrendingUp } from 'lucide-react';
import { getAllHealthData, getAllDeficiencyData, getLatestMealPlan as getLatestLocalMealPlan, HealthDataRecord, DeficiencyRecord } from '../services/DatabaseService';
import { AuthService } from '../services/AuthService';
import { ApiService } from '../services/ApiService';

// Initial stats that will be updated with database data
const initialStats = [
  { name: 'Nutrient Score', value: '92%', icon: Activity, trend: '+2.3%' },
  { name: 'Meal Plan Adherence', value: '87%', icon: Salad, trend: '+4.1%' },
  { name: 'Health Goals Met', value: '4/5', icon: Heart, trend: '+1' },
  { name: 'AI Recommendations', value: '24', icon: Brain, trend: 'New 6' },
];

export default function Dashboard() {
  const [stats, setStats] = useState(initialStats);
  const [healthData, setHealthData] = useState<HealthDataRecord[]>([]);
  const [deficiencyData, setDeficiencyData] = useState<DeficiencyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [todaysMeals, setTodaysMeals] = useState<Array<{ id?: string; name: string; type: 'breakfast'|'lunch'|'dinner'|'snack'; prepTime?: number; }>>([]);
  const userId = 'user123'; // In a real app, this would come from authentication

  // Fetch health and deficiency data from the database
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const healthRecords = await getAllHealthData(userId);
        const deficiencyRecords = await getAllDeficiencyData(userId);
        
        setHealthData(healthRecords);
        setDeficiencyData(deficiencyRecords);
        
        // Update stats based on the fetched data
        updateStatsFromData(healthRecords, deficiencyRecords);

        // Fetch latest meal plan and extract today's meals
        const authUser = AuthService.currentUser();
        const uidNum: number = typeof authUser?.id === 'number' ? authUser!.id : 1;
        const uid = String(uidNum);
        let latestPlan: any | null = null;
        try {
          latestPlan = await ApiService.getLatestMealPlan(uidNum);
        } catch {
          // fallback to local IndexedDB
          latestPlan = await getLatestLocalMealPlan(String(uid));
        }
        if (latestPlan && latestPlan.weekPlan && Array.isArray(latestPlan.weekPlan.days)) {
          const todayName = new Date().toLocaleString('en-US', { weekday: 'long' });
          const day = latestPlan.weekPlan.days.find((d: any) => String(d.dayName).toLowerCase() === todayName.toLowerCase());
          if (day && Array.isArray(day.meals)) {
            // Prefer only Breakfast/Lunch/Dinner in this widget
            const filtered = day.meals.filter((m: any) => ['breakfast','lunch','dinner'].includes(m.type));
            setTodaysMeals(filtered.map((m: any) => ({ id: m.id, name: m.name, type: m.type, prepTime: m.prepTime })));
          } else {
            setTodaysMeals([]);
          }
        } else {
          setTodaysMeals([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  // Update stats based on the fetched data
  const updateStatsFromData = (healthRecords: HealthDataRecord[], deficiencyRecords: DeficiencyRecord[]) => {
    // Calculate nutrient score based on deficiency data
    const nutrientScore = calculateNutrientScore(deficiencyRecords);
    
    // Update the stats with real data
    setStats(prevStats => {
      const newStats = [...prevStats];
      
      // Update Nutrient Score
      newStats[0] = {
        ...newStats[0],
        value: `${nutrientScore}%`,
        trend: calculateTrend(deficiencyRecords, 'score')
      };
      
      return newStats;
    });
  };

  // Calculate nutrient score based on deficiency records
  const calculateNutrientScore = (records: DeficiencyRecord[]): number => {
    if (records.length === 0) return 92; // Default score if no data
    
    // Count normal vs deficient nutrients
    const normalCount = records.filter(r => r.status === 'normal').length;
    const totalCount = records.length;
    
    return Math.round((normalCount / totalCount) * 100);
  };

  // Calculate trend based on historical data
  const calculateTrend = (records: DeficiencyRecord[], type: 'score' | 'other'): string => {
    if (records.length < 2) return '+0%';
    
    // Sort by date (oldest first)
    const sortedRecords = [...records].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // For simplicity, just compare the most recent two periods
    const recentRecords = sortedRecords.slice(-2);
    
    if (type === 'score') {
      const oldNormalCount = recentRecords[0].status === 'normal' ? 1 : 0;
      const newNormalCount = recentRecords[1].status === 'normal' ? 1 : 0;
      
      const diff = newNormalCount - oldNormalCount;
      return diff >= 0 ? `+${diff}` : `${diff}`;
    }
    
    return '+0%';
  };

  const handleUpdateHealthData = () => {
    // Logic to update health data goes here
    console.log("Health data updated!");
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome back{AuthService.currentUser() ? `, ${AuthService.currentUser()!.name}` : ''}</h1>
          <p className="text-gray-600 dark:text-gray-300">Here's your health overview for today</p>
        </div>
        <button onClick={handleUpdateHealthData} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
          Update Health Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <stat.icon className="w-6 h-6 text-emerald-600" />
              <span className="flex items-center text-sm text-emerald-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                {stat.trend}
              </span>
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Today's Meal Plan
          </h2>
          <div className="space-y-4">
            {todaysMeals.length > 0 ? (
              todaysMeals.map((m) => (
                <div key={m.id || m.name} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <Salad className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">{m.type}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{m.name}{m.prepTime ? ` • ${m.prepTime} mins` : ''}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300">
                No meals planned for today
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            AI Health Insights
          </h2>
          <div className="space-y-4">
            {loading ? (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                <p className="text-gray-500 dark:text-gray-300">Loading health insights...</p>
              </div>
            ) : deficiencyData.length > 0 ? (
              // Display actual deficiency data from the database
              deficiencyData.slice(0, 2).map((deficiency, index) => (
                <div key={index} className={`p-4 ${index % 2 === 0 ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-blue-50 dark:bg-blue-900/30'} rounded-lg`}>
                  <div className="flex items-center gap-2 mb-2">
                    {index % 2 === 0 ? (
                      <Brain className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Activity className="w-5 h-5 text-blue-600" />
                    )}
                    <p className={`font-medium ${index % 2 === 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-blue-800 dark:text-blue-300'}`}>
                      {deficiency.nutrient} Analysis
                    </p>
                  </div>
                  <p className={`text-sm ${index % 2 === 0 ? 'text-emerald-700 dark:text-emerald-200' : 'text-blue-700 dark:text-blue-200'}`}>
                    Your {deficiency.nutrient} levels are {deficiency.status}. 
                    {deficiency.status === 'deficient' && 'Consider increasing intake through diet or supplements.'}
                    {deficiency.status === 'excess' && 'Consider reducing intake to maintain optimal health.'}
                    {deficiency.status === 'normal' && 'Keep up the good work!'}
                  </p>
                </div>
              ))
            ) : (
              // Default insights if no data is available
              <>
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-5 h-5 text-emerald-600" />
                    <p className="font-medium text-emerald-800 dark:text-emerald-300">Nutrient Analysis</p>
                  </div>
                  <p className="text-sm text-emerald-700 dark:text-emerald-200">
                    Your Vitamin D levels have improved by 15% since last month. Keep up the good work!
                  </p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <p className="font-medium text-blue-800 dark:text-blue-300">Recommendation</p>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-200">
                    Consider adding more leafy greens to boost iron intake based on your recent blood work.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
