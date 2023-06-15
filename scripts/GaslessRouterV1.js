// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers, upgrades } = require('hardhat');

async function main() {
    const ContractFactory = await ethers.getContractFactory('GasRouterV1');
    
    const router = await upgrades.deployProxy(ContractFactory, [], { initializer: 'initialize' });

    await router.deployed();

    console.log(router.address, "Proxy address");
    console.log(await upgrades.erc1967.getImplementationAddress(router.address), "Imp address");
    console.log(await upgrades.erc1967.getAdminAddress(router.address), "Admin address");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
