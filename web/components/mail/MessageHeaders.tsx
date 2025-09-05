import { format } from 'date-fns';
import { Lock, AlertTriangle } from 'lucide-react'; // Using lucide-react icons

interface HeaderDetailsPopoverContentProps {
  from: string;
  to: string[];
  cc?: string[];
  date: string;
  subject?: string;
  mailedBy?: string;
  signedBy?: string;
  security?: string;
}

// This component is styled to precisely match the Gmail popover in the image.
export default function HeaderDetailsPopoverContent({
  from,
  to,
  cc = [],
  date,
  subject,
  mailedBy,
  signedBy,
  security = "Standard encryption (TLS)",
}: HeaderDetailsPopoverContentProps) {

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy, h:mm a");
    } catch {
      return dateString;
    }
  };

  return (
    <div className="text-sm text-gray-800 p-4">
      <table className="w-full text-left">
        <tbody>
          <tr>
            <td className="py-1 pr-4 font-normal text-gray-500 align-top">from:</td>
            <td className="py-1 font-medium">{from}</td>
          </tr>
          <tr>
            <td className="py-1 pr-4 font-normal text-gray-500 align-top">to:</td>
            <td className="py-1 font-medium">{to.join(', ')}</td>
          </tr>
          {cc.length > 0 && (
            <tr>
              <td className="py-1 pr-4 font-normal text-gray-500 align-top">cc:</td>
              <td className="py-1 font-medium">{cc.join(', ')}</td>
            </tr>
          )}
          <tr>
            <td className="py-1 pr-4 font-normal text-gray-500">date:</td>
            <td className="py-1 font-medium">{formatDate(date)}</td>
          </tr>
          <tr>
            <td className="py-1 pr-4 font-normal text-gray-500">subject:</td>
            <td className="py-1 font-medium">{subject}</td>
          </tr>
          {mailedBy && (
             <tr>
              <td className="py-1 pr-4 font-normal text-gray-500">mailed-by:</td>
              <td className="py-1 font-medium">{mailedBy}</td>
            </tr>
          )}
          {signedBy && (
             <tr>
              <td className="py-1 pr-4 font-normal text-gray-500">signed-by:</td>
              <td className="py-1 font-medium">{signedBy}</td>
            </tr>
          )}
           <tr>
              <td className="py-1 pr-4 font-normal text-gray-500">security:</td>
              <td className="py-1 font-medium flex items-center">
                <Lock className="w-4 h-4 mr-2 text-gray-600" />
                <span>{security} <a href="#" className="text-blue-600 hover:underline">Learn more</a></span>
              </td>
            </tr>
            {/* This stuff is coming soon :) */}
           {/* <tr>
              <td className="py-1 pr-4 font-normal text-gray-500 align-top">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-yellow-500" />
              </td>
              <td className="py-1 font-medium">
                Important according to DITMail.
              </td>
            </tr> */}
        </tbody>
      </table>
    </div>
  );
}