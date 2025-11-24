import { useTranslation } from 'react-i18next';
import BaseBody from '@/components/BaseLayout/components/BaseBody';
import EdgeAligner from '@/components/BaseLayout/components/EdgeAligner';
import { LOCK_UP_TIME_OPTIONS, NEVER_LOCK_KEY } from '@/constants/autoLock';
import { Container } from './-styled';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore.ts';
import type { LockupTimeOptions } from '@/types/autoLock.ts';
import { useRouter } from '@tanstack/react-router';

import CheckedIcon from '@/assets/images/icons/Checked18.svg';

export default function Entry() {
  const { t } = useTranslation();
  const { history } = useRouter();

  const {
    autoLockTimeInMinutes,
    isSignatureEnabled,
    updateExtensionStorageStore,
  } = useExtensionStorageStore((state) => state);

  const onHandleClick = (val: LockupTimeOptions) => {
    // 保存设置到存储，Service Worker 会自动监听变化并处理
    updateExtensionStorageStore('autoLockTimeInMinutes', val);

    // 清理旧的时间戳（如果选择永不锁定）
    if (val === NEVER_LOCK_KEY) {
      updateExtensionStorageStore('autoLockTimeStampAt', null);
    }
  };

  const toggleSignature = () => {
    updateExtensionStorageStore('isSignatureEnabled', !isSignatureEnabled);
  };

  return (
    <BaseBody>
      <EdgeAligner>
        <Container>
          {LOCK_UP_TIME_OPTIONS.map((item) => {
            const isActive = autoLockTimeInMinutes === item;

            return (
              <div
                key={item}
                className="flex items-center justify-between mb-[36px]"
                onClick={(val) => {
                  onHandleClick(item);
                  history.back();
                }}
              >
                {item === 'never' ? (
                  <div>
                    <div
                      className={`h-[20px] leading-[20px] text-[16px] font-medium ${isActive ? 'text-[#477CFC]' : 'text-white'}`}
                    >
                      {t('pages.general-setting.components.SetAutoLockBottomSheet.components.OptionButton.index.never')}
                    </div>
                    <div className="mt-[4px] h-[20px] leading-[20px] text-white text-[14px] opacity-40">
                      {t('pages.general-setting.components.SetAutoLockBottomSheet.components.OptionButton.index.notRecommended')}
                    </div>
                  </div>
                ) : Number(item) < 60 ? (
                  <div
                    className={`h-[20px] leading-[20px] text-[16px] font-medium ${isActive ? 'text-[#477CFC]' : 'text-white'}`}
                  >
                    {t('pages.general-setting.lock.entry.minutes', { value: item })}
                  </div>
                ) : (
                  <div
                    className={`h-[20px] leading-[20px] text-[16px] font-medium ${isActive ? 'text-[#477CFC]' : 'text-white'}`}
                  >
                    {t('pages.general-setting.lock.entry.hours', { value: Number(item) / 60 })}
                  </div>
                )}
                {isActive && <CheckedIcon />}
              </div>
            );
          })}

          {/* Signature Switch */}
          <div className="flex items-center justify-between mt-[40px]" onClick={toggleSignature}>
            <div className="h-[20px] leading-[20px] text-[16px] font-medium text-white">
              {t('pages.general-setting.lock.entry.requirePassword')}
            </div>
            <div
              className={`w-[44px] h-[24px] rounded-full p-[2px] transition-colors duration-200 ease-in-out ${isSignatureEnabled ? 'bg-[#477CFC]' : 'bg-gray-400'}`}
            >
              <div
                className={`bg-white w-[20px] h-[20px] rounded-full transform transition-transform duration-200 ease-in-out ${isSignatureEnabled ? 'translate-x-[20px]' : 'translate-x-0'}`}
              />
            </div>
          </div>
        </Container>
      </EdgeAligner>
    </BaseBody>
  );
}
