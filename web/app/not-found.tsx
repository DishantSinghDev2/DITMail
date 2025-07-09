// app/not-found.tsx
import Link from 'next/link';
import { MailQuestion, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
      <div className="w-full max-w-md text-center">
        <MailQuestion
          className="mx-auto h-20 w-20 text-blue-500 dark:text-blue-400"
          strokeWidth={1.5}
        />
        <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 sm:text-6xl">
          404
        </h1>
        <h2 className="mt-4 text-2xl font-semibold text-slate-700 dark:text-slate-300">
          This conversation is lost.
        </h2>
        <p className="mt-3 text-base text-slate-500 dark:text-slate-400">
          Sorry, we couldn't find the page you were looking for. It might have been moved, deleted, or you may have mistyped the address.
        </p>
        <Link href="/">
          <button
            className="mt-8 inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Return to Inbox
          </button>
        </Link>
      </div>
    </div>
  );
}