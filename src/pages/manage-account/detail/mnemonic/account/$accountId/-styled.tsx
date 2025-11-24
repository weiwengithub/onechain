import { Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

import Base1300Text from '@/components/common/Base1300Text';

export const MainContentsContainer = styled('div')({
  marginTop: '1.6rem',
});

export const OptionButtonContainer = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',

  margin: '24px 0',
});

export const MainContentBody = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  rowGap: '12px',
  marginTop: '16px',
});

export const MainContentTitleText = styled(Base1300Text)({
  fontSize: '24px',
  fontWeight: '500',
  marginRight: '8px',
});

export const MainContentSubtitleText = styled(Typography)(({ theme }) => ({
  color: theme.palette.color.base1000,
}));

export const AccountImgContainer = styled('div')({
  width: '80px',
  height: '80px',
});

export const SmallAccountImgContainer = styled('div')({
  width: '4.2rem',
  height: '4.2rem',
});

export const Caution = styled('div')({
  width: 'fit-content',

  display: 'flex',
  alignItems: 'center',
  columnGap: '0.2rem',

  wordBreak: 'keep-all',
});

export const CautionIconContainer = styled('div')(({ theme }) => ({
  width: '1.2rem',
  height: '1.2rem',

  '& > svg': {
    width: '100%',
    height: '100%',
    fill: theme.palette.accentColor.red400,
    '& > path': {
      fill: theme.palette.accentColor.red400,
    },
  },
}));

export const CautionText = styled(Typography)(({ theme }) => ({
  color: theme.palette.accentColor.red400,
}));
