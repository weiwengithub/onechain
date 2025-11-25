import { styled } from '@mui/material/styles';

export const PopupLayout = styled('div')(() => ({
  width: '100%',
  maxWidth: '54rem',
  minWidth: '36rem',
  height: '100vh',
  minHeight: '60rem',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  alignItems: 'flex-start',
  backgroundColor: '#121315',
  overflowY: 'scroll',

  scrollbarWidth: 'none',
}));
