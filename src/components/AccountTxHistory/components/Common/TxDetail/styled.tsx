import { styled } from '@mui/material/styles';

export const TxButton = styled('button')(({ theme }) => ({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  textAlign: 'left',
  paddingBottom: '16px',
  borderBottom: '1px solid rgba(44, 48, 57, 0.2)',
  backgroundColor: 'transparent',
  '&:hover': {
    backgroundColor: theme.palette.color.base200,
  },
  '&:disabled': {
    backgroundColor: 'transparent',
  },
}));

export const RowContainer = styled('div')({
  width: '100%',
  display: 'flex',
});

export const RowLeftContainer = styled('div')({
  marginRight: 'auto',

  display: 'flex',

  maxWidth: '15rem',
  wordBreak: 'keep-all',
  whiteSpace: 'nowrap',

  '& > *': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
});

export const BottomRowLeftContainer = styled('div')({
  marginRight: 'auto',
  display: 'flex',

  maxWidth: '20rem',
  wordBreak: 'keep-all',
  whiteSpace: 'nowrap',

  '& > *': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
});

export const RowRightContainer = styled('div')({
  marginLeft: 'auto',
});
