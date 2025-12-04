
import React, { useState, useEffect } from 'react';
import { CreditCard, CardDocument } from '../types';
import { CreditCardView } from './CreditCardView';
import { fetchCardDetails } from '../services/geminiService';
import { readFileAsBase64 } from '../utils/helpers';

export const CardDetailModal: React.FC<{ 
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
    } catch (e: any) {
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
