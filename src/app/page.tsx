"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquareShare,
  Percent,
  Utensils,
  Search,
  Bell,
  Settings,
  User,
  Activity,
  BarChart3,
  TrendingUp,
} from "lucide-react";

type TabId = "feedback" | "gacha" | "food";

const tabs = [
  {
    id: "feedback" as TabId,
    label: "Player Feedback Insight Report",
    icon: MessageSquareShare,
  },
  {
    id: "gacha" as TabId,
    label: "Gacha DropRate",
    icon: Percent,
  },
  {
    id: "food" as TabId,
    label: "Food-assistant",
    icon: Utensils,
  },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("feedback");

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[120px]" />
      </div>

      <div className="relative z-10 flex h-screen overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-72 flex-shrink-0 border-r border-slate-800/60 bg-[#0B0F17]/80 backdrop-blur-xl flex flex-col">
          <div className="h-20 flex items-center px-8 border-b border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400">
                Ai-Exam by BEST
              </span>
            </div>
          </div>

          <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
            <div className="px-4 mb-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
              Main Dashboard
            </div>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative group ${
                    isActive
                      ? "text-indigo-400 bg-indigo-500/10 shadow-inner"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute inset-0 rounded-xl border border-indigo-500/20 bg-indigo-500/10"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon className={`w-5 h-5 relative z-10 transition-colors ${isActive ? "text-indigo-400" : "group-hover:text-slate-300"}`} />
                  <span className="font-medium text-sm relative z-10 text-left">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-800/60">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/30 border border-slate-800/50">
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                <User className="w-5 h-5 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">Admin User</p>
                <p className="text-xs text-slate-500 truncate">admin@nexus.io</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-transparent">
          {/* Top Header */}
          <header className="h-20 flex-shrink-0 flex items-center justify-between px-8 border-b border-slate-800/60 bg-[#0B0F17]/50 backdrop-blur-md">
            <div className="flex-1 flex items-center">
              <div className="relative w-96 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Search across reports..."
                  className="w-full bg-slate-900/50 border border-slate-800/80 rounded-full pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-slate-400 hover:text-slate-200 transition-colors rounded-full hover:bg-slate-800/50">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 border-2 border-[#0B0F17]"></span>
              </button>
              <button className="p-2 text-slate-400 hover:text-slate-200 transition-colors rounded-full hover:bg-slate-800/50">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Dynamic Content */}
          <div className="flex-1 overflow-auto p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="h-full flex flex-col"
              >
                <div className="mb-8 flex items-end justify-between">
                  <div>
                    <h1 className="text-3xl font-semibold text-slate-100 tracking-tight mb-2 flex items-center gap-3">
                      {tabs.find((t) => t.id === activeTab)?.label}
                    </h1>
                    <p className="text-slate-500 text-sm">
                      Detailed analytics and insights generated by AI for your review.
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                      Export
                    </button>
                    <button className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20">
                      Generate Report
                    </button>
                  </div>
                </div>

                {/* Empty State/Placeholder for Content */}
                <div className="flex-1 border border-dashed border-slate-800/80 rounded-2xl bg-slate-900/20 flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-6 shadow-inner">
                    <BarChart3 className="w-8 h-8 text-slate-500" />
                  </div>
                  <h3 className="text-xl font-medium text-slate-300 mb-2">
                    No data visualized yet
                  </h3>
                  <p className="text-slate-500 max-w-md mx-auto mb-8">
                    This space will be populated with advanced charts, AI insights, and actionable metrics related to {tabs.find((t) => t.id === activeTab)?.label}.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl opacity-50">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-32 rounded-xl bg-slate-800/40 border border-slate-700/50"></div>
                    ))}
                    <div className="h-64 md:col-span-2 rounded-xl bg-slate-800/40 border border-slate-700/50"></div>
                    <div className="h-64 rounded-xl bg-slate-800/40 border border-slate-700/50"></div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
