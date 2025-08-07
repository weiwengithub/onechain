import type { V11Asset } from '@/types/apiV11.ts';

export const AWS_URL = 'https://onewallet2020.s3.ap-southeast-2.amazonaws.com';

export const Chain_URL = `${AWS_URL}/image/chain/`;
export const Token_URL = `${AWS_URL}/image/token/`;

export const suiTestnet = {
  chain_id: 'sui-testnet',
  block_time: 0,
  params: {
    chainlist_params: {
      api_name: '',
      chain_id: '4c78adac',
      chain_name: 'Sui testnet',
      chain_image: `${Chain_URL}sui.png`,
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
      chain_name: 'ONECHAIN TESTNET',
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
      chain_name: 'ONECHAIN',
      chain_image: `${Token_URL}oct.png`,
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
    image: `${Token_URL}oct.png`,
    coinGeckoId: 'oct-testnet',
  },
  {
    symbol: 'USDT',
    chain: 'oct-testnet',
    type: 'bridge',
    denom: '0xba7bedcdba936baa2a42dfe92c47294c7c7775b9031a7a65a3967cc4e265259e::usdt::USDT',
    name: 'Usdt',
    description: 'USDT',
    decimals: 9,
    image: `${Token_URL}usdt.png`,
    coinGeckoId: 'oct-testnet-usdt',
  },
  {
    symbol: 'USDH',
    chain: 'oct-testnet',
    type: 'bridge',
    denom: '0x68e3caaf439b8d8326162257948e8d141b0a669f2da2a560c1ca267e4298c3a3::usdh::USDH',
    name: 'Usdh',
    description: 'USDH',
    decimals: 9,
    image: `${Token_URL}usdh.png`,
    coinGeckoId: 'oct-testnet-usdh',
  },
];

export const evm_mainnet_assets: V11Asset[] = [
  {
    "chain": "ethereum",
    "type": "native",
    "denom": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "name": "Ethereum",
    "symbol": "ETH",
    "description": "Ethereum Native Coin",
    "decimals": 18,
    "image": "https://raw.githubusercontent.com/cosmostation/chainlist/master/chain/ethereum/asset/eth.png",
    "coinGeckoId": "ethereum"
  }
]

export const evm_testnet_assets: V11Asset[] = [
  {
    "chain": "ethereum",
    "type": "native",
    "denom": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "name": "Ethereum",
    "symbol": "ETH",
    "description": "Ethereum Native Coin",
    "decimals": 18,
    "image": "https://raw.githubusercontent.com/cosmostation/chainlist/master/chain/ethereum/asset/eth.png",
    "coinGeckoId": "ethereum"
  }
]


