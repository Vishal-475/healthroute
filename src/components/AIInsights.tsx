import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Brain, TrendingUp, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { getAllDeficiencyData, getDeficiencyHistory, DeficiencyRecord } from '../services/DatabaseService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Initial chart data that will be replaced with database data
const initialNutrientData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Vitamin D Levels',
      data: [65, 59, 80, 81, 56, 75],
      fill: false,
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1,
    },
    {
      label: 'Iron Levels',
      data: [28, 48, 40, 19, 86, 27],
      fill: false,
      borderColor: 'rgb(255, 99, 132)',
      tension: 0.1,
    },
  ],
};

export default function AIInsights() {
  const [nutrientData, setNutrientData] = useState(initialNutrientData);
  const [deficiencyData, setDeficiencyData] = useState<DeficiencyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = 'user123'; // In a real app, this would come from authentication

  useEffect(() => {
    const fetchDeficiencyData = async () => {
      try {
        setLoading(true);
        const allDeficiencies = await getAllDeficiencyData(userId);
        setDeficiencyData(allDeficiencies);

        // Get historical data for specific nutrients
        const vitaminDHistory = await getDeficiencyHistory('Vitamin D', userId);
        const ironHistory = await getDeficiencyHistory('Iron', userId);

        // Update chart data with real values if available
        if (vitaminDHistory.length > 0 || ironHistory.length > 0) {
          updateChartData(vitaminDHistory, ironHistory);
        }
      } catch (error) {
        console.error('Error fetching deficiency data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeficiencyData();
  }, [userId]);

  // Format date as month abbreviation
  const formatDate = (date: Date): string => {
    return date.toLocaleString('default', { month: 'short' });
  };

  // Helper function to get status title
  const getStatusTitle = (status: 'normal' | 'deficient' | 'excess'): string => {
    switch (status) {
      case 'normal':
        return 'Optimization';
      case 'deficient':
        return 'Deficiency Alert';
      case 'excess':
        return 'Excess Alert';
      default:
        return 'Analysis';
    }
  };

  // Helper function to get deficiency message
  const getDeficiencyMessage = (deficiency: DeficiencyRecord): string => {
    const { nutrient, status, value, unit } = deficiency;
    
    switch (status) {
      case 'normal':
        return `Your ${nutrient} levels (${value} ${unit}) are within the normal range. Continue with your current diet and supplementation.`;
      case 'deficient':
        return `Your ${nutrient} levels (${value} ${unit}) are below the recommended range. Consider increasing intake through diet or supplements.`;
      case 'excess':
        return `Your ${nutrient} levels (${value} ${unit}) are above the recommended range. Consider reducing intake to maintain optimal health.`;
      default:
        return `Your ${nutrient} levels are being monitored.`;
    }
  };

  // Update chart data with real values
  const updateChartData = (vitaminDHistory: DeficiencyRecord[], ironHistory: DeficiencyRecord[]) => {
    // Create a combined timeline of all dates
    const allDates = [...vitaminDHistory, ...ironHistory]
      .map(record => record.date)
      .sort((a, b) => a.getTime() - b.getTime());

    // Remove duplicates and get last 6 months (or less if not enough data)
    const uniqueDates = Array.from(new Set(allDates.map(date => formatDate(date))));
    const labels = uniqueDates.slice(-6); // Get last 6 months

    // Extract values for each nutrient
    const vitaminDValues = labels.map(month => {
      const record = vitaminDHistory.find(r => formatDate(r.date) === month);
      return record ? record.value : null;
    });

    const ironValues = labels.map(month => {
      const record = ironHistory.find(r => formatDate(r.date) === month);
      return record ? record.value : null;
    });

    // Update chart data
    setNutrientData({
      labels,
      datasets: [
        {
          label: 'Vitamin D Levels',
          data: vitaminDValues,
          fill: false,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1,
        },
        {
          label: 'Iron Levels',
          data: ironValues,
          fill: false,
          borderColor: 'rgb(255, 99, 132)',
          tension: 0.1,
        },
      ],
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Health Insights</h2>
          <div className="flex items-center gap-2 text-emerald-600">
            <Brain className="w-5 h-5" />
            <span className="text-sm font-medium">Last updated: 2 hours ago</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-50 dark:bg-emerald-900/30 p-6 rounded-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
              <h3 className="text-lg font-semibold text-emerald-900">Nutrient Trends</h3>
            </div>
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading nutrient data...</div>
            ) : (
              <Line data={nutrientData} />
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-900">Key Observations</h3>
            </div>
            <div className="space-y-4">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading observations...</div>
              ) : deficiencyData.length > 0 ? (
                // Display actual deficiency data from the database
                deficiencyData.slice(0, 3).map((deficiency, index) => (
                  <div key={index} className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">{deficiency.nutrient} {getStatusTitle(deficiency.status)}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {getDeficiencyMessage(deficiency)}
                    </p>
                  </div>
                ))
              ) : (
                // Default observations if no data is available
                <>
                  <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Vitamin D Optimization</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Your Vitamin D levels have shown consistent improvement. Continue with 15 minutes of
                      daily sun exposure and current supplementation.
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Iron Intake Alert</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Recent data shows fluctuating iron levels. Consider increasing leafy green
                      vegetables and lean meats in your diet.
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-900">Personalized Recommendations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.02 }}
                className="bg-gray-50 p-4 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-medium text-gray-900">AI Suggestion #{index}</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Based on your recent health data, we recommend adjusting your meal timing to
                  optimize nutrient absorption.
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}