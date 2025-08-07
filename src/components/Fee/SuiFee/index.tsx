import { useTranslation } from 'react-i18next';

import Tooltip from '@/components/common/Tooltip';
// import { SUI_COIN_TYPE } from '@/constants/sui';
import { useAccountAllAssets } from '@/hooks/useAccountAllAssets';

import { Container, StyledButton } from './styled';
// import { useCurrentSuiNetwork } from '@/hooks/sui/useCurrentSuiNetwork.ts';
import { getSuiCoinType } from '@/onechain/utils';

type SuiFeeProps = {
  id: string;
  displayFeeAmount?: string;
  disableConfirm?: boolean;
  errorMessage?: string;
  isLoading?: boolean;
  onClickConfirm: () => void;
};

export default function SuiFee({
                                 id,
                                 displayFeeAmount,
                                 disableConfirm,
                                 isLoading,
                                 errorMessage,
                                 onClickConfirm,
                               }: SuiFeeProps) {
  const { t } = useTranslation();

  const { data: accountAsset } = useAccountAllAssets();

  // console.log("      suifee id", id);
  //
  // const {currentSuiNetwork, suiNetworks} = useCurrentSuiNetwork();
  // console.log("      currentSuiNetwork", currentSuiNetwork);
  // console.log("      suiNetworks", suiNetworks);

  // const SUI_COIN_TYPE = getSuiCoinType(coinId);

  // console.log("      accountAsset?.suiAccountAssets", accountAsset?.suiAccountAssets);
  //
  //
  // const selectedFeeAsset = accountAsset?.suiAccountAssets.find((item) => {
  //   console.log("      item.asset.chainId", item.asset.chainId);
  //   return item.asset.chainId.startsWith('oct') ? OCT_COIN_TYPE :SUI_COIN_TYPE ;
  // })?.asset;

  const SUI_COIN_TYPE = getSuiCoinType(id);

  // debugger;

  const selectedFeeAsset = accountAsset?.suiAccountAssets.find((item) => item.asset.id === SUI_COIN_TYPE)?.asset;

  const coinSymbol = selectedFeeAsset?.symbol || '';

  return (
    <Container>
      <div className="mb-[8px] flex h-[24px] justify-between text-[14px] text-white leading-[24px]">
        <div className="opacity-40">Estimated Gas Fee</div>
        <div>{displayFeeAmount ? parseFloat(displayFeeAmount) : ''} {coinSymbol}</div>
      </div>
      <Tooltip title={errorMessage} varient="error" placement="top">
        <div>
          <StyledButton isProgress={isLoading} disabled={disableConfirm} onClick={onClickConfirm}>
            {t('components.Fee.SuiFee.index.continue')}
          </StyledButton>
        </div>
      </Tooltip>
    </Container>
  );
}
