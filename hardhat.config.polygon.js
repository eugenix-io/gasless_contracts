const _ = require('lodash');
require('hardhat-gas-reporter');
require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

const NODE_URL =
    'https://polygon-mainnet.g.alchemy.com/v2/OUyLer3Ubv9iwexAqckuwyPtJ_KczKRD';

const configParams = {
    wrappedTokenAddress: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    gasForSwap: 130_000,
    gasForApproval: 50_000,
    defaultGasPrice: 1_000_000_000,
};

module.exports = _.merge(require('./hardhat.config'), {
    networks: {
        hardhat: {
            forking: {
                url: NODE_URL,
            },
            chainId: 137,
            config: configParams,
        },
        polygon_mainnet: {
            url: NODE_URL,
            accounts: [process.env.DEPLOY_PRIVATE_KEY],
            config: configParams,
        },
    },
    gasReporter: {
        token: 'MATIC',
        gasPriceApi:
            'https://api.polygonscan.com/api?module=proxy&action=eth_gasPrice',
    },
    etherscan: {
        apiKey: 'DDZ33H8RZYENMTDX5KCM67FW1HBJD5CRUC',
    },
});
