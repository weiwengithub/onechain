import { Typography } from '@mui/material';

import type { TypoVariantKeys } from '@/styles/theme';

import { ContentContainer, StyledButton, StyledCircularProgress } from './styled';

type ButtonProps = React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
  typoVarient?: TypoVariantKeys;
  isProgress?: boolean;
  loadingText?: string;
  variant?: 'light' | 'dark' | 'red';
  Icon?: JSX.Element;
};

export default function Button(
  {
    children,
    isProgress = false,
    loadingText,
    typoVarient = 'h3_B',
    variant = 'light',
    type,
    Icon,
    ...remainder
  }: ButtonProps) {
  const disabled = isProgress ? true : remainder.disabled;

  return (
    <StyledButton {...remainder} data-typo-varient={typoVarient} type={type ?? 'button'} variants={variant}
                  disabled={disabled}
    >
      {isProgress ? (
        loadingText ? (
          <ContentContainer data-is-icon={false}>
            <StyledCircularProgress className={'mr-3'} size={18} sx={{ color: 'white' }} />
            <Typography variant={typoVarient}>{loadingText}</Typography>
          </ContentContainer>
        ) : (
          <StyledCircularProgress size={18} sx={{ color: 'white' }} />
        )
      ) : (
        <ContentContainer data-is-icon={!!Icon}>
          {Icon}
          <Typography variant={typoVarient}>{children}</Typography>
        </ContentContainer>
      )}
    </StyledButton>
  );
}
