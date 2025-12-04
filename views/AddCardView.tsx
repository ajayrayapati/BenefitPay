
import React, { useState } from 'react';
import { CreditCard, CardType, CardDocument } from '../types';
import { searchCardsByBank, fetchCardDetails } from '../services/geminiService';
import { CreditCardView } from '../components/CreditCardView';
import { Button } from '../components/Button';
import { readFileAsBase64 } from '../utils/helpers';

export const AddCardView: React.FC<{ onAdd: (c: CreditCard) => void, onCancel: () => void }> = ({ onAdd, onCancel }) => {
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
    try {
      const results = await searchCardsByBank(bankQuery);
      setFoundCards(results);
    } catch (e: any) {
      console.error(e);
    }
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
    } catch (e: any) {
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
          <label className="block text-sm font-bold text-gray-700">Your Card Bank or Merchant Name <span className="text-gray-400 font-normal text-xs">(e.g. Chase or Macy's)</span></label>
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
