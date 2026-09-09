export interface HistoryRecord {
  id: string;
  date: string;
  timestamp: number;
  callTitle: string; // filename
  caller: string;
  riskScore: number;
  result: string;
  summary: string;
  confidenceScore?: number;
  syntheticProbability?: number;
  recommendation?: string;
  evidence?: string[];
}

const STORAGE_KEY = 'vs_analysis_history';

export const historyService = {
  getHistory(): HistoryRecord[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  addRecord(record: Omit<HistoryRecord, 'id' | 'timestamp' | 'date'>): HistoryRecord {
    const existing = this.getHistory();
    const now = new Date();
    
    // Format: e.g. "Sep 5, 2026 • 23:25"
    const month = now.toLocaleString('en-US', { month: 'short' });
    const day = now.getDate();
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const dateFormatted = `${month} ${day}, ${year} • ${hours}:${minutes}`;

    const newEntry: HistoryRecord = {
      ...record,
      id: `ANL-${year}-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: now.getTime(),
      date: dateFormatted,
    };

    const updated = [newEntry, ...existing];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist history to localStorage:', e);
    }
    return newEntry;
  },

  clearHistory(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear history:', e);
    }
  },
};
