import { styled } from '@mui/material/styles';

export const Container = styled('div')({
  height: '80px',

  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

export const LeftContentContainer = styled('div')({
  position: 'absolute',
  left: '24px',

  width: 'fit-content',

  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
});

export const MiddleContentContainer = styled('div')({
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
});

export const RightContentContainer = styled('div')({
  position: 'absolute',
  right: '24px',

  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
});
