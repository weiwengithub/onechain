import { Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

export const ContentsContainer = styled('div')({
  paddingLeft: '1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',

  flex: 1,
  minWidth: 0,
});

export const SymbolTypography = styled(Typography)(() => ({
  height: '16px',
  lineHeight: '16px',
  fontSize: '16px',
  fontWeight: 700,
  color: '#ffffff',
  textAlign: 'left',
}));

export const ChainNameTypography = styled(Typography)(() => ({
  height: '16px',
  lineHeight: '16px',
  fontSize: '12px',
  color: '#ffffff',
  textAlign: 'left',
  opacity: 0.6
}));

export const APRTextContainer = styled('div')({
  display: 'flex',
  alignItems: 'center',
});

type APRTextProps = {
  'data-is-high-apr'?: boolean;
};

export const APRText = styled('div')<APRTextProps>(({ theme, ...props }) => ({
  color: props['data-is-high-apr'] ? theme.palette.accentColor.green400 : theme.palette.color.base1000,
}));

export const ChainNameContainer = styled('div')({
  display: 'flex',
  alignItems: 'center',

  flex: 1,
  minWidth: 0,

  maxWidth: '100%',
  wordBreak: 'keep-all',
  whiteSpace: 'nowrap',

  '& > *': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
});
