'use client';

import { useState, useEffect, useRef } from 'react';

interface EmailViewerProps {
  html: string;
  isSpam?: boolean;
}

export default function EmailViewer({ html, isSpam = false }: EmailViewerProps) {
  // By default, we trust the content unless it's explicitly marked as spam.
  const [trustContent, setTrustContent] = useState(!isSpam);
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!viewerRef.current) return;

    // Use the browser's built-in parser to safely handle the HTML string.
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Manipulate the DOM based on whether the content is trusted.
    if (trustContent) {
      // --- Safe/Trusted Content Logic ---
      // Find all links and make them open in a new tab for security.
      const links = doc.querySelectorAll('a');
      links.forEach(link => {
        link.setAttribute('target', '_blank');
        // Add rel="noopener noreferrer" for security when using target="_blank"
        link.setAttribute('rel', 'noopener noreferrer');
      });
    } else {
      // --- Untrusted/Spam Content Logic ---
      // Neuter all links by removing their href attribute. This keeps the text and styles.
      const links = doc.querySelectorAll('a');
      links.forEach(link => {
        link.removeAttribute('href');
        link.style.textDecoration = 'none'; // Optional: remove underline for disabled links
        link.style.cursor = 'default';      // Optional: change cursor
        link.onclick = (e) => e.preventDefault(); // Prevent any JS-based navigation
      });

      // Neuter all images by blanking their src. This preserves layout and styles.
      const images = doc.querySelectorAll('img');
      images.forEach(img => {
        img.dataset.originalSrc = img.src; // Store original src in case we want to restore it
        img.src = ''; // Blank out the source to prevent loading
        img.style.display = 'none'; // Or hide it completely
      });
    }

    // Clear the viewer and inject the sanitized HTML.
    // We use doc.body.innerHTML because parseFromString wraps the content in <html><body>...</body></html>
    viewerRef.current.innerHTML = doc.body.innerHTML;

  }, [html, trustContent]);

  return (
    <div className="relative border rounded-lg p-4 bg-white dark:bg-gray-900 shadow-sm">
      {isSpam && !trustContent && (
        <div className="mb-4 text-sm text-yellow-900 dark:text-yellow-100 bg-yellow-100 dark:bg-yellow-800 border border-yellow-400 dark:border-yellow-700 rounded-md p-3 flex items-center justify-between">
          <span>
            ⚠️ For your security, remote images and links in this message have been blocked.
          </span>
          <button
            onClick={() => setTrustContent(true)}
            className="ml-4 px-3 py-1 text-xs text-blue-700 dark:text-blue-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 font-medium"
          >
            Show Content
          </button>
        </div>
      )}

      {/* This div will be populated by the useEffect hook */}
      <div
        ref={viewerRef}
        className="prose dark:prose-invert max-w-none text-sm email-viewer"
      />
    </div>
  );
}