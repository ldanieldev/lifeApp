import { emailAPI, sessionAPI, socialAccountAPI, webAuthnAPI } from '@/api/allauth';
import type { AuthFlow, EmailAddress, SocialAccount, UserSession } from '@/api/allauth.types';
import { authApi } from '@/api/auth';
import { NotificationSettings } from '@/components/NotificationSettings';
import { PasswordChangeForm } from '@/components/passwordChangeForm';
import { ProtectedRoute } from '@/components/protectedRoute';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { usePasskey } from '@/hooks/usePasskey';
import { getAllauthErrors, isNetworkError } from '@/lib/errors';
import { formatDate, formatLastSeen } from '@/lib/formatTime';
import { parseUserAgent } from '@/lib/userAgent';
import { userProfileUpdateSchema, type UserProfileUpdateFormData } from '@/lib/validations/auth';
import { useAuth } from '@/providers/authProvider';
import type { Passkey } from '@/types/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import axios from 'axios';
import {
  Edit2,
  Fingerprint,
  Link as LinkIcon,
  LogOut,
  Mail,
  Monitor,
  Plus,
  Save,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

export const Route = createFileRoute('/account')({
  component: () => (
    <ProtectedRoute>
      <AccountPage />
    </ProtectedRoute>
  ),
});

// Helper function for consistent error handling across all mutations
const handleMutationError = (error: unknown, fallbackMessage: string, retryFn?: () => void) => {
  // Check if it's a network error
  if (isNetworkError(error)) {
    toast.error('Unable to connect to the server. Please check your internet connection and try again.', {
      icon: <WifiOff className="h-4 w-4" />,
      ...(retryFn && {
        action: {
          label: 'Retry',
          onClick: retryFn,
        },
      }),
    });
    return;
  }

  // Extract allauth errors if available
  const allauthErrors = getAllauthErrors(error);
  let errorMessage: string;

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;

    if (status === 429) {
      errorMessage = 'Too many requests. Please wait a few minutes and try again.';
    } else if (status && status >= 500) {
      errorMessage = 'Server error. Please try again in a moment.';
    } else if (allauthErrors && allauthErrors.length > 0) {
      errorMessage = allauthErrors[0].message;
    } else {
      errorMessage = error.response?.data?.message || fallbackMessage;
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    errorMessage = fallbackMessage;
  }

  toast.error(errorMessage);
};

function AccountPage() {
  const { user, logout, refetchUser, config } = useAuth();
  const { registerPasskey, isLoading: passkeyLoading } = usePasskey();
  const queryClient = useQueryClient();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showAddPasskeyDialog, setShowAddPasskeyDialog] = useState(false);
  const [showRenamePasskeyDialog, setShowRenamePasskeyDialog] = useState(false);
  const [showDeletePasskeyDialog, setShowDeletePasskeyDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [showReauthDialog, setShowReauthDialog] = useState(false);
  const [selectedPasskey, setSelectedPasskey] = useState<Passkey | null>(null);
  const [passkeyLabel, setPasskeyLabel] = useState('');
  const [pendingOperation, setPendingOperation] = useState<(() => void) | null>(null);

  // Email management state
  const [showAddEmailDialog, setShowAddEmailDialog] = useState(false);
  const [showVerifyEmailDialog, setShowVerifyEmailDialog] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [emailToVerify, setEmailToVerify] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

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

  // Fetch user's email addresses
  const { data: emailsResponse } = useQuery({
    queryKey: ['emails'],
    queryFn: emailAPI.getEmailAddresses,
  });

  const emails: EmailAddress[] = emailsResponse?.data.data || [];

  // Fetch user's providers (OAuth accounts)
  // Using allauth's endpoint
  const { data: providersResponse } = useQuery({
    queryKey: ['providers'],
    queryFn: socialAccountAPI.getConnectedAccounts,
  });

  const allauthProviders: SocialAccount[] = providersResponse?.data.data || [];

  // Get list of available providers from config
  const availableProviders = config?.data.socialaccount?.providers || [];

  // Get list of connected provider IDs
  const connectedProviderIds = allauthProviders.map((acc) => acc.provider.id);

  // Get list of providers that can be connected
  const unconnectedProviders = availableProviders.filter((provider) => !connectedProviderIds.includes(provider.id));

  // Fetch user's active sessions
  const { data: sessionsResponse, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: sessionAPI.getSessions,
    refetchInterval: 60000, // Refetch every 60 seconds
  });

  const sessions: UserSession[] = sessionsResponse?.data.data || [];

  // Session management state
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showTerminateSessionDialog, setShowTerminateSessionDialog] = useState(false);

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: UserProfileUpdateFormData) => authApi.updateUser(data),
    onSuccess: () => {
      refetchUser();
      setIsEditingProfile(false);
      toast.success('Profile updated successfully');
    },
    onError: (error: unknown) => {
      handleMutationError(error, 'Failed to update profile');
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

  // Helper to check if error requires reauthentication
  const requiresReauth = (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return false;
    }

    const flows = error.response?.data?.data?.flows;
    return (
      error.response?.status === 401 &&
      Array.isArray(flows) &&
      flows.some((flow: AuthFlow) => flow.id === 'mfa_reauthenticate')
    );
  };

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
    onError: (error: unknown) => {
      if (requiresReauth(error)) {
        // Store the operation to retry after reauthentication
        setPendingOperation(() => () => handleRenamePasskey());
        setShowReauthDialog(true);
      } else {
        handleMutationError(error, 'Failed to rename passkey');
      }
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
    onError: (error: unknown) => {
      if (requiresReauth(error)) {
        // Store the operation to retry after reauthentication
        setPendingOperation(() => () => handleDeletePasskey());
        setShowReauthDialog(true);
      } else {
        handleMutationError(error, 'Failed to delete passkey');
      }
    },
  });

  // Handle reauthentication
  const handleReauthenticate = async () => {
    try {
      // Use the webAuthn API to reauthenticate
      await webAuthnAPI.reauthenticateWithPasskey();
      toast.success('Re-authenticated successfully');
      setShowReauthDialog(false);

      // Retry the pending operation
      if (pendingOperation) {
        pendingOperation();
        setPendingOperation(null);
      }
    } catch (error: unknown) {
      console.error('Reauthentication error:', error);
      handleMutationError(error, 'Failed to re-authenticate. Please try again.');
    }
  };

  // Disconnect provider mutation
  const disconnectProviderMutation = useMutation({
    mutationFn: ({ providerId, accountUid }: { providerId: string; accountUid: string }) =>
      socialAccountAPI.disconnectAccount(providerId, accountUid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      toast.success('Provider disconnected');
    },
    onError: (error: unknown) => {
      handleMutationError(error, 'Failed to disconnect provider');
    },
  });

  // Terminate session mutation
  const terminateSessionMutation = useMutation({
    mutationFn: (sessionIds: string[]) => sessionAPI.terminateSessions(sessionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setShowTerminateSessionDialog(false);
      setSelectedSessionId(null);
      toast.success('Session terminated successfully');
    },
    onError: (error: unknown) => {
      handleMutationError(error, 'Failed to terminate session');
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: authApi.deleteAccount,
    onSuccess: async () => {
      toast.success('Account deleted');
      await logout();
    },
    onError: (error: unknown) => {
      handleMutationError(error, 'Failed to delete account');
    },
  });

  // Email management mutations
  const addEmailMutation = useMutation({
    mutationFn: (email: string) => emailAPI.addEmail(email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      setShowAddEmailDialog(false);
      setNewEmailInput('');
      // Don't automatically open verify dialog - backend already sent verification code
      // User can click "Verify" button on the email in the list
      toast.success('Verification code sent! Check your email and click Verify.');
    },
    onError: (error: unknown) => {
      handleMutationError(error, 'Failed to add email');
    },
  });

  const verifyEmailMutation = useMutation({
    mutationFn: (code: string) => emailAPI.verifyEmailCode(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      setShowVerifyEmailDialog(false);
      setEmailToVerify('');
      setVerificationCode('');
      toast.success('Email verified successfully');
      refetchUser();
    },
    onError: (error: unknown) => {
      handleMutationError(error, 'Invalid verification code');
    },
  });

  const resendCodeMutation = useMutation({
    mutationFn: (email: string) => emailAPI.requestEmailVerification(email),
    onSuccess: (_, email) => {
      toast.success('Verification code sent to ' + email);
    },
    onError: (error: unknown) => {
      handleMutationError(error, 'Failed to send verification code');
    },
  });

  const makePrimaryMutation = useMutation({
    mutationFn: (email: string) => emailAPI.markEmailAsPrimary(email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      toast.success('Primary email updated');
      refetchUser();
    },
    onError: (error: unknown) => {
      handleMutationError(error, 'Failed to update primary email');
    },
  });

  const removeEmailMutation = useMutation({
    mutationFn: (email: string) => emailAPI.removeEmail(email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      toast.success('Email address removed');
    },
    onError: (error: unknown) => {
      handleMutationError(error, 'Failed to remove email');
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

  const handleConnectProvider = (providerId: string) => {
    // Use 'connect' process and redirect back to account page
    authApi.initiateOAuth(providerId, { process: 'connect', callbackURL: '/auth/oauth/callback?returnTo=/account' });
  };

  const handleTerminateSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setShowTerminateSessionDialog(true);
  };

  const confirmTerminateSession = () => {
    if (selectedSessionId) {
      terminateSessionMutation.mutate([selectedSessionId]);
    }
  };

  // Email management handlers
  const handleAddEmail = () => {
    if (!newEmailInput.trim() || !newEmailInput.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    addEmailMutation.mutate(newEmailInput.toLowerCase());
  };

  const handleVerifyEmail = () => {
    if (!verificationCode.trim()) {
      toast.error('Please enter the verification code');
      return;
    }
    verifyEmailMutation.mutate(verificationCode);
  };

  const handleResendCode = (email: string) => {
    setEmailToVerify(email);
    setShowVerifyEmailDialog(true);
    // Don't automatically resend when opening dialog - let user click Resend button
  };

  const handleMakePrimary = (email: string) => {
    makePrimaryMutation.mutate(email);
  };

  const handleRemoveEmail = (email: string) => {
    if (confirm(`Remove ${email}?`)) {
      removeEmailMutation.mutate(email);
    }
  };

  const handleResendVerificationCode = () => {
    if (!emailToVerify) return;
    resendCodeMutation.mutate(emailToVerify);
  };

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
                    value={selectedSex || 'N'}
                    onValueChange={(value) => setValue('sex', value as 'M' | 'F' | 'O' | 'N')}
                  >
                    <SelectTrigger id="sex">
                      <SelectValue placeholder="Prefer not to say" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="N">Prefer not to say</SelectItem>
                      <SelectItem value="M">Male</SelectItem>
                      <SelectItem value="F">Female</SelectItem>
                      <SelectItem value="O">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.sex && <p className="text-sm text-destructive">{errors.sex.message}</p>}
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
                    {user?.sex === 'M'
                      ? 'Male'
                      : user?.sex === 'F'
                        ? 'Female'
                        : user?.sex === 'O'
                          ? 'Other'
                          : user?.sex === 'N'
                            ? 'Prefer not to say'
                            : '—'}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Email Addresses</Label>
                    <Button variant="outline" size="sm" onClick={() => setShowAddEmailDialog(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Email
                    </Button>
                  </div>
                  {emails.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Loading email addresses...</p>
                  ) : (
                    <div className="space-y-2">
                      {emails.map((email) => (
                        <div key={email.email} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <p className="text-sm font-medium truncate">{email.email}</p>
                              {email.primary && (
                                <Badge variant="default" className="flex-shrink-0">
                                  Primary
                                </Badge>
                              )}
                              {email.verified ? (
                                <Badge variant="default" className="bg-green-600 flex-shrink-0">
                                  Verified
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="flex-shrink-0">
                                  Unverified
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            {!email.verified && (
                              <Button variant="outline" size="sm" onClick={() => handleResendCode(email.email)}>
                                Verify
                              </Button>
                            )}
                            {!email.primary && email.verified && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMakePrimary(email.email)}
                                disabled={makePrimaryMutation.isPending}
                              >
                                Make Primary
                              </Button>
                            )}
                            {!email.primary && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRemoveEmail(email.email)}
                                disabled={removeEmailMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Password Management */}
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Change your password</CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordChangeForm />
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <NotificationSettings />

        {/* Connected Providers */}
        <Card>
          <CardHeader>
            <CardTitle>Connected Providers</CardTitle>
            <CardDescription>Manage your authentication providers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Connected Providers */}
            {allauthProviders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No providers connected</p>
            ) : (
              <div className="space-y-2">
                {allauthProviders.map((account: SocialAccount) => (
                  <div key={account.uid} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium capitalize">{account.provider.name}</p>
                      <p className="text-sm text-muted-foreground">{account.display}</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        disconnectProviderMutation.mutate({
                          providerId: account.provider.id,
                          accountUid: account.uid,
                        })
                      }
                      disabled={allauthProviders.length === 1 && passkeys.length === 0}
                    >
                      Disconnect
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Available Providers to Connect */}
            {unconnectedProviders.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Connect Additional Providers</p>
                <div className="flex flex-wrap gap-2">
                  {unconnectedProviders.map((provider) => (
                    <Button
                      key={provider.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleConnectProvider(provider.id)}
                    >
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Connect {provider.name}
                    </Button>
                  ))}
                </div>
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
                          Last used: {passkey.lastUsedAt ? new Date(passkey.lastUsedAt).toLocaleDateString() : 'Never'}
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
                        disabled={passkeys.length === 1 && allauthProviders.length === 0}
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

        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>Manage devices and sessions where you're currently logged in</CardDescription>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <div className="space-y-4">
                {/* Skeleton loaders */}
                {[1, 2].map((i) => (
                  <div key={i} className="border rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-muted-foreground">No active sessions found</p>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => {
                  const deviceInfo = parseUserAgent(session.userAgent);
                  const lastSeen = formatLastSeen(session.lastSeenAt);
                  const signedIn = formatDate(session.createdAt);

                  return (
                    <div
                      key={session.id}
                      className={`border rounded-lg p-4 ${session.isCurrent ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Monitor className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <p className="font-medium truncate">{deviceInfo}</p>
                            {session.isCurrent && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-green-600 text-white rounded-full flex-shrink-0">
                                Current Session
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>{lastSeen}</p>
                            <p>IP: {session.ip}</p>
                            <p>Signed in: {signedIn}</p>
                          </div>
                        </div>
                        {!session.isCurrent && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleTerminateSession(session.id)}
                            disabled={terminateSessionMutation.isPending}
                          >
                            {terminateSessionMutation.isPending && selectedSessionId === session.id
                              ? 'Ending...'
                              : 'End Session'}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
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

      {/* Terminate Session Dialog */}
      <Dialog open={showTerminateSessionDialog} onOpenChange={setShowTerminateSessionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to end this session? You will need to log in again on that device.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowTerminateSessionDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmTerminateSession}
              disabled={terminateSessionMutation.isPending}
              className="flex-1"
            >
              {terminateSessionMutation.isPending ? 'Ending...' : 'End Session'}
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

      {/* Add Email Dialog */}
      <Dialog open={showAddEmailDialog} onOpenChange={setShowAddEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Email Address</DialogTitle>
            <DialogDescription>Add a new email address to your account. You'll need to verify it.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="new-email">Email Address</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="email@example.com"
                value={newEmailInput}
                onChange={(e) => setNewEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddEmail();
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddEmailDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddEmail} disabled={addEmailMutation.isPending} className="flex-1">
                {addEmailMutation.isPending ? 'Adding...' : 'Add Email'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Verify Email Dialog */}
      <Dialog open={showVerifyEmailDialog} onOpenChange={setShowVerifyEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Email Address</DialogTitle>
            <DialogDescription>
              Enter the verification code sent to <strong>{emailToVerify}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="verification-code">Verification Code</Label>
              <Input
                id="verification-code"
                type="text"
                placeholder="Enter code from email"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.trim())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleVerifyEmail();
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleResendVerificationCode}
                disabled={resendCodeMutation.isPending}
                className="flex-1"
              >
                {resendCodeMutation.isPending ? 'Sending...' : 'Resend Code'}
              </Button>
              <Button onClick={handleVerifyEmail} disabled={verifyEmailMutation.isPending} className="flex-1">
                {verifyEmailMutation.isPending ? 'Verifying...' : 'Verify'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reauthentication Dialog */}
      <Dialog open={showReauthDialog} onOpenChange={setShowReauthDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-authentication Required</DialogTitle>
            <DialogDescription>
              For security reasons, please authenticate with your passkey to continue.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowReauthDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleReauthenticate} className="flex-1">
              <Fingerprint className="mr-2 h-4 w-4" />
              Authenticate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
