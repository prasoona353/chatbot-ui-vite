export interface CacheEntry {
  sender: "user" | "bot";
  rawMarkdown: string;
}

export const ChatCache = {
  getStorageKey(platformId: string): string {
    return `__trading_chat_mem_${platformId}__`;
  },

  save(platformId: string, messages: any[]): void {
    const cleanLogs: CacheEntry[] = messages
      .filter(m => m.rawMarkdown)
      .map(m => ({
        sender: m.sender,
        rawMarkdown: m.rawMarkdown
      }));
    
    // Binds state directly to active tab window memory loops
    (window as any)[this.getStorageKey(platformId)] = cleanLogs;
  },

  load(platformId: string): CacheEntry[] | null {
    const data = (window as any)[this.getStorageKey(platformId)];
    return data && data.length > 0 ? data : null;
  }
};
