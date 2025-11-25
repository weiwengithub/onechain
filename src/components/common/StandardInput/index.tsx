import type { HTMLInputTypeAttribute } from 'react';
import { useState } from 'react';
import { InputAdornment, type TextFieldProps } from '@mui/material';

import {
  BottomContainer,
  BottomWrapper,
  Container,
  RightBottomAdornmentContainer,
  StyledCircularProgress,
  StyledIconButton,
  StyledInput,
} from './styled';

import ViewIcon from '@/assets/images/icons/View12.svg';
import ViewHideIcon from '@/assets/images/icons/ViewHide20.svg';
import IconWarning from "@/assets/img/icon/warning.png";

type StandardInputProps = TextFieldProps & {
  helperText?: string;
  isLoadingHelperText?: boolean;
  rightBottomAdornment?: React.ReactNode;
  inputVarient?: 'default' | 'address';
};

export default function StandardInput({
  type,
  error = false,
  helperText,
  isLoadingHelperText = false,
  rightBottomAdornment,
  slotProps,
  inputVarient = 'default',
  ...remainder
}: StandardInputProps) {
  const [textFieldType, setTextFieldType] = useState<HTMLInputTypeAttribute | undefined>(type);

  const isShowBottomContainer = isLoadingHelperText || helperText || rightBottomAdornment;

  return (
    <Container>
      <StyledInput
        variant="standard"
        data-input-varient={inputVarient}
        autoComplete="off"
        type={type === 'password' ? textFieldType : type}
        slotProps={{
          ...slotProps,
          input: {
            endAdornment: type === 'password' && (
              <InputAdornment position="end">
                <StyledIconButton
                  onClick={() => {
                    setTextFieldType((prev) => (prev === 'password' ? 'text' : 'password'));
                  }}
                  edge="end"
                >
                  {textFieldType === 'password' ? <ViewIcon /> : <ViewHideIcon />}
                </StyledIconButton>
              </InputAdornment>
            ),
            ...slotProps?.input,
          },
        }}
        {...remainder}
      />
      <BottomWrapper>
        {isShowBottomContainer && (
          <BottomContainer>
            {isLoadingHelperText && !helperText && <StyledCircularProgress size={12} />}
            {helperText && (
              <div className="flex h-[50px] items-center rounded-[12px] bg-[#B73939]">
                <img
                  src={IconWarning}
                  alt="warning"
                  className="ml-[24px] h-[16px]"
                />
                <div className="mr-[24px] flex-1 ml-[8px] text-[14px] leading-[16px] text-white whitespace-break-spaces opacity-60">{helperText}</div>
              </div>
            )}
            {rightBottomAdornment && <RightBottomAdornmentContainer>{rightBottomAdornment}</RightBottomAdornmentContainer>}
          </BottomContainer>
        )}
      </BottomWrapper>
    </Container>
  );
}
