const { expect } = require('chai');
const { ethers } = require('hardhat');

const realTxn = [
    {
        userAddress: '0x1fb8b18101194adb78e0737b7e15087d2296dc1a',
        tokenAddress: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
        approvalValue: '1000000000000000000000000',
        approvalDeadline: 1712402180509,
        toNativePath: [
            '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
            '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
        ],
        toNativeFees: ['3000'],
        gasForApproval: 0,
        nonce: 0,
        approvalSigR:
            '0xfd46a0998f91aa6191d35103358ba200d6c9a25b1752d9076038b1b1f2b0a05c',
        approvalSigS:
            '0x56115d3088f7edb9b9c1572b61539093b8ec7123ba0d3ac6118bd94fc524dbdc',
        approvalSigV: 27,
        sigR: '0x82d2ec723251c9cdace44a1153d12da126fdf321b4f15d1d4bb6f6567fae7e8c',
        sigS: '0x16f3ca13f238ba50885984105ee4812845ec2fb5e518b92b535508a076e51f38',
        sigV: 27,
    },
];

let main;

const chainConfig = config.networks.hardhat.config;

describe('Generic Contract Functions', function () {
    before(async () => {
        const Main = await ethers.getContractFactory('GaslessV3');
        main = await Main.deploy(
            chainConfig.wrappedTokenAddress,
            ethers.BigNumber.from(chainConfig.gasForSwap),
            ethers.BigNumber.from(chainConfig.gasForApproval),
            ethers.BigNumber.from(chainConfig.defaultGasPrice)
        );
        console.log('this is the main deployed address - ', main.address);
    });

    realTxn.forEach(setupRealTest);
});

function setupRealTest(test) {
    it('Do transaction', async () => {
        let tx = await main.approveWithoutFees(test);
    });
}
