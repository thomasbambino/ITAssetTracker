import { ReactNode } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Link } from 'wouter';
import { AnimatedCounter } from '@/components/ui/animated-counter';

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
    <Card className="overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 group">
      <CardContent className="p-0 flex-1">
        <div className="px-2 py-3 sm:px-4 sm:py-5 xl:px-6 h-full">
          <div className="flex items-center">
            <div className={`flex-shrink-0 rounded-md p-1.5 sm:p-2 transition-all duration-300 group-hover:scale-110 ${iconClass}`}>
              <div className="scale-75 sm:scale-100 transition-transform duration-300">
                {icon}
              </div>
            </div>
            <div className="ml-2 sm:ml-3 w-0 flex-1 min-w-0">
              <dl>
                <dt className={getTitleClassName(title)} title={title}>{title}</dt>
                <dd className="flex flex-col sm:flex-row sm:items-baseline">
                  <div className="text-lg sm:text-xl font-semibold text-foreground transition-colors duration-300 group-hover:text-primary">
                    <AnimatedCounter value={value} duration={800} />
                  </div>
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
      <CardFooter className="bg-muted px-2 py-1.5 sm:px-4 sm:py-2 xl:px-6 border-t mt-auto transition-colors duration-300 group-hover:bg-primary/5">
        <div className="text-xs sm:text-sm w-full">
          <Link href={footerLink} className="font-medium text-primary hover:opacity-90 truncate block transition-opacity duration-200">
            {footerText}
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
