import React from 'react';
import { AppView } from '../types';

interface TabBarProps {
  currentView: AppView;
  onChange: (view: AppView) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ currentView, onChange }) => {
  const getIcon = (view: AppView, isActive: boolean) => {
    const color = isActive ? "text-blue-600" : "text-gray-400";
    
    switch (view) {
      case AppView.WALLET:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-6 h-6 ${color}`}>
            <path d="M11.25 4.533A9.707 9.707 0 006 3.755c-2.348 0-4.526.918-6.191 2.421l8.691 8.691 8.692-8.691A9.688 9.688 0 0011.25 4.533z" fillOpacity={0} />
            <path fillRule="evenodd" d="M2.25 5.25a3 3 0 013-3h13.5a3 3 0 013 3V15a3 3 0 01-3 3h-3v-2.192a6.042 6.042 0 00-3-4.856V6a1 1 0 10-2 0v6.192a6.042 6.042 0 00-3 4.856V21H5.25a3 3 0 01-3-3V5.25z" clipRule="evenodd" />
            <path d="M12 11.25a2.25 2.25 0 00-2.25 2.25v2.25a2.25 2.25 0 002.25 2.25h1.5a2.25 2.25 0 002.25-2.25v-2.25a2.25 2.25 0 00-2.25-2.25H12z" />
          </svg>
        );
      case AppView.RECOMMEND:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-6 h-6 ${color}`}>
             <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
          </svg>
        );
      case AppView.ADD_CARD:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-6 h-6 ${color}`}>
            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V15a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V9z" clipRule="evenodd" />
          </svg>
        );
      case AppView.HELP:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-6 h-6 ${color}`}>
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 01-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 01-.837.552c-.676.328-1.028.774-1.028 1.152v.75a.75.75 0 01-1.5 0v-.75c0-1.279 1.06-2.107 1.875-2.502.182-.09.351-.199.51-.338.636-.556.636-1.478 0-2.032zM12 16.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-gray-200 pt-safe px-2 flex justify-between items-center z-50 h-[88px] pb-2 shadow-sm">
      <button 
        onClick={() => onChange(AppView.WALLET)}
        className="flex flex-col items-center justify-center flex-1 space-y-1 active:scale-95 transition-transform"
      >
        {getIcon(AppView.WALLET, currentView === AppView.WALLET)}
        <span className={`text-[10px] font-bold ${currentView === AppView.WALLET ? 'text-blue-600' : 'text-gray-400'}`}>Home</span>
      </button>

      <button 
        onClick={() => onChange(AppView.RECOMMEND)}
        className="flex flex-col items-center justify-center flex-1 space-y-1 active:scale-95 transition-transform"
      >
        {getIcon(AppView.RECOMMEND, currentView === AppView.RECOMMEND)}
        <span className={`text-[10px] font-bold ${currentView === AppView.RECOMMEND ? 'text-blue-600' : 'text-gray-400'}`}>Ask AI</span>
      </button>

      <button 
        onClick={() => onChange(AppView.ADD_CARD)}
        className="flex flex-col items-center justify-center flex-1 space-y-1 active:scale-95 transition-transform"
      >
        {getIcon(AppView.ADD_CARD, currentView === AppView.ADD_CARD)}
        <span className={`text-[10px] font-bold ${currentView === AppView.ADD_CARD ? 'text-blue-600' : 'text-gray-400'}`}>Add Card</span>
      </button>

      <button 
        onClick={() => onChange(AppView.HELP)}
        className="flex flex-col items-center justify-center flex-1 space-y-1 active:scale-95 transition-transform"
      >
        {getIcon(AppView.HELP, currentView === AppView.HELP)}
        <span className={`text-[10px] font-bold ${currentView === AppView.HELP ? 'text-blue-600' : 'text-gray-400'}`}>Help</span>
      </button>
    </div>
  );
};