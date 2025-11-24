import { useNavigate } from '@tanstack/react-router';
import type {
  MoveCallTransactionInfo,
  AnalyzedTransaction,
  DividendBatchSubmitEvent,
  DividendListAddEvent,
  UserDividendFundsClaimEvent, BuyRwaTokenEvent,
} from '@/types/sui/parseTx';
import { capitalize } from '@/utils/string';
import { Route as TxHistory } from '@/pages/wallet/history';
import FunctionIcon from '@/assets/img/icon/wallet_home_swap.png';

type SuiMoveCallsTxItemProps = {
  tx: MoveCallTransactionInfo;
  digest: string;
  coinId: string;
  timestampMs?: string | null;
  originalTransaction?: AnalyzedTransaction;
};

export default function SuiMoveCallsTxItem({
                                             tx: moveCallTransactionInfo,
                                             digest,
                                             timestampMs,
                                             coinId,
                                             originalTransaction,
                                           }: SuiMoveCallsTxItemProps) {
  const navigate = useNavigate();
  const { moduleName, functionName } = moveCallTransactionInfo;

  const detail = (() => {
    const title = `${capitalize(moduleName)} ${capitalize(functionName)}`;

    return {
      title,
    };
  })();

  // Parse RWA-specific information
  const rwaInfo = (() => {
    if (!originalTransaction || moduleName !== 'rwa') {
      return null;
    }

    const events = originalTransaction.original?.events || [];

    if (functionName === 'submit_dividend_batch') {
      const submitEvent = events.find(event =>
        event.type?.includes('DividendBatchSubmitEvent'),
      );

      if (submitEvent?.parsedJson) {
        const parsedJson = submitEvent.parsedJson as DividendBatchSubmitEvent;
        const dividendFunds = parsedJson.dividend_funds;
        const totalSupply = parsedJson.rwa_token_total_supply;

        // Convert from smallest unit (assuming 9 decimals for USDH)
        const dividendAmount = (parseInt(dividendFunds) / 1e9).toString();

        return {
          type: 'submit_batch',
          dividendAmount,
          totalSupply,
        };
      }
    } else if (functionName === 'add_dividend_list') {
      const addEvents = events.filter(event =>
        event.type?.includes('DividendListAddEvent'),
      );

      if (addEvents.length > 0) {
        const recipients = addEvents.map(event => {
          if (event.parsedJson) {
            const parsedJson = event.parsedJson as DividendListAddEvent;
            const user = parsedJson.user;
            const percentage = parsedJson.participating_dividend;

            return {
              address: user,
              percentage: parseInt(percentage),
            };
          }
          return null;
        }).filter(Boolean);

        return {
          type: 'add_list',
          recipients,
        };
      }
    } else if (functionName === 'claim_dividend_funds') {
      const claimEvent = events.find(event =>
        event.type?.includes('UserDividendFundsClaimEvent'),
      );

      if (claimEvent?.parsedJson) {
        const parsedJson = claimEvent.parsedJson as UserDividendFundsClaimEvent;
        const amount = parsedJson.amount;
        const recipient = parsedJson.recipient;

        // Convert from smallest unit (assuming 6 decimals for USDH)
        const claimedAmount = (parseInt(amount) / 1e6).toString();

        return {
          type: 'claim_funds',
          claimedAmount,
          recipient,
        };
      }
    } else if (functionName === 'buy_token') {
      const buyEvent = events.find(event =>
        event.type?.includes('BuyRwaTokenEvent'),
      );

      if (buyEvent?.parsedJson) {
        const parsedJson = buyEvent.parsedJson as BuyRwaTokenEvent;
        const buyAmount = parsedJson.buy_amount;
        const payAmount = parsedJson.pay_amount;
        const price = parsedJson.price;

        // Convert from smallest unit (assuming 9 decimals for USDH)
        const displayBuyAmount = buyAmount;
        const displayPayAmount = (parseInt(payAmount) / 1e9).toString();
        const displayPrice = (parseInt(price) / 1e9).toString();

        return {
          type: 'buy_token',
          buyAmount: displayBuyAmount,
          payAmount: displayPayAmount,
          price: displayPrice,
        };
      }
    }

    return null;
  })();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Extract token symbol from coin type string
  const extractTokenSymbol = (coinType: string): string => {
    if (!coinType) return '';

    // Handle coin type like "0x2::coin::Coin<0x...::module::SYMBOL>"
    const match = coinType.match(/<([^>]+)>/);
    if (match) {
      const innerType = match[1];
      const parts = innerType.split('::');
      return parts[parts.length - 1]; // Get the last part as symbol
    }

    // Handle direct coin type like "0x...::module::SYMBOL"
    const parts = coinType.split('::');
    return parts[parts.length - 1] || '';
  };

  // Extract token symbols from transaction data
  const getTokenSymbols = () => {
    if (!originalTransaction?.original) {
      return { dividendSymbol: 'USDH', rwaSymbol: 'RWA' }; // fallback
    }

    let dividendSymbol = '';
    let rwaSymbol = '';

    // Extract from transaction inputs (for submit_dividend_batch)
    const transaction = originalTransaction.original.transaction?.data?.transaction;
    if (transaction?.kind === 'ProgrammableTransaction') {
      const inputs = transaction.inputs || [];

      // Look for coin objects in inputs
      inputs.forEach(input => {
        if (input.type === 'object' && input.objectType?.includes('::coin::Coin<')) {
          const symbol = extractTokenSymbol(input.objectType);
          if (symbol && !dividendSymbol) {
            dividendSymbol = symbol;
          }
        }
      });
    }

    // Extract from object changes
    const objectChanges = originalTransaction.original.objectChanges || [];
    objectChanges.forEach(change => {
      if (change.type === 'created' || change.type === 'mutated') {
        if (change.objectType?.includes('::coin::Coin<')) {
          const symbol = extractTokenSymbol(change.objectType);
          if (symbol && !dividendSymbol) {
            dividendSymbol = symbol;
          }
        }
        // Look for RWA token metadata
        if (change.objectType?.includes('CoinMetadata<')) {
          const symbol = extractTokenSymbol(change.objectType);
          if (symbol && !rwaSymbol) {
            rwaSymbol = symbol;
          }
        }
      }
    });

    // Try to extract from balance changes
    const balanceChanges = originalTransaction.original.balanceChanges || [];
    balanceChanges.forEach(change => {
      if (change.coinType && change.coinType !== '0x2::sui::SUI') {
        const symbol = extractTokenSymbol(change.coinType);
        if (symbol && !dividendSymbol) {
          dividendSymbol = symbol;
        }
      }
    });

    // Fallback values if nothing found
    if (!dividendSymbol) dividendSymbol = 'USDH';
    if (!rwaSymbol) rwaSymbol = 'RWA';

    return { dividendSymbol, rwaSymbol };
  };

  const { dividendSymbol, rwaSymbol } = getTokenSymbols();

  return (
    <div
      className="border-[#2c3039] mb-[16px] border-b border-solid pb-[16px]"
      onClick={() => {
        navigate({
          to: TxHistory.to,
          search: {
            coinId,
            txHash: digest,
            timestamp: timestampMs,
          },
        });
      }}
    >
      <div className="flex items-start">
        <div className="size-[32px] rounded-[40px] bg-[#1E2025] flex-shrink-0">
          <img className="mx-auto mt-[6px] size-[20px]" src={FunctionIcon} alt="function" />
        </div>
        <div className="ml-[8px] flex-1 min-w-0">
          <div className="text-[14px] leading-[16px] text-white truncate">{detail.title}</div>
          <div className="mt-[4px] text-[12px] leading-[12px] text-white opacity-40">Function Call</div>
        </div>
      </div>

      {rwaInfo && (
        <div className="mt-[8px] ml-[40px]">
          {rwaInfo.type === 'submit_batch' && (
            <div className="text-[11px] text-white opacity-60">
              <div>Dividend: {rwaInfo.dividendAmount} {dividendSymbol}</div>
              <div className="mt-[2px]">Total Supply: {rwaInfo.totalSupply} {rwaSymbol}</div>
            </div>
          )}

          {rwaInfo.type === 'add_list' && rwaInfo.recipients && (
            <div className="text-[11px] text-white opacity-60">
              {rwaInfo.recipients.map((recipient: any, index: number) => (
                <div key={index} className={index > 0 ? 'mt-[2px]' : ''}>
                  {formatAddress(recipient.address)}: {recipient.percentage}%
                </div>
              ))}
            </div>
          )}

          {rwaInfo.type === 'claim_funds' && (
            <div className="text-[11px] text-white opacity-60">
              <div>Claimed: {rwaInfo.claimedAmount} {dividendSymbol}</div>
              <div className="mt-[2px]">Recipient: {formatAddress(rwaInfo.recipient ?? '')}</div>
            </div>
          )}

          {rwaInfo.type === 'buy_token' && (
            <div className="text-[11px] text-white opacity-60">
              <div>Amount: {rwaInfo.buyAmount} {rwaSymbol}</div>
              <div className="mt-[2px]">Paid: {rwaInfo.payAmount} {dividendSymbol}</div>
              <div className="mt-[2px]">Price: {rwaInfo.price} {dividendSymbol}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
