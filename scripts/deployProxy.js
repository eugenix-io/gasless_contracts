const { ethers, upgrades } = require('hardhat');
const hre = require('hardhat');

async function main() {
    const GaslessV3 = await ethers.getContractFactory('GaslessV3');
    const proxy = await upgrades.deployProxy(GaslessV3, [
        hre.network.config.config.wrappedTokenAddress,
        hre.network.config.config.gasForSwap,
        hre.network.config.config.gasForApproval,
        hre.network.config.config.defaultGasPrice,
    ]);
    await proxy.deployed();

    const implementationAddress =
        await upgrades.erc1967.getImplementationAddress(proxy.address);

    console.log('Proxy contract address: ' + proxy.address);

    console.log('Implementation contract address: ' + implementationAddress);
}
main();