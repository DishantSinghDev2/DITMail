"use client";

import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDownIcon } from '@heroicons/react/24/solid';

interface MessageHeadersProps {
  from: string;
  to: string[];
  cc?: string[];
  date: string;
  subject?: string;
  mailedBy?: string;
  signedBy?: string;
  security?: string;
}

export default function MessageHeaders({
  from,
  to,
  cc = [],
  date,
  subject,
  mailedBy,
  signedBy,
  security = "Standard encryption (TLS)",
}: MessageHeadersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy, h:mm a");
    } catch {
      return dateString;
    }
  };

  return (
    <div className="text-sm text-gray-600 relative">
      {!isExpanded && (
        <button onClick={() => setIsExpanded(true)} className="absolute top-0 right-0 p-1 text-gray-400 hover:text-gray-600">
          <ChevronDownIcon className="h-5 w-5" />
        </button>
      )}

      {isExpanded ? (
        <table className="w-full text-left">
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="py-1 pr-2 font-medium text-gray-500 align-top">from:</td>
              <td className="py-1 text-gray-800">{from}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-1 pr-2 font-medium text-gray-500 align-top">to:</td>
              <td className="py-1 text-gray-800">{to.join(', ')}</td>
            </tr>
            {cc.length > 0 && (
              <tr className="border-b border-gray-200">
                <td className="py-1 pr-2 font-medium text-gray-500 align-top">cc:</td>
                <td className="py-1 text-gray-800">{cc.join(', ')}</td>
              </tr>
            )}
            <tr className="border-b border-gray-200">
              <td className="py-1 pr-2 font-medium text-gray-500">date:</td>
              <td className="py-1 text-gray-800">{formatDate(date)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-1 pr-2 font-medium text-gray-500">subject:</td>
              <td className="py-1 text-gray-800">{subject}</td>
            </tr>
            {mailedBy && (
               <tr className="border-b border-gray-200">
                <td className="py-1 pr-2 font-medium text-gray-500">mailed-by:</td>
                <td className="py-1 text-gray-800">{mailedBy}</td>
              </tr>
            )}
            {signedBy && (
               <tr className="border-b border-gray-200">
                <td className="py-1 pr-2 font-medium text-gray-500">signed-by:</td>
                <td className="py-1 text-gray-800">{signedBy}</td>
              </tr>
            )}
             <tr className="border-b border-gray-200">
                <td className="py-1 pr-2 font-medium text-gray-500">security:</td>
                <td className="py-1 text-gray-800">{security}</td>
              </tr>
          </tbody>
        </table>
      ) : (
        <div className="truncate pr-8">
          <span className="font-medium text-gray-800">To: {to.join(', ')}</span>
        </div>
      )}
    </div>
  );
}