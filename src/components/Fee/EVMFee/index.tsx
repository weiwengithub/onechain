import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Tooltip from '@/components/common/Tooltip';
import { times, toDisplayDenomAmount } from '@/utils/numbers';
import { Container, StyledButton } from '@/components/Fee/SuiFee/styled';

import type { FeeOption } from '../EVMFee/components/FeeSettingBottomSheet';
import FeeSettingBottomSheet from '../EVMFee/components/FeeSettingBottomSheet';

type EVMFeeProps = {
  feeOptionDatas: FeeOption[];
  currentSelectedFeeOptionKey: number;
  disableConfirm?: boolean;
  isLoading?: boolean;
  errorMessage?: string;
  onClickConfirm: () => void;
  onClickFeeStep: (gasRateKey: number) => void;
  onChangeGas: (gas: string) => void;
  onChangeGasPrice?: (gasPrice: string) => void;
  onChangeMaxBaseFee?: (maxBaseFee: string) => void;
  onChangePriorityFee?: (priorityFee: string) => void;
};

export default function EVMFee({
  feeOptionDatas,
  currentSelectedFeeOptionKey,
  disableConfirm,
  isLoading,
  errorMessage,
  onClickConfirm,
  onClickFeeStep,
  onChangeGas,
  onChangeGasPrice,
  onChangeMaxBaseFee,
  onChangePriorityFee,
}: EVMFeeProps) {
  const { t } = useTranslation();

  const selectedFeeOption = feeOptionDatas[currentSelectedFeeOptionKey] ? feeOptionDatas[currentSelectedFeeOptionKey] : null;

  const [isOpenFeeCustomBottomSheet, setIsOpenFeeCustomBottomSheet] = useState(false);

  const decimals = selectedFeeOption?.decimals || 0;
  const coinSymbol = selectedFeeOption?.symbol || '';

  const feeGasRate = useMemo(() => {
    if (selectedFeeOption?.type === 'EIP-1559') {
      return selectedFeeOption.maxBaseFeePerGas || '0';
    }
    return selectedFeeOption?.gasPrice || '0';
  }, [selectedFeeOption]);

  const gas = selectedFeeOption?.gas || '0';

  const baseFeeAmount = useMemo(() => times(feeGasRate, gas), [feeGasRate, gas]);

  const displayFeeAmount = useMemo(() => toDisplayDenomAmount(baseFeeAmount, decimals), [baseFeeAmount, decimals]);

  return (
    <Container>
      <div className="mb-[8px] flex h-[24px] items-center justify-between text-[14px] leading-[24px] text-white">
        <div className="opacity-40">{t('components.Fee.SuiFee.index.estimatedGasFee')}</div>
        <button
          type="button"
          className="flex items-center gap-[6px] text-white hover:opacity-80"
          onClick={() => setIsOpenFeeCustomBottomSheet(true)}
        >
          <span>{displayFeeAmount ? `${displayFeeAmount} ${coinSymbol}` : '-'}</span>
        </button>
      </div>
      <Tooltip title={errorMessage} varient="error" placement="top">
        <div>
          <StyledButton isProgress={isLoading} disabled={disableConfirm} onClick={onClickConfirm}>
            {t('components.Fee.SuiFee.index.continue')}
          </StyledButton>
        </div>
      </Tooltip>
      <FeeSettingBottomSheet
        feeOptionDatas={feeOptionDatas}
        feeType={selectedFeeOption?.type || null}
        currentSelectedFeeOptionKey={currentSelectedFeeOptionKey}
        open={isOpenFeeCustomBottomSheet}
        onClose={() => setIsOpenFeeCustomBottomSheet(false)}
        onChangeGas={(gas) => {
          onChangeGas(gas);
        }}
        onChangeGasPrice={(price) => {
          onChangeGasPrice?.(price);
        }}
        onChangeMaxBaseFee={(fee) => {
          onChangeMaxBaseFee?.(fee);
        }}
        onChangePriorityFee={(fee) => {
          onChangePriorityFee?.(fee);
        }}
        onSelectOption={(val) => {
          onClickFeeStep(val);
        }}
      />
    </Container>
  );
}
