import { useTranslation } from 'react-i18next';
import Image from 'components/common/Image';
import { useClipboard } from '@/hooks/useClipboard.ts';
import Base1300Text from '@/components/common/Base1300Text';
import CopyIcon from 'assets/images/icons/Copy16.svg';

import {
  ItemLeftContainer,
  ItemLeftHdPathTextContainer,
  ItemLeftImageContainer,
  ItemLeftTextContainer,
  PrivateKeyText,
  PrivateKeyViewer,
  StyledChainAccordion,
  StyledChainAccordionDetails,
  StyledChainAccordionSummary,
} from './styled';

type PrivateKeyAccordion = {
  name: string;
  image: string | null;
  hdPath: string;
  privateKey: string;
  arialControls: string;
  id: string;
};

export default function PrivateKeyAccordion({ name, image, hdPath, privateKey, arialControls, id }: PrivateKeyAccordion) {
  const { t } = useTranslation();
  const { copyToClipboard } = useClipboard();

  return (
    <StyledChainAccordion>
      <StyledChainAccordionSummary aria-controls={arialControls} id={id}>
        <ItemLeftContainer>
          <ItemLeftImageContainer>
            <Image src={image} />
          </ItemLeftImageContainer>
          <ItemLeftTextContainer>
            <Base1300Text variant="b2_M">{name}</Base1300Text>
            {/*<ItemLeftHdPathTextContainer>*/}
            {/*  <Base1000Text variant="b4_R">{t('pages.view.multi-chain-privateKey.components.index.hdPath')}</Base1000Text>*/}
            {/*  &nbsp;*/}
            {/*  <Base1000Text variant="h7n_M">{hdPath}</Base1000Text>*/}
            {/*</ItemLeftHdPathTextContainer>*/}
          </ItemLeftTextContainer>
        </ItemLeftContainer>
      </StyledChainAccordionSummary>
      <StyledChainAccordionDetails>
        <PrivateKeyViewer>
          <PrivateKeyText>{privateKey}</PrivateKeyText>
          <div
            className="mt-[12px] flex items-center justify-center h-[36px] rounded-[8px] bg-[#0047C4] hover:bg-[#3B82FF] cursor-pointer"
            onClick={() => copyToClipboard(privateKey)}
          >
            <CopyIcon />
            <span className="ml-[6px] text-white text-[16px]">Copy</span>
          </div>
        </PrivateKeyViewer>
      </StyledChainAccordionDetails>
    </StyledChainAccordion>
  );
}
