const e = require('express');
const hre = require('hardhat');

const main = async () => {
    console.log(`Deploying Sushiswap...`);

    const SushiSwapFlint = await hre.ethers.getContractFactory(
        'SushiSwapGasless'
    );
    const deploy = await SushiSwapFlint.deploy();

    const deployed = await deploy.deployed();

    console.log(`Contract deployed at: ${deployed.address}`);
};

// main();

const verifyContract = async (address, args) => {
    try {
        // Verifying contract
        console.log('Verifying contract', address);
        await run('verify:verify', {
            address,
            constructorArguments: args,
        });
    } catch (error) {
        if (error.message.toLowerCase().includes('already verified')) {
            console.log(`COntract already verified....`);
        } else {
            console.log(error, 'Error in verifying...');
        }
    }
};

verifyContract('0xC24b0c8e1A87660a3a97c4D4AceAD276B9ab4BF9', []).then(() => process.exit(0)).catch((err) => {
    console.log(err);
    process.exit(1);
})