import { styled } from '@mui/material/styles';

export const Container = styled('div')(() => ({
  width: '100%',
  position: 'sticky',
  top: '3rem',
  zIndex: 1,
  boxSizing: 'border-box',
  height: '24px',
  lineHeight: '24px',
  fontSize: '14px',
  fontWeight: 700,
  marginTop: '48px',
}));
