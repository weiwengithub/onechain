import type { OutlinedInputProps } from '@mui/material';
import { OutlinedInput } from '@mui/material';
import { styled } from '@mui/material/styles';

import IconButton from '../IconButton';

export const StyledInput = styled(OutlinedInput)<OutlinedInputProps>(({ theme, ...props }) => ({
  borderRadius: '12px',

  backgroundColor: '#1E2025',
  color: '#FFFFFF',

  width: '100%',

  '&.MuiOutlinedInput-root': {
    backgroundColor: '#1E2025',
  },

  '.MuiOutlinedInput-input': {
    fontFamily: theme.typography.b2_M.fontFamily,
    fontStyle: theme.typography.b2_M.fontStyle,
    fontSize: '16px',
    lineHeight: theme.typography.b2_M.lineHeight,
    letterSpacing: theme.typography.b2_M.letterSpacing,

    WebkitTextSecurity: props.type === 'password' ? 'disc' : 'none',
    MoxTextSecurity: props.type === 'password' ? 'disc' : 'none',

    '&[type=password]': {
      letterSpacing: '0.3rem',
    },

    '&::placeholder': {
      fontFamily: theme.typography.b4_R.fontFamily,
      fontStyle: theme.typography.b4_R.fontStyle,
      fontSize: '16px',
      lineHeight: theme.typography.b4_R.lineHeight,
      letterSpacing: theme.typography.b4_R.letterSpacing,

      color: 'rgba(255,255,255,0.2)',
    },
  },

  '.MuiOutlinedInput-notchedOutline': {
    border: props['error'] ? `0.1rem solid ${theme.palette.accentColor.red400}` : `0.1rem solid ${theme.palette.color.base200}`,
  },

  '&:hover': {
    '.MuiOutlinedInput-notchedOutline': {
      border: `0.1rem solid ${theme.palette.accentColor.blue800}`,
      '&: disabled': {
        border: `0.1rem solid ${theme.palette.color.base200}`,
      },
    },
  },
  '&.Mui-focused': {
    '.MuiOutlinedInput-notchedOutline': {
      border: `0.1rem solid ${theme.palette.accentColor.blue800}`,
    },
  },

  '&.MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.color.base200,
  },
  '& .MuiInputBase-input.Mui-disabled': {
    WebkitTextFillColor: theme.palette.color.base600,
  },
}));

export const Container = styled('div')({
  width: '100%',
});

export const BottomWrapper = styled('div')({});

export const BottomContainer = styled('div')({
  display: 'flex',
  alignItems: 'center',

  marginTop: '8px',

  maxWidth: '100%',
  wordBreak: 'keep-all',
  whiteSpace: 'nowrap',

  '& > *': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
});

export const RightBottomAdornmentContainer = styled('div')({
  display: 'flex',
  justifyContent: 'flex-end',

  marginLeft: 'auto',

  overflow: 'visible',
});

type HelperTextContainerProps = {
  'data-is-error': boolean;
};

export const HelperTextContainer = styled('div')<HelperTextContainerProps>(({ theme, ...props }) => ({
  width: '100%',
  lineHeight: '24px',
  fontSize: '16px',
  color: props['data-is-error'] ? "#E04646" : "rgba(255,255,255,0.6)",
}));

export const StyledIconButton = styled(IconButton)(({ theme }) => ({
  width: '2rem',
  height: '2rem',

  margin: '0',

  '& > svg': {
    width: '2rem',
    height: '2rem',
  },

  '&:hover': {
    opacity: 1,

    '& > svg': {
      fill: theme.palette.color.base1100,
      '& > path': {
        fill: theme.palette.color.base1100,
      },
    },
  },
}));
