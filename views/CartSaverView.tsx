
import React, { useState, useRef, useEffect } from 'react';
import { CartAnalysisResult } from '../types';
import { analyzeShoppingCart } from '../services/geminiService';
import { Button } from '../components/Button';
import { readFileAsBase64 } from '../utils/helpers';

export const CartSaverView: React.FC = () => {
  const [storeName, setStoreName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CartAnalysisResult | null>(null);
  
  // Camera/Image State
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    setCapturedImage(imageData);
    stopCamera();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
       const base64 = await readFileAsBase64(e.target.files[0]);
       setCapturedImage(base64);
    }
  };

  const handleAnalyze = async () => {
    if (!capturedImage || !storeName) return;
    setIsLoading(true);
    try {
        const res = await analyzeShoppingCart(capturedImage, storeName);
        setResult(res);
    } catch (e) {
        console.error(e);
        alert("Analysis failed. Please try again.");
    }
    setIsLoading(false);
  };

  return (
    <div className="px-6 py-4 max-w-lg mx-auto w-full pb-20">
       <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 mb-6 leading-tight">
          Cart Saver
       </h1>

       {!result ? (
           <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 animate-fade-in-up">
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                 Snap a picture of items in your cart. We'll identify them and check if you can buy them cheaper elsewhere (Online, Walmart, etc.).
              </p>

              <div className="space-y-4">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Current Store</label>
                      <input 
                        type="text" 
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        placeholder="e.g. Target, Whole Foods"
                        className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                  </div>

                  {/* Image Preview Area */}
                  <div className="relative border-2 border-dashed border-gray-300 rounded-2xl min-h-[200px] flex flex-col items-center justify-center overflow-hidden bg-gray-50">
                      {capturedImage ? (
                          <div className="relative w-full h-full">
                              <img src={capturedImage} alt="Cart" className="w-full h-[200px] object-cover rounded-xl" />
                              <button 
                                onClick={() => setCapturedImage(null)}
                                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70"
                              >
                                  ✕
                              </button>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center p-6 space-y-4">
                             <button onClick={startCamera} className="bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-transform active:scale-95">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                             </button>
                             <div className="text-xs font-bold text-gray-400">OR</div>
                             <label className="text-blue-600 text-sm font-bold cursor-pointer hover:underline">
                                Upload Photo
                                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                             </label>
                          </div>
                      )}
                  </div>

                  <Button onClick={handleAnalyze} disabled={!capturedImage || !storeName || isLoading} isLoading={isLoading}>
                      Analyze Cart Items
                  </Button>
              </div>
           </div>
       ) : (
           <div className="space-y-6 animate-fade-in-up">
              {/* Savings Summary Banner */}
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-3xl text-white shadow-xl">
                  <h2 className="text-xs font-bold opacity-80 uppercase tracking-widest mb-1">Total Potential Savings</h2>
                  <div className="text-4xl font-black mb-2">${result.totalEstimatedSavings.toFixed(2)}</div>
                  <p className="text-sm font-medium opacity-90 leading-relaxed">
                      {result.summary}
                  </p>
              </div>

              {result.unidentifiedItemsWarning && (
                  <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-2xl flex items-start gap-3">
                      <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      <p className="text-xs text-yellow-800 font-medium">Some items were hard to identify. Try taking a clearer photo of individual product labels for better accuracy.</p>
                  </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                  <div className="flex justify-between items-end px-2">
                      <h3 className="font-bold text-gray-900">Analyzed Items ({result.identifiedItemCount})</h3>
                      <button onClick={() => setResult(null)} className="text-xs font-bold text-blue-600">Scan New Cart</button>
                  </div>
                  
                  {result.items.map((item, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-gray-900 text-sm truncate max-w-[200px]">{item.name}</h4>
                              <div className="text-right">
                                  <div className="text-xs text-gray-400 line-through">${item.currentStorePrice.toFixed(2)}</div>
                                  <div className="text-sm font-bold text-green-600">${item.bestAlternativePrice.toFixed(2)}</div>
                              </div>
                          </div>
                          
                          {item.potentialSavings > 0 ? (
                              <div className="flex justify-between items-center bg-green-50 p-2 rounded-lg mt-2">
                                  <div className="flex flex-col">
                                      <span className="text-[10px] text-green-800 font-bold uppercase">Cheaper at {item.bestAlternativeStore}</span>
                                      <span className="text-xs text-green-700">Save ${item.potentialSavings.toFixed(2)}</span>
                                  </div>
                                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="bg-white text-green-700 text-[10px] font-bold px-3 py-1.5 rounded-md shadow-sm border border-green-100">
                                      View
                                  </a>
                              </div>
                          ) : (
                              <div className="bg-gray-50 p-2 rounded-lg mt-2 text-center text-xs text-gray-500 font-medium">
                                  Good price! Hard to beat.
                              </div>
                          )}
                      </div>
                  ))}
                  
                  {result.items.length === 0 && (
                      <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
                          <p className="text-gray-400 text-sm">No items were clearly identified.</p>
                      </div>
                  )}
              </div>
           </div>
       )}

       {/* Camera Modal */}
       {showCamera && (
         <div className="fixed inset-0 z-[100] bg-black flex flex-col h-[100dvh]">
            <video ref={videoRef} autoPlay playsInline className="flex-1 w-full h-full object-cover"></video>
            <canvas ref={canvasRef} className="hidden"></canvas>
            
            <div className="absolute top-0 left-0 w-full p-4 pt-safe flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
               <span className="text-white font-bold text-sm">Capture Cart</span>
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
}
