import { RPC_ERROR, RPC_ERROR_MESSAGE } from '@/constants/error';
import { sendMessage } from '@/libs/extension';
import type { RequestQueue } from '@/types/extension';
import type { ServiceWorkerMessage, UserActivityMessage } from '@/types/message/service-worker';
import { extension } from '@/utils/browser';
import { devLogger } from '@/utils/devLogger';
import { getExtensionLocalStorage, setExtensionLocalStorage } from '@/utils/storage';
// import { openTab } from '@/utils/view/controlView';
import { closeWindow } from '@/utils/view/window';

import { initExtensionView } from './initialize';
import { process } from './message';
import { lockManager } from './managers/LockManager';
import { updateAccountInfo } from './update/account';
import { address, customChainAddress } from './update/address';
import {
  updateActiveAssetsBalance,
  updateCustomBalance,
  updateDefaultAssetsBalance,
  updateSpecificChainBalance,
} from './update/balance';
import { updateSpecificChainStaking, updateStakingRelatedBalance } from './update/staking';
import { v11 } from './update/v11';

initExtensionView();

// 初始化锁定管理器 - 使用异步初始化
(async () => {
  await lockManager.initialize();
  console.log('[ServiceWorker] LockManager initialization completed');
})();
// const response = await chrome.runtime.sendMessage({ })

extension.storage.onChanged.addListener((changes) => {
  for (const [key, { newValue }] of Object.entries(changes)) {
    if (key === 'requestQueue') {
      const newQueues = newValue as RequestQueue[] | undefined;
      const text = newQueues ? `${newQueues.length > 0 ? newQueues.length : ''}` : '';
      void extension.action.setBadgeText({ text });
    }

    // 监听锁定时间设置变化
    if (key === 'autoLockTimeInMinutes') {
      lockManager.setLockTime(newValue);
    }

    // 监听认证状态变化
    if (key === 'sessionPassword') {
      if (newValue) {
        // 只有在初始化完成后才调用login，避免绕过过期检查
        if (lockManager.hasInitialized()) {
          console.log('[ServiceWorker] SessionPassword detected, calling login after initialization');
          lockManager.login();
        } else {
          console.log('[ServiceWorker] SessionPassword detected but LockManager not initialized yet, skipping login call');
        }
      } else {
        lockManager.lock();
      }
    }
  }
});

chrome.runtime.onMessage.addListener((message: ServiceWorkerMessage | UserActivityMessage | any, sender, sendResponse) => {
  (async () => {
    // devLogger.log('service worker message', message);

    // 处理keepalive信号
    if (message.type === 'KEEPALIVE') {
      sendResponse({ type: 'KEEPALIVE_RESPONSE', data: 'pong' });
      return;
    }

    // 处理用户活动信号
    if (message.type === 'USER_ACTIVITY') {
      lockManager.onUserActivity();
      sendResponse({ success: true });
      return;
    }
    // devLogger.log('service worker sender', sender);

    if (sender?.id === chrome.runtime.id && message?.target === 'SERVICE_WORKER') {
      if (message.method === 'updateBalance') {
        const [id] = message.params;
        await updateActiveAssetsBalance(id);
        await updateCustomBalance(id);

        sendResponse(null);
      }

      if (message.method === 'updateDefaultBalance') {
        const [id] = message.params;
        await updateDefaultAssetsBalance(id);
        sendResponse(null);
      }

      if (message.method === 'updateStaking') {
        const [id] = message.params;
        await updateStakingRelatedBalance(id);
        sendResponse(null);
      }

      if (message.method === 'updateAccountInfo') {
        const [id] = message.params;
        await updateAccountInfo(id);
        sendResponse(null);
      }

      if (message.method === 'updateAddress') {
        const [id] = message.params;
        await address(id);
        await customChainAddress(id);
        sendResponse(null);
      }

      if (message.method === 'updateChainSpecificBalance') {
        const [id, chainId, address] = message.params;
        await updateSpecificChainBalance(id, chainId, address);
        sendResponse(null);
      }

      if (message.method === 'updateChainSpecificStakingBalance') {
        const [id, chainId, address] = message.params;
        await updateSpecificChainBalance(id, chainId, address);
        await updateSpecificChainStaking(id, chainId, address);
        sendResponse(null);
      }

      if (message.method === 'requestApp') {
        const { params } = message;

        await process({ ...params, tabId: sender.tab?.id });
        sendResponse(null);
      }

      if (message.method === 'openSidePanel') {
        if (sender.tab?.id && typeof chrome !== 'undefined' && typeof chrome.sidePanel !== 'undefined') {
          if (__APP_BROWSER__ === 'chrome') {
            if (!chrome.sidePanel) {
              return;
            }

            await chrome.sidePanel.open({ tabId: sender.tab.id });
            await chrome.sidePanel.setOptions({
              tabId: sender.tab.id,
              path: 'sidepanel.html',
              enabled: true,
            });
          } else {
            browser.sidebarAction.setPanel({
              panel: 'sidepanel.html',
            });

            browser.sidebarAction.open();
          }
        }

        sendResponse(null);
      }
    }
  })();
  return true;
});

chrome.runtime.onInstalled.addListener((details) => {
  void (async () => {
    await v11();

    if (details.reason === 'install') {
      // await openTab();
    }
  })();
});

void extension.action.setBadgeBackgroundColor({ color: '#7C4FFC' });
void extension.action.setBadgeText({ text: '' });

extension.windows.onRemoved.addListener((windowId) => {
  void (async () => {
    const queues = await getExtensionLocalStorage('requestQueue');

    const currentWindowIds = queues.filter((item) => typeof item.windowId === 'number').map((item) => item.windowId) as number[];

    const currentWindowId = await getExtensionLocalStorage('currentWindowId');

    if (typeof currentWindowId === 'number') {
      currentWindowIds.push(currentWindowId);
    }

    const windowIds = Array.from(new Set(currentWindowIds));

    await setExtensionLocalStorage('currentWindowId', null);

    if (windowIds.includes(windowId)) {
      queues.forEach((queue) => {
        sendMessage({
          target: 'CONTENT',
          method: 'responseApp',
          origin: queue.origin,
          requestId: queue.requestId,
          tabId: queue.tabId,
          params: {
            id: queue.requestId,
            error: {
              code: RPC_ERROR.INVALID_INPUT,
              message: `${RPC_ERROR_MESSAGE[RPC_ERROR.INVALID_INPUT]}`,
            },
          },
        });

        void closeWindow(queue.windowId);
      });

      await setExtensionLocalStorage('requestQueue', []);
    }
  })();
});

// Apple Sign-In webRequest interception for form_post data
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    console.log('webRequest intercepted:', details.url, details.method);

    if (details.method === 'POST' &&
      details.url.includes('.chromiumapp.org/apple') &&
      details.requestBody?.formData) {

      console.log('Apple Sign-In form_post intercepted:', details.requestBody.formData);

      // Extract Apple form data
      const formData = details.requestBody.formData;
      const appleData = {
        code: formData.code?.[0],
        id_token: formData.id_token?.[0],
        state: formData.state?.[0],
        user: formData.user?.[0],
        timestamp: Date.now(),
      };

      console.log('Extracted Apple data:', appleData);

      // Send to all tabs that might be listening
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'APPLE_SIGNIN_CALLBACK',
              data: appleData,
            }).catch(() => {
              // Ignore errors for tabs that don't have content scripts
            });
          }
        });
      });

      // Also broadcast to any listening contexts
      chrome.runtime.sendMessage({
        type: 'APPLE_SIGNIN_CALLBACK',
        data: appleData,
      }).catch(() => {
        // Ignore if no listeners
      });
    }
  },
  { urls: ['https://*.chromiumapp.org/apple'] },
  ['requestBody'],
);
