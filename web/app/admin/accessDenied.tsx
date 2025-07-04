// /app/access-denied/page.tsx

import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

// A simple placeholder for your app's logo. 
// Replace this with your actual Logo component or an <Image> tag.
const DITMailLogo = () => (
  <svg
    className="h-8 w-auto text-blue-600"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M2.00299 5.883C2.00299 4.843 2.84499 4 3.88299 4H20.117C21.156 4 21.997 4.842 21.997 5.883L12.002 12.548L2.00299 5.883Z" />
    <path d="M22 8.125V18.117C22 19.157 21.158 20 20.118 20H3.882C2.842 20 2 19.158 2 18.118V8.125L11.498 14.375C11.77 14.553 12.23 14.553 12.502 14.375L22 8.125Z" />
  </svg>
);


// Set page metadata for the browser tab
export const metadata: Metadata = {
  title: 'Access Denied | DITMail Admin',
  description: 'You do not have permission to access this page.',
};

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-6">
        <div className="mx-auto mb-6">
          <Link href="/dashboard" aria-label="Go to DITMail Dashboard">
            <DITMailLogo />
          </Link>
        </div>
        
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
                href="/dashboard" // <-- IMPORTANT: Change this to your main dashboard route
                className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Return to Dashboard
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