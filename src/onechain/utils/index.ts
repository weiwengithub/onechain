import { SuiClient } from '@mysten/sui/client';
import { SuiClient as SuiClientOct } from '@onelabs/sui/client';
import { OCT_COIN_TYPE, SUI_COIN_TYPE } from '@/constants/sui';

export const getSuiClient = (isOct: boolean, requestURL: string) => {
  return isOct ? new SuiClientOct({ url: requestURL }) : new SuiClient({ url: requestURL });
};

export const getSuiCoinType = (coinId?: string) => {
  if (!coinId) {
    return SUI_COIN_TYPE;
  }
  if (coinId.startsWith('0x2::oct::OCT') || coinId.toLowerCase().includes('__oct')) {
    return OCT_COIN_TYPE;
  } else {
    return SUI_COIN_TYPE;
  }
};
