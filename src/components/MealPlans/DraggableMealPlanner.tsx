import React, { useState, useRef, useEffect } from 'react';
import { addMealPlan, MealPlanRecord, Meal as DBMeal, DayPlan as DBDayPlan, WeekPlan as DBWeekPlan, Nutrient as DBNutrient } from '../../services/DatabaseService';
import { ApiService } from '../../services/ApiService';
import { AuthService } from '../../services/AuthService';
import { MessageCircle, X, Send, Calendar, Plus, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Utensils, Clock, Info } from 'lucide-react';

// Define interfaces for meal planning
interface Nutrient {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Meal {
  id: string;
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  nutrients: Nutrient;
  prepTime: number;
  ingredients: string[];
}

interface DayPlan {
  id: string;
  dayName: string;
  date: Date;
  meals: Meal[];
}

interface WeekPlan {
  id: string;
  days: DayPlan[];
}

// Sortable meal component
const SortableMeal = ({ meal }: { meal: Meal }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: meal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      whileHover={{ scale: 1.02 }}
      className="bg-gray-50 p-6 rounded-lg cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Utensils className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{meal.name}</h3>
            <span className="text-xs font-medium text-emerald-600 uppercase">{meal.type}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>{meal.prepTime} mins</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Nutritional Info</h4>
          <div className="space-y-2">
            {Object.entries(meal.nutrients).map(([nutrient, value]) => (
              <div key={nutrient} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{nutrient}</span>
                <span className="text-sm font-medium text-gray-900">
                  {nutrient === 'calories' ? value : `${value}g`}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">Ingredients</h4>
          <div className="flex flex-wrap gap-2">
            {meal.ingredients.map((ingredient, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-sm"
              >
                {ingredient}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t">
        <button className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700">
          <Info className="w-4 h-4" />
          <span className="text-sm">View Recipe Details</span>
        </button>
      </div>
    </motion.div>
  );
};

// Main component that combines the chatbot and meal planner
export default function MealPlanningSystem() {
  // Chatbot states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ text: string; isUser: boolean }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showMealPlanButton, setShowMealPlanButton] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Meal planner states
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  
  // User ID for database operations
  const authUser = AuthService.currentUser();
  const userIdNumber: number = typeof authUser?.id === 'number' ? authUser!.id : 1;
  const userId = String(userIdNumber);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Together API configuration with key directly in code
  const TOGETHER_API_KEY = 'dc303dc8651fd2bd59764439750f70c969c59af5b613100c4a91fc74a7b0a8bc';
  const MODEL = 'meta-llama/Llama-3.3-70B-Instruct-Turbo';

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Helper function to get the current day
  const getCurrentDay = () => {
    if (!weekPlan || weekPlan.days.length === 0) return null;
    return weekPlan.days[currentDayIndex];
  };

  // Navigate to previous day
  const goToPreviousDay = () => {
    if (currentDayIndex > 0) {
      setCurrentDayIndex(currentDayIndex - 1);
    }
  };

  // Navigate to next day
  const goToNextDay = () => {
    if (weekPlan && currentDayIndex < weekPlan.days.length - 1) {
      setCurrentDayIndex(currentDayIndex + 1);
    }
  };

  // Parse meal plan text into structured data
  const parseMealPlanFromText = (text: string): WeekPlan => {
    // Default values for nutrients and prep time
    const defaultNutrients = {
      calories: 350,
      protein: 20,
      carbs: 40,
      fat: 15,
    };
    const defaultPrepTime = 25;

    // Define the days of the week
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Create a week plan structure
    const days: DayPlan[] = [];
    
    // Split the text by markdown headers (# for days, ## for meals)
    const lines = text.split('\n');
    let currentDay: string | null = null;
    let currentMealType: string | null = null;
    let currentMealName: string | null = null;
    let currentIngredients: string[] = [];
    let dayMeals: Meal[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for day header (# Day Name)
      if (line.startsWith('# ') && !line.startsWith('## ')) {
        // Save previous day's meals if exists
        if (currentDay && dayMeals.length > 0) {
          const dayIndex = daysOfWeek.findIndex(d => d.toLowerCase() === currentDay.toLowerCase());
          if (dayIndex !== -1) {
            days.push({
              id: `day-${dayIndex + 1}`,
              dayName: currentDay,
              date: new Date(Date.now() + dayIndex * 24 * 60 * 60 * 1000),
              meals: [...dayMeals],
            });
          }
        }
        
        // Start new day
        currentDay = line.replace('# ', '').trim();
        dayMeals = [];
        currentMealType = null;
        currentMealName = null;
        currentIngredients = [];
      }
      
      // Check for meal type header (## Meal Type)
      else if (line.startsWith('## ')) {
        // Save previous meal if exists
        if (currentMealType && currentMealName && currentDay) {
          dayMeals.push({
            id: `${currentDay.toLowerCase().replace(/\s+/g, '-')}-${currentMealType.toLowerCase()}-${dayMeals.length}`,
            name: currentMealName,
            type: currentMealType.toLowerCase() as 'breakfast' | 'lunch' | 'dinner' | 'snack',
            nutrients: { ...defaultNutrients },
            prepTime: defaultPrepTime,
            ingredients: currentIngredients.length > 0 ? currentIngredients : ['Ingredients not specified'],
          });
        }
        
        // Start new meal
        currentMealType = line.replace('## ', '').trim();
        currentMealName = null;
        currentIngredients = [];
      }
      
      // Check for recipe line (Recipe: ...)
      else if (line.toLowerCase().startsWith('recipe:')) {
        const recipeContent = line.replace(/^recipe:\s*/i, '').trim();
        const parts = recipeContent.split(',');
        
        if (parts.length > 0) {
          currentMealName = parts[0].trim();
          // Extract ingredients from the rest
          currentIngredients = parts.slice(1).map(ingredient => ingredient.trim()).filter(Boolean);
          
          // Limit to 6 ingredients for UI
          if (currentIngredients.length > 6) {
            currentIngredients = currentIngredients.slice(0, 6);
          }
        }
      }
    }
    
    // Save the last meal and day
    if (currentMealType && currentMealName && currentDay) {
      dayMeals.push({
        id: `${currentDay.toLowerCase().replace(/\s+/g, '-')}-${currentMealType.toLowerCase()}-${dayMeals.length}`,
        name: currentMealName,
        type: currentMealType.toLowerCase() as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        nutrients: { ...defaultNutrients },
        prepTime: defaultPrepTime,
        ingredients: currentIngredients.length > 0 ? currentIngredients : ['Ingredients not specified'],
      });
    }
    
    if (currentDay && dayMeals.length > 0) {
      const dayIndex = daysOfWeek.findIndex(d => d.toLowerCase() === currentDay.toLowerCase());
      if (dayIndex !== -1) {
        days.push({
          id: `day-${dayIndex + 1}`,
          dayName: currentDay,
          date: new Date(Date.now() + dayIndex * 24 * 60 * 60 * 1000),
          meals: [...dayMeals],
        });
      }
    }

    // Ensure we have all 7 days, even if some are missing from the response
    const finalDays: DayPlan[] = [];
    for (let i = 0; i < 7; i++) {
      const existingDay = days.find(d => d.dayName === daysOfWeek[i]);
      if (existingDay) {
        finalDays.push(existingDay);
      } else {
        // Create empty day if not found
        finalDays.push({
          id: `day-${i + 1}`,
          dayName: daysOfWeek[i],
          date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
          meals: [],
        });
      }
    }

    return {
      id: 'week-plan-1',
      days: finalDays,
    };
  };

  const requestMealPlan = async () => {
    const allergies = await getUserAllergies();
    let mealPlanRequest = "Generate a detailed 7-day meal plan with breakfast, lunch, dinner, and snacks for each day. Include specific meal names and list key ingredients for each meal. Format it clearly with days and meal types as headings.";
    
    if (allergies.length > 0) {
      mealPlanRequest += ` IMPORTANT: The user has the following food allergies: ${allergies.join(', ')}. Please ensure that NO meals contain any of these allergens.`;
    }
    
    setInput(mealPlanRequest);
    setShowMealPlanButton(false);
    handleSend(mealPlanRequest);
  };

  const handleSend = async (overrideInput?: string) => {
    const messageToSend = overrideInput || input;
    if (!messageToSend.trim() || isLoading) return;

    const userMessage = { text: messageToSend, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Check if it's a meal plan request
      const isMealPlanRequest = messageToSend.toLowerCase().includes('meal plan') || 
                               messageToSend.toLowerCase().includes('diet plan') ||
                               overrideInput !== undefined;
      
      // Form appropriate prompt based on request type
      let prompt = formatPrompt([...messages, userMessage]);
      
      // For meal plan requests, add specific instructions
      if (isMealPlanRequest) {
        prompt += "\nPlease generate a comprehensive 7-day meal plan with breakfast, lunch, dinner, and snacks for each day. Use this exact format:\n\n# Monday\n## Breakfast\nRecipe: [Recipe Name], [ingredient1], [ingredient2], [ingredient3]\n## Lunch\nRecipe: [Recipe Name], [ingredient1], [ingredient2], [ingredient3]\n## Dinner\nRecipe: [Recipe Name], [ingredient1], [ingredient2], [ingredient3]\n## Snack\nRecipe: [Recipe Name], [ingredient1], [ingredient2]\n\nRepeat this format for all 7 days (Monday through Sunday). Focus on nutritious, balanced options.";
      }

      // Call Together API
      const response = await fetch('https://api.together.xyz/v1/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOGETHER_API_KEY}`
        },
        body: JSON.stringify({
          model: MODEL,
          prompt: prompt,
          max_tokens: isMealPlanRequest ? 800 : 300, // Increase token limit for meal plans
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      let formattedResponse = data.choices[0].text.trim();
      
      // Process the response
      const aiResponse = { text: formattedResponse, isUser: false };
      setMessages(prev => [...prev, aiResponse]);
      
      // If it's a meal plan request, parse the response and update the meal planner
      if (isMealPlanRequest) {
        const parsedWeekPlan = parseMealPlanFromText(formattedResponse);
        setWeekPlan(parsedWeekPlan);
        setCurrentDayIndex(0);
        
        // Save the meal plan to the database
        await saveMealPlanToDatabase(parsedWeekPlan);
        // Dispatch event to notify other components that meal plan was updated
        window.dispatchEvent(new CustomEvent('mealPlanUpdated'));
      }
      
    } catch (error) {
      console.error('Error calling Together API:', error);
      const errorMessage = { 
        text: "Sorry, I'm having trouble connecting right now. Please try again later.", 
        isUser: false 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Save meal plan to the database
  const saveMealPlanToDatabase = async (weekPlanData: WeekPlan) => {
    try {
      // Convert the UI meal plan format to database format
      const mealPlanRecord: MealPlanRecord = {
        date: new Date(),
        name: `Meal Plan - ${new Date().toLocaleDateString()}`,
        weekPlan: weekPlanData,
        userId: userId,
        source: 'chatbot'
      };
      // Try backend first
      try {
        await ApiService.saveMealPlan(userIdNumber, {
          name: mealPlanRecord.name,
          date: mealPlanRecord.date,
          source: mealPlanRecord.source,
          weekPlan: mealPlanRecord.weekPlan as any
        });
      } catch (e) {
        // Fallback to local IndexedDB
        await addMealPlan(mealPlanRecord);
      }
      setSaveSuccess(true);
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      
      console.log('Meal plan saved to database successfully');
    } catch (error) {
      console.error('Error saving meal plan to database:', error);
    }
  };

  // Format the conversation history into a prompt for the model
  const formatPrompt = (messageHistory: Array<{ text: string; isUser: boolean }>) => {
    let prompt = "You are a helpful health assistant chatbot specializing in nutrition advice and meal planning. Be concise and clear.\n\n";
    messageHistory.forEach(msg => {
      if (msg.isUser) {
        prompt += `User: ${msg.text}\n`;
      } else {
        prompt += `Assistant: ${msg.text}\n`;
      }
    });
    prompt += "Assistant:";
    return prompt;
  };

  // Handle drag end for meal reordering
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;

    setWeekPlan((currentWeekPlan) => {
      if (!currentWeekPlan) return null;
      
      const daysCopy = [...currentWeekPlan.days];
      const currentDayCopy = { ...daysCopy[currentDayIndex] };
      
      const oldIndex = currentDayCopy.meals.findIndex(meal => meal.id === active.id);
      const newIndex = currentDayCopy.meals.findIndex(meal => meal.id === over.id);
      
      currentDayCopy.meals = arrayMove(currentDayCopy.meals, oldIndex, newIndex);
      daysCopy[currentDayIndex] = currentDayCopy;
      
      return {
        ...currentWeekPlan,
        days: daysCopy
      };
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Personal Meal Planning System</h1>
      
      {/* Meal Planner Section */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Your Weekly Meal Plan</h2>
            {saveSuccess && (
              <p className="text-sm text-emerald-600 mt-1">Meal plan saved to database successfully!</p>
            )}
          </div>
          
          {/* Show button to request meal plan if none exists */}
          {!weekPlan && (
            <button
              onClick={requestMealPlan}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center hover:bg-emerald-700 transition-colors"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Generate 7-Day Meal Plan
            </button>
          )}
        </div>
        
        {weekPlan ? (
          <>
            {/* Day navigation */}
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={goToPreviousDay}
                disabled={currentDayIndex === 0}
                className={`p-2 rounded-full ${
                  currentDayIndex === 0 ? 'text-gray-300' : 'text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              
              <h3 className="text-xl font-medium">
                {getCurrentDay()?.dayName} - {getCurrentDay()?.date.toLocaleDateString()}
              </h3>
              
              <button
                onClick={goToNextDay}
                disabled={!weekPlan || currentDayIndex >= weekPlan.days.length - 1}
                className={`p-2 rounded-full ${
                  !weekPlan || currentDayIndex >= weekPlan.days.length - 1
                    ? 'text-gray-300'
                    : 'text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
            
            {/* Meals list with drag and drop */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={(getCurrentDay()?.meals || []).map(meal => meal.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {getCurrentDay()?.meals.map((meal) => (
                    <SortableMeal key={meal.id} meal={meal} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </>
        ) : (
          <div className="text-center p-12 border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-gray-500 mb-4">No meal plan has been generated yet.</p>
            <p className="text-gray-500">Generate a meal plan using the chatbot or button above.</p>
          </div>
        )}
      </div>
      
      {/* Chatbot Section */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 right-4 w-96 h-96 bg-white rounded-lg shadow-xl flex flex-col z-50"
          >
            <div className="p-4 border-b flex justify-between items-center bg-emerald-600 text-white rounded-t-lg">
              <h3 className="font-semibold">Health Assistant</h3>
              <button onClick={() => setIsChatOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 mt-8">
                  <p>Ask me anything about your health and nutrition!</p>
                  {showMealPlanButton && (
                    <button 
                      onClick={requestMealPlan}
                      className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center justify-center mx-auto hover:bg-emerald-700 transition-colors"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Get 7-Day Meal Plan
                    </button>
                  )}
                </div>
              )}
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-4/5 p-3 rounded-lg ${
                      message.isUser
                        ? 'bg-emerald-600 text-white rounded-br-none'
                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    {message.isUser ? message.text : (
                      <div className="whitespace-pre-line" dangerouslySetInnerHTML={{ 
                        __html: message.text.replace(/\n/g, '<br>')
                                            .replace(/•/g, '<span class="inline-block mr-1">•</span>') 
                      }} />
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 p-3 rounded-lg rounded-bl-none">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about your health or nutrition..."
                  className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  disabled={isLoading}
                />
                <button
                  onClick={() => handleSend()}
                  className={`p-2 bg-emerald-600 text-white rounded-lg transition-colors ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-700'
                  }`}
                  disabled={isLoading}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-4 right-4 p-4 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-colors z-50"
      >
        <MessageCircle className="w-6 h-6" />
      </motion.button>
    </div>
  );
}