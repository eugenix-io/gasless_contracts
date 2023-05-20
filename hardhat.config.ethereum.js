const _ = require('lodash');
require('hardhat-gas-reporter');
require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

const NODE_URL =
    'https://eth-mainnet.g.alchemy.com/v2/N_pCh3--6wAkFNi7voWZ1Kv9XPp1GdLX';
const configParams = {
    wrappedTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    gasForSwap: 10_000_000,
    gasForApproval: 1_000_000,
    defaultGasPrice: 500_000_000,
};

module.exports = _.merge(require('./hardhat.config'), {
    networks: {
        hardhat: {
            forking: {
                url: NODE_URL,
            },
            chainId: 1,
            config: configParams, //writing this again because tests were already written },
        },
        ethereum_mainnet: {
            url: NODE_URL,
            accounts: [process.env.DEPLOY_PRIVATE_KEY],
            config: configParams,
        },
        ethereum_goerli: {
            url: 'https://eth-goerli.g.alchemy.com/v2/J2osTw41ZwlAma3Og1i-fIpWZHb42DGK',
            accounts: [process.env.DEPLOY_PRIVATE_KEY],
            config: {
                ...configParams,
                wrappedTokenAddress: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
            },
        },
    },
    gasReporter: {
        token: 'ETH',
        gasPriceApi:
            'https://api.etherscan.io/api?module=proxy&action=eth_gasPrice',
    },
    etherscan: {
        apiKey: 'V7NCNSQSDCY9R43V2QGUMYUQ81SUNJZNIR',
    },
});