import { styled } from '@mui/material/styles';

import IconButton from '@/components/common/IconButton';

export const LeftNavigatorContainer = styled('div')({
  width: '100%',
  height: '100%',

  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',

  columnGap: '0.8rem',
});

export const StyledIconButton = styled(IconButton)(({ theme }) => ({
  width: '32px',
  height: '32px',
  borderRadius: '40px',
  backgroundColor: 'rgba(65,69,79,0.1)',

  '& > svg': {
    width: '20px',
    height: '20px',
  },
  '& > svg > path': {
    fill: '#ffffff',
  },
  '&:disabled': {
    '& > svg > path': {
      fill: theme.palette.color.base600,
    },
  },
}));
