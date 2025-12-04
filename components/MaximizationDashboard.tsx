
import React from 'react';
import { RecommendationResult } from '../types';
import { calculateCashbackValue } from '../utils/helpers';

export const MaximizationDashboard: React.FC<{ result: RecommendationResult, purchaseAmount?: string }> = ({ result, purchaseAmount }) => {
    
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
