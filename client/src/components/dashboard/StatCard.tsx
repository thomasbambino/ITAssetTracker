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
  // Dynamic font size based on title length
  const getTitleClassName = (title: string) => {
    if (title.length > 15) {
      return "text-xs font-medium text-muted-foreground truncate";
    } else if (title.length > 12) {
      return "text-xs sm:text-sm font-medium text-muted-foreground truncate";
    } else {
      return "text-sm font-medium text-muted-foreground truncate";
    }
  };

  // Dynamic font size for additional info
  const getAdditionalInfoClassName = (text: string, type: string) => {
    const baseClasses = `mt-1 sm:mt-0 sm:ml-2 flex items-baseline font-semibold ${
      type === 'success' 
        ? 'text-green-600' 
        : type === 'warning'
        ? 'text-yellow-600'
        : 'text-red-600'
    }`;
    
    if (text.length > 12) {
      return `${baseClasses} text-xs`;
    } else {
      return `${baseClasses} text-xs sm:text-sm`;
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="px-3 py-4 sm:px-4 sm:py-5 xl:px-6">
          <div className="flex items-center">
            <div className={`flex-shrink-0 rounded-md p-2 sm:p-3 ${iconClass}`}>
              {icon}
            </div>
            <div className="ml-3 sm:ml-5 w-0 flex-1 min-w-0">
              <dl>
                <dt className={getTitleClassName(title)} title={title}>{title}</dt>
                <dd className="flex flex-col sm:flex-row sm:items-baseline">
                  <div className="text-xl sm:text-2xl font-semibold text-foreground">{value}</div>
                  {additionalInfo && (
                    <p className={getAdditionalInfoClassName(additionalInfo.text, additionalInfo.type)}>
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
