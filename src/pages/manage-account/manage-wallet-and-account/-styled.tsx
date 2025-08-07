import { styled } from '@mui/material/styles';

import { FilledTabPanel } from '@/components/common/FilledTab';
import TextButton from '@/components/common/TextButton';

export const CoinContainer = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
});

export const Divider = styled('div')(({ theme }) => ({
  marginBottom: '1.2rem',
  borderBottom: `0.1rem solid ${theme.palette.color.base200}`,
}));

export const SaveButton = styled(TextButton)(({ theme }) => ({
  color: theme.palette.accentColor.purple400,
}));

export const StickyTabContainer = styled('div')(() => ({
  width: '100%',
  height: 'fit-content',
  position: 'sticky',
  top: '3rem',
  paddingBottom: '24px',
  zIndex: 1,

  '&::after': {
    content: '""',
    display: 'block',
    height: '1px',
    background: 'linear-gradient(90deg, #121315 0%, #2C3039 51.32%, #121315 100%)',
    position: 'absolute',
    left: '-24px',
    right: '-24px',
    bottom: 0,
  }
}));

export const FooterContainer = styled('div')(() => ({
  padding: '0 24px',
}));

export const TabPanelContentsContainer = styled('div')({
  overflow: 'auto',
});

export const StyledTabPanel = styled(FilledTabPanel)({
  marginTop: '0',
  display: 'flex',
  flexDirection: 'column',
});

export const SearchContainer = styled('div')({
  padding: '0 1.2rem',
});
