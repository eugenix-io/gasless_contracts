require('hardhat-gas-reporter');
require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        compilers: [
            {
                version: '0.8.17',
            },
            {
                version: '0.6.6',
            },
        ],
        settings: {
            optimizer: {
                enabled: true,
            },
        },
    },
    networks: {
        // hardhat: {
        //     forking: {
        //         enabled: true,
        //     },
        // },
        localhost: {
            url: 'http://localhost:8545/'
        },
        'polygon-mainnet': {
            url: 'https://polygon-mainnet.g.alchemy.com/v2/eI-tHTF7FqIhl_kQS4oMnqeA6nyZMSmc',
            accounts: [process.env.NEW_PRIVATE_KEY]
        }
    },
    etherscan: {
        apiKey: '4TZ25RQ9DT734YTVPXGQJQSY4PQEK117TF'
    },
    gasReporter: {
        enabled: true,
        currency: 'USD',
        coinmarketcap: '02c93737-16ad-4e7c-9202-177232ff3e57',
        remoteContracts: [
            {
                abi: require('@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json')
                    .abi,
                name: require('@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json')
                    .contractName,
                address: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
            },
        ],
    },
    mocha: {
        timeout: 400000,
    },
};
