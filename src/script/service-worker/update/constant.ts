import type { V11Asset } from '@/types/apiV11.ts';
import type { EvmErc20Asset } from '@/types/asset.ts';

export const AWS_URL = 'https://file.one-wallet.cc';

export const Chain_URL = `${AWS_URL}/image/chain/`;
export const Token_URL = `${AWS_URL}/image/token/`;
export const Default_Token_Icon = `${Token_URL}oct_gray.png`;

export const suiTestnet = {
  chain_id: 'sui-testnet',
  block_time: 0,
  params: {
    chainlist_params: {
      api_name: '',
      chain_id: '4c78adac',
      chain_name: 'Sui testnet',
      chain_image: `${Chain_URL}sui-testnet.png`,
      staking_asset_denom: '0x2::sui::SUI',
      staking_asset_symbol: 'SUI',
      staking_asset_image: `${Token_URL}sui.png`,
      origin_genesis_time: '2023-05-03T00:00:00Z',
      is_support_mobile_wallet: true,
      is_support_extension_wallet: true,
      chain_type: ['sui'],
      account_type: [
        {
          hd_path: 'm/44\'/784\'/0\'/0\'/X\'',
          pubkey_style: 'ed25519',
        },
      ],
      rpc_endpoint: [
        {
          provider: 'Foundation',
          url: 'https://fullnode.testnet.sui.io:443',
        },
      ],
      explorer: {
        name: 'Suiscan',
        url: 'https://suiscan.xyz/',
        account: 'https://suiscan.xyz/testnet/account/${address}',
        'tx': 'https://suiscan.xyz/testnet/tx/${hash}',
        'proposal': '',
      },
      about: {
        website: 'https://sui.io/',
      },
      forum: {
        main: 'https://forums.sui.io/',
      },
      description: {
        ko: '',
        en: '',
        ja: '',
      },
    },
  },
  updated_at: '2025-06-20T06:05:54.000Z',
  is_support: false,
};

export const octTestnet = {
  chain_id: 'oct-testnet',
  block_time: 0,
  params: {
    chainlist_params: {
      api_name: '',
      chain_id: '4c78adac',
      chain_name: 'OneChain Testnet',
      chain_image: `${Chain_URL}oct-testnet.png`,
      staking_asset_denom: '0x2::oct::OCT',
      staking_asset_symbol: 'OCT',
      staking_asset_image: `${Token_URL}oct.png`,
      origin_genesis_time: '2023-05-03T00:00:00Z',
      is_support_mobile_wallet: true,
      is_support_extension_wallet: true,
      chain_type: ['sui'],
      account_type: [
        {
          hd_path: 'm/44\'/784\'/0\'/0\'/X\'',
          pubkey_style: 'ed25519',
        },
      ],
      rpc_endpoint: [
        {
          provider: 'Foundation',
          url: 'https://rpc-testnet.onelabs.cc:443',
        },
      ],
      explorer: {
        name: 'onescan',
        url: 'https://onescan.cc/',
        account: 'https://onescan.cc/#/account?address=${address}&net=mainnet',
        tx: 'https://onescan.cc/testnet/transactionBlocksDetail?digest=${hash}',
        proposal: '',
      },
      about: {
        website: 'https://onescan.cc/',
      },
      forum: {
        main: 'https://onescan.cc/',
      },
      description: {
        ko: '',
        en: '',
        ja: '',
      },
    },
  },
  updated_at: '2025-06-20T06:05:54.000Z',
  is_support: false,
};

export const octMainnet = {
  chain_id: 'oct',
  block_time: 0,
  params: {
    chainlist_params: {
      api_name: '',
      chain_id: '35834a8a',
      chain_name: 'OneChain',
      chain_image: `${Chain_URL}oct.png`,
      staking_asset_denom: '0x2::oct::OCT',
      staking_asset_symbol: 'OCT',
      staking_asset_image: `${Token_URL}oct.png`,
      origin_genesis_time: '2023-05-03T00:00:00Z',
      is_support_mobile_wallet: true,
      is_support_extension_wallet: true,
      chain_type: ['sui'],
      account_type: [
        {
          hd_path: 'm/44\'/784\'/0\'/0\'/X\'',
          pubkey_style: 'ed25519',
        },
      ],
      rpc_endpoint: [
        {
          provider: 'Foundation',
          url: 'https://rpc-mainnet.onelabs.cc:443',
        },
      ],
      explorer: {
        name: 'onescan',
        url: 'https://onescan.cc/',
        account: 'https://onescan.cc/#/account?address=${address}&net=Mainnet',
        tx: 'https://onescan.cc/mainnet/transactionBlocksDetail?digest=${hash}',
        proposal: '',
      },
      about: {
        website: 'https://onescan.cc/',
      },
      forum: {
        main: 'https://onescan.cc/',
      },
      description: {
        ko: '',
        en: '',
        ja: '',
      },
    },
  },
  updated_at: '2025-06-20T06:05:54.000Z',
  is_support: false,
};

export const tronMainnet = {
  chain_id: 'tron-mainnet',
  block_time: 3,
  params: {
    chainlist_params: {
      api_name: 'tron',
      chain_id: '2b6653dc', // 去掉 0x
      chain_name: 'Tron',
      chain_image: 'https://raw.githubusercontent.com/cosmostation/chainlist/master/chain/tron/resource/chain_tron.png',

      staking_asset_denom: 'trx',
      staking_asset_symbol: 'TRX',
      staking_asset_image: 'https://raw.githubusercontent.com/cosmostation/chainlist/master/chain/tron/asset/trx.png',

      origin_genesis_time: '2018-06-25T00:00:00Z',

      is_support_mobile_wallet: true,
      is_support_extension_wallet: true,

      chain_type: ['tron'],

      account_type: [
        {
          hd_path: "m/44'/195'/0'/0/X",
          pubkey_style: 'secp256k1',
        },
      ],

      rpc_endpoint: [
        {
          provider: 'TronGrid',
          url: 'https://api.trongrid.io',
        },
        {
          provider: 'TronStack',
          url: 'https://api.tronstack.io',
        },
        {
          provider: 'Tron Foundation',
          url: 'https://api.tron.network',
        },
      ],

      explorer: {
        name: 'Tronscan',
        url: 'https://tronscan.org',
        account: 'https://tronscan.org/#/address/${address}',
        tx: 'https://tronscan.org/#/transaction/${hash}',
        proposal: 'https://tronscan.org/#/proposal/${hash}',
      },

      about: {
        website: 'https://tron.network/',
      },

      forum: {
        main: 'https://forum.trondao.org',
      },

      description: {
        ko: '트론(TRON)은 분산형 엔터테인먼트 콘텐츠 공유 플랫폼을 목표로 하는 블록체인 기반 운영 체제입니다.',
        en: 'TRON is a blockchain-based decentralized operating system for global free content entertainment.',
        ja: 'TRON（トロン）は、グローバルな無料コンテンツエンターテイメントシステムの構築を目指すブロックチェーンベースの分散型オペレーティングシステムです。',
      },
    },
  },
  updated_at: '2025-11-24T00:00:00.000Z',
  is_support: false,
};

export const tronTestnet = {
  chain_id: 'tron-shasta',
  block_time: 3,
  params: {
    chainlist_params: {
      api_name: 'tron-shasta',
      chain_id: '94a9059e', // 去掉 0x
      chain_name: 'Tron Shasta',
      chain_image: 'https://raw.githubusercontent.com/cosmostation/chainlist/master/chain/tron/resource/chain_tron.png',

      staking_asset_denom: 'trx',
      staking_asset_symbol: 'TRX',
      staking_asset_image: 'https://raw.githubusercontent.com/cosmostation/chainlist/master/chain/tron/asset/trx.png',

      origin_genesis_time: '2018-06-25T00:00:00Z',

      is_support_mobile_wallet: true,
      is_support_extension_wallet: true,

      chain_type: ['tron'],

      account_type: [
        {
          hd_path: "m/44'/195'/0'/0/X",
          pubkey_style: 'secp256k1',
        },
      ],

      rpc_endpoint: [
        {
          provider: 'Shasta TronGrid',
          url: 'https://api.shasta.trongrid.io',
        },
      ],

      explorer: {
        name: 'Shasta Tronscan',
        url: 'https://shasta.tronscan.org',
        account: 'https://shasta.tronscan.org/#/address/${address}',
        tx: 'https://shasta.tronscan.org/#/transaction/${hash}',
        proposal: 'https://shasta.tronscan.org/#/proposal/${hash}',
      },

      about: {
        website: 'https://tron.network/',
      },

      forum: {
        main: 'https://forum.trondao.org',
      },

      description: {
        ko: '트론 샤스타는 트론 네트워크의 공식 테스트넷입니다.',
        en: 'Tron Shasta is the official testnet for the Tron network.',
        ja: 'トロン・シャスタは、トロンネットワークの公式テストネットです。',
      },
    },
  },
  updated_at: '2025-11-24T00:00:00.000Z',
  is_support: false,
};


// SUI assets
export const sui_mainnet_assets: V11Asset[] = [
  {
    symbol: 'SUI',
    chain: 'sui',
    type: 'native',
    denom: '0x2::sui::SUI',
    name: 'Sui',
    description: 'Sui Native Coin',
    decimals: 9,
    image: `${Token_URL}sui.png`,
    coinGeckoId: 'sui',
  },
  {
    symbol: 'USDH',
    chain: 'sui',
    type: 'bridge',
    denom: '0xb7e0f3afadf787a173ea7e7b73386072d59ea41d7bcd86de6663aa9d20e31708::usdh::USDH',
    name: 'Usdh',
    description: 'USDH',
    decimals: 9,
    image: `${Token_URL}usdh.png`,
    coinGeckoId: 'sui-mainnet-usdh',
  },
];

export const sui_testnet_assets: V11Asset[] = [
  {
    symbol: 'SUI',
    chain: 'sui-testnet',
    type: 'native',
    denom: '0x2::sui::SUI',
    name: 'Sui',
    description: 'Sui Native Coin',
    decimals: 9,
    image: `${Token_URL}sui.png`,
    coinGeckoId: 'sui',
  },
  {
    symbol: 'USDH',
    chain: 'sui-testnet',
    type: 'bridge',
    denom: '0x71ccdb46d37bae1ce9fdca3e771c8c9c07dd29992747ec52558e0c34876b6c43::usdh::USDH',
    name: 'Usdh',
    description: 'USDH',
    decimals: 9,
    image: `${Token_URL}usdh.png`,
    coinGeckoId: 'sui-testnet-usdh',
  },
];

export const oct_mainnet_assets: V11Asset[] = [
  {
    symbol: 'OCT',
    chain: 'oct',
    type: 'native',
    denom: '0x2::oct::OCT',
    name: 'Oct',
    description: 'Oct Native Coin',
    decimals: 9,
    image: `${Token_URL}oct.png`,
    coinGeckoId: 'oct',
  },
  {
    symbol: 'USDH',
    chain: 'oct',
    type: 'bridge',
    denom: '0x3d1ecd3dc3c8ecf8cb17978b6b5fe0b06704d4ed87cc37176a01510c45e21c92::usdh::USDH',
    name: 'Usdh',
    description: 'USDH',
    decimals: 9,
    image: `${Token_URL}usdh.png`,
    coinGeckoId: 'oct-mainnet-usdh',
  },
  {
    symbol: 'USDO',
    chain: 'oct',
    type: 'bridge',
    denom: '0x714159631ef1621b67a57db8239d6147492fb8278bfee7b9b734a032110c0fd6::usdo::USDO',
    name: 'Usdo',
    description: 'USDO',
    decimals: 6,
    image: `${Token_URL}usdo.png`,
    coinGeckoId: 'oct-mainnet-usdo',
  },
];

export const oct_testnet_assets: V11Asset[] = [
  {
    symbol: 'OCT',
    chain: 'oct-testnet',
    type: 'native',
    denom: '0x2::oct::OCT',
    name: 'Oct',
    description: 'Oct Native Coin',
    decimals: 9,
    image: `${Token_URL}oct-testnet.png`,
    coinGeckoId: 'oct-testnet',
  },
  {
    symbol: 'USDH',
    chain: 'oct-testnet',
    type: 'bridge',
    denom: '0x72eba41c73c4c2ce2bcfc6ec1dc0896ba1b5c17bfe7ae7c6c779943f84912b41::usdh::USDH',
    name: 'Usdh',
    description: 'USDH',
    decimals: 9,
    image: `${Token_URL}usdh-testnet.png`,
    coinGeckoId: 'oct-testnet-usdh',
  },
  {
    symbol: 'USDO',
    chain: 'oct-testnet',
    type: 'bridge',
    denom: '0xf0dbc2d1a28faec23a9d2af8e8bfaff594e370bab0eaf4ea08be456d292c7b34::usdo::USDO',
    name: 'Usdo',
    description: 'USDO',
    decimals: 6,
    image: `${Token_URL}usdo-testnet.png`,
    coinGeckoId: 'oct-testnet-usdo',
  },
];

export const eth_mainnet_coin: V11Asset[] = [
  {
    symbol: 'ETH',
    chain: 'ethereum',
    type: 'native',
    denom: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    name: 'ETH',
    description: 'ETH',
    decimals: 18,
    image: `${Chain_URL}ethereum.png`,
    coinGeckoId: 'ethereum',
    category: 1,
  },
];

export const eth_mainnet_assets: EvmErc20Asset[] = [
  {
    // chain: 'ethereum',
    type: 'erc20',
    // contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    name: 'Tether',
    symbol: 'USDT',
    description: 'Tether',
    decimals: 6,
    image: `${Token_URL}usdt.png`,
    coinGeckoId: 'tether',
    wallet_preload: true,
    id: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    chainId: 'ethereum',
    chainType: 'evm',
  },
];

export const evm_testnet_assets: V11Asset[] = [
  {
    'chain': 'ethereum',
    'type': 'native',
    'denom': '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    'name': 'Ethereum',
    'symbol': 'ETH',
    'description': 'Ethereum Native Coin',
    'decimals': 18,
    'image': 'https://raw.githubusercontent.com/cosmostation/chainlist/master/chain/ethereum/asset/eth.png',
    'coinGeckoId': 'ethereum',
  },
];

export const tron_mainnet_assets: V11Asset[] = [
  {
    symbol: 'TRX',
    chain: 'tron',
    type: 'native',
    denom: 'trx',
    name: 'TRON',
    description: 'TRON Native Coin',
    decimals: 6,
    image: `${Token_URL}trx.png`,
    coinGeckoId: 'tron',
  },
  {
    symbol: 'USDT',
    chain: 'tron',
    type: 'bridge',
    denom: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    name: 'Tether USD',
    description: 'Tether USD (TRC20 on Tron Mainnet)',
    decimals: 6,
    image: `${Token_URL}usdt_tron.png`,
    coinGeckoId: 'tether',
  },
];

export const tron_shasta_assets: V11Asset[] = [
  {
    symbol: 'TRX',
    chain: 'tron-shasta',
    type: 'native',
    denom: 'trx',
    name: 'TRON (Shasta)',
    description: 'TRON Native Coin on Shasta Testnet',
    decimals: 6,
    image: `${Token_URL}trx_shasta.png`,
    coinGeckoId: 'tron',
  },
  {
    symbol: 'USDT',
    chain: 'tron-shasta',
    type: 'bridge',
    denom: 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs',
    name: 'Tether USD (Testnet)',
    description: 'Tether USD (TRC20 on Tron Shasta Testnet)',
    decimals: 6,
    image: `${Token_URL}usdt_tron_shasta.png`,
    coinGeckoId: 'tether',
  },
];
