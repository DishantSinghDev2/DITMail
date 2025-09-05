import { XCircleIcon } from "@heroicons/react/24/solid";

interface FailureBannerProps {
  reason: string;
}

export default function FailureBanner({ reason }: FailureBannerProps) {
  return (
    <div className="rounded-md bg-red-50 p-4 mb-4 border border-red-200">
      <div className="flex">
        <div className="flex-shrink-0">
          <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">Delivery Incomplete</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>
              This message could not be delivered. The remote server responded with the following error:
            </p>
            <pre className="mt-2 font-mono text-xs bg-red-100 p-2 rounded">
              {reason}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}