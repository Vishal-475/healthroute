import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, ChevronRight, Utensils } from 'lucide-react';
import DraggableMealPlanner from './MealPlans/DraggableMealPlanner';
import { useNavigate } from 'react-router-dom';
import { getLatestMealPlan, MealPlanRecord } from '../services/DatabaseService';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function MealPlans() {
  console.log('MealPlans component rendering...');
  
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [mealPlan, setMealPlan] = useState<MealPlanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [justUpdated, setJustUpdated] = useState(false);
  const navigate = useNavigate();

  // Load the latest meal plan from database
  const loadMealPlan = async () => {
    try {
      console.log('Loading meal plan from database...');
      setLoading(true);
      const userId = 'user-1'; // In a real app, this would come from authentication
      
      // First, let's check all meal plans to see what's in the database
      const { getAllMealPlans } = await import('../services/DatabaseService');
      const allPlans = await getAllMealPlans(userId);
      console.log('All meal plans in database:', allPlans);
      
      const latestPlan = await getLatestMealPlan(userId);
      console.log('Latest meal plan:', latestPlan);
      
      if (latestPlan) {
        console.log('Setting meal plan state with:', latestPlan);
        setMealPlan(latestPlan);
      } else {
        console.log('No meal plan found, setting to null');
        setMealPlan(null);
      }
    } catch (error) {
      console.error('Error loading meal plan:', error);
    } finally {
      setLoading(false);
    }
  };

  // Expose loadMealPlan function globally for other components to call
  useEffect(() => {
    (window as any).refreshMealPlan = loadMealPlan;
    return () => {
      delete (window as any).refreshMealPlan;
    };
  }, [loadMealPlan]);

  useEffect(() => {
    console.log('MealPlans component mounted');
    
    // Initialize database first, then load meal plan
    const initializeAndLoad = async () => {
      try {
        const { initDB } = await import('../services/DatabaseService');
        await initDB();
        console.log('Database initialized');
        await loadMealPlan();
      } catch (error) {
        console.error('Error initializing database:', error);
        // Set loading to false even if there's an error so the component renders
        setLoading(false);
      }
    };
    
    initializeAndLoad();
  }, []);

  // Listen for meal plan updates
  useEffect(() => {
    const handleMealPlanUpdate = () => {
      console.log('Meal plan update event received, refreshing data...');
      setJustUpdated(true);
      // Add a small delay to ensure database write is complete
      setTimeout(() => {
        loadMealPlan();
      }, 500);
      // Reset the flag after 3 seconds
      setTimeout(() => setJustUpdated(false), 3000);
    };

    window.addEventListener('mealPlanUpdated', handleMealPlanUpdate);
    return () => {
      window.removeEventListener('mealPlanUpdated', handleMealPlanUpdate);
    };
  }, [loadMealPlan]);



  // Get meals for the selected day
  const getMealsForDay = (dayName: string) => {
    console.log('Getting meals for day:', dayName);
    console.log('Current meal plan:', mealPlan);
    
    if (!mealPlan || !mealPlan.weekPlan) {
      console.log('No meal plan or week plan found');
      return [];
    }
    
    console.log('Week plan days:', mealPlan.weekPlan.days);
    
    const day = mealPlan.weekPlan.days.find(d => 
      d.dayName.toLowerCase() === dayName.toLowerCase()
    );
    
    console.log('Found day:', day);
    
    return day ? day.meals : [];
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 rounded-xl shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Weekly Meal Plan</h2>
          <div className="flex gap-2">
            <button 
              onClick={loadMealPlan}
              disabled={loading}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                loading 
                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              Refresh
            </button>
            <button 
              onClick={() => {
                // Open the chatbot to generate meal plan
                const event = new CustomEvent('openChatbot');
                window.dispatchEvent(event);
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Generate New Plan
            </button>
          </div>
        </div>

        {justUpdated && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200 rounded-lg flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p>Meal plan updated successfully!</p>
          </div>
        )}

        <div className="flex space-x-4 mb-8 overflow-x-auto pb-4">
          {daysOfWeek.map((day) => {
            const dayMeals = getMealsForDay(day);
            const hasMeals = dayMeals.length > 0;
            
            return (
              <motion.button
                key={day}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedDay(day)}
                className={`px-6 py-3 rounded-lg flex items-center gap-2 whitespace-nowrap ${
                  selectedDay === day
                    ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                    : hasMeals 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Calendar className="w-4 h-4" />
                {day}
                {hasMeals && (
                  <span className="ml-2 px-2 py-1 bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200 rounded-full text-xs">
                    {dayMeals.length}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-300">Loading meal plan...</p>
          </div>
        ) : mealPlan ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {selectedDay} - {mealPlan.name}
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-300">
                Generated on {new Date(mealPlan.date).toLocaleDateString()}
              </span>
            </div>
            
            {getMealsForDay(selectedDay).length > 0 ? (
              <div className="grid gap-4">
                {getMealsForDay(selectedDay).map((meal) => (
                  <motion.div
                    key={meal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-6 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Utensils className="w-5 h-5 text-emerald-600" />
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{meal.name}</h4>
                          <span className="text-xs font-medium text-emerald-600 uppercase">{meal.type}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300">
                        <Clock className="w-4 h-4" />
                        <span>{meal.prepTime} mins</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h5 className="font-medium text-gray-700 dark:text-gray-200 mb-2">Nutritional Info</h5>
                        <div className="space-y-2">
                          {Object.entries(meal.nutrients).map(([nutrient, value]) => (
                            <div key={nutrient} className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">{nutrient}</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {nutrient === 'calories' ? value : `${value}g`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-700 dark:text-gray-200 mb-2">Ingredients</h5>
                        <div className="flex flex-wrap gap-2">
                          {meal.ingredients.map((ingredient, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded text-sm"
                            >
                              {ingredient}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                <p className="text-gray-500 dark:text-gray-300 mb-2">No meals planned for {selectedDay}</p>
                <p className="text-gray-400 dark:text-gray-400 text-sm">Generate a meal plan to see meals for this day</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="text-gray-500 dark:text-gray-300 mb-4">No meal plan has been generated yet.</p>
            <p className="text-gray-400 dark:text-gray-400 text-sm">Click "Generate New Plan" to create your first meal plan</p>
          </div>
        )}
      </div>
    </div>
  );
}