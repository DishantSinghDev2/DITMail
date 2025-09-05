// /lib/store/mail.ts
import { create } from 'zustand';

interface MailState {
  optimisticallyReadIds: Set<string>;
  addOptimisticallyReadId: (id: string) => void;
  revertOptimisticallyReadId: (id: string) => void;

  // --- States for Optimistic UI ---
  pendingRemovalIds: Set<string>;
  addPendingRemovalId: (id: string) => void;
  removePendingRemovalId: (id: string) => void;
  failedMessages: Map<string, string>;
  addFailedMessage: (messageId: string, reason: string) => void;
}

export const useMailStore = create<MailState>((set) => ({
  optimisticallyReadIds: new Set(),
  addOptimisticallyReadId: (id) => set((state) => ({ optimisticallyReadIds: new Set(state.optimisticallyReadIds).add(id) })),
  revertOptimisticallyReadId: (id) => set((state) => {
    const newSet = new Set(state.optimisticallyReadIds);
    newSet.delete(id);
    return { optimisticallyReadIds: newSet };
  }),

  pendingRemovalIds: new Set(),
  addPendingRemovalId: (id) => set((state) => ({
    pendingRemovalIds: new Set(state.pendingRemovalIds).add(id)
  })),
  removePendingRemovalId: (id) => set((state) => {
    const newSet = new Set(state.pendingRemovalIds);
    newSet.delete(id);
    return { pendingRemovalIds: newSet };
  }),  failedMessages: new Map(),
  addFailedMessage: (messageId, reason) =>
    set((state) => ({
      failedMessages: new Map(state.failedMessages).set(messageId, reason),
    })),
}));