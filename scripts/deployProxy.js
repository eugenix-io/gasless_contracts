const { ethers, upgrades } = require('hardhat');
const hre = require('hardhat');



async function main() {
    console.log('Deploying...');
    
    const GaslessV3 = await ethers.getContractFactory('GaslessV3');

    console.log(GaslessV3, "Contract factory...");
    const proxy = await upgrades.deployProxy(GaslessV3, [
        hre.network.config.config.wrappedTokenAddress,
        hre.network.config.config.gasForSwap,
        hre.network.config.config.gasForApproval,
        hre.network.config.config.defaultGasPrice,
    ]);
    await proxy.deployed();

    console.log('Successfully deployed GaslessV3');

    const implementationAddress =
        await upgrades.erc1967.getImplementationAddress(proxy.address);

    const adminAddress = await upgrades.erc1967.getAdminAddress(proxy.address);

    console.log('Proxy contract address: ' + proxy.address);

    console.log('Implementation contract address: ' + implementationAddress);

    console.log('Admin contract address: ' + adminAddress);
}
main();
