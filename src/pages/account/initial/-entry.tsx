import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import CheckboxIcon from "@/assets/img/icon/checkbox.png";
import CheckboxCheckedIcon from "@/assets/img/icon/checkbox_checked.png";

import BaseFooter from '@/components/BaseLayout/components/BaseFooter';
import Button from '@/components/common/Button';
import { Route as SetPassword } from '@/pages/account/set-password';

import { Container } from './-styled';
import backgroundImg from '@/assets/images/backgroundImage/solgan.png';

export default function Entry() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isCheckTerms, setIsCheckTerms] = useState(false);

  return (
    <Container>
      <img
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-center',
          marginTop: '120px',
          width: '257px',
          height: '249px',
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
              {isCheckTerms && (<img src={CheckboxCheckedIcon} alt="Checked" className="size-full"/>)}
              {!isCheckTerms && (<img src={CheckboxIcon} alt="unChecked" className="size-full"/>)}
            </div>
            <div className="ml-[8px] text-[14px] leading-[17px] text-[rgba(255,255,255,0.6)]">
              By continuing, you agree to our
              <span
                className="mr-[4px] ml-[4px] cursor-pointer text-[#0047C4]"
                onClick={async () => {
                  await chrome.tabs.create({
                    url: "https://onewallet2020.s3.ap-southeast-2.amazonaws.com/aggrement/index.html#/terms",
                  });
                }}
              >
            Terms of Service
          </span>
              and
              <span
                className="ml-[4px] cursor-pointer text-[#0047C4]"
                onClick={async () => {
                  await chrome.tabs.create({
                    url: "https://onewallet2020.s3.ap-southeast-2.amazonaws.com/aggrement/index.html#/privacy",
                  });
                }}
              >
            Privacy Policy
          </span>
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
