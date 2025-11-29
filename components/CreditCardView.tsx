import React from 'react';
import { CreditCard, CardType } from '../types';

interface CreditCardViewProps {
  card: Partial<CreditCard>; // Changed to Partial to support preview during creation
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

export const CreditCardView: React.FC<CreditCardViewProps> = ({ card, onClick, selected, className = '' }) => {
  
  const getNetworkLogo = (network?: CardType) => {
    switch (network) {
      case CardType.VISA: return "VISA";
      case CardType.MASTERCARD: return "Mastercard";
      case CardType.AMEX: return "American Express";
      case CardType.DISCOVER: return "Discover";
      default: return "CARD";
    }
  };

  const textColor = 'text-white'; 

  return (
    <div 
      onClick={onClick}
      className={`relative w-full aspect-[1.586] rounded-2xl p-6 shadow-lg transform transition-all duration-300 overflow-hidden cursor-pointer ${selected ? 'scale-105 ring-4 ring-blue-400' : 'hover:scale-[1.02]'} ${className}`}
      style={{ 
        backgroundColor: card.colorTheme || '#333',
        background: `linear-gradient(135deg, ${card.colorTheme || '#333'} 0%, #000000 120%)`
      }}
    >
      {/* Glossy Effect */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
      
      <div className={`relative z-10 flex flex-col justify-between h-full ${textColor}`}>
        <div className="flex justify-between items-start">
          <span className="font-bold tracking-wider text-sm opacity-90">{(card.bankName || 'BANK').toUpperCase()}</span>
          <span className="font-bold italic">{getNetworkLogo(card.network)}</span>
        </div>
        
        <div className="mt-4">
           {/* Chip Simulation */}
           <div className="w-10 h-8 bg-yellow-200/80 rounded-md mb-4 border border-yellow-400/50 flex items-center justify-center overflow-hidden">
              <div className="w-full h-[1px] bg-yellow-600/50 absolute top-1/2"></div>
              <div className="h-full w-[1px] bg-yellow-600/50 absolute left-1/2"></div>
           </div>
           <h3 className="font-mono text-lg sm:text-xl tracking-widest shadow-black drop-shadow-md">
             {card.lastFour ? `•••• •••• •••• ${card.lastFour}` : `•••• •••• •••• ••••`}
           </h3>
        </div>

        <div className="flex justify-between items-end">
          <div className="flex flex-col">
             <span className="text-[10px] uppercase opacity-70">Card Holder</span>
             <span className="font-medium tracking-wide text-sm uppercase truncate max-w-[150px]">
               {card.holderName || 'YOUR NAME'}
             </span>
          </div>
          <div className="flex flex-col items-end">
             <span className="text-[10px] uppercase opacity-70">Exp</span>
             <span className="font-mono text-sm">XX/XX</span>
          </div>
        </div>
      </div>
    </div>
  );
};