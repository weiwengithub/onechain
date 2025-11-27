import { useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';

import AccountImage from '@/components/AccountImage';
import Base1300Text from '@/components/common/Base1300Text';
import NumberTypo from '@/components/common/NumberTypo';
import VerifyPasswordBottomSheet from '@/components/VerifyPasswordBottomSheet';
import DeleteConfirmDialog from '@components/ConfirmDialog';
import { Route as ManageBackupStep1 } from '@/pages/manage-account/backup-wallet/step1/$accountId';
import { Route as MnemonicDetail } from '@/pages/manage-account/detail/mnemonic/$mnemonicId';
import { Route as MnemonicAccountDetail } from '@/pages/manage-account/detail/mnemonic/account/$accountId';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';
import subtractIcon from '@/assets/img/icon/subtract.png';

import {
  AccountButton,
  AccountImgContainer,
  AccountInfoContainer,
  AccountLeftContainer,
  BodyContainer,
  Container,
  LastHdPathIndexText,
  LastHdPathText,
  LastHdPathTextContainer,
  OutlinedButtonContainer,
  RightArrowIconContainer,
  StyledOutlinedButton,
  TopButton,
  TopLeftContainer,
  TopRightContainer,
} from './styled';
import { type IndexedMnemonicAccount, MNEMONIC_ACCOUNT_DND_ITEM_TYPE } from '../..';

import RightArrowIcon from '@/assets/images/icons/RightArrow14.svg';
import OrderIcon from 'assets/images/icons/Order20.svg';
import RightChevronIcon from '@/assets/images/icons/RightChevron30.svg';
import Avatar from 'boring-avatars';
import { getShortAddress } from '@/utils/string.ts';
import MainContentsLayout from '@/pages/manage-account/detail/-components/MainContentsLayout';
import {
  MainContentBody, MainContentSubtitleText,
  MainContentTitleText,
  MnemonicIconContainer,
} from '@/pages/manage-account/detail/mnemonic/$mnemonicId/-styled.tsx';
import MnemonicIcon from '@/assets/images/icons/Mnemonic52.svg';
import { toastSuccess } from '@/utils/toast.tsx';
import { Route as SwitchWallet } from '@/pages/manage-account/switch-account';
import { Route as ViewMnemonic } from '@/pages/manage-account/view/mnemonic/$mnemonicId';
import { useCurrentAccount } from '@/hooks/useCurrentAccount.ts';
import { useNewSortedAccountStore } from '@/zustand/hooks/useNewSortedAccountStore';
import { Route as ViewPrivateKey } from '@/pages/manage-account/view/privateKey/$accountId';
import ArrowRightIcon from '@/assets/img/icon/arrow_right_16.png';
import EditIcon from '@/assets/img/icon/edit.png';
import SetNameBottomSheet from '@components/SetNameBottomSheet';
import { updateAccountName } from '@/utils/zustand/accountNames.ts';
import { updateMnemonicName } from '@/utils/mnemonicNames.ts';

const tempDisplay = false;

type DraggableMnemonicAccountItemProps = {
  itemIndex: number;
  draggableItem: IndexedMnemonicAccount;
  blockDrag?: boolean;
  moveAccountItem: (id: number, atIndex: number) => void;
  findAccountItem: (id: number) => { index: number };
};

export default function DraggableMnemonicAccountItem({
                                                       draggableItem,
                                                       itemIndex,
                                                       blockDrag = false,
                                                       moveAccountItem,
                                                       findAccountItem,
                                                     }: DraggableMnemonicAccountItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [supposedToBackupAccountId, setSupposedToBackupAccountId] = useState<string | undefined>();

  const { notBackedUpAccountIds } = useExtensionStorageStore((state) => state);

  const isNotBackedUp = draggableItem.accounts.length > 0 && notBackedUpAccountIds.includes(draggableItem.accounts[0].id);

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: MNEMONIC_ACCOUNT_DND_ITEM_TYPE.MNEMONIC_CARD,
      item: draggableItem,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
      canDrag: () => !blockDrag,
      end: (item, monitor) => {
        if (!monitor.didDrop()) {
          moveAccountItem(itemIndex, item.index);
        }
      },
    }),
    [itemIndex, moveAccountItem, blockDrag],
  );

  const [, drop] = useDrop(
    () => ({
      accept: MNEMONIC_ACCOUNT_DND_ITEM_TYPE.MNEMONIC_CARD,
      hover: ({ index: draggedId }: IndexedMnemonicAccount, monitor) => {
        if (draggedId === itemIndex) return;

        if (!ref.current) return;
        const hoverBoundingRect = ref.current.getBoundingClientRect();
        if (!hoverBoundingRect) return;

        const hoverMiddleY = (hoverBoundingRect.top + hoverBoundingRect.bottom) / 2;
        const clientOffset = monitor.getClientOffset();
        if (!clientOffset) return;
        const hoverClientY = clientOffset.y;

        if (draggedId < itemIndex && hoverClientY < hoverMiddleY) return;
        if (draggedId > itemIndex && hoverClientY > hoverMiddleY) return;

        const { index: overIndex } = findAccountItem(itemIndex);
        moveAccountItem(draggedId, overIndex);
      },
    }),
    [findAccountItem, moveAccountItem],
  );

  drag(drop(ref));

  const [mnemonicName, setMnemonicName] = useState('');
  const [mnemonicId, setMnemonicId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [isOpenDeleteAccountConfirmDialog, setIsOpenDeleteAccountConfirmDialog] = useState(false);
  // const [isOpenVerifyPasswordBottomSheet, setIsOpenVerifyPasswordBottomSheet] = useState(false);
  const [isOpenVerifyPasswordBottomSheetWithRemove, setIsOpenVerifyPasswordBottomSheetWithRemove] = useState(false);

  const { removeMnemonic } = useCurrentAccount();
  const { removeAccount } = useCurrentAccount();
  const { updatedNewSortedMnemonicAccounts } = useNewSortedAccountStore((state) => state);
  const { userAccounts, accountNamesById, mnemonicNamesByHashedMnemonic } = useExtensionStorageStore((state) => state);
  const filteredAccounts = userAccounts.filter((item) => item.type === 'MNEMONIC' && item.encryptedRestoreString === mnemonicId);

  const [isOpenSetMnemonicNameBottomSheet, setIsOpenSetMnemonicNameBottomSheet] = useState(false);
  const [isOpenSetAccountNameBottomSheet, setIsOpenSetAccountNameBottomSheet] = useState(false);

  const handleSubmit = async (type: 'removeMnemonic' | 'viewMnemonic' | 'removeAccount' | 'viewPrivatekey') => {
    if (type === 'removeMnemonic') {
      await removeMnemonic(mnemonicId);
      const accounts = await useExtensionStorageStore.getState().userAccounts;

      // Update sorted account store to remove deleted mnemonic from cache
      const remainingMnemonicStrings = accounts
        .filter((account) => account.type === 'MNEMONIC')
        .map((account) => account.encryptedRestoreString)
        .filter((value, index, self) => self.indexOf(value) === index);
      await updatedNewSortedMnemonicAccounts(remainingMnemonicStrings);

      if (accounts && accounts.length > 0) {
        toastSuccess(t('pages.manage-account.detail.mnemonic.entry.successDeleteMnemonic'));
        navigate({ to: SwitchWallet.to });
      }
    }
    if (type === 'viewMnemonic') {
      if (isNotBackedUp) {
        navigate({
          to: ManageBackupStep1.to,
          params: {
            accountId: filteredAccounts[0].id,
          },
        });
      } else {
        navigate({
          to: ViewMnemonic.to,
          params: {
            mnemonicId: mnemonicId,
          },
        });
      }
    }
    if (type === 'removeAccount') {
      await removeAccount(accountId);
      const accounts = await useExtensionStorageStore.getState().userAccounts;
      if (accounts && accounts.length > 0) {
        toastSuccess(t('pages.manage-account.detail.privateKey.account.entry.successDeleteAccount'));
        navigate({ to: SwitchWallet.to });
      }
    }
    if (type === 'viewPrivatekey') {
      navigate({
        to: ViewPrivateKey.to,
        params: {
          accountId,
        },
      });
    }
  };

  const editMnemonicName = async (mnemonic: string, newMnemonicName: string) => {
    await updateMnemonicName(mnemonic, newMnemonicName);

    toastSuccess(t('pages.manage-account.detail.mnemonic.entry.updateMnemonicNameSuccess'));
  };

  const editAccountName = async (accountId: string, accountName: string) => {
    await updateAccountName(accountId, accountName);

    toastSuccess(t('pages.manage-account.detail.mnemonic.account.entry.accountNameUpdated'));
  };

  return (
    <Container ref={ref} data-is-dragging={isDragging}>
      <TopButton
        // onClick={() => {
        //   navigate({
        //     to: MnemonicDetail.to,
        //     params: { mnemonicId: draggableItem.mnemonicRestoreString },
        //   });
        // }}
      >
        <TopLeftContainer>
          <img
            src={subtractIcon}
            alt="delete"
            className="size-[20px] mr-[8px]"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setAccountId('');
              setAccountName('');
              setMnemonicId(draggableItem.mnemonicRestoreString);
              setMnemonicName(draggableItem.mnemonicName);
              setIsOpenDeleteAccountConfirmDialog(true);
            }}
          />
          <div
            className="h-[20px] text-[14px] text-white leading-[20px]"
          >{mnemonicNamesByHashedMnemonic[draggableItem.mnemonicRestoreString] || draggableItem.mnemonicName}</div>
          <div
            className="ml-[16px]"
            onClick={() => {
              setMnemonicId(draggableItem.mnemonicRestoreString);
              setIsOpenSetMnemonicNameBottomSheet(true);
              // navigate({
              //   to: MnemonicAccountDetail.to,
              //   params: { accountId: item.id },
              // });
            }}
          >
            <img src={EditIcon} alt="" className="size-[16px]" />
          </div>
        </TopLeftContainer>
        {!blockDrag && (
          <TopRightContainer>
            <OrderIcon />
          </TopRightContainer>
        )}
      </TopButton>
      <BodyContainer>
        {draggableItem.accounts.map((item, i) => {
          const accountName = accountNamesById[item.id] || item.accountName || '';
          const lastHdPath = item.type === 'MNEMONIC' ? item.index : '';

          return (
            <AccountButton
              key={i}
            >
              <img
                src={subtractIcon}
                alt="delete"
                className="size-[20px] mr-[8px]"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  setMnemonicId('');
                  setMnemonicName('');
                  setAccountId(item.id);
                  setAccountName(accountName);
                  setIsOpenDeleteAccountConfirmDialog(true);
                }}
              />
              <div
                className="flex-1 h-[46px] flex items-center rounded-[16px] bg-[#1E2025] pl-[12px]"
                onClick={() => {
                  navigate({
                    to: MnemonicAccountDetail.to,
                    params: { accountId: item.id },
                  });
                }}
              >
                <Avatar
                  size={26}
                  name={item.id}
                  variant={'marble'}
                />
                <div className="ml-[8px] flex-1 text-left text-white">
                  <div className="flex items-center">
                    <div className="h-[16px] leading-[16px] text-[14px]">{accountName}</div>
                  </div>
                  {/*<div className="mt-[2px] h-[16px] leading-[16px] text-[14px] opacity-40">{getShortAddress(address)}</div>*/}
                </div>
                <div
                  className="mr-[16px]"
                  // onClick={() => {
                  //   setAccountId(item.id);
                  //   setIsOpenSetAccountNameBottomSheet(true);
                  // }}
                >
                  <RightChevronIcon />
                  {/*<img src={EditIcon} alt="" className="size-[16px]" />*/}
                </div>
              </div>
              {tempDisplay && (
                <AccountLeftContainer>
                  <AccountImgContainer>
                    <AccountImage accountId={item.id} />
                  </AccountImgContainer>
                  <AccountInfoContainer>
                    <Base1300Text variant="b2_M">{accountName}</Base1300Text>
                    <LastHdPathTextContainer>
                      <LastHdPathText
                        variant="b4_R"
                      >{`${t('pages.manage-account.switch-account.components.lastHdPath')} :`}</LastHdPathText>
                      &nbsp;
                      <LastHdPathIndexText>
                        <NumberTypo typoOfIntegers="h6n_M">{lastHdPath}</NumberTypo>
                      </LastHdPathIndexText>
                    </LastHdPathTextContainer>
                  </AccountInfoContainer>
                </AccountLeftContainer>
              )}
            </AccountButton>
          );
        })}
        {isNotBackedUp && (
          <OutlinedButtonContainer>
            <StyledOutlinedButton
              variant="dark"
              typoVarient="b4_M"
              trailingIcon={
                <RightArrowIconContainer>
                  <RightArrowIcon />
                </RightArrowIconContainer>
              }
              onClick={() => {
                setSupposedToBackupAccountId(draggableItem.accounts[0]?.id);
              }}
            >
              {t('pages.manage-account.manage-wallet-and-account.components.MnemonicAccount.index.backUpNow')}
            </StyledOutlinedButton>
          </OutlinedButtonContainer>
        )}
      </BodyContainer>
      <VerifyPasswordBottomSheet
        open={!!supposedToBackupAccountId}
        onClose={() => setSupposedToBackupAccountId(undefined)}
        onSubmit={() => {
          navigate({
            to: ManageBackupStep1.to,
            params: {
              accountId: supposedToBackupAccountId || '',
            },
          });
        }}
      />
      <VerifyPasswordBottomSheet
        open={isOpenVerifyPasswordBottomSheetWithRemove}
        onClose={() => {
          // setIsOpenVerifyPasswordBottomSheet(false);
          setIsOpenVerifyPasswordBottomSheetWithRemove(false);
        }}
        onSubmit={() => {
          // if (isOpenVerifyPasswordBottomSheet) {
          //   if (mnemonicId) handleSubmit('viewMnemonic');
          //   if (accountId) handleSubmit('viewPrivatekey');
          // }
          if (isOpenVerifyPasswordBottomSheetWithRemove) {
            if (mnemonicId) handleSubmit('removeMnemonic');
            if (accountId) handleSubmit('removeAccount');
          }
        }}
      />
      <DeleteConfirmDialog
        title={t('pages.manage-account.manage-wallet-and-account.components.MnemonicAccount.DraggableMnemonicAccountItem.deleteTitle')}
        descriptionText={t('pages.manage-account.manage-wallet-and-account.components.MnemonicAccount.DraggableMnemonicAccountItem.deleteDescription')}
        confirmText={t('pages.manage-account.manage-wallet-and-account.components.MnemonicAccount.DraggableMnemonicAccountItem.deleteConfirm')}
        cancelText={t('pages.manage-account.manage-wallet-and-account.components.MnemonicAccount.DraggableMnemonicAccountItem.cancel')}
        open={isOpenDeleteAccountConfirmDialog}
        onClose={() => {
          setIsOpenDeleteAccountConfirmDialog(false);
        }}
        onClickConfirm={() => {
          setIsOpenDeleteAccountConfirmDialog(false);
          setIsOpenVerifyPasswordBottomSheetWithRemove(true);
        }}
      />
      <SetNameBottomSheet
        open={isOpenSetMnemonicNameBottomSheet}
        onClose={() => setIsOpenSetMnemonicNameBottomSheet(false)}
        headerTitleText={t('pages.manage-account.detail.mnemonic.entry.editMnemonicName')}
        descriptionText={t('pages.manage-account.detail.mnemonic.entry.editMnemonicNameDescription')}
        inputPlaceholder={t('pages.manage-account.detail.mnemonic.entry.mnemonicName')}
        setName={async (newMnemonicName) => {
          await editMnemonicName(mnemonicId, newMnemonicName);
          setIsOpenSetMnemonicNameBottomSheet(false);
        }}
      />
      <SetNameBottomSheet
        open={isOpenSetAccountNameBottomSheet}
        onClose={() => setIsOpenSetAccountNameBottomSheet(false)}
        setName={async (accountName) => {
          await editAccountName(accountId, accountName);
          setIsOpenSetAccountNameBottomSheet(false);
        }}
      />
    </Container>
  );
}
