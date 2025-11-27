import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {
  genAddressSeed,
  generateNonce,
  generateRandomness,
  getExtendedEphemeralPublicKey,
  getZkLoginSignature,
  jwtToAddress,
} from '@mysten/sui/zklogin';
import { zkLoginService, type PartialZkLoginSignature } from '../utils/sui/zkloginService';
import type { PublicKey } from '@mysten/sui/cryptography';
import type { JwtPayload } from 'jwt-decode';
import { jwtDecode } from 'jwt-decode';
import type { ZkloginProvider } from '@/types/account.ts';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';
import { useCurrentPassword } from '@/hooks/useCurrentPassword';
import { aesEncrypt, aesDecrypt } from '@/utils/crypto';

export interface IdTokenPayload extends JwtPayload {
  // Google specific claims
  email?: string;            // User's email
  email_verified?: boolean;  // Whether email is verified
  name?: string;             // Full name
  given_name?: string;       // Given name
  family_name?: string;      // Family name
  picture?: string;          // Profile picture URL
  locale?: string;           // Locale (e.g. "en", "zh-CN")
  hd?: string;               // Hosted domain (if using Google Workspace)

  // Flexible extension (for unexpected fields)
  [key: string]: unknown;
}

export const ENCRYPTED_EPHEMERAL_KEY_STORAGE_KEY = 'zklogin_encrypted_ephemeral_key';
export const ENCRYPTED_ID_TOKEN_STORAGE_KEY = 'zklogin_encrypted_id_token';
export const ENCRYPTED_USER_SALT_STORAGE_KEY = 'zklogin_encrypted_user_salt';
export const ENCRYPTED_ZKPROOF_STORAGE_KEY = 'zklogin_encrypted_zkproof';
export const ADDRESS_LOCAL_STORAGE_KEY = 'zklogin_address'; // Public data, no encryption needed
export const MAX_EPOCH_LOCAL_STORAGE_KEY = 'zklogin_max_epoch'; // Public data, no encryption needed

export const GOOGLE_CLIENT_ID = '286739009496-gono8rcjssnd2avghdsjr8nnbqgp03sm.apps.googleusercontent.com';
export const APPLE_CLIENT_ID = 'cc.onelabs.onewallet';

export const useZklogin = () => {
  // Get current password for encryption/decryption
  const { currentPassword } = useCurrentPassword();

  const [loading, setLoading] = useState(false);
  const [maxEpoch, setMaxEpoch] = useState<number | undefined>(undefined);
  const [idToken, setIdToken] = useState<string | undefined>(undefined);
  const [userSalt, setUserSalt] = useState<string | undefined>(undefined);
  const [zkProof, setZkProof] = useState<PartialZkLoginSignature | undefined>(undefined);
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [ephemeralKeyPair, setEphemeralKeyPair] = useState<Ed25519Keypair | undefined>(undefined);

  const generateNewEphemeralKeyPair = useCallback((password?: string) => {
    const actualPassword = password || currentPassword;
    if (!actualPassword) {
      console.warn('Cannot generate ephemeral key pair without password');
      return;
    }

    const newEphemeralKeyPair = Ed25519Keypair.generate();
    const privateKey = newEphemeralKeyPair.getSecretKey();

    // Encrypt the private key before storing
    const encryptedPrivateKey = aesEncrypt(privateKey, actualPassword);
    localStorage.setItem(ENCRYPTED_EPHEMERAL_KEY_STORAGE_KEY, encryptedPrivateKey);

    setEphemeralKeyPair(newEphemeralKeyPair);
    console.log('Generated and encrypted new ephemeralKeyPair');
  }, [currentPassword]);

  // Helper to ensure ephemeralKeyPair exists (restore from storage or generate new)
  const ensureEphemeralKeyPair = useCallback((password?: string) => {
    const actualPassword = password || currentPassword;
    if (!actualPassword) {
      console.warn('[ensureEphemeralKeyPair] Cannot initialize without password');
      return;
    }

    // Skip if already have ephemeralKeyPair
    if (ephemeralKeyPair) {
      console.log('[ensureEphemeralKeyPair] EphemeralKeyPair already exists, skipping');
      return;
    }

    try {
      const encryptedPrivateKey = localStorage.getItem(ENCRYPTED_EPHEMERAL_KEY_STORAGE_KEY);

      if (encryptedPrivateKey) {
        // Decrypt the stored key
        const decryptedPrivateKey = aesDecrypt(encryptedPrivateKey, actualPassword);
        const keyPair = Ed25519Keypair.fromSecretKey(decryptedPrivateKey);
        setEphemeralKeyPair(keyPair);
        console.log('[ensureEphemeralKeyPair] Restored and decrypted ephemeralKeyPair from localStorage');
      } else {
        // No existing key, generate a new one
        console.log('[ensureEphemeralKeyPair] No cached key found, generating new one');
        generateNewEphemeralKeyPair(actualPassword);
      }
    } catch (error) {
      console.error('[ensureEphemeralKeyPair] Failed to decrypt ephemeral key, generating new one:', error);
      // If decryption fails (wrong password, corrupted data, etc.), generate new key
      generateNewEphemeralKeyPair(actualPassword);
    }
  }, [currentPassword, ephemeralKeyPair, generateNewEphemeralKeyPair]);

  // 扩展的临时公钥
  const extendedEphemeralPublicKey = useMemo(() => {
    if (!ephemeralKeyPair) return undefined;
    return getExtendedEphemeralPublicKey(
      ephemeralKeyPair.getPublicKey() as PublicKey,
    );
  }, [ephemeralKeyPair]);

  /**
   * 验证并更新epoch
   * @returns { isValid: boolean, maxEpoch: number | undefined }
   *   isValid: true表示epoch有效，false表示epoch过期需要登出
   *   maxEpoch: 当前有效的maxEpoch值，如果过期则为undefined
   */
  const validateAndUpdateEpoch = useCallback(async (): Promise<{ isValid: boolean; maxEpoch: number | undefined }> => {
    try {
      // 1. 获取网络当前epoch
      const currentEpoch = await zkLoginService.getEpoch();
      const currentEpochNum = Number(currentEpoch);

      console.log('[Epoch Validation] Current network epoch:', currentEpochNum);

      // 2. 读取本地存储的maxEpoch
      const cachedMaxEpoch = localStorage.getItem(MAX_EPOCH_LOCAL_STORAGE_KEY);

      // 3. 如果本地无值，存储 currentEpoch + 30
      if (!cachedMaxEpoch) {
        const newMaxEpoch = currentEpochNum + 30;
        console.log('[Epoch Validation] No cached epoch, storing:', newMaxEpoch);
        localStorage.setItem(MAX_EPOCH_LOCAL_STORAGE_KEY, newMaxEpoch.toString());
        setMaxEpoch(newMaxEpoch);
        return { isValid: true, maxEpoch: newMaxEpoch };
      }

      // 4. 如果本地有值，检查是否过期
      const cachedValue = Number(cachedMaxEpoch);
      console.log('[Epoch Validation] Cached maxEpoch:', cachedValue);

      if (currentEpochNum >= cachedValue) {
        // 当前epoch已达到或超过存储的maxEpoch，会话过期
        console.warn(
          '[Epoch Validation] ⚠️ Session expired!',
          'Current:', currentEpochNum,
          'Cached:', cachedValue,
        );
        return { isValid: false, maxEpoch: undefined }; // 需要登出
      }

      // 5. 有效，继续使用当前maxEpoch
      console.log('[Epoch Validation] ✅ Session valid');
      setMaxEpoch(cachedValue);
      return { isValid: true, maxEpoch: cachedValue };

    } catch (error) {
      console.error('[Epoch Validation] Failed to validate epoch:', error);
      // 网络错误时，保守处理：不强制登出，但也不返回maxEpoch
      // 尝试使用已缓存的值
      const cachedMaxEpoch = localStorage.getItem(MAX_EPOCH_LOCAL_STORAGE_KEY);
      const cachedValue = cachedMaxEpoch ? Number(cachedMaxEpoch) : undefined;
      if (cachedValue) {
        setMaxEpoch(cachedValue);
      }
      return { isValid: true, maxEpoch: cachedValue };
    }
  }, []);

  // Clear only auth-related data (token, salt, proof, address), keep ephemeralKeyPair and maxEpoch
  // Use this when starting a new auth flow to avoid clearing the required keys
  const clearZkLoginAuthData = useCallback(() => {
    // Clear state (only auth data)
    setIdToken(undefined);
    setUserSalt(undefined);
    setZkProof(undefined);
    setAddress(undefined);

    // Clear localStorage (only encrypted auth data)
    localStorage.removeItem(ENCRYPTED_ID_TOKEN_STORAGE_KEY);
    localStorage.removeItem(ENCRYPTED_USER_SALT_STORAGE_KEY);
    localStorage.removeItem(ENCRYPTED_ZKPROOF_STORAGE_KEY);
    localStorage.removeItem(ADDRESS_LOCAL_STORAGE_KEY);

    // Clear Chrome Identity API cache to force re-authentication
    try {
      if (chrome?.identity?.clearAllCachedAuthTokens) {
        chrome.identity.clearAllCachedAuthTokens(() => {
          console.log('Chrome identity cache cleared');
        });
      }
    } catch (error) {
      console.warn('Failed to clear Chrome identity cache:', error);
    }

    console.log('ZkLogin auth data cleared (keeping ephemeralKeyPair and maxEpoch for reuse)');
  }, []);

  // Clear ALL zklogin data including ephemeralKeyPair and maxEpoch
  // Use this only when user explicitly logs out or cancels auth
  const clearZkLoginCache = useCallback(() => {
    // Clear state
    setIdToken(undefined);
    setUserSalt(undefined);
    setZkProof(undefined);
    setAddress(undefined);
    setMaxEpoch(undefined);
    setEphemeralKeyPair(undefined);

    // Clear localStorage (all encrypted data)
    localStorage.removeItem(ENCRYPTED_ID_TOKEN_STORAGE_KEY);
    localStorage.removeItem(ENCRYPTED_USER_SALT_STORAGE_KEY);
    localStorage.removeItem(ENCRYPTED_ZKPROOF_STORAGE_KEY);
    localStorage.removeItem(ADDRESS_LOCAL_STORAGE_KEY);
    localStorage.removeItem(MAX_EPOCH_LOCAL_STORAGE_KEY);
    localStorage.removeItem(ENCRYPTED_EPHEMERAL_KEY_STORAGE_KEY);

    // Clear Chrome Identity API cache to force re-authentication
    try {
      if (chrome?.identity?.clearAllCachedAuthTokens) {
        chrome.identity.clearAllCachedAuthTokens(() => {
          console.log('Chrome identity cache cleared');
        });
      }
    } catch (error) {
      console.warn('Failed to clear Chrome identity cache:', error);
    }

    console.log('ZkLogin cache cleared (all encrypted data removed)');
  }, []);

  // Initialize ZkLogin data from localStorage (with decryption)
  useEffect(() => {
    // Need password to decrypt the sensitive data
    if (!currentPassword) {
      // console.log('Waiting for password to initialize ZkLogin data');
      return;
    }

    try {
      // Decrypt and restore ID Token
      const encryptedIdToken = localStorage.getItem(ENCRYPTED_ID_TOKEN_STORAGE_KEY);
      if (encryptedIdToken) {
        const decryptedIdToken = aesDecrypt(encryptedIdToken, currentPassword);
        setIdToken(decryptedIdToken);
        console.log('Restored and decrypted idToken from localStorage');
      }

      // Decrypt and restore User Salt
      const encryptedUserSalt = localStorage.getItem(ENCRYPTED_USER_SALT_STORAGE_KEY);
      if (encryptedUserSalt) {
        const decryptedUserSalt = aesDecrypt(encryptedUserSalt, currentPassword);
        setUserSalt(decryptedUserSalt);
        console.log('Restored and decrypted userSalt from localStorage');
      }

      // Decrypt and restore ZkProof
      const encryptedZkProof = localStorage.getItem(ENCRYPTED_ZKPROOF_STORAGE_KEY);
      if (encryptedZkProof) {
        const decryptedZkProof = aesDecrypt(encryptedZkProof, currentPassword);
        setZkProof(JSON.parse(decryptedZkProof));
        console.log('Restored and decrypted zkProof from localStorage');
      }

      // Address doesn't need decryption (public data)
      const cachedAddress = localStorage.getItem(ADDRESS_LOCAL_STORAGE_KEY);
      if (cachedAddress) {
        setAddress(cachedAddress);
        console.log('Restored address from localStorage');
      }
    } catch (error) {
      console.error('Failed to decrypt ZkLogin data:', error);
      // If decryption fails, clear corrupted data
      clearZkLoginAuthData();
    }
  }, [currentPassword, clearZkLoginAuthData]);

  const randomness = useMemo(() => {
    return generateRandomness();
  }, []);

  const nonce = useMemo(() => {
    if (maxEpoch === undefined || !ephemeralKeyPair) return undefined;
    const nonce = generateNonce(
      ephemeralKeyPair.getPublicKey() as PublicKey,
      maxEpoch,
      randomness,
    );
    return nonce;

  }, [ephemeralKeyPair, maxEpoch, randomness]);

  const authUrl = useMemo(() => {
    if (!nonce) return undefined;
    const callbackUrl = chrome.identity.getRedirectURL('google');

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: callbackUrl,
      response_type: 'id_token',
      scope: 'openid email',
      nonce,
      prompt: 'select_account', // Force account selection even if cached
    });
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    return url;
  }, [nonce]);

  const appleAuthUrl = useMemo(() => {
    if (!nonce) return undefined;
    const callbackUrl = chrome.identity.getRedirectURL('apple');

    // console.log('      callbackUrl', callbackUrl);

    const params = new URLSearchParams({
      client_id: APPLE_CLIENT_ID,
      redirect_uri: callbackUrl,
      response_type: 'code id_token',
      response_mode: 'form_post',
      scope: 'name email openid',
      nonce,
    });
    const url = `https://appleid.apple.com/auth/authorize?${params}`;
    return url;
  }, [nonce]);

  const getZkProof = useCallback(async (
    idToken: string,
    userSalt: string,
  ) => {
    if (!maxEpoch || !extendedEphemeralPublicKey) {
      console.error('parameters is not available');
      return undefined;
    }

    setLoading(true);
    try {
      const proof = await zkLoginService.getZkProof(idToken, userSalt, extendedEphemeralPublicKey, maxEpoch, randomness);
      return proof;
    } catch (error) {
      console.error('Failed to get zkProof:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [extendedEphemeralPublicKey, maxEpoch, randomness]);

  // Helper function to process OAuth token and generate zklogin data
  const processOAuthToken = useCallback(async (
    idToken: string,
    provider: ZkloginProvider,
    providedMaxEpoch?: number,
    providedExtendedEphemeralPublicKey?: string,
  ) => {
    setIdToken(idToken);

    // Use provided parameters or fall back to state
    const useMaxEpoch = providedMaxEpoch || maxEpoch;
    const useExtendedEphemeralPublicKey = providedExtendedEphemeralPublicKey || extendedEphemeralPublicKey;

    try {
      // 自动获取userSalt
      const userSalt = await zkLoginService.getUserSalt(idToken, provider);
      setUserSalt(userSalt);

      // 自动获取zkProof
      let zkProof: PartialZkLoginSignature | undefined = undefined;
      if (userSalt && useMaxEpoch && useExtendedEphemeralPublicKey) {
        try {
          zkProof = await zkLoginService.getZkProof(idToken, userSalt, useExtendedEphemeralPublicKey, useMaxEpoch, randomness);
          console.log('[processOAuthToken] ZkProof generated successfully');
        } catch (proofError) {
          console.error('[processOAuthToken] Failed to get zkProof:', proofError);
        }
      } else {
        console.warn('[processOAuthToken] Cannot generate zkProof:', {
          hasUserSalt: !!userSalt,
          hasMaxEpoch: !!useMaxEpoch,
          hasExtendedEphemeralPublicKey: !!useExtendedEphemeralPublicKey,
        });
      }

      // 自动计算地址
      let address: string | undefined = undefined;
      if (userSalt) {
        try {
          address = jwtToAddress(idToken, userSalt);
          console.log('[processOAuthToken] Address generated successfully:', address);
        } catch (addressError) {
          console.error('[processOAuthToken] Failed to generate address:', addressError);
        }
      } else {
        console.warn('[processOAuthToken] Cannot generate address: userSalt not available');
      }

      return { idToken, userSalt, zkProof, address };
    } catch (saltError) {
      console.error('[processOAuthToken] Failed to get user salt:', saltError);
      return { idToken, userSalt: undefined, zkProof: undefined, address: undefined };
    }
  }, [maxEpoch, extendedEphemeralPublicKey, randomness]);

  const getZkLoginData = useCallback(async (
    providedEphemeralKeyPair?: Ed25519Keypair,
    providedMaxEpoch?: number,
  ): Promise<{
    idToken?: string,
    userSalt?: string,
    zkProof?: PartialZkLoginSignature,
    address?: string
  }> => {
    // Use provided parameters or fall back to state
    const useEphemeralKeyPair = providedEphemeralKeyPair || ephemeralKeyPair;
    const useMaxEpoch = providedMaxEpoch || maxEpoch;

    // Generate nonce and authUrl inline with provided values
    if (!useEphemeralKeyPair || useMaxEpoch === undefined) {
      console.error('[getZkLoginData] Missing ephemeralKeyPair or maxEpoch');
      return { idToken: undefined, userSalt: undefined, zkProof: undefined, address: undefined };
    }

    const generatedNonce = generateNonce(
      useEphemeralKeyPair.getPublicKey() as PublicKey,
      useMaxEpoch,
      randomness,
    );

    const callbackUrl = chrome.identity.getRedirectURL('google');
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: callbackUrl,
      response_type: 'id_token',
      scope: 'openid email',
      nonce: generatedNonce,
      prompt: 'select_account',
    });
    const generatedAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

    console.log('[getZkLoginData] Generated authUrl with nonce:', generatedNonce);

    setLoading(true);

    return new Promise<{
      idToken: string,
      userSalt: string | undefined,
      zkProof?: PartialZkLoginSignature,
      address?: string
    }>((resolve, reject) => {
      let authTabId: number | undefined = undefined;
      let timeoutId: NodeJS.Timeout | undefined = undefined;
      const redirectUrlPattern = chrome.identity.getRedirectURL('google');

      // Create tab update listener
      const tabUpdateListener = async (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
        if (tabId !== authTabId) return;
        if (!tab.url || changeInfo.status !== 'complete') return;

        try {
          // Check if the URL starts with our redirect URL
          if (tab.url.startsWith(redirectUrlPattern)) {
            console.log('Redirect detected:', tab.url);

            // Remove listener and close tab
            chrome.tabs.onUpdated.removeListener(tabUpdateListener);
            chrome.tabs.onRemoved.removeListener(tabRemoveListener);
            if (timeoutId) clearTimeout(timeoutId);
            if (authTabId) {
              chrome.tabs.remove(authTabId);
            }

            const url = new URL(tab.url);
            const hashParams = new URLSearchParams(url.hash.substring(1));
            const idToken = hashParams.get('id_token');

            if (idToken) {
              try {
                // Calculate extendedEphemeralPublicKey inline from the ephemeralKeyPair we're using
                const computedExtendedEphemeralPublicKey = useEphemeralKeyPair
                  ? getExtendedEphemeralPublicKey(useEphemeralKeyPair.getPublicKey() as PublicKey)
                  : undefined;

                const result = await processOAuthToken(
                  idToken,
                  'google',
                  useMaxEpoch,
                  computedExtendedEphemeralPublicKey,
                );
                setLoading(false);
                resolve(result);
              } catch (error) {
                console.error('Failed to process OAuth token:', error);
                setLoading(false);
                resolve({ idToken, userSalt: undefined, zkProof: undefined, address: undefined });
              }
            } else {
              setLoading(false);
              reject(new Error('No ID token found in redirect URL'));
            }
          }
        } catch (err) {
          chrome.tabs.onUpdated.removeListener(tabUpdateListener);
          chrome.tabs.onRemoved.removeListener(tabRemoveListener);
          if (timeoutId) clearTimeout(timeoutId);
          if (authTabId) {
            chrome.tabs.remove(authTabId);
          }
          setLoading(false);
          reject(err);
        }
      };

      // Tab removal listener
      const tabRemoveListener = (removedTabId: number) => {
        if (removedTabId === authTabId) {
          chrome.tabs.onUpdated.removeListener(tabUpdateListener);
          chrome.tabs.onRemoved.removeListener(tabRemoveListener);
          clearTimeout(timeoutId);
          setLoading(false);
          reject(new Error('Authentication cancelled by user'));
        }
      };

      // Set up listeners
      chrome.tabs.onUpdated.addListener(tabUpdateListener);
      chrome.tabs.onRemoved.addListener(tabRemoveListener);

      // Create the authentication tab with the generated authUrl
      chrome.tabs.create({ url: generatedAuthUrl, active: true }, (tab) => {
        if (chrome.runtime.lastError) {
          chrome.tabs.onUpdated.removeListener(tabUpdateListener);
          chrome.tabs.onRemoved.removeListener(tabRemoveListener);
          setLoading(false);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        authTabId = tab.id;
      });

      // Add timeout to prevent hanging (10 minutes)
      timeoutId = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(tabUpdateListener);
        chrome.tabs.onRemoved.removeListener(tabRemoveListener);
        if (authTabId) {
          chrome.tabs.remove(authTabId);
        }
        setLoading(false);
        reject(new Error('Authentication timeout'));
      }, 10 * 60 * 1000);
    });
  }, [ephemeralKeyPair, maxEpoch, randomness, processOAuthToken]);

  const getAppleZkLoginData = useCallback(async (
    providedEphemeralKeyPair?: Ed25519Keypair,
    providedMaxEpoch?: number,
  ): Promise<{
    idToken?: string,
    userSalt?: string,
    zkProof?: PartialZkLoginSignature,
    address?: string
  }> => {
    // Use provided parameters or fall back to state
    const useEphemeralKeyPair = providedEphemeralKeyPair || ephemeralKeyPair;
    const useMaxEpoch = providedMaxEpoch || maxEpoch;

    // Generate nonce and appleAuthUrl inline with provided values
    if (!useEphemeralKeyPair || useMaxEpoch === undefined) {
      console.error('[getAppleZkLoginData] Missing ephemeralKeyPair or maxEpoch');
      return { idToken: undefined, userSalt: undefined, zkProof: undefined, address: undefined };
    }

    const generatedNonce = generateNonce(
      useEphemeralKeyPair.getPublicKey() as PublicKey,
      useMaxEpoch,
      randomness,
    );

    const callbackUrl = chrome.identity.getRedirectURL('apple');
    const params = new URLSearchParams({
      client_id: APPLE_CLIENT_ID,
      redirect_uri: callbackUrl,
      response_type: 'code id_token',
      response_mode: 'form_post',
      scope: 'name email openid',
      nonce: generatedNonce,
    });
    const generatedAppleAuthUrl = `https://appleid.apple.com/auth/authorize?${params}`;

    console.log('[getAppleZkLoginData] Generated authUrl with nonce:', generatedNonce);

    setLoading(true);

    return new Promise<{
      idToken: string,
      userSalt: string | undefined,
      zkProof?: PartialZkLoginSignature,
      address?: string
    }>((resolve, reject) => {
      let authTabId: number | undefined = undefined;
      let timeoutId: NodeJS.Timeout | undefined = undefined;
      const redirectUrlPattern = chrome.identity.getRedirectURL('apple');

      // Listen for Apple Sign-In callback from service worker
      let messageListener: ((message: any) => void) | undefined = undefined;

      messageListener = (message) => {
        if (message.type === 'APPLE_SIGNIN_CALLBACK' && message.data?.id_token) {
          console.log('Received Apple Sign-In callback:', message.data);

          // Clean up listeners
          if (messageListener) {
            chrome.runtime.onMessage.removeListener(messageListener);
          }
          chrome.tabs.onRemoved.removeListener(tabRemoveListener);
          if (timeoutId) clearTimeout(timeoutId);
          if (authTabId) {
            chrome.tabs.remove(authTabId);
          }

          // Process the ID token
          const idToken = message.data.id_token;

          // Calculate extendedEphemeralPublicKey inline from the ephemeralKeyPair we're using
          const computedExtendedEphemeralPublicKey = useEphemeralKeyPair
            ? getExtendedEphemeralPublicKey(useEphemeralKeyPair.getPublicKey() as PublicKey)
            : undefined;

          processOAuthToken(
            idToken,
            'apple',
            useMaxEpoch,
            computedExtendedEphemeralPublicKey,
          )
            .then(result => {
              setLoading(false);
              resolve(result);
            })
            .catch(error => {
              console.error('Failed to process Apple OAuth token:', error);
              setLoading(false);
              resolve({ idToken, userSalt: undefined, zkProof: undefined, address: undefined });
            });
        }
      };

      // Tab removal listener
      const tabRemoveListener = (removedTabId: number) => {
        if (removedTabId === authTabId) {
          if (messageListener) {
            chrome.runtime.onMessage.removeListener(messageListener);
          }
          chrome.tabs.onRemoved.removeListener(tabRemoveListener);
          if (timeoutId) clearTimeout(timeoutId);
          setLoading(false);
          reject(new Error('Apple authentication cancelled by user'));
        }
      };

      // Set up listeners
      chrome.runtime.onMessage.addListener(messageListener);
      chrome.tabs.onRemoved.addListener(tabRemoveListener);

      // Create the authentication tab with the generated authUrl
      chrome.tabs.create({ url: generatedAppleAuthUrl, active: true }, (tab) => {
        if (chrome.runtime.lastError) {
          if (messageListener) {
            chrome.runtime.onMessage.removeListener(messageListener);
          }
          chrome.tabs.onRemoved.removeListener(tabRemoveListener);
          setLoading(false);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        authTabId = tab.id;
      });

      // Add timeout to prevent hanging (10 minutes)
      timeoutId = setTimeout(() => {
        if (messageListener) {
          chrome.runtime.onMessage.removeListener(messageListener);
        }
        chrome.tabs.onRemoved.removeListener(tabRemoveListener);
        if (authTabId) {
          chrome.tabs.remove(authTabId);
        }
        setLoading(false);
        reject(new Error('Apple authentication timeout'));
      }, 10 * 60 * 1000);
    });
  }, [ephemeralKeyPair, maxEpoch, randomness, processOAuthToken]);

  const getCachedZkLoginData = useCallback(async (password?: string): Promise<{
    idToken?: string,
    userSalt?: string,
    zkProof?: PartialZkLoginSignature,
    address?: string
  }> => {
    const actualPassword = password ?? currentPassword ?? undefined;

    // 1. Validate epoch first
    console.log('[getCachedZkLoginData] Validating epoch...');
    const epochResult = await validateAndUpdateEpoch();

    // 2. If epoch expired, clear cache and prepare for re-authentication
    if (!epochResult.isValid) {
      console.log('[getCachedZkLoginData] Epoch expired, clearing cache and re-authenticating...');
      clearZkLoginCache();
      generateNewEphemeralKeyPair(actualPassword);
    }

    // 3. Ensure maxEpoch state is synced with the validated value
    // This is critical for the first call to work properly
    if (epochResult.maxEpoch !== undefined && epochResult.maxEpoch !== maxEpoch) {
      console.log('[getCachedZkLoginData] Syncing maxEpoch state:', epochResult.maxEpoch);
      setMaxEpoch(epochResult.maxEpoch);
      // Wait a tick for React state to update
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // 4. Check if cached data exists
    const hasCacheData = !!idToken && !!userSalt && !!zkProof && !!address;

    // 5. Use cache if valid and exists
    if (epochResult.isValid && hasCacheData) {
      console.log('[getCachedZkLoginData] Using cached ZkLogin data (epoch valid)');
      return { idToken, userSalt, zkProof, address };
    }

    // 6. Ensure ephemeralKeyPair exists before starting authentication
    // This is called ONLY when user actively chooses to authenticate with zkLogin
    console.log('[getCachedZkLoginData] Ensuring ephemeralKeyPair exists before authentication...');
    ensureEphemeralKeyPair(actualPassword);
    // Wait for state update
    await new Promise(resolve => setTimeout(resolve, 0));

    // 7. Get the actual ephemeralKeyPair and maxEpoch values (bypass React state timing issues)
    let actualEphemeralKeyPair = ephemeralKeyPair;
    if (!actualEphemeralKeyPair && actualPassword) {
      // Read directly from localStorage if state isn't ready yet
      const encryptedKey = localStorage.getItem(ENCRYPTED_EPHEMERAL_KEY_STORAGE_KEY);
      if (encryptedKey) {
        try {
          const decryptedPrivateKey = aesDecrypt(encryptedKey, actualPassword);
          actualEphemeralKeyPair = Ed25519Keypair.fromSecretKey(decryptedPrivateKey);
          console.log('[getCachedZkLoginData] Loaded ephemeralKeyPair directly from localStorage');
        } catch (error) {
          console.error('[getCachedZkLoginData] Failed to decrypt ephemeral key:', error);
        }
      }
    }

    const actualMaxEpoch = epochResult.maxEpoch || maxEpoch;
    console.log('[getCachedZkLoginData] Using ephemeralKeyPair:', !!actualEphemeralKeyPair, 'maxEpoch:', actualMaxEpoch);

    // 8. Otherwise execute full authentication flow with explicit parameters
    console.log('[getCachedZkLoginData] Cache miss or expired, executing full authentication');
    const data = await getZkLoginData(actualEphemeralKeyPair, actualMaxEpoch);

    // 6. Update cached data (both state and localStorage with encryption)
    if (data.idToken) {
      setIdToken(data.idToken);
      if (actualPassword) {
        const encryptedIdToken = aesEncrypt(data.idToken, actualPassword);
        localStorage.setItem(ENCRYPTED_ID_TOKEN_STORAGE_KEY, encryptedIdToken);
      }
    }
    if (data.userSalt) {
      setUserSalt(data.userSalt);
      if (actualPassword) {
        const encryptedUserSalt = aesEncrypt(data.userSalt, actualPassword);
        localStorage.setItem(ENCRYPTED_USER_SALT_STORAGE_KEY, encryptedUserSalt);
      }
    }
    if (data.zkProof) {
      setZkProof(data.zkProof);
      if (actualPassword) {
        const zkProofString = JSON.stringify(data.zkProof);
        const encryptedZkProof = aesEncrypt(zkProofString, actualPassword);
        localStorage.setItem(ENCRYPTED_ZKPROOF_STORAGE_KEY, encryptedZkProof);
      }
    }
    if (data.address) {
      setAddress(data.address);
      localStorage.setItem(ADDRESS_LOCAL_STORAGE_KEY, data.address); // Public data, no encryption needed
    }

    return data;
  }, [idToken, userSalt, zkProof, address, validateAndUpdateEpoch, clearZkLoginCache, generateNewEphemeralKeyPair, ensureEphemeralKeyPair, getZkLoginData, currentPassword, maxEpoch, ephemeralKeyPair]);

  const getCachedAppleZkLoginData = useCallback(async (password?: string): Promise<{
    idToken?: string,
    userSalt?: string,
    zkProof?: PartialZkLoginSignature,
    address?: string
  }> => {
    const actualPassword = password ?? currentPassword ?? undefined;

    // 1. Validate epoch first
    console.log('[getCachedAppleZkLoginData] Validating epoch...');
    const epochResult = await validateAndUpdateEpoch();

    // 2. If epoch expired, clear cache and prepare for re-authentication
    if (!epochResult.isValid) {
      console.log('[getCachedAppleZkLoginData] Epoch expired, clearing cache and re-authenticating...');
      clearZkLoginCache();
      generateNewEphemeralKeyPair(actualPassword);
    }

    // 3. Ensure maxEpoch state is synced with the validated value
    // This is critical for the first call to work properly
    if (epochResult.maxEpoch !== undefined && epochResult.maxEpoch !== maxEpoch) {
      console.log('[getCachedAppleZkLoginData] Syncing maxEpoch state:', epochResult.maxEpoch);
      setMaxEpoch(epochResult.maxEpoch);
      // Wait a tick for React state to update
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // 4. Check if cached data exists
    const hasCacheData = !!idToken && !!userSalt && !!zkProof && !!address;

    // 5. Use cache if valid and exists
    if (epochResult.isValid && hasCacheData) {
      console.log('[getCachedAppleZkLoginData] Using cached ZkLogin data (epoch valid)');
      return { idToken, userSalt, zkProof, address };
    }

    // 6. Ensure ephemeralKeyPair exists before starting authentication
    // This is called ONLY when user actively chooses to authenticate with zkLogin
    console.log('[getCachedAppleZkLoginData] Ensuring ephemeralKeyPair exists before authentication...');
    ensureEphemeralKeyPair(actualPassword);
    // Wait for state update
    await new Promise(resolve => setTimeout(resolve, 0));

    // 7. Get the actual ephemeralKeyPair and maxEpoch values (bypass React state timing issues)
    let actualEphemeralKeyPair = ephemeralKeyPair;
    if (!actualEphemeralKeyPair && actualPassword) {
      // Read directly from localStorage if state isn't ready yet
      const encryptedKey = localStorage.getItem(ENCRYPTED_EPHEMERAL_KEY_STORAGE_KEY);
      if (encryptedKey) {
        try {
          const decryptedPrivateKey = aesDecrypt(encryptedKey, actualPassword);
          actualEphemeralKeyPair = Ed25519Keypair.fromSecretKey(decryptedPrivateKey);
          console.log('[getCachedAppleZkLoginData] Loaded ephemeralKeyPair directly from localStorage');
        } catch (error) {
          console.error('[getCachedAppleZkLoginData] Failed to decrypt ephemeral key:', error);
        }
      }
    }

    const actualMaxEpoch = epochResult.maxEpoch || maxEpoch;
    console.log('[getCachedAppleZkLoginData] Using ephemeralKeyPair:', !!actualEphemeralKeyPair, 'maxEpoch:', actualMaxEpoch);

    // 8. Otherwise execute full authentication flow with explicit parameters
    console.log('[getCachedAppleZkLoginData] Cache miss or expired, executing full authentication');
    const data = await getAppleZkLoginData(actualEphemeralKeyPair, actualMaxEpoch);

    // 9. Update cached data (both state and localStorage with encryption)
    if (data.idToken) {
      setIdToken(data.idToken);
      if (actualPassword) {
        const encryptedIdToken = aesEncrypt(data.idToken, actualPassword);
        localStorage.setItem(ENCRYPTED_ID_TOKEN_STORAGE_KEY, encryptedIdToken);
      }
    }
    if (data.userSalt) {
      setUserSalt(data.userSalt);
      if (actualPassword) {
        const encryptedUserSalt = aesEncrypt(data.userSalt, actualPassword);
        localStorage.setItem(ENCRYPTED_USER_SALT_STORAGE_KEY, encryptedUserSalt);
      }
    }
    if (data.zkProof) {
      setZkProof(data.zkProof);
      if (actualPassword) {
        const zkProofString = JSON.stringify(data.zkProof);
        const encryptedZkProof = aesEncrypt(zkProofString, actualPassword);
        localStorage.setItem(ENCRYPTED_ZKPROOF_STORAGE_KEY, encryptedZkProof);
      }
    }
    if (data.address) {
      setAddress(data.address);
      localStorage.setItem(ADDRESS_LOCAL_STORAGE_KEY, data.address); // Public data, no encryption needed
    }

    return data;
  }, [idToken, userSalt, zkProof, address, validateAndUpdateEpoch, clearZkLoginCache, generateNewEphemeralKeyPair, ensureEphemeralKeyPair, getAppleZkLoginData, currentPassword, maxEpoch, ephemeralKeyPair]);

  const getUserSalt = useCallback(async (idToken: string, path: ZkloginProvider) => {
    setLoading(true);
    try {
      const res = await zkLoginService.getUserSalt(idToken, path);
      return res;
    } catch (error) {
      console.error('Failed to get user salt:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const decodedJwt = useMemo(() => {
    if (!idToken) return undefined;
    return jwtDecode<IdTokenPayload>(idToken);
  }, [idToken]);
  // console.log('      decodedJwt', decodedJwt);

  const hasCachedData = useMemo(() => {
    return !!(idToken && userSalt && zkProof && address);
  }, [idToken, userSalt, zkProof, address]);

  const getAddress = useCallback((jwt?: string, userSalt?: string) => {
    if (!jwt || !userSalt) return undefined;
    const zkLoginUserAddress = jwtToAddress(jwt, userSalt);
    return zkLoginUserAddress;
  }, []);

  const ret = useMemo(() => {
    return {
      // 现有的Google相关
      ephemeralKeyPair,
      extendedEphemeralPublicKey,
      maxEpoch,
      randomness,
      nonce,
      authUrl,
      getZkLoginData,          // 保持原有函数
      loading,
      getUserSalt,
      decodedJwt,
      getAddress,
      getZkProof,

      // Apple相关
      appleAuthUrl,            // Apple授权URL
      getAppleZkLoginData,     // Apple登录数据获取函数

      // 新增的缓存相关
      getCachedZkLoginData,    // Google登录的智能缓存函数
      getCachedAppleZkLoginData, // Apple登录的智能缓存函数
      clearZkLoginCache,       // 清除所有缓存（包括 ephemeralKeyPair 和 maxEpoch）
      clearZkLoginAuthData,    // 仅清除认证数据（保留 ephemeralKeyPair 和 maxEpoch）
      hasCachedData,          // 缓存状态检查

      // Epoch验证相关
      validateAndUpdateEpoch,  // Epoch验证函数（供手动调用）

      // 直接暴露缓存的数据
      cachedIdToken: idToken,
      cachedUserSalt: userSalt,
      cachedZkProof: zkProof,
      cachedAddress: address,
    };
  }, [ephemeralKeyPair, extendedEphemeralPublicKey, maxEpoch, randomness, nonce, authUrl, getZkLoginData, loading, getUserSalt, decodedJwt, getAddress, getZkProof, appleAuthUrl, getAppleZkLoginData, getCachedZkLoginData, getCachedAppleZkLoginData, clearZkLoginCache, clearZkLoginAuthData, hasCachedData, validateAndUpdateEpoch, idToken, userSalt, zkProof, address]);

  return ret;
};
