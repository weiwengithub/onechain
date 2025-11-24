import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

import StandardInput from '@/components/common/StandardInput';
import { LabelText } from '@components/EthermintFilterChainSelectBox/styled.tsx';

type ContractAddressInputProps = React.ComponentProps<typeof StandardInput> & {
  labelClassName?: string;
  containerClassName?: string;
  labelText?: string;
  placeholderText?: string;
};

export default function ContractAddressInput({
                                               labelClassName,
                                               containerClassName,
                                               labelText,
                                               placeholderText,
                                               placeholder,
                                               ...inputProps
                                             }: ContractAddressInputProps) {
  const { t } = useTranslation();
  const resolvedLabel = labelText ?? t('pages.manage-assets.import.assets.entry.contractAddressLabel');
  const resolvedPlaceholder = placeholder ?? placeholderText ?? t('pages.manage-assets.import.assets.entry.contractAddressPlaceholder');

  return (
    <div className={clsx('flex flex-col gap-1', containerClassName)}>
      <LabelText className={labelClassName}>{resolvedLabel}</LabelText>
      <StandardInput
        placeholder={resolvedPlaceholder}
        {...inputProps}
      />
    </div>
  );
}
