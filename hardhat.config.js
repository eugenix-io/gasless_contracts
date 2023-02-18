require("hardhat-gas-reporter");
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [{
      version: "0.8.17"
    }, {
      version: "0.6.6"
    }],
    settings: {
      optimizer: {
        enabled: true
      }
    }
  },
  networks: {
    hardhat: {
      forking: {
        enabled: true,
        url: 'https://polygon-mainnet.g.alchemy.com/v2/OUyLer3Ubv9iwexAqckuwyPtJ_KczKRD'
      },
      chainId: 137
    },
    polygon_mainnet: {
      url: 'https://polygon-mainnet.g.alchemy.com/v2/OUyLer3Ubv9iwexAqckuwyPtJ_KczKRD',
      accounts: ['0x45dcce842cede0741a2cfd3de6f7aeaccce52cc8f1266d59ebc1fe0787ec8e84'],
    },
  },
  gasReporter: {
    enabled: true,
    currency: 'USD',
    coinmarketcap: '02c93737-16ad-4e7c-9202-177232ff3e57',
    token: 'MATIC',
    gasPriceApi: 'https://api.polygonscan.com/api?module=proxy&action=eth_gasPrice',
    remoteContracts: [{
      abi: require('@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json').abi,
      name: require('@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json').contractName,
      address: "0xE592427A0AEce92De3Edee1F18E0157C05861564"
    }]
  },
  etherscan: {
    apiKey: 'DDZ33H8RZYENMTDX5KCM67FW1HBJD5CRUC'
  },
  mocha: {
    timeout: 400000
  }
};
