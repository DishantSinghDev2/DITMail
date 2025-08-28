// /lib/store/mail.ts
import { create } from 'zustand';

// Keep your existing state
interface MailState {
  optimisticallyReadIds: Set<string>;
  addOptimisticallyReadId: (id: string) => void;
  revertOptimisticallyReadId: (id: string) => void;

  // --- NEW STATE for Optimistic UI ---
  pendingRemovalIds: Set<string>; // IDs of messages we've acted on but are waiting for API confirmation
  addPendingRemovalId: (id: string) => void; // Add an ID to the set
  removePendingRemovalId: (id: string) => void; // Remove an ID (on success or failure)
}

export const useMailStore = create<MailState>((set) => ({
  optimisticallyReadIds: new Set(),
  addOptimisticallyReadId: (id) => set((state) => ({ optimisticallyReadIds: new Set(state.optimisticallyReadIds).add(id) })),
  revertOptimisticallyReadId: (id) => set((state) => {
    const newSet = new Set(state.optimisticallyReadIds);
    newSet.delete(id);
    return { optimisticallyReadIds: newSet };
  }),

  // --- NEW ACTIONS ---
  pendingRemovalIds: new Set(),
  addPendingRemovalId: (id) => set((state) => ({
    pendingRemovalIds: new Set(state.pendingRemovalIds).add(id)
  })),
  removePendingRemovalId: (id) => set((state) => {
    const newSet = new Set(state.pendingRemovalIds);
    newSet.delete(id);
    return { pendingRemovalIds: newSet };
  }),
}));