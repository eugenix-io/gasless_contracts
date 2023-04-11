const hre = require('hardhat');

module.exports = [
    hre.network.config.config.wrappedTokenAddress,
    hre.network.config.config.gasForSwap,
    hre.network.config.config.gasForApproval,
    hre.network.config.config.defaultGasPrice,
];
