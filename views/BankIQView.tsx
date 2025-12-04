
import React, { useState } from 'react';
import { BankAnalysisResult } from '../types';
import { analyzeBankStatements } from '../services/geminiService';
import { Button } from '../components/Button';
import { readFileAsBase64 } from '../utils/helpers';

export const BankIQView: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<BankAnalysisResult | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            // Filter only PDFs
            const validFiles = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
            if (validFiles.length < e.target.files.length) {
                alert("Only PDF bank statements are supported.");
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
            const analysis = await analyzeBankStatements(fileBase64s);
            setResult(analysis);
        } catch (e) {
            console.error(e);
            alert("Analysis failed. Please try again.");
        }
        setIsLoading(false);
    };

    return (
        <div className="px-6 py-4 max-w-lg mx-auto w-full pb-20">
            <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 mb-6 leading-tight">
                BankIQ
            </h1>

            {!result ? (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 animate-fade-in-up">
                    <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                        Upload your <strong>Bank Statements (PDF)</strong>. We will analyze cash flow, detect recurring subscriptions, and find smart savings opportunities (ATM fees, lower utility bills, duplicate charges).
                    </p>

                    <div className="space-y-6">
                        <div className="relative border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:bg-gray-50 hover:border-green-400 transition-all group cursor-pointer">
                            <input 
                                type="file" 
                                multiple
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center group-hover:scale-105 transition-transform">
                                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                                </div>
                                <span className="text-sm font-bold text-gray-700">Add Bank Statements</span>
                                <span className="text-[10px] text-gray-400 mt-1">PDF Only • Secure Analysis</span>
                            </div>
                        </div>

                        {/* File List */}
                        {files.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Selected Files</h4>
                                {files.map((file, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="text-xs font-medium text-gray-700 truncate">{file.name}</span>
                                        </div>
                                        <button onClick={() => removeFile(idx)} className="text-gray-400 hover:text-red-500">✕</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <Button onClick={handleAnalyze} disabled={files.length === 0 || isLoading} isLoading={isLoading}>
                            {isLoading ? 'Processing Finances...' : 'Analyze Statements'}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-fade-in-up">
                    
                    {/* Cash Flow Card */}
                    <div className="bg-gray-900 text-white p-6 rounded-3xl shadow-xl">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Monthly Cash Flow</h2>
                                <div className="text-2xl font-black mt-1">
                                    {result.cashFlow.netFlow >= 0 ? '+' : '-'}${Math.abs(result.cashFlow.netFlow).toFixed(0)}
                                    <span className="text-sm font-medium text-gray-400 ml-1">Net</span>
                                </div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${result.overallHealthScore > 70 ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black'}`}>
                                Health Score: {result.overallHealthScore}
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-800 p-3 rounded-xl">
                                <div className="text-[10px] text-green-400 font-bold uppercase mb-1">Total In</div>
                                <div className="text-lg font-bold">${result.cashFlow.totalIn.toFixed(0)}</div>
                            </div>
                            <div className="bg-gray-800 p-3 rounded-xl">
                                <div className="text-[10px] text-red-400 font-bold uppercase mb-1">Total Out</div>
                                <div className="text-lg font-bold">${result.cashFlow.totalOut.toFixed(0)}</div>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-4 leading-relaxed border-t border-gray-700 pt-3">
                            {result.summary}
                        </p>
                    </div>

                    {/* Savings Opportunities (The Core Feature) */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                           ⚡ Savings Opportunities
                        </h3>
                        {result.savingsOpportunities.length > 0 ? (
                             <div className="grid gap-3">
                                {result.savingsOpportunities.map((opp, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                            opp.type === 'DUPLICATE' ? 'bg-red-50 text-red-500' : 
                                            opp.type === 'FEE' ? 'bg-orange-50 text-orange-500' :
                                            'bg-green-50 text-green-600'
                                        }`}>
                                            <span className="font-bold text-lg">$</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm">{opp.title}</h4>
                                            <p className="text-xs text-gray-500 mt-1 mb-2">{opp.description}</p>
                                            <div className="inline-block bg-green-100 text-green-800 text-[10px] font-bold px-2 py-1 rounded-md">
                                                Save ~${opp.potentialMonthlySavings}/mo
                                            </div>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        ) : (
                            <div className="bg-green-50 p-4 rounded-xl text-green-800 text-sm text-center font-medium">
                                No obvious waste detected. Good job!
                            </div>
                        )}
                    </div>

                    {/* Subscriptions */}
                    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
                         <div className="p-4 bg-gray-50 border-b border-gray-100">
                             <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Recurring Subscriptions</h3>
                         </div>
                         <div className="divide-y divide-gray-100">
                             {result.subscriptions.map((sub, idx) => (
                                 <div key={idx} className="p-4 flex justify-between items-center">
                                     <div>
                                         <div className="font-bold text-gray-900 text-sm">{sub.name}</div>
                                         <div className="text-[10px] text-gray-400 uppercase">{sub.frequency} • {sub.category}</div>
                                     </div>
                                     <div className="font-bold text-gray-900 text-sm">${sub.amount.toFixed(2)}</div>
                                 </div>
                             ))}
                             {result.subscriptions.length === 0 && <div className="p-4 text-sm text-gray-400 text-center">No subscriptions detected.</div>}
                         </div>
                    </div>

                    {/* New Analysis Button */}
                    <div className="text-center pt-6">
                        <button onClick={() => { setResult(null); setFiles([]); }} className="text-sm font-bold text-blue-600 hover:underline">
                            Upload New Statements
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
}
