// scripts/deploy.js
const { ethers } = require('hardhat');
const fs = require('fs');
const hre = require('hardhat');


async function main() {
    const GaslessV4 = await ethers.getContractFactory('GaslessV4');
    const gaslessV4 = await GaslessV4.deploy(
        hre.network.config.config.wrappedTokenAddress,
        hre.network.config.config.gasForSwap,
        hre.network.config.config.gasForApproval,
        hre.network.config.config.defaultGasPrice,
    );

    await gaslessV4.deployed();

    console.log('GaslessV4 contract deployed to:', gaslessV4.address);

    // Save the contract address to a JSON file
    saveContractAddressToFile(gaslessV4.address);
}

function saveContractAddressToFile(address) {
    const outputFile = './deployed_contract.json';
    const data = { address };
    fs.writeFileSync(outputFile, JSON.stringify(data));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
