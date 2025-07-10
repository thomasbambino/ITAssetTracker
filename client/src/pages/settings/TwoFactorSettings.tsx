import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Copy, RotateCcw, QrCode, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const verifySetupSchema = z.object({
  token: z.string().length(6, 'Token must be 6 digits'),
});

const disableTwoFactorSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
});

interface TwoFactorStatus {
  enabled: boolean;
  backupCodesCount: number;
}

interface SetupData {
  secret: string;
  qrCodeDataUrl: string;
  manualEntryKey: string;
  issuer: string;
}

export default function TwoFactorSettings() {
  const [isSetupDialogOpen, setIsSetupDialogOpen] = useState(false);
  const [isDisableDialogOpen, setIsDisableDialogOpen] = useState(false);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update queries when backup codes dialog closes
  useEffect(() => {
    if (!showBackupCodes && backupCodes.length > 0) {
      queryClient.invalidateQueries({ queryKey: ['/api/2fa/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
    }
  }, [showBackupCodes, backupCodes.length, queryClient]);

  // Get 2FA status
  const { data: status, isLoading } = useQuery({
    queryKey: ['/api/2fa/status'],
    staleTime: 0, // Force fresh data
    gcTime: 0, // Don't cache (updated from cacheTime)
  });

  // Extract data from nested response
  const statusData = status?.data || status;

  // Setup form
  const setupForm = useForm({
    resolver: zodResolver(verifySetupSchema),
    defaultValues: {
      token: '',
    },
  });

  // Disable form
  const disableForm = useForm({
    resolver: zodResolver(disableTwoFactorSchema),
    defaultValues: {
      currentPassword: '',
    },
  });

  // Start 2FA setup
  const setupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/2fa/setup');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to setup 2FA');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setSetupData(data.data);
      setIsSetupDialogOpen(true);
    },
    onError: (error: Error) => {
      toast({
        title: 'Setup Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Verify setup and enable 2FA
  const verifySetupMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await fetch('/api/2fa/verify-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to verify setup');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setBackupCodes(data.data.backupCodes);
      setIsSetupDialogOpen(false);
      // Show backup codes dialog after setup dialog closes
      setTimeout(() => {
        setShowBackupCodes(true);
      }, 50);
      toast({
        title: 'Two-Factor Authentication Enabled',
        description: 'Your account is now protected with 2FA.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Verification Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Disable 2FA
  const disableMutation = useMutation({
    mutationFn: async (currentPassword: string) => {
      const response = await fetch('/api/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to disable 2FA');
      }
      return response.json();
    },
    onSuccess: () => {
      setIsDisableDialogOpen(false);
      disableForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/2fa/status'] });
      toast({
        title: 'Two-Factor Authentication Disabled',
        description: 'Your account no longer uses 2FA.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Disable Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Regenerate backup codes
  const regenerateBackupCodesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/2fa/regenerate-backup-codes', {
        method: 'POST',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to regenerate backup codes');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setBackupCodes(data.data.backupCodes);
      setShowBackupCodes(true);
      queryClient.invalidateQueries({ queryKey: ['/api/2fa/status'] });
      toast({
        title: 'Backup Codes Regenerated',
        description: 'New backup codes have been generated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Copied to clipboard',
    });
  };

  const copyAllBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    toast({
      title: 'Backup Codes Copied',
      description: 'All backup codes copied to clipboard',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Two-Factor Authentication</h1>
        <p className="text-muted-foreground">
          Add an extra layer of security to your account with two-factor authentication.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication Status
          </CardTitle>
          <CardDescription>
            Two-factor authentication helps keep your account secure by requiring a second verification step when signing in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>Status:</span>
              <Badge variant={statusData?.enabled ? 'default' : 'secondary'}>
                {statusData?.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            
            {statusData?.enabled ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => regenerateBackupCodesMutation.mutate()}
                  disabled={regenerateBackupCodesMutation.isPending}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Regenerate Backup Codes
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setIsDisableDialogOpen(true)}
                >
                  Disable 2FA
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setupMutation.mutate()}
                disabled={setupMutation.isPending}
              >
                <Shield className="h-4 w-4 mr-2" />
                Enable 2FA
              </Button>
            )}
          </div>

          {statusData?.enabled && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                You have <strong>{statusData.backupCodesCount}</strong> backup codes remaining.
                Backup codes can be used to access your account if you lose your authenticator device.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={isSetupDialogOpen} onOpenChange={setIsSetupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Setup Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app, then enter the 6-digit code to verify.
            </DialogDescription>
          </DialogHeader>
          
          {setupData && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg">
                  <img 
                    src={setupData.qrCodeDataUrl} 
                    alt="2FA QR Code" 
                    className="w-48 h-48"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Manual Entry Key</Label>
                <div className="flex mt-1">
                  <Input
                    value={setupData.manualEntryKey}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2"
                    onClick={() => copyToClipboard(setupData.manualEntryKey)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Form {...setupForm}>
                <form onSubmit={setupForm.handleSubmit((data) => verifySetupMutation.mutate(data.token))} className="space-y-4">
                  <FormField
                    control={setupForm.control}
                    name="token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Code</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter 6-digit code"
                            maxLength={6}
                            className="text-center font-mono"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsSetupDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={verifySetupMutation.isPending}
                      className="flex-1"
                    >
                      Verify & Enable
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={isDisableDialogOpen} onOpenChange={setIsDisableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your current password to disable two-factor authentication.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...disableForm}>
            <form onSubmit={disableForm.handleSubmit((data) => disableMutation.mutate(data.currentPassword))} className="space-y-4">
              <FormField
                control={disableForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Enter your current password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDisableDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={disableMutation.isPending}
                  className="flex-1"
                >
                  Disable 2FA
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Backup Codes</DialogTitle>
            <DialogDescription>
              Save these backup codes in a secure location. Each code can only be used once.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span>{code}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(code)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={copyAllBackupCodes}
                className="flex-1"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy All
              </Button>
              <Button
                onClick={() => setShowBackupCodes(false)}
                className="flex-1"
              >
                Done
              </Button>
            </div>
            
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Important:</p>
                <p>Store these codes safely. They won't be shown again and are your only way to access your account if you lose your authenticator device.</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}