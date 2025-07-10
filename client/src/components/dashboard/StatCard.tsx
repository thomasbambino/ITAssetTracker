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
        <div className="px-3 py-4 sm:px-4 sm:py-5">
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className={`flex-shrink-0 rounded-md p-2 ${iconClass}`}>
                {icon}
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold text-foreground">{value}</div>
              </div>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground" title={title}>{title}</dt>
              {additionalInfo && (
                <p 
                  className={`text-xs font-semibold ${
                    additionalInfo.type === 'success' 
                      ? 'text-green-600' 
                      : additionalInfo.type === 'warning'
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}
                >
                  {additionalInfo.text}
                </p>
              )}
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
