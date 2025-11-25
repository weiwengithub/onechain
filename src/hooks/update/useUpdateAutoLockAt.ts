import { useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { KeepAliveClient } from '@/utils/KeepAliveClient';
import { getExtensionSessionStorage, getExtensionLocalStorage } from '@/utils/storage';

// 发送用户活动信号到 Service Worker (仅在真实用户交互时调用)
const sendUserActivity = () => {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.sendMessage({ type: 'USER_ACTIVITY' }).catch(() => {
      // 忽略错误，Service Worker 可能正在重启
    });
  }
};

// 检查认证状态
const checkAuthStatus = async () => {
  try {
    const sessionPassword = await getExtensionSessionStorage('sessionPassword');
    const comparisonPasswordHash = await getExtensionLocalStorage('comparisonPasswordHash');

    const isAuthenticated = !!sessionPassword;
    const hasPasswordSetup = !!comparisonPasswordHash;

    if (!isAuthenticated && hasPasswordSetup) {
      // console.log('[AutoLock] User session expired, should redirect to lock screen');
      // Note: We removed the hard redirect here. The Lock component will handle this.
      // The Lock component already checks (!currentPassword && comparisonPasswordHash)
      return false;
    }

    if (!hasPasswordSetup) {
      // console.log('[AutoLock] Fresh install detected, skipping auto-lock');
      return true; // Allow navigation to proceed for fresh installs
    }

    return isAuthenticated;
  } catch (error) {
    // console.error('[AutoLock] Failed to check auth status:', error);
    return false;
  }
};

export function useUpdateAutoLockAt() {
  const keepAliveClientRef = useRef<KeepAliveClient | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // 防抖的用户活动处理
  const handleUserActivity = useCallback(() => {
    const now = Date.now();
    // 防抖：至少间隔5秒才发送一次用户活动信号
    if (now - lastActivityRef.current > 5000) {
      lastActivityRef.current = now;
      // console.log('[AutoLock] Real user activity detected, sending signal');
      sendUserActivity();
    }
  }, []);

  useEffect(() => {
    // 创建并启动 KeepAlive 客户端
    keepAliveClientRef.current = new KeepAliveClient('REACT_APP');

    // 立即检查一次认证状态
    void checkAuthStatus();

    // 监听真实的用户活动事件
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    // 每30秒检查一次认证状态（不干扰Service Worker定时器）
    const authCheckInterval = setInterval(() => {
      void checkAuthStatus();
    }, 30 * 1000);

    return () => {
      clearInterval(authCheckInterval);

      // 移除事件监听器
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });

      // 清理 KeepAlive 客户端
      if (keepAliveClientRef.current) {
        keepAliveClientRef.current.disconnect();
        keepAliveClientRef.current = null;
      }
    };
  }, [handleUserActivity]);

  // 简化 query 结构，仅用于认证状态检查，不发送用户活动信号
  const { data, isLoading, error } = useQuery({
    queryKey: ['updateAutoLockAt'],
    queryFn: async () => {
      await checkAuthStatus();
      return true;
    },
    staleTime: Infinity,
    refetchInterval: 1000 * 30, // 每30秒检查一次认证状态
  });

  return { data, isLoading, error };
}
