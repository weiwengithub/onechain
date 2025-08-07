import { Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

import { FilledTabPanel } from '@/components/common/FilledTab';

export const Container = styled('div')({
  width: '100%',
});

export const ManageIconContainer = styled('div')(({ theme }) => ({
  color: theme.palette.accentColor.purple400,
}));

export const ManageText = styled(Typography)(({ theme }) => ({
  color: theme.palette.accentColor.purple400,
  marginLeft: '0.2rem',
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
