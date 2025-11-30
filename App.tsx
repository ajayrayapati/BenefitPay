
import React, { useState, useEffect, useRef } from 'react';
import { AppView, CreditCard, CardType, CardDocument, RecommendationResult, MarketRecommendation } from './types';
import { searchCardsByBank, fetchCardDetails, recommendBestCard, findBetterMarketCard } from './services/geminiService';
import { CardRepository } from './services/cardRepository';
import { CreditCardView } from './components/CreditCardView';
import { TabBar } from './components/TabBar';
import { Button } from './components/Button';

// Helper to read file as Base64 for storage
const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

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
      
      <main className="flex-1 overflow-y-auto no-scrollbar pt-[90px] pb-6">
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
           <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-white/20">
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

// --- Sub-Views ---

const WalletView: React.FC<{ 
  cards: CreditCard[], 
  onChangeView: (v: AppView) => void,
  onCardClick: (c: CreditCard) => void,
  onOpenSettings: () => void
}> = ({ cards, onChangeView, onCardClick, onOpenSettings }) => {
  return (
    <div className="px-6 py-4 max-w-lg mx-auto w-full">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600">
            AI-Smart Pay
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-1">My Wallet</p>
        </div>
        <button 
          onClick={onOpenSettings}
          className="bg-white shadow-md hover:shadow-lg transition-all rounded-full w-10 h-10 flex items-center justify-center text-gray-600 border border-gray-100"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.581-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        </button>
      </div>

      <div className="mb-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
        <p className="text-sm text-blue-900 leading-relaxed">
          Simple smart pay app which provides recommendations on what credit card to use based on your wallet, plus finds real-time cashback stacking offers (Rakuten/PayPal) to maximize your savings.
        </p>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-12 text-center space-y-4 animate-fade-in-up">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-9 h-9 text-blue-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800">Your Wallet is Empty</h3>
          <p className="text-gray-500 max-w-[200px] leading-relaxed text-sm">Add your credit cards to start getting AI-powered recommendations.</p>
          <div className="pt-6 w-full max-w-[200px]">
             <Button onClick={() => onChangeView(AppView.ADD_CARD)}>Add First Card</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {cards.map((card) => (
            <CreditCardView 
              key={card.id} 
              card={card} 
              onClick={() => onCardClick(card)}
              className="hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
            />
          ))}
          <div className="h-4"></div>
        </div>
      )}
    </div>
  );
};

const HelpView: React.FC = () => {
  return (
    <div className="px-6 py-4 max-w-lg mx-auto w-full">
      <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 mb-6">
        How to Use
      </h1>

      <div className="space-y-6 animate-fade-in-up">
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
             <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M11.25 4.533A9.707 9.707 0 006 3.755c-2.348 0-4.526.918-6.191 2.421l8.691 8.691 8.692-8.691A9.688 9.688 0 0011.25 4.533z" fillOpacity={0} />
                  <path fillRule="evenodd" d="M2.25 5.25a3 3 0 013-3h13.5a3 3 0 013 3V15a3 3 0 01-3 3h-3v-2.192a6.042 6.042 0 00-3-4.856V6a1 1 0 10-2 0v6.192a6.042 6.042 0 00-3 4.856V21H5.25a3 3 0 01-3-3V5.25z" clipRule="evenodd" />
               </svg>
             </div>
             <h3 className="font-bold text-lg text-gray-900">Wallet Home</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            This is your digital wallet. All your saved cards appear here. Tap on any card to view its rewards, benefits, or to edit its details manually.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
             <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                 <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V15a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V9z" clipRule="evenodd" />
               </svg>
             </div>
             <h3 className="font-bold text-lg text-gray-900">Add Card</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Search for your bank (e.g., "Chase") to auto-fill card details using AI. If the AI is busy, or for custom cards, you can enter details manually and upload warranty PDFs.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
             <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
               </svg>
             </div>
             <h3 className="font-bold text-lg text-gray-900">Ask AI</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            The core feature. Enter what you are buying (e.g., "iPhone") and where (e.g., "Apple Store"). The AI recommends the best card from your wallet and simultaneously checks for "Stacking Opportunities" (extra cashback from Rakuten or PayPal) to help you double-dip on rewards.
          </p>
        </div>

      </div>
    </div>
  );
};

// --- Card Detail Modal with Edit/Refresh/Delete ---
const CardDetailModal: React.FC<{ 
  card: CreditCard, 
  onClose: () => void,
  onUpdate: (c: CreditCard) => void,
  onDelete: (id: string) => void
}> = ({ card, onClose, onUpdate, onDelete }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [manualText, setManualText] = useState(card.manualDetails || '');
  const [editHolderName, setEditHolderName] = useState(card.holderName || '');
  const [editNickName, setEditNickName] = useState(card.nickName || ''); // Changed from editLastFour
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Sync state when card prop updates
  useEffect(() => {
    setEditHolderName(card.holderName || '');
    setEditNickName(card.nickName || ''); // Changed from lastFour
    setManualText(card.manualDetails || '');
  }, [card]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const details = await fetchCardDetails(card.cardName, card.bankName);
      const updatedCard: CreditCard = {
        ...card,
        ...details,
        rewards: details.rewards || card.rewards,
        benefits: details.benefits || card.benefits,
        lastRefreshed: new Date().toISOString()
      };
      onUpdate(updatedCard);
    } catch (e) {
      alert("Failed to refresh card details.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const confirmDelete = () => {
    if (confirm(`Delete ${card.bankName} ${card.cardName}?`)) {
      onDelete(card.id);
    }
  };

  const handleSaveEdits = async () => {
    setIsSavingEdit(true);
    
    // Process new files into Base64 for DB storage
    const newDocs: CardDocument[] = [];
    for (const f of newFiles) {
      const base64 = await readFileAsBase64(f);
      newDocs.push({
        id: crypto.randomUUID(),
        name: f.name,
        type: f.type.includes('pdf') ? 'pdf' : 'text',
        content: base64, // Store actual file
        dateAdded: new Date().toISOString()
      });
    }

    const updatedCard: CreditCard = {
      ...card,
      holderName: editHolderName,
      nickName: editNickName, // Changed from lastFour
      manualDetails: manualText,
      documents: [...(card.documents || []), ...newDocs]
    };
    
    await onUpdate(updatedCard);
    setIsSavingEdit(false);
    setIsEditing(false);
    setNewFiles([]);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto transition-opacity" onClick={onClose} />
      
      <div className="bg-gradient-to-b from-white to-gray-50 w-full h-[92%] sm:h-[90%] sm:w-[400px] sm:rounded-3xl rounded-t-3xl shadow-2xl z-50 overflow-hidden flex flex-col pointer-events-auto transform transition-transform duration-300 animate-fade-in-up">
        
        {/* Header */}
        <div className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
           <div className="flex flex-col">
             <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">{card.network}</span>
             <h2 className="text-lg font-bold text-gray-900 truncate max-w-[250px]">{card.bankName} {card.cardName}</h2>
           </div>
           <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 hover:scale-105 transition-all">
             ✕
           </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6 flex-1 no-scrollbar">
           {/* Card Preview (Live update during edit) */}
           <div className="shadow-2xl rounded-2xl scale-[0.98]">
             <CreditCardView card={{...card, holderName: editHolderName, nickName: editNickName}} />
           </div>
           
           <div className="text-center text-[10px] text-gray-400 font-medium">
             Type: <span className="text-gray-600 font-bold">{card.network}</span> • Last Updated: {card.lastRefreshed ? new Date(card.lastRefreshed).toLocaleDateString() : 'N/A'}
           </div>

           {/* Controls */}
           {!isEditing ? (
             <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 py-3 rounded-xl font-bold text-xs active:scale-95 transition-all"
                >
                  {isRefreshing ? <span className="animate-spin text-sm">⟳</span> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                  {isRefreshing ? 'Updating...' : 'Refresh AI Data'}
                </button>
                
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold text-xs active:scale-95 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Edit Notes & Info
                </button>
             </div>
           ) : (
             <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-4 animate-fade-in-up">
                <div className="grid grid-cols-2 gap-3">
                   <div className="col-span-2">
                      <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Name on Card</label>
                      <input 
                        type="text" 
                        value={editHolderName}
                        onChange={(e) => setEditHolderName(e.target.value.toUpperCase())}
                        className="w-full text-sm p-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-400 outline-none uppercase"
                        placeholder="YOUR NAME"
                      />
                   </div>
                   <div className="col-span-2">
                      <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Card Nickname</label>
                      <input 
                        type="text" 
                        value={editNickName}
                        onChange={(e) => setEditNickName(e.target.value)}
                        className="w-full text-sm p-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-400 outline-none uppercase"
                        placeholder="e.g. DINING CARD"
                      />
                   </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-800 uppercase mb-2">Manual Notes / Benefits</label>
                  <textarea 
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    className="w-full text-sm p-3 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-400 outline-none h-20"
                    placeholder="Paste benefit updates or warranty text here..."
                  />
                </div>
                <div>
                   <label className="block text-xs font-bold text-blue-800 uppercase mb-2">Upload Files</label>
                   <input type="file" multiple onChange={(e) => e.target.files && setNewFiles(Array.from(e.target.files))} className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"/>
                   {newFiles.length > 0 && <div className="text-xs text-blue-600 mt-2">{newFiles.length} file(s) ready to save</div>}
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleSaveEdits} disabled={isSavingEdit} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold text-xs hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                    {isSavingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button onClick={() => { setIsEditing(false); setEditHolderName(card.holderName || ''); setEditNickName(card.nickName || ''); setManualText(card.manualDetails || ''); setNewFiles([]); }} className="px-4 py-2 text-gray-500 font-bold text-xs hover:text-gray-700">Cancel</button>
                </div>
             </div>
           )}

           {/* Details Content */}
           <div className="space-y-6">
              <section>
                 <div className="flex items-center gap-2 mb-3">
                   <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                   <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Rewards</h3>
                 </div>
                 <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {card.rewards && card.rewards.length > 0 ? (
                      card.rewards.map((r, i) => (
                        <div key={i} className="p-4 border-b border-gray-100 last:border-0 flex justify-between items-center group hover:bg-blue-50/50 transition-colors">
                           <span className="text-sm text-gray-700 font-medium group-hover:text-gray-900">{r.category}</span>
                           <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">{r.rate}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-gray-400 italic">No specific reward data loaded.</div>
                    )}
                 </div>
              </section>

              <section>
                 <div className="flex items-center gap-2 mb-3">
                   <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                   <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Key Benefits</h3>
                 </div>
                 <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-4 space-y-4">
                    {card.benefits && card.benefits.length > 0 ? (
                      card.benefits.map((b, i) => (
                        <div key={i} className="text-sm">
                           <div className="font-bold text-gray-800">{b.title}</div>
                           <div className="text-gray-500 text-xs leading-relaxed mt-1">{b.description}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-400 italic">No specific benefits loaded.</div>
                    )}
                 </div>
              </section>

              {(card.manualDetails || (card.documents && card.documents.length > 0)) && (
                 <section>
                   <div className="flex items-center gap-2 mb-3">
                     <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                     <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">My Notes & Docs</h3>
                   </div>
                   <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
                      {card.manualDetails && <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{card.manualDetails}</p>}
                      
                      {card.documents && card.documents.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-2">
                           {card.documents.map((d, i) => (
                             <div key={i} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer" title="Stored in Database">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <span className="text-xs text-gray-600 truncate max-w-[150px]">{d.name}</span>
                             </div>
                           ))}
                        </div>
                      )}
                   </div>
                 </section>
              )}
              
              <div className="pt-4 border-t border-gray-200/50">
                 <button 
                  onClick={confirmDelete}
                  className="w-full text-center text-red-500 text-xs font-bold py-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Remove Card from Wallet
                </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};


const AddCardView: React.FC<{ onAdd: (c: CreditCard) => void, onCancel: () => void }> = ({ onAdd, onCancel }) => {
  const [mode, setMode] = useState<'search' | 'manual'>('search');
  const [step, setStep] = useState<1 | 2>(1); // 1: Search/Input, 2: Details/Confirm
  
  // Search Mode State
  const [bankQuery, setBankQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundCards, setFoundCards] = useState<string[]>([]);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  
  // Shared/Manual State
  const [draftCard, setDraftCard] = useState<Partial<CreditCard>>({});
  const [inputHolderName, setInputHolderName] = useState('');
  const [inputNickName, setInputNickName] = useState(''); // Changed from inputLastFour
  
  // Manual Documents/Text
  const [manualText, setManualText] = useState('');
  const [manualFiles, setManualFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleSearch = async () => {
    if (!bankQuery.trim()) return;
    setIsSearching(true);
    const results = await searchCardsByBank(bankQuery);
    setFoundCards(results);
    setIsSearching(false);
  };

  const handleSelectCard = async (cardName: string) => {
    setIsFetchingDetails(true);
    try {
      const details = await fetchCardDetails(cardName, bankQuery);
      setDraftCard({
        ...details,
        bankName: bankQuery,
        cardName: cardName,
        holderName: '',
        nickName: '' // Changed from lastFour
      });
      setStep(2);
    } catch (e) {
      alert("Could not fetch details. Please try again or use Manual Mode.");
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const initManualMode = () => {
    setMode('manual');
    setDraftCard({
      bankName: '',
      cardName: '',
      network: CardType.VISA,
      colorTheme: '#333333',
      rewards: [],
      benefits: []
    });
    setStep(2);
  };

  const handleManualFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setManualFiles(Array.from(e.target.files));
    }
  };

  const handleFinalizeAdd = async () => {
    if (!inputNickName || !inputHolderName) return; // Changed inputLastFour check
    if (mode === 'manual' && (!draftCard.bankName || !draftCard.cardName)) return;

    setIsSaving(true);

    // Create Document objects for files with actual content
    const docs: CardDocument[] = [];
    for (const f of manualFiles) {
      const base64 = await readFileAsBase64(f);
      docs.push({
        id: crypto.randomUUID(),
        name: f.name,
        type: f.type.includes('pdf') ? 'pdf' : 'text',
        content: base64, // Store file content in DB
        dateAdded: new Date().toISOString()
      });
    }

    const newCard: CreditCard = {
      id: crypto.randomUUID(),
      bankName: draftCard.bankName!,
      cardName: draftCard.cardName!,
      network: draftCard.network!,
      colorTheme: draftCard.colorTheme!,
      rewards: draftCard.rewards || [],
      benefits: draftCard.benefits || [],
      holderName: inputHolderName,
      nickName: inputNickName, // Changed from lastFour
      manualDetails: manualText, // Store the pasted policy text
      documents: docs
    };
    
    await onAdd(newCard);
    setIsSaving(false);
  };

  // --- RENDER SEARCH STEP ---
  if (step === 1 && mode === 'search') {
    return (
      <div className="px-6 py-4 h-full flex flex-col max-w-lg mx-auto w-full">
         <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Add Card</h2>
          <button onClick={onCancel} className="text-blue-600 font-bold text-sm">Cancel</button>
        </div>
  
        <div className="space-y-4">
          <label className="block text-sm font-bold text-gray-700">Bank or Merchant Name <span className="text-gray-400 font-normal text-xs">(e.g. Chase or Macy's)</span></label>
          <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="e.g. Chase, Macy's"
                className="flex-1 bg-white border border-gray-200 shadow-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                value={bankQuery}
                onChange={(e) => setBankQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button 
                onClick={handleSearch}
                disabled={isSearching || !bankQuery}
                className="bg-blue-600 text-white px-5 rounded-xl font-bold shadow-lg shadow-blue-200 disabled:opacity-50 active:scale-95 transition-all"
              >
                {isSearching ? '...' : 'Go'}
              </button>
          </div>
        </div>

        <div className="mt-5">
          <button onClick={initManualMode} className="text-sm text-blue-600 underline font-medium">
             Cannot find your card? Add Manually
          </button>
        </div>
  
        <div className="mt-8 flex-1 overflow-y-auto no-scrollbar">
          {isSearching && (
            <div className="flex flex-col items-center justify-center h-40 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-gray-500 text-sm font-medium">Identifying available card types...</p>
            </div>
          )}

          {isFetchingDetails && (
             <div className="flex flex-col items-center justify-center h-40 space-y-3">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
               <p className="text-gray-500 text-sm font-medium text-center max-w-xs">Fetching reward and benefit details of the card and card type from available resources...</p>
             </div>
          )}

          {!isFetchingDetails && !isSearching && foundCards.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Select your card</h3>
              {foundCards.map((cardName) => (
                <button 
                  key={cardName}
                  onClick={() => handleSelectCard(cardName)}
                  className="w-full text-left bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-blue-300 hover:shadow-md active:bg-blue-50 transition-all flex justify-between items-center group"
                >
                  <span className="font-semibold text-gray-900 group-hover:text-blue-700">{cardName}</span>
                  <span className="text-gray-300 group-hover:text-blue-500">→</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- RENDER DETAILS / MANUAL STEP ---
  return (
    <div className="px-6 py-4 h-full flex flex-col max-w-lg mx-auto w-full">
       <div className="flex justify-between items-center mb-6">
        <button onClick={() => { setStep(1); setMode('search'); }} className="text-blue-600 font-bold text-sm flex items-center hover:underline">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        <h2 className="text-lg font-bold text-gray-900">{mode === 'manual' ? 'Manual Entry' : 'Card Details'}</h2>
        <div className="w-12"></div>
      </div>

      <div className="mb-8 transform scale-100 origin-top shadow-xl rounded-2xl w-full max-w-sm mx-auto">
        <CreditCardView card={{...draftCard, holderName: inputHolderName || 'YOUR NAME', nickName: inputNickName || 'NICKNAME'}} />
      </div>

      <div className="space-y-5 flex-1 overflow-y-auto no-scrollbar pb-10">
        
        {/* Manual Fields if in Manual Mode */}
        {mode === 'manual' && (
          <div className="grid grid-cols-2 gap-4">
             <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bank or Merchant Name</label>
                <input 
                  type="text" 
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={draftCard.bankName}
                  onChange={(e) => setDraftCard({...draftCard, bankName: e.target.value})}
                />
             </div>
             <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Card Name</label>
                <input 
                  type="text" 
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={draftCard.cardName}
                  onChange={(e) => setDraftCard({...draftCard, cardName: e.target.value})}
                />
             </div>
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Network</label>
                <select 
                   className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 shadow-sm"
                   value={draftCard.network}
                   onChange={(e) => setDraftCard({...draftCard, network: e.target.value as CardType})}
                >
                  {Object.values(CardType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
             </div>
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Color (Hex)</label>
                <input 
                  type="color" 
                  className="w-full h-[42px] bg-white border border-gray-200 rounded-lg p-1 shadow-sm cursor-pointer"
                  value={draftCard.colorTheme}
                  onChange={(e) => setDraftCard({...draftCard, colorTheme: e.target.value})}
                />
             </div>
          </div>
        )}

        {/* Standard User Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name on Card</label>
            <input 
              type="text" 
              placeholder="JOHN APPLESEED"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 uppercase shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={inputHolderName}
              onChange={(e) => setInputHolderName(e.target.value.toUpperCase())}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Card Nickname (e.g. GAS CARD)</label>
            <input 
              type="text" 
              placeholder="MY TRAVEL CARD"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 uppercase shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={inputNickName}
              onChange={(e) => setInputNickName(e.target.value)}
            />
          </div>
        </div>
        
        {/* Documents / Plain Text Upload Section */}
        <div className="border-t border-gray-200 pt-5 mt-4">
           <h3 className="text-sm font-bold text-gray-900 mb-2">Rewards & Policy Info <span className="text-gray-400 font-normal text-xs">(Optional)</span></h3>
           <p className="text-xs text-gray-500 mb-4 leading-relaxed">
             {mode === 'manual' 
               ? "Since we can't fetch details automatically, please upload PDFs or paste the rewards/benefits text below so our AI can recommend this card correctly." 
               : "Add extra details (like specific warranty terms) to help the AI."}
           </p>

           <div className="space-y-4">
              {/* File Upload Simulation */}
              <div className="relative border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center hover:bg-gray-50 hover:border-blue-400 transition-all group">
                 <input 
                    type="file" 
                    multiple 
                    accept=".pdf,.txt,.doc"
                    onChange={handleManualFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                 />
                 <div className="flex flex-col items-center group-hover:scale-105 transition-transform">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mb-2">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    </div>
                    <span className="text-xs font-bold text-gray-700">Upload PDF or Documents</span>
                    {manualFiles.length > 0 ? (
                      <div className="mt-2 text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded-full">
                        {manualFiles.length} file(s) selected (Saved to DB)
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400 mt-1">Tap to browse (Saved to DB)</span>
                    )}
                 </div>
              </div>

              {/* Text Paste Area */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Paste Policy / Rewards Text <span className="text-gray-400 font-normal lowercase">(Optional)</span></label>
                <textarea
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm min-h-[100px] shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Paste text from your card agreement, warranty policy, or rewards structure here..."
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                />
              </div>
           </div>
        </div>

        <div className="pt-4 pb-8">
          <Button 
            onClick={handleFinalizeAdd} 
            disabled={!inputHolderName || !inputNickName || (mode === 'manual' && !draftCard.cardName) || isSaving}
            isLoading={isSaving}
          >
            {isSaving ? 'Saving to Database...' : 'Save to Wallet'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const RecommendView: React.FC<{ cards: CreditCard[], onViewChange: (v: AppView) => void }> = ({ cards, onViewChange }) => {
  const [item, setItem] = useState('');
  const [merchant, setMerchant] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Market Recommendation State
  const [marketRec, setMarketRec] = useState<MarketRecommendation | null>(null);
  const [isMarketLoading, setIsMarketLoading] = useState(false);
  const [showMarketModal, setShowMarketModal] = useState(false);
  
  // Empty Wallet State
  const [showEmptyWalletOption, setShowEmptyWalletOption] = useState(false);

  const handleAsk = async () => {
    if (!item.trim() || !merchant.trim()) return;
    setIsLoading(true);
    setResult(null);
    setMarketRec(null);
    setErrorMsg('');
    setShowEmptyWalletOption(false);

    if (cards.length === 0) {
        setShowEmptyWalletOption(true);
        setIsLoading(false);
        return;
    }

    const query = `Buying "${item}" at "${merchant}" (${isOnline ? 'Online Transaction' : 'In-Person/Physical Store'})`;
    
    const rec = await recommendBestCard(query, cards);
    if (rec) {
      setResult(rec);
    } else {
      setErrorMsg("AI service is currently busy or unavailable. Please check your card benefits manually.");
    }
    setIsLoading(false);
  };

  const handleFindBetterCard = async () => {
    if (!result || !purchaseAmount) return;
    setIsMarketLoading(true);
    setShowMarketModal(true); // Open modal immediately to show loading state

    const currentCard = cards.find(c => c.id === result.cardId);
    const cardName = currentCard ? `${currentCard.bankName} ${currentCard.cardName}` : "Generic Credit Card";
    const query = `Buying "${item}" at "${merchant}"`;

    const marketResult = await findBetterMarketCard(query, purchaseAmount, cardName);
    setMarketRec(marketResult);
    setIsMarketLoading(false);
  };
  
  const handleEmptyWalletMarketSearch = async () => {
    setIsMarketLoading(true);
    setShowMarketModal(true);

    const query = `Buying "${item}" at "${merchant}"`;
    const amountVal = purchaseAmount || '100'; // Default if empty

    const marketResult = await findBetterMarketCard(query, amountVal, "Paying with Cash");
    setMarketRec(marketResult);
    setIsMarketLoading(false);
  }

  const clearResult = () => {
    setResult(null);
    setErrorMsg('');
    setItem('');
    setMerchant('');
    setPurchaseAmount('');
    setMarketRec(null);
    setShowMarketModal(false);
    setShowEmptyWalletOption(false);
  }

  // Generic helper to parse percentages from AI strings and calculate dollar value
  const calculateCashbackValue = (percentageString: string | undefined, amountStr: string) => {
    if (!percentageString || !amountStr) return null;
    const amt = parseFloat(amountStr);
    if (isNaN(amt) || amt <= 0) return null;

    // Regex to find a number followed by %
    const regex = /(\d+(\.\d+)?)%/;
    const match = percentageString.match(regex);
    
    if (match) {
        const percentage = parseFloat(match[1]);
        const value = (amt * percentage) / 100;
        return value.toFixed(2);
    }
    return null;
  };

  const estimatedTotalEarnings = result?.optimizationAnalysis?.totalPotentialReturn 
      ? calculateCashbackValue(result.optimizationAnalysis.totalPotentialReturn, purchaseAmount) 
      : null;

  const estimatedCardEarnings = result?.estimatedReward
      ? calculateCashbackValue(result.estimatedReward, purchaseAmount)
      : null;

  const isHighValuePurchase = purchaseAmount && parseFloat(purchaseAmount) > 500;

  return (
    <div className="px-6 py-12 flex flex-col h-full relative max-w-lg mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600">Ask AI-Smart Pay</h1>
        {(result || errorMsg || showEmptyWalletOption) && (
          <button onClick={clearResult} className="text-sm text-blue-600 font-bold hover:underline">New Search</button>
        )}
      </div>
      
      {!result && !errorMsg && !showEmptyWalletOption ? (
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 mb-8 space-y-5 animate-fade-in-up">
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Product or Service</label>
            <input
              type="text"
              className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
              placeholder="e.g. Groceries, Flight, Laptop"
              value={item}
              onChange={(e) => setItem(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Merchant or Place</label>
            <input
              type="text"
              className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
              placeholder="e.g. Whole Foods, Delta, Best Buy"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
            />
          </div>

          <div>
             <label className="block text-sm font-bold text-gray-700 mb-2">Transaction Type</label>
             <div className="flex bg-gray-100 p-1.5 rounded-xl">
                <button 
                  onClick={() => setIsOnline(false)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${!isOnline ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  In-Store / Physical
                </button>
                <button 
                  onClick={() => setIsOnline(true)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${isOnline ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Online
                </button>
             </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Purchase Amount ($) <span className="text-gray-400 font-normal">(Optional)</span></label>
            <div className="relative">
                <span className="absolute left-4 top-3.5 text-gray-500 font-bold">$</span>
                <input
                type="number"
                className="w-full bg-gray-50 border-0 rounded-xl pl-8 pr-4 py-3.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
                placeholder="0.00"
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(e.target.value)}
                />
            </div>
            <p className="text-[10px] text-gray-500 mt-2 ml-1">Enter purchase amount to see estimated cashback earnings.</p>
          </div>

          <div className="mt-4 pt-2">
             <Button onClick={handleAsk} isLoading={isLoading} disabled={!item || !merchant}>Find Best Card</Button>
          </div>
        </div>
      ) : showEmptyWalletOption ? (
        <div className="animate-fade-in-up bg-blue-50 border border-blue-100 p-6 rounded-2xl text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
               <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-blue-800 font-bold mb-2">Wallet is Empty</h3>
            <p className="text-blue-600 text-sm mb-6">Since no card is available in your wallet, we cannot provide specific wallet recommendations. You can add a card or check for a general market recommendation.</p>
            
            <div className="space-y-3">
                <Button onClick={() => onViewChange(AppView.ADD_CARD)}>Add a Card</Button>
                <button 
                  onClick={handleEmptyWalletMarketSearch}
                  className="w-full bg-white text-blue-600 border border-blue-200 py-3.5 rounded-xl font-bold text-[17px] active:scale-[0.98] transition-all hover:bg-blue-50"
                >
                  Find Recommended Card
                </button>
            </div>
        </div>
      ) : errorMsg ? (
        <div className="animate-fade-in-up bg-red-50 border border-red-100 p-6 rounded-2xl text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
               <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-red-800 font-bold mb-2">Service Busy</h3>
            <p className="text-red-600 text-sm mb-4">{errorMsg}</p>
            <Button onClick={clearResult} variant="secondary">Try Again Later</Button>
        </div>
      ) : (
        <div className="animate-fade-in-up pb-10">
           <div className="flex items-center gap-2 mb-4">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
              <span className="text-xs font-bold text-green-600 uppercase tracking-widest">Recommendation Found</span>
           </div>
           
           {/* 1. Card & Stats Section (Top) */}
           <div className="transform transition-transform hover:scale-[1.02] duration-300">
             {result && result.cardId && (
               <CreditCardView card={cards.find(c => c.id === result.cardId) || {}} className="mb-4 shadow-2xl" />
             )}
             
             {/* Card Stats Box */}
             <div className="flex justify-between items-center bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 shadow-sm">
                 <div>
                    <div className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-0.5">Card Rewards</div>
                    <div className="text-lg font-black text-blue-900">{result?.estimatedReward || "Standard Rate"}</div>
                 </div>
                 {estimatedCardEarnings && (
                    <div className="text-right">
                         <div className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-0.5">Est. Cash</div>
                         <div className="text-lg font-black text-blue-900">${estimatedCardEarnings}</div>
                    </div>
                 )}
             </div>
           </div>

           {/* 2. Reasoning & Detail Section */}
           <div className="bg-white border border-gray-100 p-6 rounded-3xl relative overflow-hidden shadow-sm space-y-4 mb-6">
              <div className="relative z-10">
                <h3 className="text-gray-900 font-bold text-sm uppercase tracking-wide mb-2">Why this card?</h3>
                <p className="text-gray-700 text-base font-medium leading-relaxed mb-4">
                  {result?.reasoning}
                </p>
              </div>

               {/* Sources */}
               {result?.sources && result.sources.length > 0 && (
                <div className="relative z-10 pt-4 mt-2 border-t border-gray-100">
                   <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Verified Sources</h4>
                   <div className="flex flex-wrap gap-2">
                     {result.sources.map((s, i) => (
                       <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-gray-50 border border-gray-200 px-2 py-1 rounded-md text-gray-500 hover:text-blue-600 hover:border-blue-300 truncate max-w-[150px]">
                         {s.title}
                       </a>
                     ))}
                   </div>
                </div>
              )}
           </div>

           {/* 3. Stacking Offers (Middle) */}
           {result?.stackingInfo && (
              <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100 mb-6 shadow-sm">
                <h3 className="text-purple-700 font-bold text-sm uppercase tracking-wide mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Extra Offers Found
                </h3>
                <p className="text-purple-900 text-sm font-medium leading-relaxed">
                  {result.stackingInfo}
                </p>
              </div>
           )}
           
           {/* 4. Maximize Your Savings Dashboard (Bottom Summary) */}
           {result?.optimizationAnalysis && (
             <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 p-6 rounded-3xl mb-6 relative overflow-hidden shadow-sm">
                 <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4 pb-4 border-b border-emerald-100/50">
                       <span className="text-xl">💰</span>
                       <h3 className="text-emerald-900 font-extrabold text-lg tracking-tight">Maximize Your Savings</h3>
                    </div>
                    
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1">Total Potential Return</div>
                            <div className="text-3xl font-black text-emerald-800 tracking-tight leading-none">
                                {result.optimizationAnalysis.totalPotentialReturn}
                            </div>
                        </div>
                        {estimatedTotalEarnings && (
                            <div className="text-right bg-white/60 px-3 py-2 rounded-xl border border-emerald-100/50 backdrop-blur-sm">
                                <div className="text-[10px] font-bold text-emerald-600 uppercase mb-0.5">Total Est. Cash</div>
                                <div className="text-xl font-black text-emerald-700 leading-none">${estimatedTotalEarnings}</div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                       {result.optimizationAnalysis.stepsToMaximize.map((step, idx) => (
                         <div key={idx} className="flex items-start gap-3 bg-white/60 p-3 rounded-xl border border-emerald-100/50">
                            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                               {idx + 1}
                            </div>
                            <p className="text-sm text-emerald-900 font-medium leading-tight">{step}</p>
                         </div>
                       ))}
                    </div>
                 </div>
                 {/* Decoration */}
                 <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-400/10 rounded-full blur-2xl"></div>
             </div>
           )}

           {/* High Value Purchase - Apply for New Card Banner - Bottom */}
           {isHighValuePurchase && (
              <div className="mb-6 animate-fade-in-up delay-200">
                  <button 
                    onClick={handleFindBetterCard}
                    className="w-full bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100 border border-amber-200 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] group relative overflow-hidden"
                  >
                     <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                          </div>
                          <div className="text-left">
                            <h3 className="font-bold text-amber-900 text-sm">Large Purchase Alert</h3>
                            <p className="text-xs text-amber-700 mt-0.5">You could earn a bigger bonus on this purchase.</p>
                          </div>
                        </div>
                        <span className="bg-amber-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-sm group-hover:bg-amber-600 transition-colors">Find Better Card</span>
                     </div>
                     <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-300/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                  </button>
              </div>
            )}
        </div>
      )}

      {/* Market Recommendation Modal - UPDATED FOR MOBILE SCROLLING */}
      {showMarketModal && (
          <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 sm:p-4">
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowMarketModal(false)}></div>
              
              <div className="relative w-full max-w-sm max-h-[85vh] flex flex-col bg-gradient-to-b from-amber-50 to-white rounded-3xl shadow-2xl animate-fade-in-up border border-amber-100 overflow-hidden">
                  
                  {isMarketLoading ? (
                      <div className="flex flex-col items-center justify-center py-10 h-64">
                          <div className="w-12 h-12 border-4 border-amber-300 border-t-amber-600 rounded-full animate-spin mb-4"></div>
                          <h3 className="text-amber-800 font-bold">Scanning Credit Card Market...</h3>
                          <p className="text-amber-600 text-xs mt-2">Checking Sign-Up Bonuses & Benefits</p>
                      </div>
                  ) : marketRec ? (
                      <div className="flex flex-col h-full">
                          {/* Header - Fixed at top */}
                          <div className="flex justify-between items-start p-6 pb-2 shrink-0 bg-amber-50">
                             <div>
                                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Market Recommendation</span>
                                <h2 className="text-xl font-bold text-gray-900 mt-1 leading-tight">{marketRec.bankName}</h2>
                                <h3 className="text-sm text-gray-700 font-medium">{marketRec.cardName}</h3>
                             </div>
                             <button onClick={() => setShowMarketModal(false)} className="bg-white hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center text-gray-500 shadow-sm border border-gray-100">✕</button>
                          </div>

                          {/* Scrollable Body */}
                          <div className="overflow-y-auto p-6 pt-2 no-scrollbar">
                              <div className="bg-amber-100 text-amber-900 p-4 rounded-2xl mb-5 border border-amber-200 shadow-sm">
                                  <h4 className="font-bold text-lg mb-1 leading-tight">{marketRec.headline}</h4>
                              </div>

                              <div className="space-y-4 mb-6">
                                  <div>
                                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Why it beats your current card</h4>
                                      <p className="text-sm text-gray-800 font-medium leading-relaxed">{marketRec.whyBetter}</p>
                                  </div>
                                  
                                  <div>
                                     <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Benefits for this purchase</h4>
                                     <ul className="space-y-2">
                                         {marketRec.benefitsForThisPurchase.map((b, i) => (
                                             <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                                <span className="text-green-500 font-bold mt-0.5">✓</span> 
                                                <span className="leading-snug">{b}</span>
                                             </li>
                                         ))}
                                     </ul>
                                  </div>
                              </div>

                              <a 
                                 href={`https://www.google.com/search?q=${encodeURIComponent(marketRec.applySearchQuery)}`}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="block w-full bg-gray-900 text-white text-center py-3.5 rounded-xl font-bold text-sm shadow-lg hover:bg-black transition-colors"
                              >
                                 Apply / View Offer
                              </a>
                              <p className="text-[10px] text-gray-400 text-center mt-3">Links to Google Search for security.</p>
                          </div>
                      </div>
                  ) : (
                      <div className="text-center py-10 px-6">
                          <p className="text-gray-500 mb-4">Could not find a better market recommendation at this time.</p>
                          <button onClick={() => setShowMarketModal(false)} className="bg-gray-100 px-6 py-2 rounded-xl text-gray-700 font-bold text-sm">Close</button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Legal Disclaimer Footer */}
      <div className="mt-auto pt-6 px-4 pb-2">
        <p className="text-[10px] text-gray-400 text-center leading-relaxed">
          Disclaimer: Recommendations provided by AI-Smart Pay are based on available public information and AI analysis. They may not reflect real-time changes in bank policies or specific user agreements. Users should verify details with their card issuer. Use at your own risk.
        </p>
      </div>
    </div>
  );
};
