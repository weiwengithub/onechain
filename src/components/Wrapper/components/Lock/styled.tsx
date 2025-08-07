import { styled } from '@mui/material/styles';

import OutlinedInput from '../../../common/OutlinedInput';
import TextButton from '../../../common/TextButton';

// import backgroundImg from '@/assets/images/backgroundImage/background.png';

export const FormContainer = styled('form')({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  padding: '0 24px',
  boxSizing: 'border-box',

  // backgroundImage: `url(${backgroundImg})`,
  backgroundSize: 'auto',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
  backgroundColor: '#101011',

  overflow: 'hidden',
  position: 'relative',
});

export const StyledInputContainer = styled('div')({});

export const StyledInput = styled(OutlinedInput)(({ theme }) => ({
  height: '50px',

  '.MuiOutlinedInput-input': {
    '&::placeholder': {
      fontFamily: theme.typography.b1_R.fontFamily,
      fontStyle: theme.typography.b1_R.fontStyle,
      fontSize: theme.typography.b1_R.fontSize,
      lineHeight: theme.typography.b1_R.lineHeight,
      letterSpacing: theme.typography.b1_R.letterSpacing,
    },
  },
}));

export const RecoverPasswordTextButton = styled(TextButton)(({ theme }) => ({
  width: '100%',
  display: 'flex',
  justifyContent: 'center',

  marginBottom: '1.6rem',

  color: theme.palette.color.base1000,
}));
