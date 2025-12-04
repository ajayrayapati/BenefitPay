

import React from 'react';

export const HelpView: React.FC = () => {
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
             <h3 className="font-bold text-lg text-gray-900">Product Research</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Is it worth the price? Enter a product name or scan a barcode/item. The AI will analyze the last 6 months of price history, summarized customer sentiment, and suggest better value alternatives.
          </p>
        </div>

        {/* SpendIQ Help Section */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
             <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 018.25-8.25.75.75 0 01.75.75v6.75H18a.75.75 0 01.75.75 8.25 8.25 0 01-16.5 0zm1.5 0a6.75 6.75 0 006.75 6.75v-6H3.75z" clipRule="evenodd" />
                    <path d="M12 2.25a.75.75 0 01.75.75v2.25H18a2.25 2.25 0 012.25 2.25v5.506A8.25 8.25 0 0014.887 2.26 6.72 6.72 0 0012 2.25z" />
                </svg>
             </div>
             <h3 className="font-bold text-lg text-gray-900">SpendIQ</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
             Upload a monthly credit card statement (PDF, Photo, or Screenshot). 
             We'll analyze every transaction to see if you could have earned more rewards by using a different card from your wallet.
          </p>
        </div>

        {/* SpendFit Help Section */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                        <path fillRule="evenodd" d="M9 14l6-6m0 0v6m0-6h-6" clipRule="evenodd" />
                        <path d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12 18.75a6.75 6.75 0 100-13.5 6.75 6.75 0 000 13.5z" />
                    </svg>
                </div>
                <h3 className="font-bold text-lg text-gray-900">SpendFit</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
                Want to know which new card to get? Upload statements from multiple cards. The AI will aggregate your total spending by category (e.g. Dining vs Travel) and find the #1 best card in the market for your lifestyle.
            </p>
        </div>

      </div>
    </div>
  );
};
