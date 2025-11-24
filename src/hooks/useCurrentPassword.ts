import { v4 as uuidv4 } from 'uuid';

import { aesDecrypt, aesEncrypt } from '@/utils/crypto';
import { useExtensionSessionStorageStore } from '@/zustand/hooks/useExtensionSessionStorageStore';

export function useCurrentPassword() {
  const { sessionPassword, updateExtensionSessionStorageStore } = useExtensionSessionStorageStore((state) => state);

  const setCurrentPassword = async (password: string | null) => {
    const timestamp = new Date().getTime();
    const key = uuidv4();

    // 更新密码
    await updateExtensionSessionStorageStore(
      'sessionPassword',
      password
        ? {
            key,
            timestamp,
            encryptedPassword: aesEncrypt(password, `${key}${timestamp}`),
          }
        : null,
    );

    // 同时更新活动时间戳（如果设置了密码）
    if (password) {
      await updateExtensionSessionStorageStore('lastActivityTimestamp', Date.now());
      console.log('[useCurrentPassword] Password and activity timestamp updated');
    } else {
      console.log('[useCurrentPassword] Password cleared');
    }
  };

  const currentPassword = sessionPassword ? aesDecrypt(sessionPassword.encryptedPassword, `${sessionPassword.key}${sessionPassword.timestamp}`) : null;

  return { currentPassword, setCurrentPassword };
}
