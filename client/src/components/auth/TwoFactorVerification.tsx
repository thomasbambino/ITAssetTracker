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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Two-Factor Authentication
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {useBackupCode
              ? 'Enter one of your backup codes'
              : 'Enter the 6-digit code from your authenticator app'
            }
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {useBackupCode ? <Key className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
              {useBackupCode ? 'Backup Code' : 'Verification Code'}
            </CardTitle>
            <CardDescription>
              {useBackupCode
                ? 'Enter one of your saved backup codes to access your account.'
                : 'Open your authenticator app and enter the current 6-digit code.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {useBackupCode ? 'Backup Code' : 'Verification Code'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={useBackupCode ? 'Enter backup code' : 'Enter 6-digit code'}
                          maxLength={useBackupCode ? 8 : 6}
                          className="text-center font-mono text-lg"
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
                  className="w-full"
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
                    className="text-sm"
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
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Important:</p>
                    <p>Each backup code can only be used once. After using this code, you'll have one fewer backup code available.</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Having trouble? Contact your administrator for assistance.
          </p>
        </div>
      </div>
    </div>
  );
}