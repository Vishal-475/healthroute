import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { addMealPlan, MealPlanRecord, Meal as DBMeal, DayPlan as DBDayPlan, WeekPlan as DBWeekPlan, Nutrient as DBNutrient } from '../services/DatabaseService';

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false); // Start closed as a floating widget
  const [messages, setMessages] = useState<Array<{ text: string; isUser: boolean }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showMealPlanButton, setShowMealPlanButton] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Together API configuration with key directly in code
  const TOGETHER_API_KEY = 'dc303dc8651fd2bd59764439750f70c969c59af5b613100c4a91fc74a7b0a8bc';
  const MODEL = 'meta-llama/Llama-3.3-70B-Instruct-Turbo';

  // User ID for database operations
  const userId = 'user-1'; // In a real app, this would come from authentication

  // Get user's allergies for meal planning
  const getUserAllergies = async (): Promise<string[]> => {
    try {
      const { getAllHealthData } = await import('../services/DatabaseService');
      const healthData = await getAllHealthData(userId);
      const latestHealthData = healthData.sort((a, b) => b.date.getTime() - a.date.getTime())[0];
      return latestHealthData?.allergens || [];
    } catch (error) {
      console.error('Error fetching user allergies:', error);
      return [];
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for openChatbot event
  useEffect(() => {
    const handleOpenChatbot = () => {
      setIsOpen(true);
      // Auto-generate meal plan when opened from meal plans page
      setTimeout(() => {
        requestMealPlan();
      }, 500);
    };

    window.addEventListener('openChatbot', handleOpenChatbot);
    return () => {
      window.removeEventListener('openChatbot', handleOpenChatbot);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Parse meal plan text into structured data
  const parseMealPlanFromText = (text: string): DBWeekPlan => {
    console.log('Starting to parse meal plan text...');
    
    // Default values for nutrients and prep time
    const defaultNutrients: DBNutrient = {
      calories: 350,
      protein: 20,
      carbs: 40,
      fat: 15,
    };
    const defaultPrepTime = 25;

    // Define the days of the week
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Create a week plan structure
    const days: DBDayPlan[] = [];
    
    // Split the text by markdown headers (# for days, ## for meals)
    const lines = text.split('\n');
    console.log('Total lines to parse:', lines.length);
    
    let currentDay: string | null = null;
    let currentMealType: string | null = null;
    let currentMealName: string | null = null;
    let currentIngredients: string[] = [];
    let dayMeals: DBMeal[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      console.log(`Processing line ${i}: "${line}"`);
      
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
        if (currentMealType && currentMealName) {
          dayMeals.push({
            id: `${currentDay?.toLowerCase().replace(/\s+/g, '-')}-${currentMealType.toLowerCase()}-${dayMeals.length}`,
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
    if (currentMealType && currentMealName) {
      dayMeals.push({
        id: `${currentDay?.toLowerCase().replace(/\s+/g, '-')}-${currentMealType.toLowerCase()}-${dayMeals.length}`,
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
    const finalDays: DBDayPlan[] = [];
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

    console.log('Final parsed week plan:', {
      id: 'week-plan-1',
      days: finalDays,
    });
    
    return {
      id: 'week-plan-1',
      days: finalDays,
    };
  };

  // Save meal plan to the database
  const saveMealPlanToDatabase = async (weekPlanData: DBWeekPlan) => {
    try {
      console.log('Saving meal plan to database...', weekPlanData);
      // Convert the UI meal plan format to database format
      const mealPlanRecord: MealPlanRecord = {
        date: new Date(),
        name: `Meal Plan - ${new Date().toLocaleDateString()}`,
        weekPlan: weekPlanData,
        userId: userId,
        source: 'chatbot'
      };
      
      console.log('Meal plan record to save:', mealPlanRecord);
      
      // Save to database
      const result = await addMealPlan(mealPlanRecord);
      console.log('Meal plan saved with ID:', result);
      setSaveSuccess(true);
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      
      console.log('Meal plan saved to database successfully');
      
      // Verify the meal plan was saved by fetching it back
      setTimeout(async () => {
        try {
          const { getLatestMealPlan } = await import('../services/DatabaseService');
          const savedPlan = await getLatestMealPlan(userId);
          console.log('Verification - Latest meal plan after save:', savedPlan);
        } catch (error) {
          console.error('Error verifying saved meal plan:', error);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error saving meal plan to database:', error);
    }
  };

  const formatResponseWithBulletPoints = (text: string) => {
    // Check if the response already has bullet points or numbering
    if (text.includes('\n- ') || text.includes('\n* ') || /\n\d+\./.test(text)) {
      return text; // Already formatted with bullets or numbers
    }
    
    // Split by sentences and convert to bullet points
    const sentences = text.split(/(?<=[.!?])\s+/);
    
    // Filter out empty sentences and format with bullet points
    const bulletPoints = sentences
      .filter(sentence => sentence.trim().length > 0)
      .map(sentence => `• ${sentence.trim()}`)
      .join('\n');
    
    return bulletPoints;
  };

  const requestMealPlan = async () => {
    const allergies = await getUserAllergies();
    let mealPlanRequest = "Generate a detailed 7-day meal plan with breakfast, lunch, dinner, and snacks. Include healthy options with a good balance of nutrients.";
    
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
      
      // If it's a meal plan request, parse the response and save to database
      if (isMealPlanRequest) {
        console.log('Parsing meal plan from text:', formattedResponse);
        const parsedWeekPlan = parseMealPlanFromText(formattedResponse);
        console.log('Parsed week plan:', parsedWeekPlan);
        
        await saveMealPlanToDatabase(parsedWeekPlan);
        // Dispatch event to notify other components that meal plan was updated
        console.log('Dispatching mealPlanUpdated event...');
        window.dispatchEvent(new CustomEvent('mealPlanUpdated'));
        
        // Direct call to refresh function if available
        if ((window as any).refreshMealPlan) {
          console.log('Calling refreshMealPlan directly...');
          (window as any).refreshMealPlan();
        }
      } else {
        // Only format as bullet points if it's not a meal plan
        formattedResponse = formatResponseWithBulletPoints(formattedResponse);
        const aiResponse = { text: formattedResponse, isUser: false };
        setMessages(prev => [...prev.slice(0, -1), aiResponse]); // Replace the last message
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

  return (
    <>
      {/* Floating Chat Widget */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-20 right-4 w-96 h-96 bg-white rounded-lg shadow-xl flex flex-col z-50 border border-gray-200"
          >
            <div className="p-4 border-b flex justify-between items-center bg-emerald-600 text-white rounded-t-lg">
              <div>
                <h3 className="font-semibold">Health Assistant</h3>
                {saveSuccess && (
                  <p className="text-sm text-emerald-100 mt-1">Meal plan saved successfully!</p>
                )}
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
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

      {/* Floating Chat Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-4 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-colors z-50"
      >
        <MessageCircle className="w-6 h-6" />
      </motion.button>
    </>
  );
}