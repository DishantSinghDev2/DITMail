"use client";

/**
 * A generic card skeleton for consistent loading states.
 */
const SkeletonCard = () => (
  <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md animate-pulse">
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
    <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
  </div>
);

/**
 * A skeleton loader that mimics the structure of the Admin Dashboard page.
 */
export const DashboardSkeleton = () => {
  return (
    <div>
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/4 animate-pulse"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2 mt-3 animate-pulse"></div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Lower Section Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-8">
        <div className="p-6 h-64 bg-white dark:bg-gray-800 rounded-lg shadow-md animate-pulse"></div>
        <div className="p-6 h-64 bg-white dark:bg-gray-800 rounded-lg shadow-md animate-pulse"></div>
      </div>
    </div>
  );
};

/**
 * A skeleton loader that mimics the structure of the User Management page.
 */
export const UserTableSkeleton = () => {
  return (
    <div>
       {/* Header and Search Skeleton */}
      <div className="mb-8 flex justify-between items-center">
        <div>
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-64 mt-3 animate-pulse"></div>
        </div>
        <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded-md w-24 animate-pulse"></div>
      </div>
      <div className="mb-6">
        <div className="h-10 bg-gray-200 dark:bg-gray-600 rounded-md w-full max-w-md animate-pulse"></div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden animate-pulse">
        {/* Table Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 hidden md:flex">
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4 ml-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4 ml-4"></div>
        </div>
        {/* Table Rows */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {[...Array(5)].map((_, i) => (
                 <div key={i} className="p-4 flex items-center space-x-4">
                    <div className="h-10 w-10 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/5"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-4/5"></div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export const DomainsTableSkeleton = () => {
  return (
    <div>
      {/* Header and Add button Skeleton */}
      <div className="mb-8 flex justify-between items-center">
        <div>
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-64 mt-3 animate-pulse"></div>
        </div>
        <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded-md w-40 animate-pulse"></div>
      </div>

      {/* Domain Cards Skeleton */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow-md animate-pulse">
                <div className="flex items-center space-x-4">
                    <div className="h-6 w-6 bg-gray-300 dark:bg-gray-700 rounded-full"></div> {/* Status icon */}
                    <div>
                        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-48 mb-2"></div> {/* Domain name */}
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-32"></div> {/* Status text */}
                    </div>
                </div>
                <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded-md w-20"></div> {/* Verify button */}
            </div>
        ))}
      </div>
    </div>
  );
};
