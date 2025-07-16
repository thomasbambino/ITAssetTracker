import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ProblemReportForm } from './ProblemReportForm';
import ErrorBoundary from '@/components/ErrorBoundary';

interface SafeProblemReportFormProps {
  onSuccess?: () => void;
}

const ProblemReportErrorFallback = ({ error, resetError }: { error: Error; resetError: () => void }) => {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          Problem Report Error
        </CardTitle>
        <CardDescription className="text-red-600">
          An error occurred while loading the problem report form. Please try again.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {process.env.NODE_ENV === 'development' && (
          <div className="p-3 bg-red-100 rounded-md border border-red-200">
            <h4 className="font-medium text-red-800 mb-2">Error Details:</h4>
            <pre className="text-sm text-red-700 overflow-auto max-h-32">
              {error.toString()}
            </pre>
          </div>
        )}
        <div className="flex gap-2">
          <Button onClick={resetError} variant="outline" className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button onClick={() => window.location.reload()} variant="default" className="flex-1">
            Reload Page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export function SafeProblemReportForm({ onSuccess }: SafeProblemReportFormProps) {
  return (
    <ErrorBoundary fallback={ProblemReportErrorFallback}>
      <ProblemReportForm onSuccess={onSuccess} />
    </ErrorBoundary>
  );
}