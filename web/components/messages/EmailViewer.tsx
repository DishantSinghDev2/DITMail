'use client';

import DOMPurify from 'dompurify';
import { useState, useMemo } from 'react';

interface EmailViewerProps {
  html: string;
  isSpam?: boolean;
}

export default function EmailViewer({ html, isSpam = false }: EmailViewerProps) {
  const [showBlocked, setShowBlocked] = useState(false);

  const sanitizedHTML = useMemo(() => {
    let safeHTML = html;

    // Basic sanitization to remove scripts and unsafe elements
    safeHTML = DOMPurify.sanitize(safeHTML, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['script', 'iframe', 'style', 'object'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'style'],
    });

    if (isSpam && !showBlocked) {
      // Hide images and links by replacing their tags
      safeHTML = safeHTML
        .replace(/<img [^>]*>/gi, `<div class="bg-gray-200 dark:bg-gray-700 text-center text-xs text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md my-2">[Image blocked due to spam]</div>`)
        .replace(/<a [^>]*>(.*?)<\/a>/gi, `<span class="text-blue-600 dark:text-blue-400 underline cursor-not-allowed">[Link blocked]</span>`);
    }

    return safeHTML;
  }, [html, isSpam, showBlocked]);

  return (
    <div className="relative border rounded-lg p-4 bg-white dark:bg-gray-900">
      {isSpam && !showBlocked && (
        <div className="mb-4 text-sm text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-800 border border-yellow-400 dark:border-yellow-700 rounded p-2">
          This message was flagged as spam. Images and links are blocked for your safety.
          <button
            onClick={() => setShowBlocked(true)}
            className="ml-3 text-blue-600 dark:text-blue-300 underline"
          >
            Show anyway
          </button>
        </div>
      )}
      <div
        className="prose dark:prose-invert max-w-none text-sm"
        dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
      />
    </div>
  );
}
