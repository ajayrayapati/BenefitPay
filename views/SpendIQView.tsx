
import React, { useState } from 'react';
import { CreditCard, SpendAnalysisResult, AppView } from '../types';
import { analyzeSpendStatement } from '../services/geminiService';
import { Button } from '../components/Button';
import { readFileAsBase64 } from '../utils/helpers';

export const SpendIQView: React.FC<{ cards: CreditCard[], onViewChange: (v: AppView) => void }> = ({ cards, onViewChange }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<SpendAnalysisResult | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            // Only accept PDFs per requirements
            const validFiles = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
            if (validFiles.length < e.target.files.length) {
                alert("Only PDF files are supported for optimized analysis.");
            }
            setFiles(validFiles);
        }
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleAnalyze = async () => {
        if (files.length === 0) return;
        
        setIsLoading(true);
        try {
            const fileBase64s = await Promise.all(files.map(f => readFileAsBase64(f)));
            const analysis = await analyzeSpendStatement(fileBase64s, cards);
            setResult(analysis);
        } catch (e) {
            console.error(e);
            alert("Analysis failed. Please ensure the file is clear.");
        }
        setIsLoading(false);
    };

    return (
        <div className="px-6 py-4 max-w-lg mx-auto w-full">
            <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 mb-6">SpendIQ Analysis</h1>
            
            {!result ? (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 animate-fade-in-up">
                    <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                        Upload monthly credit card statements (PDF only). 
                        We'll aggregate your spending by category and calculate exactly how much reward value you missed by not using the best card in your wallet.
                    </p>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Upload Statements (PDF)</label>
                            <div className="relative border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:bg-gray-50 hover:border-blue-400 transition-all group">
                                <input 
                                    type="file" 
                                    multiple
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="flex flex-col items-center group-hover:scale-105 transition-transform">
                                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                                        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">Add PDF Statements</span>
                                    <span className="text-[10px] text-gray-400 mt-1">Supports Multiple Files</span>
                                </div>
                            </div>
                        </div>

                        {/* File List */}
                        {files.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Selected Files</h4>
                                {files.map((file, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            <span className="text-xs font-medium text-gray-700 truncate">{file.name}</span>
                                        </div>
                                        <button onClick={() => removeFile(idx)} className="text-gray-400 hover:text-red-500">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <Button onClick={handleAnalyze} disabled={files.length === 0 || isLoading} isLoading={isLoading}>
                            {isLoading ? 'Analyzing Categories...' : `Analyze ${files.length > 0 ? files.length : ''} Statement(s)`}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-fade-in-up pb-10">
                    {/* Summary Dashboard */}
                    <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                        
                        <div className="relative z-10 text-center">
                            {(result.detectedCard) && (
                                <div className="inline-block bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide mb-2">
                                    Source: {result.detectedCard}
                                </div>
                            )}

                            <h2 className="text-sm font-bold opacity-80 uppercase tracking-widest mb-1">Total Missed Value</h2>
                            <div className="text-4xl font-black mb-2 text-red-200">-${result.totalMissedSavings.toFixed(2)}</div>
                            <p className="text-xs opacity-70 max-w-[250px] mx-auto">
                                {result.analysisSummary}
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10">
                             <div>
                                 <div className="text-[10px] font-bold opacity-60 uppercase">Total Spend Analyzed</div>
                                 <div className="text-lg font-bold">${result.totalSpend.toFixed(2)}</div>
                             </div>
                             <div>
                                 <div className="text-[10px] font-bold opacity-60 uppercase">Top Missed Category</div>
                                 <div className="text-lg font-bold">{result.topMissedCategory}</div>
                             </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 text-lg">Categories Analysis</h3>
                        <button onClick={() => { setResult(null); setFiles([]); }} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">New Analysis</button>
                    </div>

                    <div className="space-y-4">
                        {result.categoryAnalysis.map((cat, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="flex justify-between items-end mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${cat.missedSavings > 0 ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                                        <h4 className="font-bold text-gray-800">{cat.category}</h4>
                                    </div>
                                    <div className="text-sm font-bold text-gray-900">${cat.totalAmount.toFixed(0)}</div>
                                </div>

                                {/* Category Progress Bar */}
                                <div className="w-full h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${Math.min(cat.percentage, 100)}%` }}></div>
                                </div>

                                {cat.missedSavings > 0 ? (
                                    <div className="bg-orange-50 rounded-xl p-3 flex justify-between items-center">
                                        <div>
                                            <div className="text-[10px] font-bold text-orange-800 uppercase mb-0.5">Missed Opportunity</div>
                                            <div className="text-xs text-orange-900">
                                                Use <span className="font-bold">{cat.bestCardName}</span>
                                            </div>
                                        </div>
                                        <div className="text-sm font-black text-red-600 bg-white px-2 py-1 rounded border border-red-100 shadow-sm">
                                            -${cat.missedSavings.toFixed(2)}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-green-50 rounded-xl p-2 flex items-center gap-2 text-xs font-bold text-green-700">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        Optimized! You used the best card.
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* CROSS-LINK NAVIGATION: SpendIQ -> SpendFit */}
                    <div className="mt-6 bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => onViewChange(AppView.MARKET_REC)}>
                        <div>
                            <h4 className="font-bold text-gray-800 text-sm">Want to maximize more?</h4>
                            <p className="text-xs text-gray-500 mt-1">Find a better card in the market for your spend.</p>
                        </div>
                        <div className="bg-white rounded-full p-2 text-gray-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
