const _ = require('lodash');
require('hardhat-gas-reporter');
require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

const NODE_URL =
    'https://arb-mainnet.g.alchemy.com/v2/IIe6yauUmszMlIDXFKtREUbfC-eotOVb';

module.exports = _.merge(require('./hardhat.config'), {
    networks: {
        hardhat: {
            forking: {
                url: NODE_URL,
            },
            chainId: 42161,
            wrappedTokenAddress: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        },
        arbitrum_mainnet: {
            url: NODE_URL,
            accounts: [process.env.DEPLOY_PRIVATE_KEY],
            wrappedTokenAddress: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        },
    },
    gasReporter: {
        token: 'ETH',
        gasPriceApi:
            'https://api.arbiscan.io/api?module=proxy&action=eth_gasPrice',
    },
    etherscan: {
        apiKey: 'WUP7FAH8JGUXKT6MZ78ZJ7KDHYN96PPZSA',
    },
});
