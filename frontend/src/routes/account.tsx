import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Fingerprint, Trash2, Edit2, Plus, LogOut, Save, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { ProtectedRoute } from '@/components/protectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { usePasskey } from '@/hooks/usePasskey';
import { authApi } from '@/api/auth';
import { userProfileUpdateSchema, type UserProfileUpdateFormData } from '@/lib/validations/auth';
import type { Passkey } from '@/types/auth';

export const Route = createFileRoute('/account')({
  component: () => (
    <ProtectedRoute>
      <AccountPage />
    </ProtectedRoute>
  ),
});

function AccountPage() {
  const { user, logout, refetchUser } = useAuth();
  const { registerPasskey, isLoading: passkeyLoading } = usePasskey();
  const queryClient = useQueryClient();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showAddPasskeyDialog, setShowAddPasskeyDialog] = useState(false);
  const [showRenamePasskeyDialog, setShowRenamePasskeyDialog] = useState(false);
  const [showDeletePasskeyDialog, setShowDeletePasskeyDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [selectedPasskey, setSelectedPasskey] = useState<Passkey | null>(null);
  const [passkeyLabel, setPasskeyLabel] = useState('');

  // Profile update form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<UserProfileUpdateFormData>({
    resolver: zodResolver(userProfileUpdateSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      sex: user?.sex as 'M' | 'F' | 'O' | undefined,
    },
  });

  const selectedSex = watch('sex');

  // Fetch user's passkeys
  const { data: passkeys = [] } = useQuery({
    queryKey: ['passkeys'],
    queryFn: authApi.getPasskeys,
  });

  // Fetch user's providers
  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: authApi.getUserProviders,
  });

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: UserProfileUpdateFormData) => authApi.updateUser(data),
    onSuccess: () => {
      refetchUser();
      setIsEditingProfile(false);
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update profile');
    },
  });

  // Add passkey mutation
  const addPasskeyMutation = useMutation({
    mutationFn: async (label: string) => {
      await registerPasskey(label);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passkeys'] });
      setShowAddPasskeyDialog(false);
      setPasskeyLabel('');
    },
  });

  // Rename passkey mutation
  const renamePasskeyMutation = useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) => authApi.updatePasskeyLabel(id, label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passkeys'] });
      setShowRenamePasskeyDialog(false);
      setSelectedPasskey(null);
      setPasskeyLabel('');
      toast.success('Passkey renamed');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to rename passkey');
    },
  });

  // Delete passkey mutation
  const deletePasskeyMutation = useMutation({
    mutationFn: (id: string) => authApi.deletePasskey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passkeys'] });
      setShowDeletePasskeyDialog(false);
      setSelectedPasskey(null);
      toast.success('Passkey deleted');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete passkey');
    },
  });

  // Disconnect provider mutation
  const disconnectProviderMutation = useMutation({
    mutationFn: (provider: string) => authApi.disconnectProvider(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      toast.success('Provider disconnected');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to disconnect provider');
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: authApi.deleteAccount,
    onSuccess: async () => {
      toast.success('Account deleted');
      await logout();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete account');
    },
  });

  const handleAddPasskey = async () => {
    if (!passkeyLabel.trim()) {
      toast.error('Please enter a label for your passkey');
      return;
    }
    await addPasskeyMutation.mutateAsync(passkeyLabel);
  };

  const handleRenamePasskey = () => {
    if (!selectedPasskey || !passkeyLabel.trim()) return;
    renamePasskeyMutation.mutate({ id: selectedPasskey.id, label: passkeyLabel });
  };

  const handleDeletePasskey = () => {
    if (!selectedPasskey) return;
    deletePasskeyMutation.mutate(selectedPasskey.id);
  };

  const handleEditProfile = () => {
    reset({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      sex: user?.sex as 'M' | 'F' | 'O' | undefined,
    });
    setIsEditingProfile(true);
  };

  const handleCancelEdit = () => {
    reset();
    setIsEditingProfile(false);
  };

  const handleSaveProfile = handleSubmit((data: UserProfileUpdateFormData) => {
    updateProfileMutation.mutate(data);
  });

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground">Manage your account and authentication methods</p>
      </div>

      <div className="grid gap-6">
        {/* User Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Your account details</CardDescription>
              </div>
              {!isEditingProfile && (
                <Button variant="outline" size="sm" onClick={handleEditProfile}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      {...register('firstName')}
                      className={errors.firstName ? 'border-destructive' : ''}
                    />
                    {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      {...register('lastName')}
                      className={errors.lastName ? 'border-destructive' : ''}
                    />
                    {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sex">Sex</Label>
                  <Select
                    value={selectedSex || undefined}
                    onValueChange={(value) => setValue('sex', value as 'M' | 'F' | 'O')}
                  >
                    <SelectTrigger id="sex">
                      <SelectValue placeholder="Prefer not to say" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Male</SelectItem>
                      <SelectItem value="F">Female</SelectItem>
                      <SelectItem value="O">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.sex && <p className="text-sm text-destructive">{errors.sex.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Email address cannot be changed</p>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={updateProfileMutation.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <p className="text-sm mt-1">{user?.firstName || '—'}</p>
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <p className="text-sm mt-1">{user?.lastName || '—'}</p>
                  </div>
                </div>
                <div>
                  <Label>Sex</Label>
                  <p className="text-sm mt-1">
                    {user?.sex === 'M' ? 'Male' : user?.sex === 'F' ? 'Female' : user?.sex === 'O' ? 'Other' : '—'}
                  </p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="text-sm mt-1">{user?.email}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Connected Providers */}
        <Card>
          <CardHeader>
            <CardTitle>Connected Providers</CardTitle>
            <CardDescription>Manage your authentication providers</CardDescription>
          </CardHeader>
          <CardContent>
            {providers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No providers connected</p>
            ) : (
              <div className="space-y-2">
                {providers.map((provider) => (
                  <div key={provider.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium capitalize">{provider.provider}</p>
                      <p className="text-sm text-muted-foreground">{provider.name}</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => disconnectProviderMutation.mutate(provider.provider)}
                      disabled={providers.length === 1 && passkeys.length === 0}
                    >
                      Disconnect
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Passkeys */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Passkeys</CardTitle>
                <CardDescription>Manage your registered passkeys</CardDescription>
              </div>
              <Button onClick={() => setShowAddPasskeyDialog(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Passkey
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {passkeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">No passkeys registered</p>
            ) : (
              <div className="space-y-2">
                {passkeys.map((passkey) => (
                  <div key={passkey.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Fingerprint className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{passkey.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Last used: {new Date(passkey.lastUsedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPasskey(passkey);
                          setPasskeyLabel(passkey.label);
                          setShowRenamePasskeyDialog(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedPasskey(passkey);
                          setShowDeletePasskeyDialog(true);
                        }}
                        disabled={passkeys.length === 1 && providers.length === 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sign Out</p>
                <p className="text-sm text-muted-foreground">Sign out of your account on this device</p>
              </div>
              <Button variant="outline" onClick={() => logout()}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Account</p>
                <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
              </div>
              <Button variant="destructive" onClick={() => setShowDeleteAccountDialog(true)}>
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Passkey Dialog */}
      <Dialog open={showAddPasskeyDialog} onOpenChange={setShowAddPasskeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Passkey</DialogTitle>
            <DialogDescription>Give your passkey a name to identify it later</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="passkey-label">Passkey Label</Label>
              <Input
                id="passkey-label"
                placeholder="e.g., iPhone, YubiKey, MacBook"
                value={passkeyLabel}
                onChange={(e) => setPasskeyLabel(e.target.value)}
              />
            </div>
            <Button onClick={handleAddPasskey} disabled={passkeyLoading || addPasskeyMutation.isPending}>
              {passkeyLoading || addPasskeyMutation.isPending ? 'Adding...' : 'Add Passkey'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Passkey Dialog */}
      <Dialog open={showRenamePasskeyDialog} onOpenChange={setShowRenamePasskeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Passkey</DialogTitle>
            <DialogDescription>Update the label for this passkey</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="rename-passkey-label">Passkey Label</Label>
              <Input id="rename-passkey-label" value={passkeyLabel} onChange={(e) => setPasskeyLabel(e.target.value)} />
            </div>
            <Button onClick={handleRenamePasskey} disabled={renamePasskeyMutation.isPending}>
              {renamePasskeyMutation.isPending ? 'Renaming...' : 'Rename Passkey'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Passkey Dialog */}
      <Dialog open={showDeletePasskeyDialog} onOpenChange={setShowDeletePasskeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Passkey</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedPasskey?.label}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowDeletePasskeyDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePasskey}
              disabled={deletePasskeyMutation.isPending}
              className="flex-1"
            >
              {deletePasskeyMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete your account? This will permanently delete all your data and cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowDeleteAccountDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteAccountMutation.mutate()}
              disabled={deleteAccountMutation.isPending}
              className="flex-1"
            >
              {deleteAccountMutation.isPending ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
