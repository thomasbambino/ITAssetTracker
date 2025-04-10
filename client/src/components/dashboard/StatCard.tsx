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
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className={`flex-shrink-0 rounded-md p-3 ${iconClass}`}>
              {icon}
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-muted-foreground truncate">{title}</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-foreground">{value}</div>
                  {additionalInfo && (
                    <p 
                      className={`ml-2 flex items-baseline text-sm font-semibold ${
                        additionalInfo.type === 'success' 
                          ? 'text-green-600' 
                          : additionalInfo.type === 'warning'
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      <span>{additionalInfo.text}</span>
                    </p>
                  )}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted px-4 py-2 sm:px-6 border-t">
        <div className="text-sm">
          <Link href={footerLink} className="font-medium text-primary hover:opacity-90">
            {footerText}
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
