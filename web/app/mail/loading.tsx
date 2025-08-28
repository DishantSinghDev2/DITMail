import { LoaderCircle } from "lucide-react";

export default function MailLoading() {
  return (
    <div className="flex h-full flex-1 items-center justify-center p-4">
      <div className="flex flex-col items-center justify-center gap-4" role="status" aria-live="polite">
        <LoaderCircle className="h-12 w-12 animate-spin text-blue-600" />
        <p className=" font-medium text-gray-600">
          Loading messages...
        </p>
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
}