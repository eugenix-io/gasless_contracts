const { assert } = require('chai');
const { ethers, upgrades } = require('hardhat');
let proxy;
let GaslessV3;
describe('Proxy', function () {
    before(async () => {
        GaslessV3 = await ethers.getContractFactory('GaslessV3');
        proxy = await upgrades.deployProxy(GaslessV3, [
            hre.network.config.config.wrappedTokenAddress,
            hre.network.config.config.gasForSwap,
            hre.network.config.config.gasForApproval,
            hre.network.config.config.defaultGasPrice,
        ]);
    });

    it('works after upgrading', async function () {
        await upgrades.upgradeProxy(proxy.address, GaslessV3);
        assert.strictEqual(
            await proxy.gasForSwap(),
            hre.network.config.config.gasForSwap
        );
    });
});
