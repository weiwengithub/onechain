import { useState } from 'react';
// import { useTranslation } from 'react-i18next';

import type { MnemonicBits } from '@/pages/account/create-wallet/mnemonic/-entry';

import MnemonicBitsPopover from './components/MnemonicBitsPopover';
import MnemonicWord from './components/MnemonicWord';
import {
  Container,
  // ControlInputButtonContainer,
  // ControlInputText,
  MnemonicContainer,
} from './styled';
// import CopyButton from '../CopyButton';

type MnemonicViewerProp = {
  rawMnemonic: string;
  onClickMnemonicBits?: (bits: MnemonicBits) => void;
  variants?: 'create' | 'view';
};

export default function MnemonicViewer({ rawMnemonic, onClickMnemonicBits }: MnemonicViewerProp) {
  // const { t } = useTranslation();

  const [isViewMnemonic] = useState(true);

  const [isOpenPopover, setIsOpenPopover] = useState(false);
  const [popoverAnchorEl] = useState<HTMLButtonElement | null>(null);

  const splitedMnemonic = rawMnemonic.split(' ');

  const displayMnemonic = (() => {
    if (!isViewMnemonic) {
      return splitedMnemonic.map(() => '•'.repeat(4));
    }
    return splitedMnemonic;
  })();

  // const mnemonicWordCounts = displayMnemonic.length;

  return (
    <>
      <Container>
        {/*{variants === 'create' && (*/}
        {/*  <TopContainer>*/}
        {/*    <IconTextButton*/}
        {/*      trailingIcon={<ViewIconContainer>{isViewMnemonic ? <ViewHideIcon /> : <ViewIcon />}</ViewIconContainer>}*/}
        {/*      onClick={() => {*/}
        {/*        setIsViewMnemonic(!isViewMnemonic);*/}
        {/*      }}*/}
        {/*    >*/}
        {/*      <MarginRightTypography variant="h4_B">{t('components.MnemonicViewer.index.seedPhrase')}</MarginRightTypography>*/}
        {/*    </IconTextButton>*/}
        {/*    <IconTextButton*/}
        {/*      onClick={(event) => {*/}
        {/*        setIsOpenPopover(true);*/}
        {/*        setPopoverAnchorEl(event.currentTarget);*/}
        {/*      }}*/}
        {/*      trailingIcon={*/}
        {/*        <BottomChevronIconContainer>*/}
        {/*          <BottomChevronIcon />*/}
        {/*        </BottomChevronIconContainer>*/}
        {/*      }*/}
        {/*    >*/}
        {/*      <MarginRightTypography variant="b3_M">{t('components.MnemonicViewer.index.words', { wordCounts: mnemonicWordCounts })}</MarginRightTypography>*/}
        {/*    </IconTextButton>*/}
        {/*  </TopContainer>*/}
        {/*)}*/}
        {/*{variants === 'view' && (*/}
        {/*  <TopContainer>*/}
        {/*    <IconTextButton*/}
        {/*      trailingIcon={<ViewIconContainer>{isViewMnemonic ? <ViewHideIcon /> : <ViewIcon />}</ViewIconContainer>}*/}
        {/*      onClick={() => {*/}
        {/*        setIsViewMnemonic(!isViewMnemonic);*/}
        {/*      }}*/}
        {/*    >*/}
        {/*      <MarginRightTypography variant="h4_B">{`${mnemonicWordCounts} ${t('components.MnemonicViewer.index.seedPhrase')}`}</MarginRightTypography>*/}
        {/*    </IconTextButton>*/}
        {/*  </TopContainer>*/}
        {/*)}*/}
        <MnemonicContainer>
          {displayMnemonic.map((item, index) => (
            <MnemonicWord key={index} index={index + 1} word={item} isViewMnemonic={isViewMnemonic} />
          ))}
        </MnemonicContainer>
        {/*<ControlInputButtonContainer>*/}
        {/*  <CopyButton*/}
        {/*    varient="dark"*/}
        {/*    iconSize={{*/}
        {/*      width: 1.8,*/}
        {/*      height: 1.8,*/}
        {/*    }}*/}
        {/*    copyString={rawMnemonic}*/}
        {/*    trailing={<ControlInputText variant="b3_R">{t('components.MnemonicViewer.index.copy')}</ControlInputText>}*/}
        {/*  />*/}
        {/*</ControlInputButtonContainer>*/}
      </Container>
      <MnemonicBitsPopover
        open={isOpenPopover}
        onClose={() => {
          setIsOpenPopover(false);
        }}
        onClickMnemonicBits={(bits) => {
          onClickMnemonicBits?.(bits);
        }}
        anchorEl={popoverAnchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      />
    </>
  );
}
