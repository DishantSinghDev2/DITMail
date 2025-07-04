// /app/access-denied/page.tsx

import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';



// Set page metadata for the browser tab
export const metadata: Metadata = {
  title: 'Access Denied | DITMail Admin',
  description: 'You do not have permission to access this page.',
};

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-6">
        
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col items-center text-center">
            
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <ShieldAlert className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>

            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
              Access Denied
            </h1>
            
            <p className="mt-3 text-base text-gray-600 dark:text-gray-400">
              Your account does not have the necessary permissions to view this page.
            </p>
            
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
              Please contact your administrator if you believe this is an error.
            </p>

            <div className="mt-8 w-full">
              <Link
                href="/mail"
                className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Return to Mail
              </Link>
            </div>

          </div>
        </div>
        
        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Need help?{' '}
          <a href="mailto:support@ditmail.com" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}