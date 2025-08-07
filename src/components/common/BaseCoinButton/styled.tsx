import { styled } from '@mui/material/styles';

type StyledButtonProps = {
  'data-is-active'?: boolean;
};

export const StyledButton = styled('button')<StyledButtonProps>(() => ({
  width: '100%',
  height: '42px',
  display: 'flex',
  alignItems: 'center',
  marginTop: '16px',
}));

export const LeftContainer = styled('div')({
  display: 'flex',
  justifyContent: 'flex-start',
  alignItems: 'center',

  flexShrink: 1,
  minWidth: 0,

  textAlign: 'left',
});

export const RightContainer = styled('div')({
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',

  textAlign: 'right',
});

export const RightTextContainer = styled('div')({
  display: 'grid',

  gridTemplateColumns: '1fr',

  rowGap: '0.2rem',
});

export const RightDisplayAmountContainer = styled('div')(({ theme }) => ({
  color: theme.palette.color.base1300,
}));

export const RightValueContainer = styled('div')(({ theme }) => ({
  color: theme.palette.color.base1000,
}));
