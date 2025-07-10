import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonCard() {
  return (
    <Card className="overflow-hidden flex flex-col h-full animate-pulse">
      <CardContent className="p-0 flex-1">
        <div className="px-3 py-4 sm:px-4 sm:py-5 xl:px-6 h-full">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md p-2 sm:p-3">
              <Skeleton className="h-6 w-6 rounded" />
            </div>
            <div className="ml-3 sm:ml-5 w-0 flex-1 min-w-0">
              <dl>
                <dt>
                  <Skeleton className="h-4 w-24 mb-2" />
                </dt>
                <dd className="flex flex-col sm:flex-row sm:items-baseline">
                  <Skeleton className="h-8 w-16 mb-1 sm:mb-0" />
                  <Skeleton className="h-4 w-20 sm:ml-2" />
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted px-3 py-2 sm:px-4 sm:py-2 xl:px-6 border-t mt-auto">
        <div className="text-xs sm:text-sm w-full">
          <Skeleton className="h-4 w-20" />
        </div>
      </CardFooter>
    </Card>
  );
}