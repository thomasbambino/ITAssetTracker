import { ReactNode } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Link } from 'wouter';

interface StatCardProps {
  icon: ReactNode;
  iconClass: string;
  title: string;
  value: number;
  footerText?: string;
  footerLink?: string;
  additionalInfo?: {
    text: string;
    type: 'success' | 'warning' | 'error';
  };
}

export function StatCard({
  icon,
  iconClass,
  title,
  value,
  footerText = 'View details',
  footerLink = '#',
  additionalInfo,
}: StatCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="px-3 py-4 sm:px-4 sm:py-5 xl:px-6">
          <div className="flex items-center">
            <div className={`flex-shrink-0 rounded-md p-1.5 sm:p-2 ${iconClass}`}>
              {icon}
            </div>
            <div className="ml-3 sm:ml-5 w-0 flex-1 min-w-0">
              <dl>
                <dt className="text-xs sm:text-sm font-medium text-muted-foreground truncate" title={title}>{title}</dt>
                <dd className="flex flex-col sm:flex-row sm:items-baseline">
                  <div className="text-xl sm:text-2xl font-semibold text-foreground">{value}</div>
                  {additionalInfo && (
                    <p 
                      className={`mt-1 sm:mt-0 sm:ml-2 flex items-baseline text-xs sm:text-sm font-semibold ${
                        additionalInfo.type === 'success' 
                          ? 'text-green-600' 
                          : additionalInfo.type === 'warning'
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      <span className="truncate">{additionalInfo.text}</span>
                    </p>
                  )}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted px-3 py-2 sm:px-4 sm:py-2 xl:px-6 border-t">
        <div className="text-xs sm:text-sm w-full">
          <Link href={footerLink} className="font-medium text-primary hover:opacity-90 truncate block">
            {footerText}
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
