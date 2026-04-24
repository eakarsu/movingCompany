export function SkeletonLine({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b">
        <SkeletonLine className="h-8 w-48" />
      </div>
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-50">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-6 py-3">
                <SkeletonLine className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-t">
              {Array.from({ length: cols }).map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  <SkeletonLine className="h-4 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
      <SkeletonLine className="h-6 w-1/3 mb-4" />
      <SkeletonLine className="h-4 w-full mb-2" />
      <SkeletonLine className="h-4 w-2/3 mb-2" />
      <SkeletonLine className="h-4 w-1/2" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <TableSkeleton rows={5} cols={4} />
    </div>
  );
}
