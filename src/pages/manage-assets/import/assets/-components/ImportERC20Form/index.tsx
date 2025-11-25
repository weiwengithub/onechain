import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { joiResolver } from '@hookform/resolvers/joi';
import { useTranslation } from 'react-i18next';

import Button from '@/components/common/Button';
import { useCurrentCustomERC20Tokens } from '@/hooks/useCurrentCustomERC20Tokens';
import type { EvmErc20Asset } from '@/types/asset';
import type { UniqueChainId } from '@/types/chain';
import { parseUniqueChainId } from '@/utils/queryParamGenerator';
import { getExtensionLocalStorage } from '@/utils/storage';
import { isNumber } from '@/utils/string';
import { toastError, toastSuccess } from '@/utils/toast';

import { FormContainer, InputWrapper } from './styled';
import type { ImportCustomERC20TokenForm } from './useSchema';
import { useSchema } from './useSchema';
import ContractAddressInput from '../ContractAddressInput';

type ImportERC20FormProps = {
  chainId: UniqueChainId;
  onSuccess?: () => void;
};

export default function ImportERC20Form({ chainId, onSuccess }: ImportERC20FormProps) {
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);

  const { addCustomERC20Token } = useCurrentCustomERC20Tokens();

  const { importCustomERC20TokenForm } = useSchema();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    reset,
  } = useForm<ImportCustomERC20TokenForm>({
    resolver: joiResolver(importCustomERC20TokenForm),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
  });

  const { address, symbol, decimals } = watch();
  const isButtonEnabled = useMemo(() => !!address && !!symbol && !!decimals && isDirty, [address, decimals, isDirty, symbol]);

  const submit = async (data: ImportCustomERC20TokenForm) => {
    try {
      setIsProcessing(true);

      const { address, symbol, decimals, logoUrl } = data;
      const { id } = parseUniqueChainId(chainId);

      const newToken: EvmErc20Asset = {
        type: 'erc20',
        name: symbol,
        symbol,
        decimals: Number(decimals),
        image: logoUrl,
        id: address,
        chainId: id,
        chainType: 'evm',
      };

      const storedERC20Assets = await getExtensionLocalStorage('erc20Assets');

      const isAlreadySupport = storedERC20Assets.some((item) => item.id.toLowerCase() === newToken.id.toLowerCase() && item.chainId === newToken.chainId);

      if (isAlreadySupport) {
        toastError(t('pages.manage-assets.import.assets.components.ERC20.index.supportedAssets'));
        return;
      }

      await addCustomERC20Token(newToken);

      toastSuccess(t('pages.manage-assets.import.assets.components.ERC20.index.success'));
      onSuccess?.();
      reset();
    } catch {
      toastError(t('pages.manage-assets.import.assets.components.ERC20.index.error'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <FormContainer onSubmit={handleSubmit(submit)}>
      <InputWrapper>
        <ContractAddressInput
          labelClassName="mt-8"
          error={!!errors.address}
          helperText={errors.address?.message}
          slotProps={{
            input: {
              ...register('address'),
            },
          }}
        />
        <ContractAddressInput
          labelText={t('pages.manage-assets.import.assets.components.ERC20.index.symbol')}
          placeholderText={t('pages.manage-assets.import.assets.components.ERC20.index.symbol')}
          error={!!errors.symbol}
          helperText={errors.symbol?.message}
          slotProps={{
            input: {
              ...register('symbol'),
            },
          }}
        />
        <ContractAddressInput
          labelText={t('pages.manage-assets.import.assets.components.ERC20.index.decimals')}
          placeholderText={t('pages.manage-assets.import.assets.components.ERC20.index.decimals')}
          error={!!errors.decimals}
          helperText={errors.decimals?.message}
          slotProps={{
            input: {
              ...register('decimals', {
                setValueAs: (v: string) => (v && isNumber(v) ? v : ''),
              }),
            },
          }}
        />
        <ContractAddressInput
          labelText={t('pages.manage-assets.import.assets.components.ERC20.index.logoUrl')}
          placeholderText={t('pages.manage-assets.import.assets.components.ERC20.index.logoUrl')}
          error={!!errors.logoUrl}
          helperText={errors.logoUrl?.message}
          slotProps={{
            input: {
              ...register('logoUrl'),
            },
          }}
        />
      </InputWrapper>
      <div className="fixed bottom-3 left-8 right-8 backdrop-blur-md rounded-xl p-4 z-[1000]">
        <Button type="submit" disabled={!isButtonEnabled} isProgress={isProcessing}>
          {t('pages.manage-assets.import.assets.components.ERC20.index.addCustomCrypto')}
        </Button>
      </div>
    </FormContainer>
  );
}
