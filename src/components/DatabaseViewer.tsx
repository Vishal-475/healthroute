import React, { useState, useEffect } from 'react';
import { viewAllDatabaseData } from '../services/DatabaseService';
import { Database, Calendar, Activity, Apple } from 'lucide-react';

export default function DatabaseViewer() {
  const [databaseData, setDatabaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('health');
  const userId = 'user-1'; // In a real app, this would come from authentication

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await viewAllDatabaseData(userId);
        setDatabaseData(data);
        console.log('Database data:', data);
      } catch (error) {
        console.error('Error fetching database data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-6 h-6 text-emerald-600" />
        <h1 className="text-2xl font-bold">Database Viewer</h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
        </div>
      ) : (
        <div className="w-full">
          <div className="grid w-full grid-cols-3 mb-8 border-b">
            <button 
              onClick={() => setActiveTab('health')} 
              className={`flex items-center justify-center gap-2 p-3 ${activeTab === 'health' ? 'border-b-2 border-emerald-600 font-medium' : ''}`}
            >
              <Activity className="w-4 h-4" />
              Health Data
            </button>
            <button 
              onClick={() => setActiveTab('deficiency')} 
              className={`flex items-center justify-center gap-2 p-3 ${activeTab === 'deficiency' ? 'border-b-2 border-emerald-600 font-medium' : ''}`}
            >
              <Apple className="w-4 h-4" />
              Deficiency Data
            </button>
            <button 
              onClick={() => setActiveTab('mealplans')} 
              className={`flex items-center justify-center gap-2 p-3 ${activeTab === 'mealplans' ? 'border-b-2 border-emerald-600 font-medium' : ''}`}
            >
              <Calendar className="w-4 h-4" />
              Meal Plans
            </button>
          </div>

          {activeTab === 'health' && (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="text-lg font-semibold">Health Data Records</h3>
                  <p className="text-sm text-gray-500">
                    View all your health measurements and metrics.
                  </p>
                </div>
                <div className="p-4">
                {databaseData?.healthData?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="p-2 text-left">Date</th>
                          <th className="p-2 text-left">Blood Pressure</th>
                          <th className="p-2 text-left">Blood Sugar</th>
                          <th className="p-2 text-left">Weight</th>
                          <th className="p-2 text-left">Height</th>
                          <th className="p-2 text-left">BMI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {databaseData.healthData.map((record: any) => (
                          <tr key={record.id} className="border-b hover:bg-gray-50">
                            <td className="p-2">{formatDate(record.date)}</td>
                            <td className="p-2">{record.bloodPressure}</td>
                            <td className="p-2">{record.bloodSugar}</td>
                            <td className="p-2">{record.weight} kg</td>
                            <td className="p-2">{record.height} cm</td>
                            <td className="p-2">{record.bmi?.toFixed(1) || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center p-6 text-gray-500">
                    No health data records found.
                  </div>
                )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'deficiency' && (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="text-lg font-semibold">Nutrient Deficiency Records</h3>
                  <p className="text-sm text-gray-500">
                    Track your nutrient levels and deficiencies over time.
                  </p>
                </div>
                <div className="p-4">
                {databaseData?.deficiencyData?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="p-2 text-left">Date</th>
                          <th className="p-2 text-left">Nutrient</th>
                          <th className="p-2 text-left">Value</th>
                          <th className="p-2 text-left">Unit</th>
                          <th className="p-2 text-left">Status</th>
                          <th className="p-2 text-left">Reference Range</th>
                        </tr>
                      </thead>
                      <tbody>
                        {databaseData.deficiencyData.map((record: any) => (
                          <tr key={record.id} className="border-b hover:bg-gray-50">
                            <td className="p-2">{formatDate(record.date)}</td>
                            <td className="p-2">{record.nutrient}</td>
                            <td className="p-2">{record.value}</td>
                            <td className="p-2">{record.unit}</td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded-full text-xs ${record.status === 'normal' ? 'bg-green-100 text-green-800' : record.status === 'deficient' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {record.status}
                              </span>
                            </td>
                            <td className="p-2">{record.referenceRange || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center p-6 text-gray-500">
                    No deficiency records found.
                  </div>
                )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mealplans' && (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="text-lg font-semibold">Meal Plans</h3>
                  <p className="text-sm text-gray-500">
                    View your saved meal plans generated by the chatbot.
                  </p>
                </div>
                <div className="p-4">
                {databaseData?.mealPlans?.length > 0 ? (
                  <div className="space-y-6">
                    {databaseData.mealPlans.map((plan: any) => (
                      <div key={plan.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">{plan.name}</h3>
                            <p className="text-sm text-gray-500">Created: {formatDate(plan.date)}</p>
                          </div>
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs">
                            {plan.source}
                          </span>
                        </div>
                        
                        <div className="overflow-x-auto">
                          <div className="flex space-x-4 pb-4 overflow-x-auto">
                            {plan.weekPlan.days.map((day: any) => (
                              <div key={day.id} className="min-w-[300px] border rounded-lg p-3">
                                <h4 className="font-medium mb-2">{day.dayName}</h4>
                                <div className="space-y-3">
                                  {day.meals.map((meal: any) => (
                                    <div key={meal.id} className="bg-gray-50 p-2 rounded">
                                      <div className="flex justify-between items-center">
                                        <span className="font-medium">{meal.name}</span>
                                        <span className="text-xs text-emerald-600 uppercase">{meal.type}</span>
                                      </div>
                                      <div className="mt-1 text-sm text-gray-600">
                                        <span className="font-medium">Ingredients: </span>
                                        {meal.ingredients.join(', ')}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-6 text-gray-500">
                    No meal plans found. Generate a meal plan using the chatbot.
                  </div>
                )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}