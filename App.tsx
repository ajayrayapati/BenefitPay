
import React, { useState, useEffect } from 'react';
import { AppView, CreditCard } from './types';
import { CardRepository } from './services/cardRepository';
import { TabBar } from './components/TabBar';
import { CardDetailModal } from './components/CardDetailModal';
import { WalletView } from './views/WalletView';
import { AddCardView } from './views/AddCardView';
import { RecommendView } from './views/RecommendView';
import { ResearchView } from './views/ResearchView';
import { SpendIQView } from './views/SpendIQView';
import { SpendRecommenderView } from './views/SpendRecommenderView';
import { BankIQView } from './views/BankIQView';
import { CartSaverView } from './views/CartSaverView';
import { ReceiptTrackerView } from './views/ReceiptTrackerView';
import { HelpView } from './views/HelpView';

export default function App() {
  const [view, setView] = useState<AppView>(AppView.WALLET);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  
  // Load from Storage on startup
  useEffect(() => {
    const init = async () => {
      try {
        const data = await CardRepository.getAll();
        setCards(data);
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        setIsLoadingDB(false);
      }
    };
    init();
  }, []);

  const addCard = async (newCard: CreditCard) => {
    await CardRepository.addCard(newCard);
    const updatedCards = await CardRepository.getAll();
    setCards(updatedCards);
    setView(AppView.WALLET);
  };

  const handleUpdateCard = async (updatedCard: CreditCard) => {
    await CardRepository.updateCard(updatedCard);
    const updatedCards = await CardRepository.getAll();
    setCards(updatedCards);
    setSelectedCard(updatedCard); 
  };

  const handleDeleteCard = async (cardId: string) => {
    await CardRepository.deleteCard(cardId);
    const updatedCards = await CardRepository.getAll();
    setCards(updatedCards);
    setSelectedCard(null); 
  };

  // --- Data Management Handlers ---
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        const success = await CardRepository.importData(content);
        if (success) {
          const restoredCards = await CardRepository.getAll();
          setCards(restoredCards);
          alert("Data restored from backup successfully!");
          setShowSettings(false);
        } else {
          alert("Invalid backup file.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExport = async () => {
    const data = await CardRepository.exportData();
    if (!data) {
      alert("No data to export.");
      return;
    }
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-smart-pay-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleClearAll = async () => {
    if (confirm("Are you sure? This will delete all your cards permanently.")) {
      await CardRepository.clearAll();
      setCards([]);
      setShowSettings(false);
    }
  };

  if (isLoadingDB) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900 text-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-sm font-medium animate-pulse">Loading Secure Wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 via-white to-blue-50 relative font-sans text-gray-900">
      <TabBar currentView={view} onChange={setView} />
      
      {/* Adjusted top padding for two-row header */}
      <main className="flex-1 overflow-y-auto no-scrollbar pt-[150px] pb-6">
        {view === AppView.WALLET && (
          <WalletView 
            cards={cards} 
            onChangeView={setView} 
            onCardClick={setSelectedCard} 
            onOpenSettings={() => setShowSettings(true)}
          />
        )}
        {view === AppView.ADD_CARD && <AddCardView onAdd={addCard} onCancel={() => setView(AppView.WALLET)} />}
        {view === AppView.RECOMMEND && <RecommendView cards={cards} onViewChange={setView} />}
        {view === AppView.RESEARCH && <ResearchView cards={cards} onViewChange={setView} />}
        {view === AppView.CART_SAVER && <CartSaverView />}
        {view === AppView.SPEND_IQ && <SpendIQView cards={cards} onViewChange={setView} />}
        {view === AppView.MARKET_REC && <SpendRecommenderView onViewChange={setView} />}
        {view === AppView.BANK_IQ && <BankIQView />}
        {view === AppView.RECEIPT_TRACKER && <ReceiptTrackerView />}
        {view === AppView.HELP && <HelpView />}
      </main>

      {/* Card Detail Modal Overlay */}
      {selectedCard && (
        <CardDetailModal 
          card={selectedCard} 
          onClose={() => setSelectedCard(null)} 
          onUpdate={handleUpdateCard}
          onDelete={handleDeleteCard}
        />
      )}

      {/* Settings / Data Management Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in-up">
           <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto no-scrollbar">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">Settings</h2>
                 <button onClick={() => setShowSettings(false)} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors">✕</button>
              </div>

              <div className="space-y-6">
                 <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Backup & Restore</h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                       <button onClick={handleExport} className="flex flex-col items-center justify-center p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-colors active:scale-95">
                          <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          <span className="text-xs font-bold">Export Backup</span>
                       </button>

                       <label className="flex flex-col items-center justify-center p-4 bg-gray-50 text-gray-700 rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer active:scale-95">
                          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                          <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          <span className="text-xs font-bold">Load Backup</span>
                       </label>
                    </div>
                 </div>

                 <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100">
                    <h4 className="text-xs font-bold text-yellow-800 mb-1">⚠️ Storage Info</h4>
                    <p className="text-[10px] text-yellow-700 leading-relaxed">
                       This is a local-only app. Data is stored in your browser. <br/>
                       1. <strong>Refreshing:</strong> Data should persist. <br/>
                       2. <strong>New Browser/Device:</strong> Data will NOT appear. <br/>
                       Use "Export Backup" to move data between devices.
                    </p>
                 </div>

                 <div className="pt-2 border-t border-gray-100">
                    <button onClick={handleClearAll} className="w-full py-3 text-red-600 text-sm font-bold bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
                       Reset App & Clear All Data
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
