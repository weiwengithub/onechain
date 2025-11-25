import { styled } from '@mui/material/styles';
import OutlinedButton from '@/components/common/OutlinedButton';

export const AllAccountBody = styled('div')({
  flex: 1,
  paddingBottom: '24px',
  overflowX: 'hidden',
  overflowY: 'auto',
  msOverflowStyle: 'none',
  scrollbarWidth: 'none',

  '&::-webkit-scrollbar': {
    display: 'none'
  }
});

export const Container = styled('div')({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: '12px',
});

export const ZkLoginContainer = styled('div')({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: '1rem',
});

export const PrivateKeyContainer = styled('div')({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: '1rem',
});

export const TopContainer = styled('div')({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '12px',
});

export const BodyContainer = styled('div')({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
});

export const AccountButton = styled('button')<{ isCurrentAccount?: boolean }>(({ theme, isCurrentAccount }) => ({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  border: 'none',
  background: isCurrentAccount ? '#343842' : '#1E2025',
  borderRadius: '12px',
  cursor: 'pointer',
  padding: '1.3rem 1.6rem',
  marginBottom: '12px',

  '&:hover': {
    backgroundColor: isCurrentAccount ? '#3E4249' : theme.palette.color.base200,
  },
}));

export const ZkLoginAccountButton = styled('button')<{ isCurrentAccount?: boolean }>(({ theme, isCurrentAccount }) => ({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  border: 'none',
  background: isCurrentAccount ? '#343842' : '#1E2025',
  borderRadius: '12px',
  cursor: 'pointer',
  padding: '1.3rem 1.6rem',
  marginBottom: '0.5rem',

  '&:hover': {
    backgroundColor: isCurrentAccount ? '#3E4249' : theme.palette.color.base200,
  },
}));

export const AddAccountButton = styled('div')(({ theme }) => ({
  width: '100%',
  height: '36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid #2C3039',
  borderRadius: '8px',
  marginTop: '12px',
  background: 'none',
  cursor: 'pointer',

  '&:hover': {
    backgroundColor: theme.palette.color.base200,
  },
}));

export const OutlinedButtonContainer = styled('div')({
  width: '100%',
  padding: '0 1.6rem',
  marginBottom: '0.8rem',
});

export const StyledOutlinedButton = styled(OutlinedButton)({
  width: '100%',
});

export const RightArrowIconContainer = styled('div')({
  width: '1.4rem',
  height: '1.4rem',
});

export const EmptyAssetContainer = styled('div')({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
});