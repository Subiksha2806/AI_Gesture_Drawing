import React, { useState } from 'react';
import { Settings as SettingsIcon, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface SidebarProps {
  children: (activeTab: 'settings' | 'history') => React.ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'settings' | 'history'>('settings');

  return (
    <div className="relative h-full flex flex-row items-stretch select-none">
      {/* Sidebar Panel Container */}
      <motion.div
        animate={{ width: isOpen ? 320 : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="h-full overflow-hidden flex flex-col items-stretch glass-panel border-r border-slate-800/40 relative z-10"
      >
        {/* Navigation Tabs Header */}
        <div className="flex border-b border-slate-800/50 bg-slate-950/20">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-3 px-4 text-xs font-bold flex items-center justify-center space-x-2 border-b-2 transition-all ${
              activeTab === 'settings'
                ? 'border-brand-500 text-brand-400 bg-brand-500/[0.02]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/10'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Control Panel</span>
          </button>
          
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-4 text-xs font-bold flex items-center justify-center space-x-2 border-b-2 transition-all ${
              activeTab === 'history'
                ? 'border-brand-500 text-brand-400 bg-brand-500/[0.02]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/10'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Gallery</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-hidden p-5 bg-slate-900/10">
          {children(activeTab)}
        </div>
      </motion.div>

      {/* Collapse/Expand Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-1/2 -translate-y-1/2 -right-4 z-20 w-8 h-8 rounded-full border glass-panel shadow-md hover:bg-slate-800 text-slate-400 hover:text-slate-100 flex items-center justify-center transition-all focus:outline-none"
        title={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
      >
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    </div>
  );
}
