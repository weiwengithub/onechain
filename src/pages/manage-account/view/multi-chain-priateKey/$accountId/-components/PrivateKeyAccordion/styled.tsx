import type { AccordionSummaryProps } from '@mui/material';
import { styled } from '@mui/material/styles';

import Accordion, { AccordionDetails, AccordionSummary } from '@/components/common/Accordion';
import Base1300Text from '@/components/common/Base1300Text';

import BottomChevronIcon from '@/assets/images/icons/BottomChevron18.svg';

export const StyledChainAccordion = styled(Accordion)(({ theme }) => ({
  border: '0',
  borderRadius: '0',
}));

export const StyledChainAccordionSummary = styled((props: AccordionSummaryProps) => <AccordionSummary expandIcon={<BottomChevronIcon />} {...props} />)(
  ({ theme }) => ({
    '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': {
      transform: 'rotate(180deg)',
    },

    '& .MuiAccordionSummary-expandIconWrapper': {
      '& > svg > path': {
        stroke: "#FFFFFF",
      },
    },
  }),
);

export const StyledChainAccordionDetails = styled(AccordionDetails)({
  marginTop: '12px',
});

export const ItemLeftContainer = styled('div')({
  display: 'flex',
  justifyContent: 'flex-start',
  alignItems: 'center',
});

export const ItemLeftImageContainer = styled('div')({
  display: 'flex',
  justifyContent: 'flex-start',
  alignItems: 'center',

  '& > img': {
    width: '3.6rem',
    height: '3.6rem',
  },
});

export const ItemLeftTextContainer = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  marginLeft: '12px',
});

export const ItemLeftHdPathTextContainer = styled('div')({
  display: 'flex',
  alignItems: 'center',
});

export const PrivateKeyViewer = styled('div')(({ theme }) => ({
  borderRadius: '12px',
  border: `0.1rem solid ${theme.palette.color.base200}`,
  padding: '12px',
  backgroundColor: theme.palette.color.base100,
}));

export const PrivateKeyText = styled('div')({
  width: '100%',
  fontSize: '16px',
  lineHeight: '20px',
  wordBreak: 'break-all',
  backgroundColor: '#101011',
  padding: '12px',
  borderRadius: '8px',
});
