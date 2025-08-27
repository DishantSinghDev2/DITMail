import { create } from 'zustand';

interface MailState {
  // A Set is efficient for checking if a message ID exists.
  optimisticallyReadIds: Set<string>;
  
  // Action to add a message ID to the set.
  addOptimisticallyReadId: (messageId: string) => void;
  
  // Action to handle API failures and revert the optimistic state.
  revertOptimisticallyReadId: (messageId: string) => void;
}

export const useMailStore = create<MailState>((set) => ({
  optimisticallyReadIds: new Set(),

  addOptimisticallyReadId: (messageId) =>
    set((state) => ({
      optimisticallyReadIds: new Set(state.optimisticallyReadIds).add(messageId),
    })),

  revertOptimisticallyReadId: (messageId) =>
    set((state) => {
      const newSet = new Set(state.optimisticallyReadIds);
      newSet.delete(messageId);
      return { optimisticallyReadIds: newSet };
    }),
}));