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

verifyContract('0xae294F66775eDd9C81f4540eAdA41Bc1E4eE22AD', ['0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270']).then(() => process.exit(0)).catch((err) => {
    console.log(err);
    process.exit(1);
})