const _ = require('lodash');
require('hardhat-gas-reporter');
require('@nomicfoundation/hardhat-toolbox');
require('@openzeppelin/hardhat-upgrades');
require('dotenv').config();

const NODE_URL =
    'https://arb-mainnet.g.alchemy.com/v2/IIe6yauUmszMlIDXFKtREUbfC-eotOVb';
const configParams = {
    wrappedTokenAddress: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    gasForSwap: 1_400_000,
    gasForApproval: 1_000_000,
    defaultGasPrice: 100_000_000,
};

module.exports = _.merge(require('./hardhat.config'), {
    networks: {
        hardhat: {
            forking: {
                url: NODE_URL,
            },
            chainId: 42161,
            config: { ...configParams, gasForSwap: 130_000 }, //writing this again because tests were already written },
        },
        arbitrum_mainnet: {
            url: NODE_URL,
            accounts: [process.env.DEPLOY_PRIVATE_KEY],
            config: configParams,
        },
        arbitrum_goerli: {
            url: 'https://arb-goerli.g.alchemy.com/v2/Fc-1XH8Pq-B5tDAdwrhgOWB5P1hyfSv2',
            accounts: [process.env.DEPLOY_PRIVATE_KEY_GOERLI],
            config: configParams,
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
