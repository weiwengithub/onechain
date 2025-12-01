import { useState } from 'react';
// import { useTranslation } from 'react-i18next';

// import { ButtonRow, Container, FirstRow, MnemonicButton, SecondRow, ThirdRow, TopContainer } from './styled';
// import Base1000Text from '../common/Base1000Text';
// import Base1300Text from '../common/Base1300Text';
import {
  MnemonicInputContainerConfirm,
  MnemonicInputWrapper,
  MnemonicWordIndexText,
  StyledInput,
} from '@/pages/account/restore-wallet/mnemonic/-styled.tsx';
import { InputAdornment } from '@mui/material';
import * as bip39 from 'bip39';

export type CheckWord = {
  index: number;
  word: string;
};

type MnemnicBackupCheckerProps = {
  mnemonic: string;
  checkWords: CheckWord[];
  onClickFirstAnswer: (word: string) => void;
  onClickSecondAnswer: (word: string) => void;
  onClickThirdAnswer: (word: string) => void;
};

export default function MnemnicBackupChecker({ mnemonic, checkWords, onClickFirstAnswer, onClickSecondAnswer, onClickThirdAnswer }: MnemnicBackupCheckerProps) {
  // const { t } = useTranslation();
  // const values = [...mnemonic];
  const mnemonicList = mnemonic.split(" ");
  const indexArray: number[] = [];
  for (let i = 0; i < checkWords.length; i++) {
    const index = checkWords[i].index;
    mnemonicList[index] = "";
    indexArray.push(index);
  }

  const [values, setValues] = useState<string[]>([...mnemonicList]);
  // const [firstSelectedMnemonic, setFirstSelectedMnemonic] = useState('');
  // const [secondSelectedMnemonic, setSecondSelectedMnemonic] = useState('');
  // const [thirdSelectedMnemonic, setThirdSelectedMnemonic] = useState('');

  // const splitedMnemonic = useMemo(() => mnemonic.split(' '), [mnemonic]);
  const mnemonicWordList = bip39.wordlists.english;
  const [isViewMnemonic] = useState(true);
  const [inputTypes, setInputTypes] = useState(values.map(() => (isViewMnemonic ? 'text' : 'password')));

  const handleFocusMnemonicInput = (index: number) => {
    setInputTypes((prevTypes) => {
      const newTypes = [...prevTypes];
      newTypes[index] = 'text';
      return newTypes;
    });
  };

  const handleBlurMnemonicInput = (index: number) => {
    setInputTypes((prevTypes) => {
      const newTypes = [...prevTypes];
      newTypes[index] = isViewMnemonic ? 'text' : 'password';
      return newTypes;
    });
  };

  const updateMnemonicWords = (index: number, value: string) => {
    let newValues = [...values];
    const words = value.split(' ');

    if (words.length === 24) {
      setValues(Array(24).fill(''));
      newValues = Array(24).fill('');
    }

    if (words.length === 18) {
      setValues(Array(18).fill(''));
      newValues = Array(18).fill('');
    }

    if (words.length > 1) {
      words.forEach((word, i) => {
        if (i < newValues.length) {
          newValues[i] = word;
        }
      });
    } else {
      newValues[index] = value;
    }

    setValues(newValues);

    switch (index) {
      case indexArray[0]:
        onClickFirstAnswer(value);
        break;
      case indexArray[1]:
        onClickSecondAnswer(value);
        break;
      case indexArray[2]:
        onClickThirdAnswer(value);
        break;
    }
  };
  // const mnemonicRows = useMemo(() => {
  //   const shuffleArray = (array: string[]) => array.sort(() => Math.random() - 0.5);
  //
  //   const wrongAnswerWords = splitedMnemonic.filter((item) => !checkWords.map(({ word }) => word).includes(item));
  //
  //   const randomWrongAnswerWords = shuffleArray(wrongAnswerWords);
  //
  //   const [firstRowWordParts, seconRowWordParts, thirdRowWordParts] = [
  //     randomWrongAnswerWords.slice(0, 2),
  //     randomWrongAnswerWords.slice(2, 4),
  //     randomWrongAnswerWords.slice(4, 6),
  //   ];
  //
  //   const firstRowWords = shuffleArray([checkWords[0].word, ...firstRowWordParts]);
  //   const secondRowWords = shuffleArray([checkWords[1].word, ...seconRowWordParts]);
  //   const thirdRowWords = shuffleArray([checkWords[2].word, ...thirdRowWordParts]);
  //
  //   return {
  //     firstRowWords,
  //     secondRowWords,
  //     thirdRowWords,
  //   };
  // }, [checkWords, splitedMnemonic]);

  return (
    <MnemonicInputWrapper>
      <MnemonicInputContainerConfirm>
        {values.map((value, index) => (
          <StyledInput
            key={index}
            value={value}
            type={isViewMnemonic ? 'text' : inputTypes[index]}
            disabled={!indexArray.includes(index)}
            startAdornment={
              <InputAdornment position="start">
                <MnemonicWordIndexText variant="h5n_M">{index + 1}</MnemonicWordIndexText>
              </InputAdornment>
            }
            hideViewIcon
            error={!!value && !mnemonicWordList.includes(value)}
            onFocus={() => handleFocusMnemonicInput(index)}
            onBlur={() => handleBlurMnemonicInput(index)}
            onChange={(e) => {
              if (e.target.value.endsWith(' ')) {
                return;
              }

              updateMnemonicWords(index, e.target.value);
            }}
          />
        ))}
      </MnemonicInputContainerConfirm>
    </MnemonicInputWrapper>
    // <Container>
    //   <FirstRow>
    //     <TopContainer>
    //       <Base1300Text variant="h4_B">{t('components.MnemonicBackupChecker.index.phrase')}</Base1300Text>
    //       &nbsp;
    //       <Base1000Text variant="h4_B">{`#${checkWords[0].index + 1}`}</Base1000Text>
    //     </TopContainer>
    //     <ButtonRow>
    //       {mnemonicRows.firstRowWords.map((item) => (
    //         <MnemonicButton
    //           key={item}
    //           isSelected={firstSelectedMnemonic === item}
    //           onClick={() => {
    //             setFirstSelectedMnemonic(item);
    //             onClickFirstAnswer(item);
    //           }}
    //           variant="primaryHoverGray"
    //         >
    //           <Base1300Text variant="b3_M">{item}</Base1300Text>
    //         </MnemonicButton>
    //       ))}
    //     </ButtonRow>
    //   </FirstRow>
    //   <SecondRow>
    //     <TopContainer>
    //       <Base1300Text variant="h4_B">{t('components.MnemonicBackupChecker.index.phrase')}</Base1300Text>
    //       &nbsp;
    //       <Base1000Text variant="h4_B">{`#${checkWords[1].index + 1}`}</Base1000Text>
    //     </TopContainer>
    //     <ButtonRow>
    //       {mnemonicRows.secondRowWords.map((item) => (
    //         <MnemonicButton
    //           key={item}
    //           isSelected={secondSelectedMnemonic === item}
    //           onClick={() => {
    //             setSecondSelectedMnemonic(item);
    //             onClickSecondAnswer(item);
    //           }}
    //           variant="primaryHoverGray"
    //         >
    //           <Base1300Text variant="b3_M">{item}</Base1300Text>
    //         </MnemonicButton>
    //       ))}
    //     </ButtonRow>
    //   </SecondRow>
    //   <ThirdRow>
    //     <TopContainer>
    //       <Base1300Text variant="h4_B">{t('components.MnemonicBackupChecker.index.phrase')}</Base1300Text>
    //       &nbsp;
    //       <Base1000Text variant="h4_B">{`#${checkWords[2].index + 1}`}</Base1000Text>
    //     </TopContainer>
    //     <ButtonRow>
    //       {mnemonicRows.thirdRowWords.map((item) => (
    //         <MnemonicButton
    //           key={item}
    //           isSelected={thirdSelectedMnemonic === item}
    //           onClick={() => {
    //             setThirdSelectedMnemonic(item);
    //             onClickThirdAnswer(item);
    //           }}
    //           variant="primaryHoverGray"
    //         >
    //           <Base1300Text variant="b3_M">{item}</Base1300Text>
    //         </MnemonicButton>
    //       ))}
    //     </ButtonRow>
    //   </ThirdRow>
    // </Container>
  );
}
