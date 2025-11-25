import { useNavigate } from '@tanstack/react-router';

import BaseLayout from '@/components/BaseLayout';
// import Base1300Text from '@/components/common/Base1300Text';
import FloatingButton from '@/components/FloatingButton';
import FloatingContents from '@/components/FloatingButton/components/FloatingContents';
import FooterCoinPrice from '@/components/FooterCoinPrice';
import Header from '@/components/Header';
import NavigationPanel from '@/components/Header/components/NavigationPanel';
import { BABYLON_POPOVER_ID, DROP_POPOVER_ID } from '@/constants/adPopover';
// import { useCurrentAccount } from '@/hooks/useCurrentAccount';
import { Route as CoinAbout } from '@/pages/coin-detail/$coinId/about';
import { isStillBlocked } from '@/utils/date';
import { parseCoinId } from '@/utils/queryParamGenerator';
import { turnOnAdPopover } from '@/utils/zustand/adPopoverState';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';

import { FloatingButtonContainer, FooterContainer } from './-styled';

import BabylonFloatingImage from '@/assets/images/ad/babylonFloating.png';
import DropFloatingImage from '@/assets/images/ad/dropFloating.png';
import { useGetAccountAsset } from '@/hooks/useGetAccountAsset.ts';

type LayoutProps = {
  children: JSX.Element;
  coinId: string;
};

export default function Layout({ children, coinId }: LayoutProps) {
  const navigate = useNavigate();
  // const { currentAccount } = useCurrentAccount();
  const { adPopoverState } = useExtensionStorageStore((state) => state);

  const floatingContents = (() => {
    const { id, chainId, chainType } = parseCoinId(coinId);

    if (id === 'uatom' && chainId === 'cosmos') {
      return {
        popOverId: DROP_POPOVER_ID,
        image: DropFloatingImage,
        borderColor: {
          startColor: '#E7D5FC',
          endColor: '#302659',
        },
        launchFunc: () => {
          window.open('https://app.drop.money/dashboard?referral_code=dropmaga', '_blank');
        },
      };
    }

    if ((id === 'ubbn' && (chainId === 'babylon' || chainId === 'babylon-testnet')) || chainType === 'bitcoin') {
      return {
        popOverId: BABYLON_POPOVER_ID,
        image: BabylonFloatingImage,
        borderColor: {
          startColor: '#FF7C2B',
          endColor: '#56C4C8',
        },
        launchFunc: () => {
          window.open('https://btcstaking.babylonlabs.io/', '_blank');
        },
      };
    }
  })();

  //todo
  const tempDisplay = false;

  const { getAccountAsset } = useGetAccountAsset({ coinId });
  const currentCoin = getAccountAsset();
  const coinImage = currentCoin?.asset.image;
  const chainName = currentCoin?.chain.name;

  return (
    <BaseLayout
      header={
        <Header
          leftContent={<NavigationPanel isHideHomeButton />}
          middleContent={
            <div className="flex h-[22px] text-[18px] leading-[22px] text-white font-medium">
              <div className="mt-[-1px] mr-[8px] size-[24px]">
                <img
                  src={coinImage}
                  alt={chainName}
                  className="h-full w-full shrink-0"
                />

              </div>
              <div className={'text-[14px] whitespace-nowrap'}>{chainName}</div>
            </div>
          }
        />}
      footer={
        <FooterContainer>
          <FloatingButtonContainer>
            {floatingContents && (
              <FloatingButton
                onClick={async () => {
                  const { lastClosed } = adPopoverState[floatingContents.popOverId];
                  const isBlocked = lastClosed ? isStillBlocked(lastClosed, 7) : false;

                  if (isBlocked) {
                    floatingContents.launchFunc();
                  } else {
                    await turnOnAdPopover(floatingContents.popOverId);
                  }
                }}
              >
                <FloatingContents image={floatingContents.image} borderColor={floatingContents.borderColor} />
              </FloatingButton>
            )}
          </FloatingButtonContainer>
          {tempDisplay && <FooterCoinPrice
            coinId={coinId}
            onClick={() => {
              navigate({
                to: CoinAbout.to,
                params: {
                  coinId: coinId,
                },
              });
            }}
          />}
        </FooterContainer>
      }
    >
      {children}
    </BaseLayout>
  );
}
