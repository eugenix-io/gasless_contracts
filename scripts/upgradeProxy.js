const { ethers, upgrades } = require('hardhat');

// TO DO: Place the address of your proxy here!
const proxyAddress = '0x4E48653DB34c2c2e5fd42e07239F1F7479Eb10F4';

async function main() {
    const GaslessV4 = await ethers.getContractFactory('GaslessV4');
    const upgraded = await upgrades.upgradeProxy(proxyAddress, GaslessV4);

    const implementationAddress =
        await upgrades.erc1967.getImplementationAddress(proxyAddress);

    console.log('The current contract owner is: ' + await upgraded.owner());
    console.log('Implementation contract address: ' + implementationAddress);
}

main();