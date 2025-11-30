
import { CreditCard, CardDocument } from '../types';

const DB_NAME = 'AISmartPayDB';
const DB_VERSION = 1;
const STORE_NAME = 'cards';
const LOCAL_BACKUP_KEY = 'ai_smart_pay_backup_lite';

// Helper to strip heavy Base64 content from documents for LocalStorage backup
const createLiteBackup = (cards: CreditCard[]) => {
  return cards.map(card => ({
    ...card,
    documents: card.documents?.map(doc => ({
      ...doc,
      content: undefined // Remove heavy content for lightweight backup
    }))
  }));
};

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
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  },

  getAll: async (): Promise<CreditCard[]> => {
    let dbCards: CreditCard[] = [];
    
    // 1. Try Loading from IndexedDB (Preferred - contains full files)
    try {
      const db = await CardRepository.getDB();
      dbCards = await new Promise<CreditCard[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject("Error fetching cards from DB");
      });
    } catch (e) {
      console.warn("IndexedDB load failed, falling back to LocalStorage", e);
    }

    // 2. If IndexedDB is empty (Sandbox wipe?), try LocalStorage
    if (dbCards.length === 0) {
      const localData = localStorage.getItem(LOCAL_BACKUP_KEY);
      if (localData) {
        console.log("Restoring from LocalStorage backup...");
        return JSON.parse(localData);
      }
    }

    return dbCards;
  },

  addCard: async (card: CreditCard): Promise<void> => {
    // 1. Save to IndexedDB
    const db = await CardRepository.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(card);
      request.onsuccess = () => resolve();
      request.onerror = () => reject("Error adding card");
    });

    // 2. Update LocalStorage Backup
    await CardRepository.syncToLocalStorage();
  },
  
  updateCard: async (card: CreditCard): Promise<void> => {
    const db = await CardRepository.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(card);
      request.onsuccess = () => resolve();
      request.onerror = () => reject("Error updating card");
    });

    await CardRepository.syncToLocalStorage();
  },

  deleteCard: async (id: string): Promise<void> => {
    const db = await CardRepository.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject("Error deleting card");
    });

    await CardRepository.syncToLocalStorage();
  },

  // Internal helper to keep LocalStorage in sync
  syncToLocalStorage: async () => {
    try {
      const db = await CardRepository.getDB();
      // CRITICAL FIX: Properly handle IDBRequest instead of casting directly
      const allCards = await new Promise<CreditCard[]>((resolve) => {
         const tx = db.transaction(STORE_NAME, 'readonly');
         const request = tx.objectStore(STORE_NAME).getAll();
         request.onsuccess = () => resolve(request.result || []);
         request.onerror = () => resolve([]);
      });
      
      if (Array.isArray(allCards)) {
        const liteBackup = createLiteBackup(allCards);
        localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(liteBackup));
      }
    } catch (e) {
      console.error("Failed to sync to LocalStorage", e);
    }
  },
  
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
  
  importData: async (jsonString: string): Promise<boolean> => {
      try {
          const data = JSON.parse(jsonString);
          if(data && Array.isArray(data.cards)) {
              const db = await CardRepository.getDB();
              await new Promise((resolve) => {
                  const tx = db.transaction(STORE_NAME, 'readwrite');
                  const store = tx.objectStore(STORE_NAME);
                  store.clear(); // Overwrite
                  data.cards.forEach((card: CreditCard) => store.add(card));
                  tx.oncomplete = () => resolve(true);
                  tx.onerror = () => resolve(false);
              });
              
              // Sync to local storage immediately
              const liteBackup = createLiteBackup(data.cards);
              localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(liteBackup));
              return true;
          }
          return false;
      } catch (e) {
          console.error("Import failed", e);
          return false;
      }
  },

  clearAll: async (): Promise<void> => {
      const db = await CardRepository.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject("Error clearing DB");
      });
      localStorage.removeItem(LOCAL_BACKUP_KEY);
  }
};
