
import { CreditCard } from '../types';

const DB_NAME = 'AISmartPayDB';
const DB_VERSION = 1;
const STORE_NAME = 'cards';

// IndexedDB Helper
export const CardRepository = {
  getDB: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject("IndexedDB not supported");
        return;
      }
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = (event) => {
        console.error("Database error:", (event.target as any).error);
        reject("Error opening DB");
      };
      
      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          // Create the object store with 'id' as the key path
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  },

  getAll: async (): Promise<CreditCard[]> => {
    try {
      const db = await CardRepository.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject("Error fetching cards");
      });
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  addCard: async (card: CreditCard): Promise<void> => {
    const db = await CardRepository.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(card);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject("Error adding card");
    });
  },
  
  updateCard: async (card: CreditCard): Promise<void> => {
    const db = await CardRepository.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(card); // 'put' updates if key exists, inserts if not
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject("Error updating card");
    });
  },

  deleteCard: async (id: string): Promise<void> => {
    const db = await CardRepository.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject("Error deleting card");
    });
  },
  
  // Backup: Export entire DB to JSON string
  exportData: async (): Promise<string> => {
    try {
        const cards = await CardRepository.getAll();
        return JSON.stringify({
            version: DB_VERSION,
            cards,
            lastUpdated: new Date().toISOString()
        });
    } catch(e) {
        console.error("Export failed", e);
        return ''; 
    }
  },
  
  // Restore: Import JSON string into DB
  importData: async (jsonString: string): Promise<boolean> => {
      try {
          const data = JSON.parse(jsonString);
          if(data && Array.isArray(data.cards)) {
              const db = await CardRepository.getDB();
              return new Promise((resolve) => {
                  const tx = db.transaction(STORE_NAME, 'readwrite');
                  const store = tx.objectStore(STORE_NAME);
                  
                  // Clear existing data before import? 
                  // Let's assume restore overwrites/merges. For safety, let's clear.
                  store.clear();
                  
                  data.cards.forEach((card: CreditCard) => {
                      store.add(card);
                  });
                  
                  tx.oncomplete = () => resolve(true);
                  tx.onerror = () => resolve(false);
              });
          }
          return false;
      } catch (e) {
          console.error("Import failed", e);
          return false;
      }
  },

  clearAll: async (): Promise<void> => {
      const db = await CardRepository.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject("Error clearing DB");
      });
  }
};
