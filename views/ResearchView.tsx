
import React, { useState, useRef, useEffect } from 'react';
import { AppView, CreditCard, ProductResearchResult, RecommendationResult } from '../types';
import { performProductResearch, recommendBestCard } from '../services/geminiService';
import { Button } from '../components/Button';
import { MaximizationDashboard } from '../components/MaximizationDashboard';
import { GENERIC_CARD } from '../utils/helpers';

export const ResearchView: React.FC<{ cards: CreditCard[], onViewChange: (v: AppView) => void }> = ({ cards, onViewChange }) => {
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [price, setPrice] = useState('');
  const [store, setStore] = useState('');
  const [result, setResult] = useState<ProductResearchResult | null>(null);
  const [recResult, setRecResult] = useState<RecommendationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  // Camera Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Zoom State
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [supportsZoom, setSupportsZoom] = useState(false);

  // Scroll ref
  const alternativesRef = useRef<HTMLDivElement>(null);

  const startCamera = async () => {
    setShowCamera(true);
    setZoomLevel(1);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Check Zoom Capabilities
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        if ('zoom' in capabilities) {
            setSupportsZoom(true);
            // @ts-ignore
            setMaxZoom(capabilities.zoom.max || 10);
        } else {
            setSupportsZoom(false);
        }
      }
    } catch (e) {
      alert("Unable to access camera. Please ensure permissions are granted.");
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

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newZoom = parseFloat(e.target.value);
      setZoomLevel(newZoom);
      if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          const track = stream.getVideoTracks()[0];
          // @ts-ignore
          if (track.applyConstraints) {
             // @ts-ignore
             track.applyConstraints({ advanced: [{ zoom: newZoom }] }).catch(err => console.log(err));
          }
      }
  }

  // --- Auto-Detect Barcode Logic ---
  useEffect(() => {
    let interval: any;
    // Check if API exists
    // @ts-ignore
    if (showCamera && videoRef.current && 'BarcodeDetector' in window) {
      // @ts-ignore
      const detector = new window.BarcodeDetector({
        formats: ['qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e']
      });

      const scan = async () => {
        if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;
        try {
           const barcodes = await detector.detect(videoRef.current);
           if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              if (code) {
                  // Vibrate for feedback
                  if (navigator.vibrate) navigator.vibrate(200);
                  clearInterval(interval);
                  // Auto-capture but DO NOT research immediately
                  handleCameraCapture(code);
              }
           }
        } catch(e) {
           console.log("Barcode detection error", e);
        }
      };
      
      // Scan every 500ms
      interval = setInterval(scan, 500);
    }
    return () => clearInterval(interval);
  }, [showCamera]);

  const handleCameraCapture = async (barcodeValue?: string) => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // Draw frame to canvas
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx?.drawImage(videoRef.current, 0, 0);
    
    // Get Base64
    const imageData = canvasRef.current.toDataURL('image/jpeg');
    
    // Set state
    setCapturedImage(imageData);
    if (barcodeValue) {
        setName(`Barcode: ${barcodeValue}`);
    }

    stopCamera();
    // Intentionally NOT calling executeResearch here
  };

  const handleAnalyzeClick = async () => {
    if (!name && !capturedImage) return;
    
    // If name contains "Barcode:", extract it
    let barcodeVal = undefined;
    if (name.startsWith('Barcode: ')) {
        barcodeVal = name.replace('Barcode: ', '').trim();
    }
    
    await executeResearch(capturedImage || undefined, barcodeVal);
  };

  const clearCapturedImage = () => {
      setCapturedImage(null);
      if (name.startsWith('Barcode: ')) {
          setName('');
      }
  }

  const executeResearch = async (imageData?: string, barcodeValue?: string) => {
      setIsLoading(true);
      setResult(null);
      setRecResult(null);

      try {
        // 1. Product Research
        const res = await performProductResearch({ 
            name: name || (barcodeValue ? 'Scanned Item' : 'Item'), 
            model, 
            price, 
            store,
            barcode: barcodeValue 
        }, imageData);
        
        setResult(res);

        // 2. Parallel Recommendation (Maximization)
        if (res) {
            const productIdentify = res.productName || name || 'Item';
            const query = `Buying "${productIdentify}" at "${store || 'General Store'}" (Price: ${price || res.currentPrice || '$0'})`;
            
            // Use generic card if wallet is empty
            const activeCards = cards.length > 0 ? cards : [GENERIC_CARD as CreditCard];
            const rec = await recommendBestCard(query, activeCards);
            setRecResult(rec);
        }
      } catch (e: any) {
        alert("Research failed. Please try again.");
      }

      setIsLoading(false);
  }

  const scrollToAlternatives = () => {
      alternativesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="px-6 py-4 max-w-lg mx-auto w-full">
       <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 mb-6 leading-tight">Product Price to Value Research</h1>
       
       <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 mb-6">
          <div className="space-y-4">
             <div className="flex gap-2">
                <div className="flex-1 relative">
                    <input 
                    type="text" 
                    className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Product Name (e.g. Sony WH-1000XM5)"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    />
                    {capturedImage && (
                        <div className="absolute right-2 top-1.5 h-8 w-8 rounded-lg overflow-hidden border border-gray-200 shadow-sm group cursor-pointer" onClick={clearCapturedImage} title="Clear Image">
                            <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
                            <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center text-white text-[10px]">✕</div>
                        </div>
                    )}
                </div>
                <button onClick={startCamera} className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-3 rounded-xl transition-colors shrink-0" title="Scan Barcode/Product">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                </button>
             </div>
             
             <div className="flex gap-2">
               <input 
                  type="text" 
                  className="flex-1 bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Store / Merchant (Optional)"
                  value={store}
                  onChange={e => setStore(e.target.value)}
                />
                <input 
                  type="number" 
                  className="w-24 bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="$ US Price"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                />
             </div>
             
             <Button onClick={handleAnalyzeClick} disabled={(!name && !capturedImage) || isLoading} isLoading={isLoading}>Analyze Product</Button>
          </div>
       </div>

       {isLoading && (
         <div className="text-center py-10 animate-pulse">
            <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl">🔍</span>
            </div>
            <h3 className="font-bold text-gray-600">Analyzing Market Data...</h3>
            <p className="text-xs text-gray-400">Comparing prices at Amazon, Best Buy, Walmart...</p>
         </div>
       )}

       {result && (
         <div className="space-y-6 animate-fade-in-up pb-10">
            {/* Verdict Card */}
            <div className={`p-6 rounded-3xl border shadow-sm relative ${
                result.verdict === 'Good Buy' ? 'bg-green-50 border-green-100 text-green-900' :
                result.verdict === 'Overpriced' ? 'bg-red-50 border-red-100 text-red-900' :
                'bg-yellow-50 border-yellow-100 text-yellow-900'
            }`}>
               <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight mb-2">{result.verdict}</h2>
                    <p className="text-sm font-medium leading-relaxed opacity-90">{result.verdictReason}</p>
                  </div>
                  {/* Floating Action for Negative Verdicts */}
                  {(result.verdict === 'Overpriced' || result.verdict === 'Wait') && (
                      <button 
                        onClick={scrollToAlternatives}
                        className="absolute right-4 top-4 bg-white shadow-md border border-gray-100 rounded-full w-10 h-10 flex items-center justify-center animate-bounce text-gray-600"
                        title="See Better Options"
                      >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                      </button>
                  )}
               </div>
            </div>

            {/* Price Graph (Last 6 Months) */}
            {result.priceHistory && result.priceHistory.length > 0 && (
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                 <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">6-Month Price Trend</h3>
                 <div className="flex items-end justify-between h-40 gap-2">
                    {result.priceHistory.map((point, i) => {
                       const maxPrice = Math.max(...result.priceHistory.map(p => p.price));
                       const heightPct = maxPrice > 0 ? (point.price / maxPrice) * 100 : 0;
                       
                       return (
                         <div key={i} className="flex flex-col items-center flex-1 h-full group">
                            {/* Bar Container - fills available space via flex-1 */}
                            <div className="relative flex-1 w-full flex items-end justify-center">
                               {/* Tooltip */}
                               <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-md">
                                 ${point.price}
                               </div>
                               {/* The Bar */}
                               <div 
                                 className="w-full max-w-[24px] bg-blue-500 rounded-t-md hover:bg-blue-600 transition-all opacity-90 hover:opacity-100"
                                 style={{ height: `${heightPct}%`, minHeight: '4px' }}
                               ></div>
                            </div>
                            {/* X-Axis Label */}
                            <span className="text-[10px] text-gray-400 mt-2 font-bold uppercase">{point.month}</span>
                         </div>
                       )
                    })}
                 </div>
              </div>
            )}

            {/* Maximization Dashboard in Research View */}
            {recResult && (
                <MaximizationDashboard result={recResult} purchaseAmount={price} />
            )}

            {/* Customer Sentiment */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
               <div className="flex justify-between items-end mb-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Customer Sentiment</h3>
                  <div className="text-2xl font-black text-gray-900">{result.sentimentScore}/100</div>
               </div>
               
               {/* Sentiment Bar */}
               <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                  <div 
                    className={`h-full rounded-full ${result.sentimentScore > 70 ? 'bg-green-500' : result.sentimentScore > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${result.sentimentScore}%` }}
                  ></div>
               </div>
               
               <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                  {result.sentimentSummary}
               </p>
            </div>

            {/* Alternatives */}
            {result.alternatives && result.alternatives.length > 0 && (
              <div ref={alternativesRef} className="scroll-mt-24">
                <h3 className="text-lg font-bold text-gray-900 mb-4 px-2">Better Value Options</h3>
                <div className="space-y-3">
                   {result.alternatives.map((alt, i) => (
                     <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                           <h4 className="font-bold text-gray-900">{alt.name}</h4>
                           <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-lg">{alt.price}</span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed mb-3">{alt.whyBetter}</p>
                        <a 
                             href={alt.link?.startsWith('http') ? alt.link : `https://www.google.com/search?q=${encodeURIComponent(alt.link || alt.name + ' buy')}`}
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                            View Deal
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                     </div>
                   ))}
                </div>
              </div>
            )}
            
            {/* CROSS-LINK NAVIGATION: Product -> AI Pick */}
            <div className="mt-6 bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => onViewChange(AppView.RECOMMEND)}>
              <div>
                  <h4 className="font-bold text-gray-800 text-sm">Decided to buy?</h4>
                  <p className="text-xs text-gray-500 mt-1">Find the best card in your wallet.</p>
              </div>
              <div className="bg-white rounded-full p-2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>
         </div>
       )}

       {/* Camera Modal with Dynamic Viewport Height and Safe Area Padding */}
       {showCamera && (
         <div className="fixed inset-0 z-[100] bg-black flex flex-col h-[100dvh]">
            {/* Video takes up all available space */}
            <video ref={videoRef} autoPlay playsInline className="flex-1 w-full h-full object-cover"></video>
            <canvas ref={canvasRef} className="hidden"></canvas>
            
            {/* Top Bar */}
            <div className="absolute top-0 left-0 w-full p-4 pt-safe flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent z-10">
               <span className="text-white font-bold text-sm drop-shadow-md">
                   Scan Barcode or Product
               </span>
               <button onClick={stopCamera} className="text-white font-bold bg-white/20 backdrop-blur-md rounded-full w-8 h-8 flex items-center justify-center">✕</button>
            </div>

            {/* Bottom Controls Bar with Safe Area Padding */}
            <div className="absolute bottom-0 w-full p-6 pb-safe bg-gradient-to-t from-black/90 to-transparent flex flex-col items-center justify-end z-10 space-y-6">
               
               {/* Zoom Slider (if supported) */}
               {supportsZoom && (
                   <div className="w-full max-w-xs flex items-center gap-3 px-4">
                       <span className="text-[10px] text-white font-bold">1x</span>
                       <input 
                         type="range" 
                         min="1" 
                         max={maxZoom} 
                         step="0.1" 
                         value={zoomLevel} 
                         onChange={handleZoomChange}
                         className="flex-1 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white"
                       />
                       <span className="text-[10px] text-white font-bold">{Math.round(maxZoom)}x</span>
                   </div>
               )}

               <div className="flex flex-col items-center">
                    <button 
                        onClick={() => handleCameraCapture()}
                        className="w-20 h-20 rounded-full border-[5px] border-white flex items-center justify-center bg-white/20 active:bg-white/50 transition-all shadow-lg"
                    >
                        <div className="w-16 h-16 bg-white rounded-full"></div>
                    </button>
                    {/* @ts-ignore */}
                    {'BarcodeDetector' in window && (
                        <p className="text-white/80 text-[10px] mt-3 font-medium animate-pulse">
                            Auto-detecting Barcodes...
                        </p>
                    )}
               </div>
            </div>
            
            {/* Viewfinder Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
               <div className="w-64 h-64 border-2 border-white/50 rounded-xl relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white -mt-1 -ml-1 rounded-tl-sm"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white -mt-1 -mr-1 rounded-tr-sm"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white -mb-1 -ml-1 rounded-bl-sm"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white -mb-1 -mr-1 rounded-br-sm"></div>
                  
                  {/* Center Crosshair */}
                  <div className="absolute top-1/2 left-1/2 w-4 h-[1px] bg-white/50 -translate-x-1/2"></div>
                  <div className="absolute top-1/2 left-1/2 h-4 w-[1px] bg-white/50 -translate-y-1/2"></div>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};
