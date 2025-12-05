
import { CreditCard, CardDocument, Receipt } from '../types';

const DB_NAME = 'AISmartPayDB';
const DB_VERSION = 2; // Upgraded version for Receipts
const STORE_CARDS = 'cards';
const STORE_RECEIPTS = 'receipts';
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
        // Create Cards Store
        if (!db.objectStoreNames.contains(STORE_CARDS)) {
          db.createObjectStore(STORE_CARDS, { keyPath: 'id' });
        }
        // Create Receipts Store
        if (!db.objectStoreNames.contains(STORE_RECEIPTS)) {
            const receiptStore = db.createObjectStore(STORE_RECEIPTS, { keyPath: 'id' });
            receiptStore.createIndex('timestamp', 'timestamp', { unique: false });
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
        const tx = db.transaction(STORE_CARDS, 'readonly');
        const store = tx.objectStore(STORE_CARDS);
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
      const tx = db.transaction(STORE_CARDS, 'readwrite');
      const store = tx.objectStore(STORE_CARDS);
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
      const tx = db.transaction(STORE_CARDS, 'readwrite');
      const store = tx.objectStore(STORE_CARDS);
      const request = store.put(card);
      request.onsuccess = () => resolve();
      request.onerror = () => reject("Error updating card");
    });

    await CardRepository.syncToLocalStorage();
  },

  deleteCard: async (id: string): Promise<void> => {
    const db = await CardRepository.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CARDS, 'readwrite');
      const store = tx.objectStore(STORE_CARDS);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject("Error deleting card");
    });

    await CardRepository.syncToLocalStorage();
  },

  // --- RECEIPT METHODS ---
  addReceipt: async (receipt: Receipt): Promise<void> => {
    const db = await CardRepository.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_RECEIPTS, 'readwrite');
      const store = tx.objectStore(STORE_RECEIPTS);
      const request = store.add(receipt);
      request.onsuccess = () => resolve();
      request.onerror = () => reject("Error adding receipt");
    });
  },

  getAllReceipts: async (): Promise<Receipt[]> => {
    try {
        const db = await CardRepository.getDB();
        return await new Promise<Receipt[]>((resolve, reject) => {
            if (!db.objectStoreNames.contains(STORE_RECEIPTS)) {
                resolve([]);
                return;
            }
            const tx = db.transaction(STORE_RECEIPTS, 'readonly');
            const store = tx.objectStore(STORE_RECEIPTS);
            // Get by timestamp index to show newest first? Or sort manually.
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject("Error fetching receipts");
        });
    } catch (e) {
        console.warn("Receipt DB access failed", e);
        return [];
    }
  },

  deleteReceipt: async (id: string): Promise<void> => {
      const db = await CardRepository.getDB();
      await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_RECEIPTS, 'readwrite');
          const store = tx.objectStore(STORE_RECEIPTS);
          const request = store.delete(id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject("Error deleting receipt");
      });
  },

  // Internal helper to keep LocalStorage in sync
  syncToLocalStorage: async () => {
    try {
      const db = await CardRepository.getDB();
      // CRITICAL FIX: Properly handle IDBRequest instead of casting directly
      const allCards = await new Promise<CreditCard[]>((resolve) => {
         const tx = db.transaction(STORE_CARDS, 'readonly');
         const request = tx.objectStore(STORE_CARDS).getAll();
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
        // Export receipts as well? Might be too large for JSON string if many images.
        // For now, keep backup focused on Cards logic as per original scope, 
        // or add receipts but warn about size.
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
                  const tx = db.transaction(STORE_CARDS, 'readwrite');
                  const store = tx.objectStore(STORE_CARDS);
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
        const tx = db.transaction([STORE_CARDS, STORE_RECEIPTS], 'readwrite');
        tx.objectStore(STORE_CARDS).clear();
        tx.objectStore(STORE_RECEIPTS).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject("Error clearing DB");
      });
      localStorage.removeItem(LOCAL_BACKUP_KEY);
  }
};
