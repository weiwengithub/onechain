import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { sendMessage } from '@/libs/extension';
import { useCurrentAccount } from './useCurrentAccount';

/**
 * 强制刷新余额的Hook
 * 解决余额更新缓慢的问题
 */
export function useForceRefreshBalance() {
  const { currentAccount } = useCurrentAccount();
  const queryClient = useQueryClient();

  const forceRefresh = useCallback(async () => {
    try {
      console.log('🔄 开始强制刷新余额...');
      
      // 1. 清除所有相关的React Query缓存
      await queryClient.invalidateQueries({ 
        queryKey: ['accountAllAssets'] 
      });
      await queryClient.invalidateQueries({ 
        queryKey: ['updateBalance'] 
      });
      
      // 2. 触发Service Worker更新余额
      await sendMessage({ 
        target: 'SERVICE_WORKER', 
        method: 'updateBalance', 
        params: [currentAccount.id] 
      });
      
      // 3. 等待一小段时间让Service Worker完成更新
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 4. 再次清除缓存并重新获取数据
      await queryClient.invalidateQueries({ 
        queryKey: ['accountAllAssets', currentAccount.id] 
      });
      
      // 5. 强制重新获取数据
      await queryClient.refetchQueries({ 
        queryKey: ['accountAllAssets', currentAccount.id] 
      });
      
      console.log('✅ 余额刷新完成');
      
    } catch (error) {
      console.error('❌ 刷新余额失败:', error);
      throw error;
    }
  }, [currentAccount.id, queryClient]);

  return { forceRefresh };
}