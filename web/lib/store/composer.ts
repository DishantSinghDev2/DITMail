// lib/store/composer.ts
import { create } from 'zustand';
import { emailSchema } from '@/lib/schemas';
import { z } from 'zod';
import { Attachment } from '@/components/editor/email-editor';

export interface ComposerOpenData {
  draftId?: string;
  replyToMessage?: any;
  forwardMessage?: any;
  initialData?: z.infer<typeof emailSchema> | null;
  initialAttachments?: Attachment[];
}

type ComposerState = {
  // State properties
  isOpen: boolean;
  isMaximized: boolean;

  // Data properties
  draftId?: string;
  mode: 'reply' | 'forward' | 'new';
  replyToMessage?: any;
  forwardMessage?: any;
  composerData: z.infer<typeof emailSchema> | null;
  composerAttachments: Attachment[];

  // Actions
  openComposer: (data?: ComposerOpenData) => void;
  reopenComposer: (data: ComposerOpenData) => void;
  closeComposer: () => void;
  toggleMaximize: () => void;
  toggleMinimize: () => void;
  updateComposerData: (data: z.infer<typeof emailSchema>, attachments: Attachment[]) => void;
  setDraftId: (draftId: string) => void;
};

export const useComposerStore = create<ComposerState>((set, get) => ({
  isOpen: false,
  isMaximized: false,
  draftId: undefined,
  mode: 'new',
  replyToMessage: undefined,
  forwardMessage: undefined,
  composerData: null,
  composerAttachments: [],

  openComposer: (data = {}) => {
    if (get().isOpen || get().isMaximized) return;

    let mode: 'reply' | 'forward' | 'new' = 'new';
    if (data.replyToMessage) mode = 'reply';
    if (data.forwardMessage) mode = 'forward';

    set({
      isOpen: true,
      isMaximized: false,
      draftId: data.draftId,
      mode,
      replyToMessage: data.replyToMessage,
      forwardMessage: data.forwardMessage,
      composerData: data.initialData || null,
      composerAttachments: data.initialAttachments || [],
    });
  },

  reopenComposer: (data) => {
    let mode: 'reply' | 'forward' | 'new' = 'new';
    if (data.replyToMessage) mode = 'reply';
    if (data.forwardMessage) mode = 'forward';

    set({
      isOpen: true,
      isMaximized: false,
      draftId: data.draftId,
      mode,
      replyToMessage: data.replyToMessage,
      forwardMessage: data.forwardMessage,
      composerData: data.initialData || null,
      composerAttachments: data.initialAttachments || [],
    });
  },
  
  closeComposer: () => set({
    isOpen: false,
    isMaximized: false,
    draftId: undefined,
    composerData: null,
    composerAttachments: [],
    replyToMessage: undefined,
    forwardMessage: undefined,
  }),
  
  toggleMaximize: () => set({ isMaximized: true, isOpen: false }),
  toggleMinimize: () => set({ isMaximized: false, isOpen: true }),
  updateComposerData: (data, attachments) => set({ composerData: data, composerAttachments: attachments }),
  setDraftId: (draftId) => set({ draftId }),
}));