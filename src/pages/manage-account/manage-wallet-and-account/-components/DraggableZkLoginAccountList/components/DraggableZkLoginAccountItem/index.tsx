import { useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';

import VerifyPasswordBottomSheet from '@/components/VerifyPasswordBottomSheet';
import DeleteConfirmDialog from '@components/ConfirmDialog';
import SetNameBottomSheet from '@/components/SetNameBottomSheet';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';
import { useCurrentAccount } from '@/hooks/useCurrentAccount';
import { getShortAddress } from '@/utils/string';
import subtractIcon from '@/assets/img/icon/subtract.png';
import Avatar from 'boring-avatars';
import RightChevronIcon from '@/assets/images/icons/RightChevron30.svg';
import { updateAccountName } from '@/utils/zustand/accountNames';
import {
  Container,
  TopButton,
  TopLeftContainer,
  BodyContainer,
} from './styled';
import { type IndexedZkLoginAccount, ZKLOGIN_ACCOUNT_DND_ITEM_TYPE } from '../..';

import { toastSuccess } from '@/utils/toast';
import { Route as SwitchWallet } from '@/pages/manage-account/switch-account';
import GoogleLogo from '@/assets/images/logos/g.webp';
import AppleLogo from '@/assets/images/logos/apple.png';

type DraggableZkLoginAccountItemProps = {
  itemIndex: number;
  draggableItem: IndexedZkLoginAccount;
  blockDrag?: boolean;
  moveAccountItem: (id: number, atIndex: number) => void;
  findAccountItem: (id: number) => { index: number };
};

export default function DraggableZkLoginAccountItem(
  {
    draggableItem,
    itemIndex,
    blockDrag = false,
    moveAccountItem,
    findAccountItem,
  }: DraggableZkLoginAccountItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { accountNamesById } = useExtensionStorageStore((state) => state);
  const { removeAccount } = useCurrentAccount();

  const [isOpenDeleteAccountConfirmDialog, setIsOpenDeleteAccountConfirmDialog] = useState(false);
  const [isOpenVerifyPasswordBottomSheet, setIsOpenVerifyPasswordBottomSheet] = useState(false);
  const [isOpenSetAccountNameBottomSheet, setIsOpenSetAccountNameBottomSheet] = useState(false);

  const accountName = accountNamesById[draggableItem.accountId] || 'ZkLogin Account';

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: ZKLOGIN_ACCOUNT_DND_ITEM_TYPE.ZKLOGIN_CARD,
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
    [itemIndex, blockDrag, moveAccountItem],
  );

  const [, drop] = useDrop(
    () => ({
      accept: ZKLOGIN_ACCOUNT_DND_ITEM_TYPE.ZKLOGIN_CARD,
      hover: ({ index: draggedId }: IndexedZkLoginAccount) => {
        if (draggedId !== itemIndex) {
          const { index: overIndex } = findAccountItem(itemIndex);
          moveAccountItem(draggedId, overIndex);
        }
      },
    }),
    [findAccountItem, moveAccountItem],
  );

  const handleDeleteAccount = async () => {
    try {
      console.log('Deleting zklogin account:', draggableItem.accountId);
      await removeAccount(draggableItem.accountId);

      // Check remaining accounts after deletion
      const accounts = await useExtensionStorageStore.getState().userAccounts;
      console.log('Remaining accounts after deletion:', accounts.length);
      console.log('Remaining zkLogin accounts:', accounts.filter(acc => acc.type === 'ZKLOGIN').length);

      toastSuccess(t('pages.manage-account.detail.privateKey.account.entry.successDeleteAccount'));

      // Only navigate away if no accounts remain, otherwise stay on current page to show the updated list
      if (!accounts || accounts.length === 0) {
        navigate({ to: SwitchWallet.to });
      }
      // If accounts remain, the component will automatically re-render with updated userAccounts

      // Force a small delay to ensure state updates are processed
      setTimeout(() => {
        console.log('Post-deletion state check completed');
      }, 100);

    } catch (error) {
      console.error('Failed to delete zklogin account:', error);
      // Show error toast to user
      // toastError('Failed to delete account. Please try again.');
    }
  };

  const editAccountName = async (accountId: string, newAccountName: string) => {
    await updateAccountName(accountId, newAccountName);
    toastSuccess(t('pages.manage-account.detail.mnemonic.account.entry.accountNameUpdated'));
  };

  drag(drop(ref));

  return (
    <Container ref={ref} data-is-dragging={isDragging}>
      {/*<TopButton>*/}
      {/*  <TopLeftContainer>*/}
      {/*    /!*<div className="h-[20px] text-[14px] text-white leading-[20px]">ZkLogin Account</div>*!/*/}
      {/*    <div*/}
      {/*      className="ml-[16px]"*/}
      {/*      onClick={() => {*/}
      {/*        setIsOpenSetAccountNameBottomSheet(true);*/}
      {/*      }}*/}
      {/*    >*/}
      {/*      /!*<RightChevronIcon />*!/*/}
      {/*    </div>*/}
      {/*  </TopLeftContainer>*/}
      {/*</TopButton>*/}
      {/*<div className={'h-3'} />*/}
      <BodyContainer>
        <div
          className="flex-1 min-h-[60px] h-[60px] flex items-center rounded-[16px] bg-[#1E2025] pl-[12px] w-full"
          onClick={() => {
            // TODO: Navigate to zklogin account detail when available
            console.log('Navigate to zklogin account detail');
          }}
        >
          <div className="flex size-[26px] rounded-full bg-white items-center justify-center">
            <img
              className={'size-[18px]'}
              src={draggableItem.provider === 'apple' ? AppleLogo : GoogleLogo}
              alt={draggableItem.provider === 'apple' ? 'Apple' : 'Google'}
            />
          </div>
          <div className="ml-[8px] flex-1 text-left text-white flex flex-col justify-center min-h-[40px]">
            <div className="flex items-center">
              <div className="h-[16px] leading-[16px] text-[14px]">{accountName}</div>
            </div>
            <div
              className="mt-[2px] h-[16px] leading-[16px] text-[12px] opacity-40"
            >{getShortAddress(draggableItem.address)}</div>
          </div>
          <img
            src={subtractIcon}
            alt="delete"
            className="size-[20px] mr-[8px]"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setIsOpenDeleteAccountConfirmDialog(true);
            }}
          />
        </div>
      </BodyContainer>

      <DeleteConfirmDialog
        title={t('pages.manage-account.detail.zklogin.account.entry.deleteAccountTitle')}
        descriptionText={t('pages.manage-account.detail.zklogin.account.entry.deleteAccountDescription')}
        confirmText={t('pages.manage-account.detail.zklogin.account.entry.delete')}
        open={isOpenDeleteAccountConfirmDialog}
        onClose={() => {
          setIsOpenDeleteAccountConfirmDialog(false);
        }}
        onClickConfirm={() => {
          setIsOpenDeleteAccountConfirmDialog(false);
          setIsOpenVerifyPasswordBottomSheet(true);
        }}
      />

      <VerifyPasswordBottomSheet
        open={isOpenVerifyPasswordBottomSheet}
        onClose={() => {
          setIsOpenVerifyPasswordBottomSheet(false);
        }}
        onSubmit={async () => {
          await handleDeleteAccount();
          setIsOpenVerifyPasswordBottomSheet(false);
        }}
      />

      <SetNameBottomSheet
        open={isOpenSetAccountNameBottomSheet}
        onClose={() => setIsOpenSetAccountNameBottomSheet(false)}
        headerTitleText={t('pages.manage-account.detail.mnemonic.account.entry.editAccountName')}
        descriptionText={t('pages.manage-account.detail.mnemonic.account.entry.editAccountNameDescription')}
        inputPlaceholder={t('pages.manage-account.detail.mnemonic.account.entry.accountName')}
        setName={async (newAccountName) => {
          if (newAccountName) {
            await editAccountName(draggableItem.accountId, newAccountName);
          }
        }}
        currentName={accountName}
      />
    </Container>
  );
}
