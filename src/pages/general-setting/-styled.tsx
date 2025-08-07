import { styled } from '@mui/material/styles';

export const Container = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
});

export const SectionContainer = styled('div')({
  paddingTop: '12px',
  paddingBottom: '12px',
  position: 'relative',

  // '&::after': {
  //   content: '""',
  //   display: 'block',
  //   height: '1px',
  //   backgroundColor: '#2c3039',
  //   position: 'absolute',
  //   left: '-24px',
  //   right: '-24px',
  //   bottom: 0,
  // },

});

export const SectionTitleContainer = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  columnGap: '0.2rem',
  marginBottom: '0.8rem',
  padding: '1.2rem 1.6rem 0',
});

export const OptionButtonContainer = styled('div')({
  display: 'flex',
  flexDirection: 'column',
});

export const OptionButtonIconContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',

  width: '18px',
  height: '18px',

  borderRadius: '20px',
}));
