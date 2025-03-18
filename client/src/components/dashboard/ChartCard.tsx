import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, children, className }: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium text-gray-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
