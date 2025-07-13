import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { PageContainer } from '@/components/layout/PageContainer';
import { Shield, Key, User, Loader2, Camera, Upload, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

interface TwoFactorStatus {
  enabled: boolean;
  backupCodesCount: number;
}

export default function UserSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get 2FA status
  const { data: twoFactorStatus, isLoading: is2FALoading } = useQuery<TwoFactorStatus>({
    queryKey: ['/api/2fa/status'],
  });

  // Password change form
  const form = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof changePasswordSchema>) => {
      const response = await apiRequest({
        method: 'POST',
        url: '/api/auth/change-password',
        data: {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        },
      });
      return response;
    },
    onSuccess: () => {
      form.reset();
      toast({
        title: 'Password Changed',
        description: 'Your password has been successfully updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Password Change Failed',
        description: error.message || 'Failed to change password',
        variant: 'destructive',
      });
    },
  });

  const handlePasswordSubmit = (data: z.infer<typeof changePasswordSchema>) => {
    changePasswordMutation.mutate(data);
  };

  // Photo upload mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      
      const response = await fetch(`/api/users/${user?.id}/photo`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload photo');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Photo Uploaded',
        description: 'Your profile photo has been updated successfully.',
      });
      // Force immediate refresh of user data
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      queryClient.refetchQueries({ queryKey: ['/api/users/me'] });
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload photo',
        variant: 'destructive',
      });
    },
  });

  // Photo delete mutation
  const deletePhotoMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest({
        method: 'DELETE',
        url: `/api/users/${user?.id}/photo`,
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: 'Photo Deleted',
        description: 'Your profile photo has been removed.',
      });
      // Invalidate and refetch user data to refresh profile photo
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      queryClient.refetchQueries({ queryKey: ['/api/users/me'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete photo',
        variant: 'destructive',
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Invalid File Type',
          description: 'Please select a JPEG, PNG, or GIF image.',
          variant: 'destructive',
        });
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Please select an image smaller than 5MB.',
          variant: 'destructive',
        });
        return;
      }
      
      uploadPhotoMutation.mutate(file);
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeletePhoto = () => {
    deletePhotoMutation.mutate();
  };

  return (
    <PageContainer
      title="My Settings"
      description="Manage your account settings and security preferences"
    >
      <Tabs defaultValue="security" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>
        
        <TabsContent value="security" className="mt-0">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account with 2FA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {is2FALoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg space-y-3 sm:space-y-0">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">Two-Factor Authentication</h4>
                      <p className="text-sm text-muted-foreground">
                        {twoFactorStatus?.enabled 
                          ? `2FA is enabled. ${twoFactorStatus.backupCodesCount} backup codes remaining.`
                          : 'Secure your account with authenticator app verification'
                        }
                      </p>
                    </div>
                    <Link href="/settings/two-factor">
                      <Button variant="outline" className="w-full sm:w-auto">
                        <Shield className="h-4 w-4 mr-2" />
                        {twoFactorStatus?.enabled ? 'Manage 2FA' : 'Setup 2FA'}
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your account password for better security
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
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
                    
                    <FormField
                      control={form.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="Enter your new password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="Confirm your new password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      disabled={changePasswordMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      {changePasswordMutation.isPending ? 'Changing Password...' : 'Change Password'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="account" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                View your account information. Contact an administrator to make changes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Photo Section */}
              <div className="space-y-4">
                <Label>Profile Photo</Label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-2 border-border overflow-hidden">
                      {user?.profilePhoto ? (
                        <img 
                          src={user.profilePhoto} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <button
                      onClick={handlePhotoClick}
                      className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={uploadPhotoMutation.isPending}
                    >
                      {uploadPhotoMutation.isPending ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handlePhotoClick}
                      disabled={uploadPhotoMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadPhotoMutation.isPending ? 'Uploading...' : 'Upload Photo'}
                    </Button>
                    {user?.profilePhoto && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleDeletePhoto}
                        disabled={deletePhotoMutation.isPending}
                        className="w-full sm:w-auto"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {deletePhotoMutation.isPending ? 'Deleting...' : 'Remove'}
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload a profile photo (JPEG, PNG, or GIF, max 5MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <Label htmlFor="display-name">Display Name</Label>
                <Input 
                  id="display-name" 
                  value={user ? `${user.firstName} ${user.lastName}` : 'Loading...'} 
                  disabled 
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Contact your administrator to update your name or email address.
                </p>
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <Label htmlFor="email-address">Email Address</Label>
                <Input 
                  id="email-address" 
                  value={user?.email || 'Loading...'} 
                  disabled 
                  className="bg-muted"
                />
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <Label htmlFor="user-role">Role</Label>
                <Input 
                  id="user-role" 
                  value={user?.role ? (
                    user.role === 'admin' ? 'Administrator' :
                    user.isManager ? 'Manager' :
                    'User'
                  ) : 'Loading...'} 
                  disabled 
                  className="bg-muted"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}