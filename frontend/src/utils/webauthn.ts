/**
 * Check if WebAuthn is supported in the current browser
 */
export const isWebAuthnSupported = (): boolean => {
  return window?.PublicKeyCredential !== undefined && typeof window.PublicKeyCredential === 'function';
};

/**
 * Check if the browser supports platform authenticators (e.g., Touch ID, Face ID, Windows Hello)
 */
export const isPlatformAuthenticatorSupported = async (): Promise<boolean> => {
  if (!isWebAuthnSupported()) {
    return false;
  }

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (error) {
    console.error('Error checking platform authenticator support:', error);
    return false;
  }
};

/**
 * Convert base64 string to Uint8Array
 */
export const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

/**
 * Convert Uint8Array to base64 string
 */
export const uint8ArrayToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

/**
 * Create a new passkey credential
 */
export const createPasskey = async (options: PublicKeyCredentialCreationOptions): Promise<PublicKeyCredential> => {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser');
  }

  try {
    const credential = await navigator.credentials.create({
      publicKey: options,
    });

    if (!credential || !(credential instanceof PublicKeyCredential)) {
      throw new Error('Failed to create credential');
    }

    return credential;
  } catch (error) {
    console.error('Error creating passkey:', error);
    throw error;
  }
};

/**
 * Get an existing passkey credential for authentication
 */
export const getPasskey = async (options: PublicKeyCredentialRequestOptions): Promise<PublicKeyCredential> => {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser');
  }

  try {
    const credential = await navigator.credentials.get({
      publicKey: options,
    });

    if (!credential || !(credential instanceof PublicKeyCredential)) {
      throw new Error('Failed to get credential');
    }

    return credential;
  } catch (error) {
    console.error('Error getting passkey:', error);
    throw error;
  }
};
