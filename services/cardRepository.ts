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
  }
};