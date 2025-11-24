import { styled } from '@mui/material/styles';
import { before } from 'lodash';

export const Container = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  height: '100%',
});

export const StickyContainer = styled('div')(({ theme }) => ({
  width: '100%',
  height: 'fit-content',
  position: 'sticky',
  top: '80px',
  boxSizing: 'border-box',
  zIndex: 1,
}));

export const RowContainer = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',

  marginTop: '16px',
});

export const PurpleContainer = styled('div')(({ theme }) => ({
  '& > svg': {
    fill: '#477CFC',
    fontSize: '16px',
    '& > path': {
      fill: '#477CFC',
    },
  },
}));

export const AddTextContainer = styled('div')(({ theme }) => ({
  color: '#477CFC',
  fontSize: '16px',
  marginLeft: '0.2rem',
}));

export const Divider = styled('div')(({ theme }) => ({
  width: '100%',
  borderBottom: `0.1rem solid ${theme.palette.color.base100}`,
}));

export const ContentsContainer = styled('div')({
  flex: '1',
  display: 'flex',
  flexDirection: 'column',
  paddingTop: '16px',
  position: 'relative',

  '&:before': {
    content: '""',
    display: 'block',
    height: '1px',
    background: 'linear-gradient(90deg, #121315 0%, #2C3039 51.32%, #121315 100%)',
    position: 'absolute',
    left: '-24px',
    right: '-24px',
    top: '16px',
  },
});

export const AddressItemWrapper = styled('div')(({ theme }) => ({
  width: '100%',

  '& > *:last-child': {
    borderBottom: 'none',
  },
}));

export const EmptyAssetContainer = styled('div')({
  flex: 1,

  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem 0',
});
