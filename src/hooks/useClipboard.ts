import { useTranslation } from 'react-i18next';
import { toastDefault, toastError } from '@/utils/toast.tsx';
import copy from 'copy-to-clipboard';

export function useClipboard() {
  const { t } = useTranslation();

  const copyToClipboard = async (copyText: string, showToast = true) => {
    const text = String(copyText ?? '').trim();

    // 1) 先确保有内容可复制
    if (!text) {
      if(showToast) toastError(t('components.MainBox.CoinDetailBox.index.copyFailed')); // 或者提示“暂无可复制内容”
      return false;
    }

    try {
      // 2) 优先使用异步 Clipboard API（仅在 https/localhost 生效）
      if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        if(showToast) toastDefault(t('components.MainBox.CoinDetailBox.index.copied'));
        return true;
      }

      // 3) 回退到 copy-to-clipboard
      const ok = copy(text, { format: 'text/plain' });
      if (ok) {
        if(showToast) toastDefault(t('components.MainBox.CoinDetailBox.index.copied'));
        return true;
      } else {
        if(showToast) toastError(t('components.MainBox.CoinDetailBox.index.copyFailed'));
        return false;
      }
    } catch {
      if(showToast) toastError(t('components.MainBox.CoinDetailBox.index.copyFailed'));
    }
  };

  return { copyToClipboard };
}
