import { styled } from '@mui/material/styles';

import BaseChainImage from '@/components/common/BaseChainImage';
import BaseOptionButton from '@/components/common/BaseOptionButton';

export const StyledOptionButton = styled(BaseOptionButton)(({ theme }) => ({
  width: '100%',
  position: 'relative',
  padding: '16px 0',
  borderBottom: '1px solid #2c3039',
  marginBottom: '0',
}));

export const Container = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
});

export const LabelContainer = styled('div')({
  width: '100%',
  display: 'flex',
  columnGap: '0.4rem',
  marginBottom: '0.6rem',
});

export const AddressContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  maxWidth: '27rem',
  wordBreak: 'keep-all',
  whiteSpace: 'nowrap',
  marginBottom: '1rem',

  '& > *': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  color: theme.palette.color.base1200,
}));

export const MemoContainer = styled('div')({
  width: '100%',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  marginBottom: '0.8rem',
});

export const MemoContentsContainer = styled('div')({
  width: '80%',
  wordBreak: 'break-all',
  wordWrap: 'break-word',
  textAlign: 'left',
});

export const ChainContainer = styled('div')({
  display: 'flex',
  alignItems: 'center',
  columnGap: '0.2rem',
});

export const ChainImage = styled(BaseChainImage)({
  width: '1.6rem',
  height: '1.6rem',
});
