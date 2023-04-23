const { ethers, upgrades } = require('hardhat');

// TO DO: Place the address of your proxy here!
const proxyAddress = '';

async function main() {
    const GaslessV3 = await ethers.getContractFactory('GaslessV3');
    const upgraded = await upgrades.upgradeProxy(proxyAddress, GaslessV3);

    const implementationAddress =
        await upgrades.erc1967.getImplementationAddress(proxyAddress);

    console.log('The current contract owner is: ' + upgraded.owner());
    console.log('Implementation contract address: ' + implementationAddress);
}

main();
