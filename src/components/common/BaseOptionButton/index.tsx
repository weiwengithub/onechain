import { forwardRef } from 'react';

import { ActiveLabel, LeftContainer, MiddleContainer, RightContainer, StyledButton } from './styled';

import RightChevronIcon from '@/assets/images/icons/RightChevron30.svg';

export type BaseOptionButtonProps = React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
  leftContent?: JSX.Element;
  leftSecondHeader?: JSX.Element;
  leftSecondBody?: JSX.Element;
  rightContent?: JSX.Element;
  isActive?: boolean;
  enableActiveLabel?: boolean;
  disableRightChevron?: boolean;
};

const tempDisplay = false;
const BaseOptionButton = forwardRef<HTMLButtonElement, BaseOptionButtonProps>(
  (
    { leftContent, leftSecondHeader, leftSecondBody, rightContent, isActive = false, enableActiveLabel = false, disableRightChevron = false, ...remainder },
    ref,
  ) => {
    return (
      <StyledButton isActive={isActive} ref={isActive ? ref : undefined} {...remainder}>
        {isActive && enableActiveLabel && <ActiveLabel />}
        {leftContent && <LeftContainer>{leftContent}</LeftContainer>}
        <MiddleContainer>
          {leftSecondHeader}
          {tempDisplay && leftSecondBody}
        </MiddleContainer>
        <RightContainer>
          {rightContent}
          {disableRightChevron ? null : <RightChevronIcon />}
        </RightContainer>
      </StyledButton>
    );
  },
);

BaseOptionButton.displayName = 'BaseOptionButton';

export default BaseOptionButton;
