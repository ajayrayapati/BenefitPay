
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
      case AppView.RESEARCH:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-6 h-6 ${color}`}>
            <path fillRule="evenodd" d="M10.5 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM19.5 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM1.5 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clipRule="evenodd" />
          </svg>
        );
      case AppView.SPEND_IQ:
        return (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-6 h-6 ${color}`}>
                <path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 018.25-8.25.75.75 0 01.75.75v6.75H18a.75.75 0 01.75.75 8.25 8.25 0 01-16.5 0zm1.5 0a6.75 6.75 0 006.75 6.75v-6H3.75z" clipRule="evenodd" />
                <path d="M12 2.25a.75.75 0 01.75.75v2.25H18a2.25 2.25 0 012.25 2.25v5.506A8.25 8.25 0 0014.887 2.26 6.72 6.72 0 0012 2.25z" />
            </svg>
        );
      case AppView.MARKET_REC:
        return (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-6 h-6 ${color}`}>
                <path fillRule="evenodd" d="M9 14l6-6m0 0v6m0-6h-6" clipRule="evenodd" />
                <path d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12 18.75a6.75 6.75 0 100-13.5 6.75 6.75 0 000 13.5z" />
            </svg>
        );
      case AppView.BANK_IQ:
        return (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-6 h-6 ${color}`}>
                <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v.756a32.3 32.3 0 01-5.6 1.052.75.75 0 01-.256-1.478A30.73 30.73 0 0012 2.25zM12.75 3a.75.75 0 00-1.5 0v.756c1.93.295 3.795.66 5.6 1.052a.75.75 0 00.256-1.478A30.73 30.73 0 0012.75 3z" clipRule="evenodd" />
                <path d="M10.5 9.75a3 3 0 013-3h1.5a.75.75 0 01.75.75v10.5a.75.75 0 01-.75.75H4.5a.75.75 0 01-.75-.75V8.25a.75.75 0 01.75-.75h2.25a3 3 0 013 3v4.5a.75.75 0 001.5 0v-4.5z" />
                <path d="M20.25 14.25a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0v-4.5z" />
            </svg>
        );
      case AppView.CART_SAVER:
        return (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-6 h-6 ${color}`}>
                <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
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

  const btnClass = "flex flex-col items-center justify-center py-2 space-y-1 active:scale-95 transition-transform w-full";
  const textClass = (isActive: boolean) => `text-[8px] sm:text-[9px] font-bold ${isActive ? 'text-blue-600' : 'text-gray-400'}`;

  // Row 1: Home, AI Pick, Add Card, Cart Saver, Product Research
  const row1 = [
    { view: AppView.WALLET, label: 'Home' },
    { view: AppView.RECOMMEND, label: 'AI Pick' },
    { view: AppView.ADD_CARD, label: 'Card' },
    { view: AppView.CART_SAVER, label: 'Cart Analyzer' },
    { view: AppView.RESEARCH, label: 'Product Research' },
  ];

  // Row 2: SpendIQ, SpendFit, BankIQ, Help
  const row2 = [
    { view: AppView.SPEND_IQ, label: 'SpendIQ' },
    { view: AppView.MARKET_REC, label: 'SpendFit' },
    { view: AppView.BANK_IQ, label: 'BankIQ' },
    { view: AppView.HELP, label: 'About' },
  ];

  return (
    <div className="fixed top-0 w-full bg-white/95 backdrop-blur-md border-b border-gray-200 pt-safe z-50 shadow-sm flex flex-col">
      {/* Row 1 */}
      <div className="flex w-full border-b-2 border-gray-300">
        {row1.map((item) => (
            <button key={item.view} onClick={() => onChange(item.view)} className={btnClass}>
                {getIcon(item.view, currentView === item.view)}
                <span className={textClass(currentView === item.view)}>{item.label}</span>
            </button>
        ))}
      </div>

      {/* Row 2 - Padded to bring icons closer */}
      <div className="flex w-full px-8">
        {row2.map((item) => (
            <button key={item.view} onClick={() => onChange(item.view)} className={btnClass}>
                {getIcon(item.view, currentView === item.view)}
                <span className={textClass(currentView === item.view)}>{item.label}</span>
            </button>
        ))}
      </div>
    </div>
  );
};
