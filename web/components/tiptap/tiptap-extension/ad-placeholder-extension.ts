// /components/tiptap-extension/ad-placeholder-extension.ts
import { Node, mergeAttributes } from '@tiptap/core'

export interface AdPlaceholderOptions {
  HTMLAttributes: {
    [key: string]: any
  }
}

// Define the attributes our node can store
export interface AdPlaceholderAttributes {
  adSlotId: string | null;
  // Add other potential attributes here if needed, e.g., adSize, adType
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    adPlaceholder: {
      /**
       * Add an ad placeholder with optional attributes.
       */
      setAdPlaceholder: (attributes: Partial<AdPlaceholderAttributes>) => ReturnType; // Allow partial attributes initially
      /**
       * Update attributes of the selected ad placeholder.
       */
      updateAdPlaceholderAttributes: (attributes: Partial<AdPlaceholderAttributes>) => ReturnType; // Optional: Command to update existing node
    }
  }
}

export const AdPlaceholder = Node.create<AdPlaceholderOptions, AdPlaceholderAttributes>({ // Add storage type
  name: 'adPlaceholder',
  group: 'block', // Usually better as a block element
  atom: true,     // Treat as a single unit, not editable inside
  draggable: true,
  selectable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'ad-placeholder-node', // Base class for styling
      },
    }
  },

  // Define the attributes and their defaults
  addAttributes(): Record<keyof AdPlaceholderAttributes, any> {
    return {
      adSlotId: {
        default: null,
        // Define how this attribute should be parsed from HTML
        parseHTML: (element: { getAttribute: (arg0: string) => any; }) => element.getAttribute('data-ad-slot-id'),
        // Define how this attribute should be rendered to HTML
        renderHTML: (attributes: { adSlotId: any; }) => {
          if (!attributes.adSlotId) {
            return {}
          }
          return {
            'data-ad-slot-id': attributes.adSlotId,
          }
        },
      },
      // Add other attributes here following the same pattern
    }
  },

  parseHTML() {
    return [
      {
        // Match the element based on the presence of our data attribute or class
        tag: `div[data-ad-slot-id]`, // Be specific
      },
      {
        // Fallback or alternative: match based on the class if data attribute is missing but class is present
         tag: `div.${this.options.HTMLAttributes.class}`,
         // Optional: Add priority if needed, lower priority means it's checked later
         // priority: 50,
      }
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    // Get the specific attributes of this node instance
    const { adSlotId } = node.attrs as AdPlaceholderAttributes;

    // Merge default options, node-specific attributes, and attributes passed by TipTap
    const mergedAttributes = mergeAttributes(
      this.options.HTMLAttributes, // Default class etc.
      HTMLAttributes,             // Attributes from TipTap (like style for drag/selection)
      // Add node attributes as data-* attributes explicitly if not handled by addAttributes renderHTML
      // (addAttributes renderHTML handles data-ad-slot-id automatically here)
    );

    return ['div', mergedAttributes, [
      'div',
      {
        // Internal div for styling the placeholder visually
        style: 'border: 1px dashed #ccc; border-radius: 5px; padding: 10px; text-align: center; color: #999; min-height: 50px; display: flex; align-items: center; justify-content: center;',
        // Make it non-editable visually
        contenteditable: 'false',
      },
      // Display the ad slot ID or a generic message
      `Ad Placeholder ${adSlotId ? `(Slot: ${adSlotId})` : '(No Slot ID)'}`
    ]]
  },

  addCommands() {
    return {
      setAdPlaceholder: (attributes) => ({ commands }) => {
          // Ensure adSlotId is provided, or handle default/error
          if (!attributes.adSlotId) {
              console.warn("Attempted to insert ad placeholder without an adSlotId.");
              // Optionally insert with a default or show an error
              // return false; // Or prevent insertion
          }
        return commands.insertContent({
          type: this.name,
          attrs: attributes, // Pass the provided attributes
        })
      },
      // Optional: Command to update attributes if needed later (e.g., from a node view)
      updateAdPlaceholderAttributes: (attributes) => ({ commands }) => {
         return commands.updateAttributes(this.name, attributes);
      }
    }
  }
})