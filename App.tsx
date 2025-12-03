import React, { useState, useEffect, useRef } from 'react';
import { AppView, CreditCard, CardType, CardDocument, RecommendationResult, MarketRecommendation, ProductResearchResult } from './types';
import { searchCardsByBank, fetchCardDetails, recommendBestCard, findBetterMarketCard, performProductResearch } from './services/geminiService';
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

const GENERIC_CARD: Partial<CreditCard> = {
    bankName: 'Generic',
    cardName: 'Cash / Debit',
    network: CardType.OTHER,
    colorTheme: '#64748b',
    rewards: [{ category: 'General', rate: '1%', description: 'Base rate' }],
    benefits: [],
    nickName: 'CASH'
};

// --- Reusable Component: Maximization Dashboard ---
const MaximizationDashboard: React.FC<{ result: RecommendationResult, purchaseAmount?: string }> = ({ result, purchaseAmount }) => {
    
    const estimatedTotalEarnings = result.optimizationAnalysis?.totalPotentialReturn && purchaseAmount
      ? calculateCashbackValue(result.optimizationAnalysis.totalPotentialReturn, purchaseAmount) 
      : null;

    // Check for Rakuten/Paypal/Capital One
    const hasRakuten = result.stackingInfo?.toLowerCase().includes('rakuten') || result.optimizationAnalysis?.stepsToMaximize.some(s => s.toLowerCase().includes('rakuten'));
    const hasPaypal = result.stackingInfo?.toLowerCase().includes('paypal') || result.optimizationAnalysis?.stepsToMaximize.some(s => s.toLowerCase().includes('paypal'));
    const hasCapOne = result.stackingInfo?.toLowerCase().includes('capital one') || result.optimizationAnalysis?.stepsToMaximize.some(s => s.toLowerCase().includes('capital one'));

    if (!result.optimizationAnalysis) return null;

    return (
        <div id="maximization-dashboard" className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 p-6 rounded-3xl mb-6 relative overflow-hidden shadow-sm animate-fade-in-up">
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

                {/* Quick Access Links */}
                {(hasRakuten || hasPaypal || hasCapOne) && (
                    <div className="mt-6 pt-4 border-t border-emerald-200/50">
                        <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-3">Quick Actions</h4>
                        <div className="flex flex-wrap gap-2">
                            {hasRakuten && (
                                <a href="https://www.rakuten.com" target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[120px] bg-white text-emerald-800 text-xs font-bold py-2.5 px-4 rounded-xl border border-emerald-200 hover:bg-emerald-50 flex items-center justify-center gap-2 transition-colors shadow-sm">
                                    Open Rakuten
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
                            )}
                            {hasPaypal && (
                                <a href="https://www.paypal.com" target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[120px] bg-white text-emerald-800 text-xs font-bold py-2.5 px-4 rounded-xl border border-emerald-200 hover:bg-emerald-50 flex items-center justify-center gap-2 transition-colors shadow-sm">
                                    Open PayPal
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
                            )}
                            {hasCapOne && (
                                <a href="https://capitaloneshopping.com" target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[120px] bg-white text-emerald-800 text-xs font-bold py-2.5 px-4 rounded-xl border border-emerald-200 hover:bg-emerald-50 flex items-center justify-center gap-2 transition-colors shadow-sm">
                                    Open CapOne Shop
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

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
        {view === AppView.RESEARCH && <ResearchView cards={cards} />}
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
          Simple smart pay app which provides recommendations on what credit card to use based on your wallet, plus finds real-time cashback stacking offers (Rakuten, PayPal, Capital One Shopping) to maximize your savings.
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

// --- Research View for Product Analysis ---
const ResearchView: React.FC<{ cards: CreditCard[] }> = ({ cards }) => {
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
             <h3 className="font-bold text-lg text-gray-900">AI Pick</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            The AI recommends the best card from your wallet and simultaneously checks for "Stacking Opportunities" (extra cashback from Rakuten, PayPal, or Capital One Shopping) to help you double-dip on rewards.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
             <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path fillRule="evenodd" d="M10.5 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM19.5 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM1.5 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clipRule="evenodd" />
               </svg>
             </div>
             <h3 className="font-bold text-lg text-gray-900">Payment Research</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Is it worth the price? Enter a product name or scan a barcode/item. The AI will analyze the last 6 months of price history, summarized customer sentiment, and suggest better value alternatives.
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

    // If wallet is empty, use GENERIC_CARD but still allow search
    const activeCards = cards.length > 0 ? cards : [GENERIC_CARD as CreditCard];
    
    // If it's truly empty (no cards), we track this to show the "Add Card" prompt later
    // But we still perform the search with the generic card to give results.
    const isEmptyWallet = cards.length === 0;

    const query = `Buying "${item}" at "${merchant}" (${isOnline ? 'Online Transaction' : 'In-Store/Physical'})`;
    
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
                           <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Potential Max Return</span>
                           <span className="bg-emerald-100 text-emerald-600 text-[9px] px-1.5 py-0.5 rounded-full font-bold">STRETCH GOAL</span>
                        </div>
                        <div className="flex items-baseline gap-1 mt-0.5">
                           <span className="text-lg font-black text-emerald-800">{result.optimizationAnalysis.totalPotentialReturn}</span>
                           {estimatedTotalEarnings && <span className="text-sm font-bold text-emerald-700">(${estimatedTotalEarnings})</span>}
                        </div>
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