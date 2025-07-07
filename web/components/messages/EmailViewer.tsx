'use client';

import { useState, useMemo } from 'react';
import DOMPurify from 'dompurify';

interface EmailViewerProps {
  html: string;
  isSpam?: boolean;
}

export default function EmailViewer({ html, isSpam = false }: EmailViewerProps) {
  const [showBlocked, setShowBlocked] = useState(!isSpam);

  const processedHtml = useMemo(() => {
    let cleanHtml = html
    if (!showBlocked && isSpam) {
      // Hide <img> and <a> visually (not remove them)
      cleanHtml = cleanHtml
        .replace(/<img[^>]*>/gi, `<div class="spam-img-placeholder"></div>`)
        .replace(/<a [^>]*>(.*?)<\/a>/gi, `<span class="spam-link">🔗 Link blocked</span>`);
    }

    return cleanHtml;
  }, [html, isSpam, showBlocked]);

  return (
    <div className="relative border rounded-lg p-4 bg-white dark:bg-gray-900 shadow-sm">
      {isSpam && !showBlocked && (
        <div className="mb-4 text-sm text-yellow-900 dark:text-yellow-100 bg-yellow-100 dark:bg-yellow-800 border border-yellow-400 dark:border-yellow-700 rounded-md p-3">
          ⚠️ This message was flagged as spam. Images and links have been blocked.
          <button
            onClick={() => setShowBlocked(true)}
            className="ml-3 text-blue-600 dark:text-blue-300 underline font-medium"
          >
            Show anyway
          </button>
        </div>
      )}

      <div
        className="prose dark:prose-invert max-w-none text-sm email-viewer"
        dangerouslySetInnerHTML={{ __html: processedHtml }}
      />
    </div>
  );
}
