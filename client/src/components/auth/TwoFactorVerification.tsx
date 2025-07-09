import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Shield, Key, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const verifySchema = z.object({
  token: z.string().min(6, 'Token must be at least 6 characters'),
});

interface TwoFactorVerificationProps {
  onSuccess: (data: any) => void;
  onError: (error: string) => void;
  isLoading?: boolean;
}

export default function TwoFactorVerification({ onSuccess, onError, isLoading }: TwoFactorVerificationProps) {
  const [useBackupCode, setUseBackupCode] = useState(false);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      token: '',
    },
  });

  const handleSubmit = async (data: { token: string }) => {
    try {
      const response = await fetch('/api/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: data.token,
          isBackupCode: useBackupCode
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Verification failed');
      }

      const result = await response.json();
      
      if (result.data?.backupCodesRemaining !== undefined) {
        toast({
          title: 'Backup Code Used',
          description: `${result.data.backupCodesRemaining} backup codes remaining`,
          variant: 'default',
        });
      }
      
      onSuccess(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Verification failed';
      onError(errorMessage);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardHeader className="space-y-6 pb-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-gradient-to-br from-primary to-primary/80 p-4 rounded-2xl shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">Two-Factor Authentication</h1>
              <p className="text-sm text-muted-foreground mt-2">
                {useBackupCode
                  ? 'Enter one of your backup codes to continue'
                  : 'Enter the 6-digit code from your authenticator app'
                }
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">
                      {useBackupCode ? 'Backup Code' : 'Verification Code'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={useBackupCode ? 'Enter backup code' : 'Enter 6-digit code'}
                        maxLength={useBackupCode ? 8 : 6}
                        className="h-12 px-4 text-center font-mono text-lg rounded-lg border-2 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                        autoComplete="one-time-code"
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 rounded-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                disabled={isLoading}
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => {
                    setUseBackupCode(!useBackupCode);
                    form.reset();
                  }}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {useBackupCode
                    ? 'Use authenticator app instead'
                    : 'Use backup code instead'
                  }
                </Button>
              </div>
            </form>
          </Form>

          {useBackupCode && (
            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-300">
                  <p className="font-medium mb-1">Important:</p>
                  <p>Each backup code can only be used once. After using this code, you'll have one fewer backup code available.</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        
        <div className="px-8 pb-8">
          <p className="text-sm text-center text-muted-foreground">
            Having trouble? Contact your administrator for assistance.
          </p>
        </div>
      </Card>
    </div>
  );
}