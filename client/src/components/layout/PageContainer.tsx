import { ReactNode } from 'react';

interface PageContainerProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PageContainer({ title, description, actions, children }: PageContainerProps) {
  return (
    <div className="px-4 py-4 md:py-6 sm:px-6 lg:px-8 mt-16 md:mt-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        
        {/* Actions */}
        {actions && (
          <div className="mt-3 md:mt-0 flex flex-wrap gap-2">
            {actions}
          </div>
        )}
      </div>
      
      {/* Content */}
      {children}
    </div>
  );
}