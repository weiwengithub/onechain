import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from './useCurrentAccount';
import { useForceRefreshBalance } from './useForceRefreshBalance';

/**
 * 智能余额刷新Hook
 * 在以下情况下自动刷新余额：
 * 1. 页面从隐藏状态变为可见
 * 2. 窗口重新获得焦点
 * 3. 网络从离线状态恢复
 */
export function useSmartBalanceRefresh() {
  const { currentAccount } = useCurrentAccount();
  const { forceRefresh } = useForceRefreshBalance();
  const queryClient = useQueryClient();
  const lastRefreshTime = useRef<number>(0);

  // 防抖：限制刷新频率
  const shouldRefresh = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime.current;
    return timeSinceLastRefresh > 30 * 1000; // 30秒间隔
  }, []);

  const refreshWithThrottle = useCallback(async () => {
    if (!shouldRefresh()) {
      // console.log('刷新频率限制，跳过此次刷新');
      return;
    }

    lastRefreshTime.current = Date.now();
    // console.log('智能刷新余额...');
    await forceRefresh();
  }, [forceRefresh, shouldRefresh]);

  useEffect(() => {
    // 页面可见性变化监听
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // console.log('页面变为可见，触发余额刷新');
        void refreshWithThrottle();
      }
    };

    // 窗口焦点变化监听
    const handleFocus = () => {
      // console.log('窗口获得焦点，触发余额刷新');
      void refreshWithThrottle();
    };

    // 网络状态变化监听
    const handleOnline = () => {
      // console.log('网络恢复连接，触发余额刷新');
      void refreshWithThrottle();
    };

    // 添加事件监听器
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    // 清理函数
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [currentAccount.id, refreshWithThrottle]);

  // 监听账户切换，自动刷新新账户的余额
  useEffect(() => {
    // console.log('账户切换，刷新余额');
    void refreshWithThrottle();
  }, [currentAccount.id, refreshWithThrottle]);

  return {
    forceRefresh: refreshWithThrottle,
  };
}
