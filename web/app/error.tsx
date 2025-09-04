// app/error.tsx
'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // For production, you would log the error to a reporting service
    // like Sentry, LogRocket, etc.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-lg dark:border-slate-700 dark:bg-slate-800">
        <AlertTriangle
          className="mx-auto h-16 w-16 text-red-500 dark:text-red-400"
          strokeWidth={1.5}
        />
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
          Something went wrong
        </h1>
        <p className="mt-4 text-slate-600 dark:text-slate-300">
          We've encountered a temporary glitch. Your message data is safe. You can try to refresh the page or return to your inbox.
        </p>
        
        {/* Optional: Show error digest in development for easier debugging */}
        {process.env.NODE_ENV === 'development' && error.digest && (
          <div className="mt-4 rounded-md bg-slate-100 p-3 text-left text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-400">
            <p className="font-mono">Error Digest: {error.digest}</p>
          </div>
        )}

        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            onClick={() => reset()}
            className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 sm:w-auto"
          >
            <RotateCw className="mr-2 h-5 w-5" />
            Try Again
          </button>
          <Link href="/mail/inbox" className="w-full sm:w-auto">
            <button
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-transparent px-6 py-3 text-base font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:ring-offset-slate-800"
            >
              <Home className="mr-2 h-5 w-5" />
              Go to Inbox
            </button>
          </Link>
        </div>
      </div>
      <footer className="mt-8 text-sm text-slate-500 dark:text-slate-400">
        If the problem persists, please contact support.
      </footer>
    </div>
  );
}