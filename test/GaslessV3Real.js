const { expect } = require('chai');
const { ethers } = require('hardhat');

const realTxn = [
    {
        userAddress: '0x1fb8b18101194adb78e0737b7e15087d2296dc1a',
        tokenAddress: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
        approvalValue: '1000000000000000000000000',
        approvalDeadline: 1712391950892,
        toNativePath: [
            '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
            '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
        ],
        toNativeFees: ['500'],
        gasForApproval: 0,
        nonce: 0,
        approvalSigR:
            '0x7f0db7873f3412037c82552a1dd86c64c446da66a4e7549ccf632671359bc614',
        approvalSigS:
            '0x13bb498b2c9802343fdce1a2429501acf4526ea1fac0fbd51f3eb0115b28364d',
        approvalSigV: 27,
        sigR: '0x4fd87e10e699904e27678df397770d7ca3c822bc10ffe93b7e2ca77fa89505ce',
        sigS: '0x774679f378de249a407f33ff7129cf210b0084de003af1390ae5d1d949b03785',
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
