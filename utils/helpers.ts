
import { CreditCard, CardType } from '../types';

export const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const calculateCashbackValue = (percentageString: string | undefined, amountStr: string) => {
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

export const GENERIC_CARD: Partial<CreditCard> = {
    bankName: 'Generic',
    cardName: 'Cash / Debit',
    network: CardType.OTHER,
    colorTheme: '#64748b',
    rewards: [{ category: 'General', rate: '1%', description: 'Base rate' }],
    benefits: [],
    nickName: 'CASH'
};
