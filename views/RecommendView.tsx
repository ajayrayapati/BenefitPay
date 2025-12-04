
import React, { useState } from 'react';
import { AppView, CreditCard, RecommendationResult, MarketRecommendation } from '../types';
import { recommendBestCard, findBetterMarketCard } from '../services/geminiService';
import { CreditCardView } from '../components/CreditCardView';
import { Button } from '../components/Button';
import { MaximizationDashboard } from '../components/MaximizationDashboard';
import { calculateCashbackValue, GENERIC_CARD } from '../utils/helpers';

export const RecommendView: React.FC<{ cards: CreditCard[], onViewChange: (v: AppView) => void }> = ({ cards, onViewChange }) => {
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

    // If wallet is empty, use GENERIC_CARD but still allow search
    const activeCards = cards.length > 0 ? cards : [GENERIC_CARD as CreditCard];
    
    // If it's truly empty (no cards), we track this to show the "Add Card" prompt later
    // But we still perform the search with the generic card to give results.
    const isEmptyWallet = cards.length === 0;

    const query = `Buying "${item}" at "${merchant}" (${isOnline ? 'Online Transaction' : 'In-Store/Physical'}) for amount $${purchaseAmount || '100'}`;
    
    try {
        const rec = await recommendBestCard(query, activeCards);
        if (rec) {
          setResult(rec);
          // If we used the generic card, ensure we show options to find a real card
          if (isEmptyWallet) setShowEmptyWalletOption(true);
        } else {
          setErrorMsg("AI service is currently busy or unavailable. Please check your card benefits manually.");
        }
    } catch (e: any) {
        setErrorMsg("An error occurred. Please try again.");
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

    try {
        const marketResult = await findBetterMarketCard(query, purchaseAmount, cardName);
        setMarketRec(marketResult);
    } catch (e: any) {
       console.error(e);
    }
    
    setIsMarketLoading(false);
  };
  
  const handleEmptyWalletMarketSearch = async () => {
    setIsMarketLoading(true);
    setShowMarketModal(true);

    const query = `Buying "${item}" at "${merchant}"`;
    const amountVal = purchaseAmount || '100'; // Default if empty

    try {
        const marketResult = await findBetterMarketCard(query, amountVal, "Paying with Cash");
        setMarketRec(marketResult);
    } catch (e: any) {
        console.error(e);
    }
    
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

  const estimatedCardEarnings = result?.estimatedReward
      ? calculateCashbackValue(result.estimatedReward, purchaseAmount)
      : null;

  const estimatedTotalEarnings = result?.optimizationAnalysis?.totalPotentialReturn && purchaseAmount
      ? calculateCashbackValue(result.optimizationAnalysis.totalPotentialReturn, purchaseAmount) 
      : null;

  const isHighValuePurchase = purchaseAmount && parseFloat(purchaseAmount) > 500;
  const isGenericCard = result?.cardId === undefined || !cards.find(c => c.id === result?.cardId);

  return (
    <div className="px-6 py-12 flex flex-col h-full relative max-w-lg mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600">Ask AI-Smart Pay</h1>
        {(result || errorMsg) && (
          <button onClick={clearResult} className="text-sm text-blue-600 font-bold hover:underline">New Search</button>
        )}
      </div>
      
      {!result && !errorMsg ? (
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 mb-8 space-y-5 animate-fade-in-up">
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Product or Service you would like to purchase</label>
            <input
              type="text"
              className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
              placeholder="e.g. Groceries, Flight, Laptop"
              value={item}
              onChange={(e) => setItem(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Preferred Merchant or Store</label>
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
            <label className="block text-sm font-bold text-gray-700 mb-2">Potential Purchase Amount ($) <span className="text-gray-400 font-normal">(Optional)</span></label>
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
             {(result?.cardId && cards.find(c => c.id === result.cardId)) ? (
               <CreditCardView card={cards.find(c => c.id === result.cardId) || {}} className="mb-4 shadow-2xl" />
             ) : (
                // Fallback view for Generic Card (Empty Wallet)
                <CreditCardView card={GENERIC_CARD} className="mb-4 shadow-2xl opacity-90 grayscale-[0.5]" />
             )}
             
             {/* Card Stats Box */}
             <div className="flex justify-between items-center bg-blue-50 border border-blue-100 rounded-xl p-4 mb-2 shadow-sm relative z-10">
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

             {/* NEW: Max Potential Teaser */}
             {result?.optimizationAnalysis && (
                <button 
                  onClick={() => {
                    document.getElementById('maximization-dashboard')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-3 mb-6 shadow-sm group"
                >
                    <div className="flex flex-col text-left">
                        <div className="flex items-center gap-1">
                           <span className="text-lg font-black text-emerald-800">{result.optimizationAnalysis.totalPotentialReturn}</span>
                           <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-1">Potential Max Return</span>
                        </div>
                        {estimatedTotalEarnings && (
                            <span className="text-sm font-bold text-emerald-700 mt-1">Total Est. Cash: ${estimatedTotalEarnings}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-white/60 px-3 py-1.5 rounded-lg group-hover:bg-white transition-colors">
                        <span>See How</span>
                        <svg className="w-3 h-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                    </div>
                </button>
             )}
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
           {result && <MaximizationDashboard result={result} purchaseAmount={purchaseAmount} />}

           {/* Large Purchase / Market Comparison Alert */}
           {(isHighValuePurchase || isGenericCard) && (
              <div className="mt-8 bg-gradient-to-br from-indigo-900 to-blue-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                  
                  <div className="relative z-10">
                      <h3 className="font-bold text-lg mb-2">
                         {isGenericCard ? "Unlock Real Savings" : "Unlock Higher Savings"}
                      </h3>
                      <p className="text-blue-100 text-sm mb-4 leading-relaxed">
                          {isGenericCard 
                            ? "You are missing out on 2-5% cashback by paying with cash/debit. See what credit card you should get."
                            : "This is a large purchase. You could earn a Sign-Up Bonus ($200+) or get 0% APR with a new card."
                          }
                      </p>
                      
                      <button 
                        onClick={isGenericCard ? handleEmptyWalletMarketSearch : handleFindBetterCard}
                        className="bg-white text-blue-900 font-bold text-sm py-3 px-6 rounded-xl w-full hover:bg-blue-50 transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-2"
                      >
                         {isGenericCard ? "Find Recommended Card" : "Find Better Card"}
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                      </button>
                  </div>
              </div>
           )}
           
           {/* CROSS-LINK NAVIGATION: AI Pick -> Product Research */}
           <div className="mt-6 bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => onViewChange(AppView.RESEARCH)}>
              <div>
                  <h4 className="font-bold text-gray-800 text-sm">Wait! Is this product worth it?</h4>
                  <p className="text-xs text-gray-500 mt-1">Check price history & value before you buy.</p>
              </div>
              <div className="bg-white rounded-full p-2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
           </div>
           
           {/* Empty Wallet Prompt (If Generic Card used) */}
           {showEmptyWalletOption && (
              <div className="mt-6 text-center">
                 <p className="text-sm text-gray-500 mb-3">Already have a card?</p>
                 <Button onClick={() => onViewChange(AppView.ADD_CARD)} variant="secondary">Add to Wallet</Button>
              </div>
           )}
        </div>
      )}

      {/* Market Recommendation Modal */}
      {showMarketModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in-up">
           <div className="bg-white w-full max-w-sm h-full max-h-[85vh] rounded-3xl shadow-2xl border border-white/20 flex flex-col overflow-hidden">
              
              {/* Modal Header (Fixed) */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white z-10">
                 <h2 className="text-xl font-bold text-gray-900">Market Recommendation</h2>
                 <button onClick={() => { setShowMarketModal(false); setMarketRec(null); }} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200">✕</button>
              </div>

              {/* Modal Content (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50 no-scrollbar">
                 {isMarketLoading ? (
                    <div className="text-center py-10 space-y-4">
                       <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                       <p className="text-sm font-medium text-gray-600 animate-pulse">Analyzing current market offers...</p>
                    </div>
                 ) : marketRec ? (
                    <>
                       <div className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-6 rounded-2xl shadow-lg transform transition-transform hover:scale-[1.02]">
                          <div className="text-xs font-bold opacity-75 uppercase tracking-widest mb-1">{marketRec.bankName}</div>
                          <h3 className="text-2xl font-black mb-2">{marketRec.cardName}</h3>
                          <div className="bg-white/20 inline-block px-3 py-1 rounded-lg text-xs font-bold backdrop-blur-sm mb-4">
                            {marketRec.headline}
                          </div>
                          <p className="text-sm opacity-90 leading-relaxed font-medium">
                            {marketRec.whyBetter}
                          </p>
                       </div>

                       <div>
                          <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            Benefits for THIS Purchase
                          </h4>
                          <ul className="space-y-3">
                             {marketRec.benefitsForThisPurchase.map((b, i) => (
                               <li key={i} className="flex items-start gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                  <span className="text-sm text-gray-700 font-medium">{b}</span>
                               </li>
                             ))}
                          </ul>
                       </div>
                       
                       <a 
                         href={`https://www.google.com/search?q=${encodeURIComponent(marketRec.applySearchQuery)}`}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="block w-full bg-blue-600 text-white font-bold text-center py-3.5 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
                       >
                         Apply Now (Google Search)
                       </a>
                    </>
                 ) : (
                    <div className="text-center text-gray-500">No better card found at this time.</div>
                 )}
              </div>
           </div>
        </div>
      )}

    </div>
  );
};
