
import React, { useState } from 'react';
import { PortfolioAnalysisResult } from '../types';
import { analyzePortfolioAndRecommend } from '../services/geminiService';
import { Button } from '../components/Button';
import { readFileAsBase64 } from '../utils/helpers';

export const SpendRecommenderView: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<PortfolioAnalysisResult | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleAnalyze = async () => {
        if (files.length === 0) return;
        
        setIsLoading(true);
        try {
            const filePayloads = await Promise.all(files.map(async (f) => ({
                base64: await readFileAsBase64(f),
                mimeType: f.type === 'application/pdf' ? 'application/pdf' : 'image/jpeg'
            })));
            
            const analysis = await analyzePortfolioAndRecommend(filePayloads);
            setResult(analysis);
        } catch (e) {
            console.error(e);
            alert("Analysis failed. Please check your internet connection and try again.");
        }
        setIsLoading(false);
    };

    return (
        <div className="px-6 py-4 max-w-lg mx-auto w-full">
            <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 mb-6 leading-tight">
                SpendFit
            </h1>
            
            {!result ? (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 animate-fade-in-up">
                    <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                        Upload monthly statements from <strong>one or multiple cards</strong>. 
                        We will analyze your aggregate spending profile across all categories and find the 
                        <strong> #1 Best Card</strong> in the market tailored to your lifestyle.
                    </p>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Upload Statements (PDF / Image)</label>
                            <div className="relative border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center hover:bg-gray-50 hover:border-blue-400 transition-all group">
                                <input 
                                    type="file" 
                                    multiple
                                    accept="image/*,.pdf"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="flex flex-col items-center group-hover:scale-105 transition-transform">
                                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                                        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">Add Files</span>
                                    <span className="text-[10px] text-gray-400 mt-1">PDF or Images</span>
                                </div>
                            </div>
                        </div>

                        {/* File List */}
                        {files.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ready to Analyze</h4>
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
                            {files.length > 0 ? `Analyze ${files.length} Statement(s)` : 'Analyze Spend'}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-fade-in-up pb-10">
                    {/* Recommendation Card */}
                    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden transform transition-all hover:scale-[1.01]">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                        
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="text-xs font-bold opacity-75 uppercase tracking-widest mb-1">{result.recommendedMarketCard.bankName}</div>
                                    <h2 className="text-2xl font-black">{result.recommendedMarketCard.cardName}</h2>
                                </div>
                                <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-bold">
                                    #1 Match
                                </div>
                            </div>

                            <p className="text-sm opacity-90 leading-relaxed font-medium mb-6">
                                {result.recommendedMarketCard.headline}
                            </p>

                            <div className="bg-white/10 rounded-xl p-4 border border-white/10 mb-6">
                                <div className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">Estimated Annual Return</div>
                                <div className="text-3xl font-black text-white">{result.recommendedMarketCard.estimatedAnnualReturn}</div>
                            </div>

                            <a 
                                href={`https://www.google.com/search?q=${encodeURIComponent(result.recommendedMarketCard.applySearchQuery)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full bg-white text-blue-800 font-bold text-center py-3.5 rounded-xl shadow-lg hover:bg-blue-50 active:scale-95 transition-all"
                            >
                                Apply Now (Search)
                            </a>
                        </div>
                    </div>

                    {/* Spend Profile */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-end mb-6">
                            <h3 className="font-bold text-gray-900">Your Spend Profile</h3>
                            <button onClick={() => { setResult(null); setFiles([]); }} className="text-xs font-bold text-blue-600">New Analysis</button>
                        </div>
                        
                        <div className="space-y-4">
                            {result.spendProfile.map((cat, idx) => (
                                <div key={idx}>
                                    <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                                        <span>{cat.category}</span>
                                        <span>${cat.amount.toFixed(0)} ({cat.percentage}%)</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-blue-500 rounded-full"
                                            style={{ width: `${cat.percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                            <div className="text-xs text-gray-400 uppercase">Total Analyzed</div>
                            <div className="text-xl font-bold text-gray-900">${result.totalAnalyzedSpend.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* Reasoning */}
                    <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                        <h3 className="font-bold text-blue-900 text-sm uppercase tracking-wide mb-2">Why this card?</h3>
                        <p className="text-blue-800 text-sm leading-relaxed">
                            {result.recommendedMarketCard.reasoning}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
