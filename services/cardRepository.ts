
import { CreditCard } from '../types';

const STORAGE_KEY = 'ai_smart_pay_db';

interface CardDatabase {
  version: number;
  cards: CreditCard[];
  lastUpdated: string;
}

// Simulates a persistent "Folder" / Database within the app
export const CardRepository = {
  load: (): CreditCard[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const db: CardDatabase = JSON.parse(data);
        return db.cards || [];
      }
    } catch (e) {
      console.error("Failed to load card repository", e);
    }
    return [];
  },

  save: (cards: CreditCard[]) => {
    try {
      const db: CardDatabase = {
        version: 1,
        cards: cards,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.error("Failed to save card repository", e);
    }
  },

  addCard: (card: CreditCard) => {
    const cards = CardRepository.load();
    cards.push(card);
    CardRepository.save(cards);
    return cards;
  },

  updateCard: (updatedCard: CreditCard) => {
    const cards = CardRepository.load();
    const index = cards.findIndex(c => c.id === updatedCard.id);
    if (index !== -1) {
      cards[index] = updatedCard;
      CardRepository.save(cards);
    }
    return cards;
  },

  deleteCard: (cardId: string) => {
    const cards = CardRepository.load();
    const newCards = cards.filter(c => c.id !== cardId);
    CardRepository.save(newCards);
    return newCards;
  },
  
  // Potential helper to "upload" a document to a card
  addDocumentToCard: (cardId: string, doc: any) => {
    const cards = CardRepository.load();
    const card = cards.find(c => c.id === cardId);
    if (card) {
      if (!card.documents) card.documents = [];
      card.documents.push(doc);
      CardRepository.save(cards);
    }
    return cards;
  },

  // --- Backup / Restore Features ---

  exportData: (): string => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data || '';
    } catch (e) {
      return '';
    }
  },

  importData: (jsonString: string): CreditCard[] | null => {
    try {
      const db: CardDatabase = JSON.parse(jsonString);
      if (db && Array.isArray(db.cards)) {
        // Basic validation passed
        CardRepository.save(db.cards);
        return db.cards;
      }
      return null;
    } catch (e) {
      console.error("Import failed", e);
      return null;
    }
  },

  clearAll: () => {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
};
