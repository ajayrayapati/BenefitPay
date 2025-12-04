
import React from 'react';
import { CreditCard, AppView } from '../types';
import { CreditCardView } from '../components/CreditCardView';
import { Button } from '../components/Button';

interface WalletViewProps {
  cards: CreditCard[];
  onChangeView: (v: AppView) => void;
  onCardClick: (c: CreditCard) => void;
  onOpenSettings: () => void;
}

export const WalletView: React.FC<WalletViewProps> = ({ cards, onChangeView, onCardClick, onOpenSettings }) => {
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
        <p className="text-sm text-blue-900 leading-relaxed mb-2">
          Simple smart pay app which provides recommendations on what credit card to use based on your wallet, plus finds real-time cashback stacking offers (Rakuten, PayPal, Capital One Shopping) to maximize your savings.
        </p>
        <p className="text-xs text-blue-700 font-medium">
            This app does much more! <button onClick={() => onChangeView(AppView.HELP)} className="underline font-bold hover:text-blue-900">Explore features in About</button>
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
