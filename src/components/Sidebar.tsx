import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, Brain, Heart, Salad, User, Sun, Moon, ChevronRight, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navigation = [
  { name: 'Dashboard', icon: Activity, path: '/' },
  { name: 'Meal Plans', icon: Salad, path: '/meal-plans' },
  { name: 'Health Data', icon: Heart, path: '/health-data' },
  { name: 'AI Insights', icon: Brain, path: '/ai-insights' },
  { name: 'Profile', icon: User, path: '/profile' },
  { name: 'Database', icon: Database, path: '/database' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const sidebarVariants = {
    expanded: { width: '280px' },
    collapsed: { width: '80px' }
  };

  const itemVariants = {
    expanded: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.2
      }
    },
    collapsed: {
      x: -10,
      opacity: 0,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <motion.div
      initial="expanded"
      animate={isExpanded ? "expanded" : "collapsed"}
      variants={sidebarVariants}
      className="relative min-h-screen glass-morphism dark:bg-gray-900/80 dark:border-gray-800"
    >
      <div className="sticky top-0 z-10 glass-morphism p-6 dark:bg-gray-900/80 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-xl bg-primary-500 text-white dark:bg-emerald-600"
          >
            <Brain className="w-8 h-8" />
          </motion.div>
          <AnimatePresence>
            {isExpanded && (
              <motion.h1
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
                variants={itemVariants}
                className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-accent-400 bg-clip-text text-transparent dark:text-gray-100 dark:bg-none"
              >
                HealthRoute
              </motion.h1>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <nav className="p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <motion.button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={`sidebar-link ${isActive ? 'sidebar-link-active' : 'hover:bg-gray-50'}`}
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.div
                whileHover={{ rotate: 5 }}
                transition={{ duration: 0.2 }}
              >
                <item.icon className="sidebar-icon" />
              </motion.div>
              <AnimatePresence>
                {isExpanded && (
                  <motion.span
                    initial="collapsed"
                    animate="expanded"
                    exit="collapsed"
                    variants={itemVariants}
                    className="flex-1 text-left font-medium"
                  >
                    {item.name}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && isExpanded && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2 h-2 rounded-full bg-primary-500"
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      <div className="absolute bottom-4 left-4 right-4 space-y-2">
        <motion.button
          onClick={toggleTheme}
          className="sidebar-link w-full"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isDarkMode ? (
            <Moon className="sidebar-icon" />
          ) : (
            <Sun className="sidebar-icon" />
          )}
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
                variants={itemVariants}
                className="font-medium"
              >
                {isDarkMode ? 'Dark Mode' : 'Light Mode'}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className="sidebar-link w-full"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div
            animate={{ rotate: isExpanded ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronRight className="sidebar-icon" />
          </motion.div>
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
                variants={itemVariants}
                className="font-medium"
              >
                Collapse Sidebar
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.div>
  );
}