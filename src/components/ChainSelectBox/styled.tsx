import type { TextFieldProps } from '@mui/material';
import { TextField } from '@mui/material';
import { styled } from '@mui/material/styles';

import BaseChainImage from '../common/BaseChainImage';

export const Container = styled('div')({
  width: '100%',
});

export const StyledSelectBox = styled(TextField)<TextFieldProps>(({ theme }) => ({
  width: '100%',

  '& .MuiInput-root': {
    padding: '6px 0 12px',

    '& .MuiInputBase-input': {
      cursor: 'pointer !important',

      height: 'fit-content',

      fontFamily: theme.typography.b2_M.fontFamily,
      fontStyle: theme.typography.b2_M.fontStyle,
      fontSize: theme.typography.b2_M.fontSize,
      lineHeight: theme.typography.b2_M.lineHeight,
      letterSpacing: theme.typography.b2_M.letterSpacing,

      color: theme.palette.color.base1300,
      '&: disabled': {
        cursor: 'not-allowed !important',
      },
    },
    '& .MuiInputBase-input.Mui-disabled': {
      cursor: 'not-allowed !important',
      WebkitTextFillColor: theme.palette.color.base1300,
    },
  },

  '& .MuiInput-underline': {
    '&:before': {
      borderBottom: `0.1rem solid ${theme.palette.color.base200}`,
      height: 0,
    },

    '&:after': {
      borderBottom: `0.2rem solid ${theme.palette.color.base500}`,
      transition: 'none',
    },

    ':hover:not(.Mui-focused):before': {
      borderBottom: `0.2rem solid ${theme.palette.color.base600}`,
      transition: 'none',
    },
  },
  '& .MuiInput-underline.Mui-disabled': {
    '&:before': {
      borderBottom: `0.1rem solid ${theme.palette.color.base200}`,
      height: 0,
    },

    '&:after': {
      borderBottom: `0.1rem solid ${theme.palette.color.base200}`,
      transition: 'none',
    },

    ':hover:not(.Mui-focused):before': {
      borderBottom: `0.1rem solid ${theme.palette.color.base200}`,
      transition: 'none',
    },
  },

  '& .MuiInputLabel-standard': {
    padding: '0 0.4rem',

    fontFamily: theme.typography.b1_R.fontFamily,
    fontStyle: theme.typography.b1_R.fontStyle,
    fontSize: theme.typography.b1_R.fontSize,
    lineHeight: theme.typography.b1_R.lineHeight,
    letterSpacing: theme.typography.b1_R.letterSpacing,

    color: theme.palette.color.base700,

    '&.Mui-focused': {
      color: theme.palette.color.base700,
    },
  },

  '& .MuiInputLabel-shrink': {
    fontSize: '16px',
    color: theme.palette.color.base1000,
  },

  '& .MuiInputLabel-shrink.Mui-disabled': {
    color: theme.palette.color.base1000,
  },
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
  width: '20px',
  height: '20px',
  flex: '0 0 auto',
});

export const RightAdormentConatiner = styled('div')({
  display: 'flex',

  columnGap: '0.6rem',
});

type ChevronIconProps = {
  'data-is-open': boolean;
};

export const ChevronIconContainer = styled('div')<ChevronIconProps>(({ ...props }) => ({
  width: '1.4rem',
  height: '1.4rem',

  transform: props['data-is-open'] ? 'rotate(180deg)' : 'rotate(0deg)',
}));
