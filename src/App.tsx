import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import MealPlans from './components/MealPlans';
import HealthData from './components/HealthData';
import AIInsights from './components/AIInsights';
import Profile from './components/Profile';
import ChatBot from './components/ChatBot';
import DatabaseViewer from './components/DatabaseViewer';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import { AuthService } from './services/AuthService';

function Shell() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const user = AuthService.currentUser();

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {!isAuthPage && <Sidebar />}
      <AnimatePresence mode="wait">
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`flex-1 ${!isAuthPage ? 'p-8' : ''} overflow-y-auto`}
        >
          <Routes>
            {/* Auth routes */}
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup />} />

            {/* Protected routes */}
            <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" replace />} />
            <Route path="/meal-plans" element={user ? <MealPlans /> : <Navigate to="/login" replace />} />
            <Route path="/health-data" element={user ? <HealthData /> : <Navigate to="/login" replace />} />
            <Route path="/ai-insights" element={user ? <AIInsights /> : <Navigate to="/login" replace />} />
            <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" replace />} />
            <Route path="/database" element={user ? <DatabaseViewer /> : <Navigate to="/login" replace />} />
          </Routes>
        </motion.main>
      </AnimatePresence>
      {!isAuthPage && <ChatBot />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Shell />
    </Router>
  );
}

export default App;