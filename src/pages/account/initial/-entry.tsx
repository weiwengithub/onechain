import { useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import CheckboxIcon from '@/assets/img/icon/checkbox.png';
import CheckboxCheckedIcon from '@/assets/img/icon/checkbox_checked.png';

import BaseFooter from '@/components/BaseLayout/components/BaseFooter';
import Button from '@/components/common/Button';
import { Route as SetPassword } from '@/pages/account/set-password';

import { Container } from './-styled';
import backgroundImg from '@/assets/images/backgroundImage/solgan.png';
import { AWS_URL } from '@/script/service-worker/update/constant.ts';

export default function Entry() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [isCheckTerms, setIsCheckTerms] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setIsLanguageMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languageOptions = useMemo(
    () => [
      { code: 'en', label: t('pages.account.initial.entry.languageOptions.english') },
      { code: 'zh', label: t('pages.account.initial.entry.languageOptions.chinese') },
    ],
    [t],
  );

  const normalizedLanguage = (i18n.language || 'en').split('-')[0];
  const currentLanguageLabel =
    languageOptions.find((option) => option.code === normalizedLanguage)?.label ?? languageOptions[0].label;

  return (
    <Container>
      <div className="flex justify-end w-full px-4 pt-4">
        <div className="relative mt-5 text-[14px]" ref={languageMenuRef}>
          <button
            className="flex items-center gap-[6px] rounded-full border border-[#2C3039] bg-[#1E2025] px-4 py-[6px] text-[14px] text-white"
            onClick={() => setIsLanguageMenuOpen((prev) => !prev)}
          >
            {currentLanguageLabel}
            <span className={`transition-transform ${isLanguageMenuOpen ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {isLanguageMenuOpen && (
            <div
              className="absolute right-0 mt-2 min-w-[140px] rounded-[12px] border border-[#2C3039] bg-[#1E2025] shadow-lg z-10"
            >
              {languageOptions.map((option) => (
                <div
                  key={option.code}
                  className={`px-4 py-2 text-[14px] text-white cursor-pointer hover:bg-[#2C3039] ${
                    option.code === normalizedLanguage ? 'text-[#477CFC]' : ''
                  }`}
                  onClick={() => {
                    i18n.changeLanguage(option.code);
                    setIsLanguageMenuOpen(false);
                  }}
                >
                  {option.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <img
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-center',
          marginTop: '120px',
          width: '241px',
          height: '250px',
        }}
        src={backgroundImg}
        alt="backgroundImg"
      />
      <BaseFooter>
        <>
          <div className="mb-[16px] flex items-center">
            <div
              className="relative size-[20px] shrink-0"
              onClick={() => {
                setIsCheckTerms(!isCheckTerms);
              }}
            >
              {isCheckTerms && (<img src={CheckboxCheckedIcon} alt="Checked" className="size-full" />)}
              {!isCheckTerms && (<img src={CheckboxIcon} alt="unChecked" className="size-full" />)}
            </div>
            <div className="ml-[8px] text-[14px] leading-[17px] text-[rgba(255,255,255,0.6)]">
              <Trans
                i18nKey="pages.account.initial.entry.termsNotice"
                components={{
                  terms: (
                    <span
                      className="mr-[4px] ml-[4px] cursor-pointer text-[#0047C4]"
                      onClick={async () => {
                        await chrome.tabs.create({
                          url: `${AWS_URL}/agreement/index.html#/terms`,
                        });
                      }}
                    />
                  ),
                  privacy: (
                    <span
                      className="ml-[4px] cursor-pointer text-[#0047C4]"
                      onClick={async () => {
                        await chrome.tabs.create({
                          url: `${AWS_URL}/agreement/index.html#/privacy`,
                        });
                      }}
                    />
                  ),
                }}
              />
            </div>
          </div>
          <Button
            disabled={!isCheckTerms}
            onClick={() => {
              navigate({ to: SetPassword.to });
            }}
          >
            {t('pages.account.initial.index.start')}
          </Button>
        </>
      </BaseFooter>
    </Container>
  );
}
