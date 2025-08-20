// lib/store/composer.ts
import { create } from 'zustand';
import { emailSchema } from '@/lib/schemas'; // Your Zod schema
import { z } from 'zod';
import { Attachment } from '@/components/editor/email-editor'; // Your Attachment type

// Define the shape of the data that can open the composer
export interface ComposerOpenData {
  replyToMessage?: any; // Replace 'any' with a proper Message type if available
  forwardMessage?: any; // Replace 'any' with a proper Message type
  initialData?: z.infer<typeof emailSchema> | null;
  initialAttachments?: Attachment[];
}

type ComposerState = {
  // State properties
  isOpen: boolean;
  isMaximized: boolean;
  
  // Data properties
  mode: 'reply' | 'forward' | 'new';
  replyToMessage?: any;
  forwardMessage?: any;
  composerData: z.infer<typeof emailSchema> | null;
  composerAttachments: Attachment[];

  // Actions
  openComposer: (data?: ComposerOpenData) => void;
  closeComposer: () => void;
  toggleMaximize: () => void;
  toggleMinimize: () => void;
  updateComposerData: (data: z.infer<typeof emailSchema>, attachments: Attachment[]) => void;
};

export const useComposerStore = create<ComposerState>((set) => ({
  // Initial state
  isOpen: false,
  isMaximized: false,
  mode: 'new',
  replyToMessage: undefined,
  forwardMessage: undefined,
  composerData: null,
  composerAttachments: [],

  // --- ACTIONS ---
  openComposer: (data) => {
    let mode: 'reply' | 'forward' | 'new' = 'new';
    if (data?.replyToMessage) mode = 'reply';
    if (data?.forwardMessage) mode = 'forward';

    set({
      isOpen: true,
      isMaximized: false, // Always open in mini mode first
      mode,
      replyToMessage: data?.replyToMessage,
      forwardMessage: data?.forwardMessage,
      composerData: data?.initialData || null,
      composerAttachments: data?.initialAttachments || [],
    });
  },
  
  closeComposer: () => set({
    isOpen: false,
    isMaximized: false,
    composerData: null,
    composerAttachments: [],
    replyToMessage: undefined,
    forwardMessage: undefined,
  }),
  
  toggleMaximize: () => set((state) => ({ 
    isMaximized: true, 
    isOpen: false // Close the mini-composer when maximizing
  })),

  toggleMinimize: () => set({ 
    isMaximized: false, 
    isOpen: true // Open the mini-composer when minimizing
  }),

  updateComposerData: (data, attachments) => set({
    composerData: data,
    composerAttachments: attachments,
  }),
}));