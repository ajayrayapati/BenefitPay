

import React, { useState, useRef, useEffect } from 'react';
import { Receipt } from '../types';
import { parseReceipt } from '../services/geminiService';
import { CardRepository } from '../services/cardRepository';
import { Button } from '../components/Button';
import { readFileAsBase64 } from '../utils/helpers';

export const ReceiptTrackerView: React.FC = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Camera/Image State
  const [showCamera, setShowCamera] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Modal State
  const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    const data = await CardRepository.getAllReceipts();
    // Sort by timestamp desc
    const sorted = data.sort((a, b) => b.timestamp - a.timestamp);
    setReceipts(sorted);
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      alert("Camera access denied.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx?.drawImage(videoRef.current, 0, 0);
    const imageData = canvasRef.current.toDataURL('image/jpeg');
    processImage(imageData);
    stopCamera();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
       const base64 = await readFileAsBase64(e.target.files[0]);
       processImage(base64);
    }
  };

  const processImage = async (base64: string) => {
      setSelectedImage(base64);
      setIsProcessing(true);
      try {
          const parsed = await parseReceipt(base64);
          if (parsed) {
              let displayDate = parsed.date;
              if (!displayDate || displayDate === 'null' || displayDate === 'N/A') {
                  displayDate = `${new Date().toLocaleDateString()} (uploaded)`;
              }

              const newReceipt: Receipt = {
                  id: crypto.randomUUID(),
                  storeName: parsed.storeName || 'Unknown Store',
                  date: displayDate,
                  totalAmount: parsed.totalAmount || 0,
                  items: parsed.items || [],
                  imageBase64: base64,
                  timestamp: Date.now()
              };
              await CardRepository.addReceipt(newReceipt);
              await loadReceipts();
          } else {
              alert("Could not extract receipt data. Please try again with a clearer image.");
          }
      } catch (e) {
          console.error(e);
          alert("Error processing receipt.");
      }
      setIsProcessing(false);
      setSelectedImage(null);
  };

  const handleDelete = async (id: string) => {
      if(confirm("Delete this receipt?")) {
          await CardRepository.deleteReceipt(id);
          await loadReceipts();
          setViewingReceipt(null);
      }
  };

  // Filter Logic
  const filteredReceipts = receipts.filter(r => {
      const q = searchQuery.toLowerCase();
      return r.storeName.toLowerCase().includes(q) || 
             r.items.some(item => item.toLowerCase().includes(q)) ||
             r.date.includes(q);
  });

  return (
    <div className="px-6 py-4 max-w-lg mx-auto w-full pb-20">
       <div className="flex justify-between items-center mb-6">
         <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 leading-tight">
            Receipts
         </h1>
         <div className="flex gap-2">
            <button onClick={startCamera} className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:bg-blue-700 active:scale-95">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
            <label className="bg-gray-100 text-gray-600 rounded-full w-10 h-10 flex items-center justify-center cursor-pointer shadow-sm hover:bg-gray-200 active:scale-95">
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            </label>
         </div>
       </div>

       {/* Description Card */}
       <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-6 animate-fade-in-up">
          <p className="text-sm text-gray-600 leading-relaxed">
             Scan and store your physical receipts. The AI extracts every line item, date, and total amount, allowing you to instantly search for specific products (like "Eggs" or "Batteries") across your purchase history.
          </p>
       </div>

       {/* Processing State */}
       {isProcessing && (
           <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-6 flex items-center gap-3 animate-pulse">
               <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
               <span className="text-sm font-bold text-blue-700">Analyzing Receipt Items...</span>
           </div>
       )}

       {/* Search Bar */}
       <div className="relative mb-6">
           <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           <input 
             type="text" 
             placeholder="Search items in receipts uploaded prior (e.g. Milk, Eggs)..."
             className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
           />
       </div>

       {/* Receipts List */}
       <div className="space-y-4">
           {filteredReceipts.map((receipt) => (
               <div key={receipt.id} onClick={() => setViewingReceipt(receipt)} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex gap-4 cursor-pointer hover:bg-gray-50 transition-colors">
                   {/* Thumbnail */}
                   <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden border border-gray-200 flex-shrink-0">
                       <img src={receipt.imageBase64} alt="Receipt" className="w-full h-full object-cover" />
                   </div>
                   
                   {/* Details */}
                   <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-start">
                           <h3 className="font-bold text-gray-900 truncate">{receipt.storeName}</h3>
                           <span className="font-bold text-green-600">${receipt.totalAmount.toFixed(2)}</span>
                       </div>
                       <div className="text-xs text-gray-400 mt-0.5">{receipt.date}</div>
                       
                       {/* Matched Items Preview */}
                       {searchQuery && (
                           <div className="mt-2 text-xs bg-yellow-50 text-yellow-800 px-2 py-1 rounded inline-block">
                               Found: {receipt.items.filter(i => i.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 2).join(', ')}
                           </div>
                       )}
                   </div>
               </div>
           ))}

           {filteredReceipts.length === 0 && !isProcessing && (
               <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 border-dashed">
                   <p className="text-gray-400 text-sm font-medium">No receipts found.</p>
                   <p className="text-gray-400 text-xs mt-1">Scan one to start tracking!</p>
               </div>
           )}
       </div>

       {/* Detail Modal */}
       {viewingReceipt && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in-up">
               <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                   <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white z-10">
                       <h2 className="font-bold text-gray-900">{viewingReceipt.storeName}</h2>
                       <button onClick={() => setViewingReceipt(null)} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full">✕</button>
                   </div>
                   
                   <div className="overflow-y-auto p-4 space-y-4 bg-gray-50 flex-1">
                       <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                           <img src={viewingReceipt.imageBase64} className="w-full object-contain" />
                       </div>
                       
                       <div className="bg-white p-4 rounded-xl border border-gray-100">
                           <div className="flex justify-between text-sm font-bold mb-2">
                               <span>Date</span>
                               <span>{viewingReceipt.date}</span>
                           </div>
                           <div className="flex justify-between text-sm font-bold mb-4">
                               <span>Total</span>
                               <span className="text-green-600">${viewingReceipt.totalAmount.toFixed(2)}</span>
                           </div>
                           
                           <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Items Detected</div>
                           <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
                               {viewingReceipt.items.map((item, i) => (
                                   <li key={i}>{item}</li>
                               ))}
                           </ul>
                       </div>

                       <button onClick={() => handleDelete(viewingReceipt.id)} className="w-full py-3 text-red-500 font-bold text-xs bg-red-50 hover:bg-red-100 rounded-xl">
                           Delete Receipt
                       </button>
                   </div>
               </div>
           </div>
       )}

       {/* Camera Modal */}
       {showCamera && (
         <div className="fixed inset-0 z-[100] bg-black flex flex-col h-[100dvh]">
            <video ref={videoRef} autoPlay playsInline className="flex-1 w-full h-full object-cover"></video>
            <canvas ref={canvasRef} className="hidden"></canvas>
            
            <div className="absolute top-0 left-0 w-full p-4 pt-safe flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
               <span className="text-white font-bold text-sm">Capture Receipt</span>
               <button onClick={stopCamera} className="text-white font-bold bg-white/20 backdrop-blur-md rounded-full w-8 h-8 flex items-center justify-center">✕</button>
            </div>

            <div className="absolute bottom-0 w-full p-8 pb-safe bg-gradient-to-t from-black/80 to-transparent flex justify-center">
               <button 
                onClick={handleCapture}
                className="w-20 h-20 rounded-full border-[6px] border-white flex items-center justify-center bg-white/20 active:bg-white/50 transition-all"
               >
                 <div className="w-16 h-16 bg-white rounded-full"></div>
               </button>
            </div>
         </div>
       )}
    </div>
  );
};
