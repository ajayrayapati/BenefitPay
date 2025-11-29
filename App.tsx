import React, { useState, useEffect } from 'react';
import { AppView, CreditCard } from './types';
import { searchCardsByBank, fetchCardDetails, recommendBestCard } from './services/geminiService';
import { CreditCardView } from './components/CreditCardView';
import { TabBar } from './components/TabBar';
import { Button } from './components/Button';

// Mock data for initial state or empty state
const INITIAL_CARDS: CreditCard[] = [];

export default function App() {
  const [view, setView] = useState<AppView>(AppView.WALLET);
  const [cards, setCards] = useState<CreditCard[]>(INITIAL_CARDS);
  
  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('cardwiz_wallet');
    if (saved) {
      try {
        setCards(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load cards", e);
      }
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('cardwiz_wallet', JSON.stringify(cards));
  }, [cards]);

  const addCard = (newCard: CreditCard) => {
    setCards(prev => [...prev, newCard]);
    setView(AppView.WALLET);
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7]">
      <main className="flex-1 overflow-y-auto no-scrollbar pb-[100px]">
        {view === AppView.WALLET && <WalletView cards={cards} onChangeView={setView} />}
        {view === AppView.ADD_CARD && <AddCardView onAdd={addCard} onCancel={() => setView(AppView.WALLET)} />}
        {view === AppView.RECOMMEND && <RecommendView cards={cards} />}
      </main>
      
      <TabBar currentView={view} onChange={setView} />
    </div>
  );
}

// --- Sub-Views ---

const WalletView: React.FC<{ cards: CreditCard[], onChangeView: (v: AppView) => void }> = ({ cards, onChangeView }) => {
  return (
    <div className="px-6 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Wallet</h1>
        <div className="bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center">
            <span className="text-xs font-bold text-gray-500">{cards.length}</span>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 text-center space-y-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-800">No cards yet</h3>
          <p className="text-gray-500 max-w-[200px]">Add your credit cards to start getting smart recommendations.</p>
          <div className="pt-4 w-full max-w-[200px]">
             <Button onClick={() => onChangeView(AppView.ADD_CARD)}>Add First Card</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {cards.map((card) => (
            <CreditCardView key={card.id} card={card} />
          ))}
          <div className="h-4"></div>
        </div>
      )}
    </div>
  );
};

const AddCardView: React.FC<{ onAdd: (c: CreditCard) => void, onCancel: () => void }> = ({ onAdd, onCancel }) => {
  const [step, setStep] = useState<1 | 2>(1); // 1: Search, 2: Details
  const [bankQuery, setBankQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundCards, setFoundCards] = useState<string[]>([]);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  
  // Step 2 State
  const [draftCard, setDraftCard] = useState<Partial<CreditCard>>({});
  const [inputHolderName, setInputHolderName] = useState('');
  const [inputLastFour, setInputLastFour] = useState('');

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
        lastFour: ''
      });
      setStep(2);
    } catch (e) {
      alert("Could not fetch details. Please try again.");
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const handleFinalizeAdd = () => {
    if (!inputLastFour || !inputHolderName) return;

    const newCard: CreditCard = {
      id: crypto.randomUUID(),
      bankName: draftCard.bankName!,
      cardName: draftCard.cardName!,
      network: draftCard.network!,
      colorTheme: draftCard.colorTheme!,
      rewards: draftCard.rewards!,
      benefits: draftCard.benefits!,
      holderName: inputHolderName,
      lastFour: inputLastFour
    };
    onAdd(newCard);
  };

  // Render Step 1: Search & List
  if (step === 1) {
    return (
      <div className="px-6 py-8 h-full flex flex-col">
         <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Add Card</h2>
          <button onClick={onCancel} className="text-blue-500 font-medium">Cancel</button>
        </div>
  
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Bank Name</label>
          <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="e.g. Chase, Amex, Capital One"
                className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
                value={bankQuery}
                onChange={(e) => setBankQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button 
                onClick={handleSearch}
                disabled={isSearching || !bankQuery}
                className="bg-blue-600 text-white px-4 rounded-xl font-medium disabled:opacity-50"
              >
                {isSearching ? '...' : 'Go'}
              </button>
          </div>
        </div>
  
        <div className="mt-8 flex-1 overflow-y-auto no-scrollbar">
          {isFetchingDetails && (
            <div className="flex flex-col items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-500 text-sm">Fetching card styling & rewards...</p>
            </div>
          )}
          {!isFetchingDetails && foundCards.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Select your card</h3>
              {foundCards.map((cardName) => (
                <button 
                  key={cardName}
                  onClick={() => handleSelectCard(cardName)}
                  className="w-full text-left bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 active:bg-blue-50 transition-colors flex justify-between items-center"
                >
                  <span className="font-medium text-gray-900">{cardName}</span>
                  <span className="text-gray-300">→</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render Step 2: Details
  return (
    <div className="px-6 py-8 h-full flex flex-col">
       <div className="flex justify-between items-center mb-6">
        <button onClick={() => setStep(1)} className="text-blue-500 font-medium flex items-center">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        <h2 className="text-lg font-bold">Card Details</h2>
        <div className="w-12"></div>
      </div>

      <div className="mb-8 transform scale-95 origin-top">
        <CreditCardView card={{...draftCard, holderName: inputHolderName || 'YOUR NAME', lastFour: inputLastFour || '••••'}} />
      </div>

      <div className="space-y-6 flex-1">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Name on Card</label>
          <input 
            type="text" 
            placeholder="JOHN APPLESEED"
            className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
            value={inputHolderName}
            onChange={(e) => setInputHolderName(e.target.value.toUpperCase())}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Last 4 Digits</label>
          <input 
            type="tel" 
            maxLength={4}
            placeholder="1234"
            className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono tracking-widest"
            value={inputLastFour}
            onChange={(e) => setInputLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
        </div>

        <div className="pt-4">
          <Button 
            onClick={handleFinalizeAdd} 
            disabled={!inputHolderName || inputLastFour.length < 4}
          >
            Add to Wallet
          </Button>
        </div>
      </div>
    </div>
  );
};

const RecommendView: React.FC<{ cards: CreditCard[] }> = ({ cards }) => {
  const [item, setItem] = useState('');
  const [merchant, setMerchant] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ card: CreditCard, reasoning: string, reward?: string } | null>(null);

  const handleAsk = async () => {
    if (!item.trim() || !merchant.trim() || cards.length === 0) return;
    setIsLoading(true);
    setResult(null);

    const query = `Buying "${item}" at "${merchant}" (${isOnline ? 'Online Transaction' : 'In-Person/Physical Store'})`;
    
    const rec = await recommendBestCard(query, cards);
    if (rec) {
      const winningCard = cards.find(c => c.id === rec.cardId);
      if (winningCard) {
        setResult({
          card: winningCard,
          reasoning: rec.reasoning,
          reward: rec.estimatedReward
        });
      }
    }
    setIsLoading(false);
  };

  const clearResult = () => {
    setResult(null);
    setItem('');
    setMerchant('');
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center">
         <p className="text-gray-500">Add cards to your wallet to enable Smart Recommendations.</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-12 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Ask CardWiz</h1>
        {result && (
          <button onClick={clearResult} className="text-sm text-blue-500 font-medium">New Search</button>
        )}
      </div>
      
      {!result ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8 space-y-5">
          
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">What are you buying?</label>
            <input
              type="text"
              className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              placeholder="e.g. Groceries, Flight, Laptop"
              value={item}
              onChange={(e) => setItem(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Where (Merchant)?</label>
            <input
              type="text"
              className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              placeholder="e.g. Whole Foods, Delta, Best Buy"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
            />
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-600 mb-2">Transaction Type</label>
             <div className="flex bg-gray-100 p-1 rounded-xl">
                <button 
                  onClick={() => setIsOnline(false)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${!isOnline ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  In-Store
                </button>
                <button 
                  onClick={() => setIsOnline(true)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${isOnline ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Online
                </button>
             </div>
          </div>

          <div className="mt-4 pt-2">
             <Button onClick={handleAsk} isLoading={isLoading} disabled={!item || !merchant}>Find Best Card</Button>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in-up">
           <div className="flex items-center gap-2 mb-4">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Best Match</span>
           </div>
           
           <CreditCardView card={result.card} className="mb-6 shadow-2xl" />
           
           <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-blue-900 text-lg font-medium leading-relaxed mb-3">
                  {result.reasoning}
                </p>
                {result.reward && (
                  <div className="inline-flex items-center px-3 py-1 bg-white/60 backdrop-blur-sm border border-blue-200 text-blue-700 text-sm font-bold rounded-full shadow-sm">
                    ✨ {result.reward}
                  </div>
                )}
              </div>
              {/* Decoration */}
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-200 rounded-full opacity-20 blur-xl"></div>
           </div>
        </div>
      )}
    </div>
  );
};