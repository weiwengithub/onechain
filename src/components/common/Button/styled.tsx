import { CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';

import type { TypoVariantKeys } from '@/styles/theme';

type StyledButtonProps = {
  'data-typo-varient': TypoVariantKeys;
  variants?: 'light' | 'dark' | 'red';
};

export const StyledButton = styled('button')<StyledButtonProps>(({ theme, ...props }) => {
  const backgroundColor = (() => {
    const variants = props['variants'];
    if (variants === 'light') {
      return "#0047c4";
    }
    if (variants === 'dark') {
      return theme.palette.color.base400;
    }
    if (variants === 'red') {
      return theme.palette.accentColor.red200;
    }
    return "#0047c4";
  })();

  const hoverBackgroundColor = (() => {
    const variants = props['variants'];
    if (variants === 'light') {
      return "#3b82ff";
    }
    if (variants === 'dark') {
      return theme.palette.color.base500;
    }
    if (variants === 'red') {
      return theme.palette.accentColor.red300;
    }
    return "#3b82ff";
  })();

  return {
    border: 'none',

    width: '100%',
    height: '50px',

    borderRadius: '12px',

    backgroundColor: backgroundColor,
    color: "#ffffff",

    cursor: 'pointer',

    marginBottom: '46px',

    '&:hover': {
      backgroundColor: hoverBackgroundColor,
    },

    '&:disabled': {
      backgroundColor: "rgba(0,71,196,0.3)",
      color: "rgba(255,255,255,0.3)",

      cursor: 'default',

      '& svg': {
        fill: theme.palette.color.base1200,

        '& > path': {
          fill: theme.palette.color.base1200,
        },
      },
    },
  };
});

type ContentContainerProps = {
  'data-is-icon'?: boolean;
};

export const ContentContainer = styled('div')<ContentContainerProps>((props) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',

  marginLeft: props['data-is-icon'] ? '-0.6rem' : '0',

  '& :first-of-type': {
    marginRight: props['data-is-icon'] ? '0.4rem' : '0',
  },
}));

export const StyledCircularProgress = styled(CircularProgress)(({ theme }) => ({
  '&.MuiCircularProgress-root': {
    color: theme.palette.color.base1300,
  },
}));
