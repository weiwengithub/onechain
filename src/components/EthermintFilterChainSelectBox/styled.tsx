import { styled } from '@mui/material/styles';

import BaseChainImage from '../common/BaseChainImage';

export const Container = styled('div')({
  width: '100%',
});

export const LabelText = styled('div')(({ theme }) => ({
  marginBottom: '8px',
  paddingLeft: '4px',
  fontFamily: theme.typography.b1_R.fontFamily,
  fontStyle: theme.typography.b1_R.fontStyle,
  fontSize: theme.typography.b1_R.fontSize,
  lineHeight: theme.typography.b1_R.lineHeight,
  letterSpacing: theme.typography.b1_R.letterSpacing,
  color: theme.palette.color.base700,
}));

type StyledCardContainerProps = {
  'data-is-disabled': boolean;
  'data-is-error': boolean;
};

export const StyledCardContainer = styled('div')<StyledCardContainerProps>(({ theme, ...props }) => ({
  width: '100%',
  backgroundColor: theme.palette.color.base1400,
  border: `1px solid ${props['data-is-error'] ? theme.palette.accentColor.red400 : theme.palette.color.base400}`,
  borderRadius: '12px',
  padding: '16px',
  cursor: props['data-is-disabled'] ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s ease',
  opacity: props['data-is-disabled'] ? 0.6 : 1,

  '&:hover': {
    // backgroundColor: props['data-is-disabled'] ? theme.palette.color.base300 : theme.palette.color.base200,
    borderColor: props['data-is-disabled']
      ? (props['data-is-error'] ? theme.palette.accentColor.red400 : theme.palette.color.base400)
      : (props['data-is-error'] ? theme.palette.accentColor.red400 : theme.palette.color.base500),
  },
}));

export const CardContent = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  gap: '12px',
});

export const ChainNameText = styled('div')(({ theme }) => ({
  flex: 1,
  fontFamily: theme.typography.b2_M.fontFamily,
  fontStyle: theme.typography.b2_M.fontStyle,
  fontSize: theme.typography.b2_M.fontSize,
  lineHeight: theme.typography.b2_M.lineHeight,
  letterSpacing: theme.typography.b2_M.letterSpacing,
  color: theme.palette.color.base1300,
  textAlign: 'left',
}));

export const BottomWrapper = styled('div')({});

export const BottomContainer = styled('div')({
  display: 'flex',
  alignItems: 'center',

  margin: '0.6rem 0.4rem 0',

  maxWidth: '100%',
  wordBreak: 'keep-all',
  whiteSpace: 'nowrap',

  '& > *': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
});

type HelperTextContainerProps = {
  'data-is-error': boolean;
};

export const HelperTextContainer = styled('div')<HelperTextContainerProps>(({ theme, ...props }) => ({
  width: '100%',

  color: props['data-is-error'] ? theme.palette.accentColor.red400 : theme.palette.color.base1300,
}));

export const ChainImageContainer = styled(BaseChainImage)({
  width: '24px',
  height: '24px',
  flex: '0 0 auto',
});

export const RightAdormentConatiner = styled('div')({
  display: 'flex',

  columnGap: '0.6rem',
});

type ChevronIconProps = {
  'data-is-open': boolean;
};

export const ChevronIconContainer = styled('div')<ChevronIconProps>(() => ({
  width: '1.6rem',
  height: '1.6rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',

  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
}));
