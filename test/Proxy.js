const { assert } = require('chai');
const { ethers, upgrades } = require('hardhat');

let proxy;
let implementation;
let GaslessV3Factory;
let implementationAddress;

describe('Proxy', function () {
    before(async () => {
        GaslessV3Factory = await ethers.getContractFactory('GaslessV3');
        proxy = await upgrades.deployProxy(GaslessV3Factory, [
            hre.network.config.config.wrappedTokenAddress,
            hre.network.config.config.gasForSwap,
            hre.network.config.config.gasForApproval,
            hre.network.config.config.defaultGasPrice,
        ]);
        await proxy.deployed();
        implementationAddress =
            await upgrades.erc1967.getImplementationAddress(proxy.address);
        implementation = GaslessV3Factory.attach(implementationAddress);
    });

    it('Works with Implemation_1', async function () {
        assert.strictEqual(await implementation.gasForSwap(), 0);
        assert.strictEqual(
            await proxy.gasForSwap(),
            hre.network.config.config.gasForSwap
        );
    });
});
