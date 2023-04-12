const { expect } = require('chai');
const { ethers } = require('hardhat');

const realTxn = [
    {
        amountIn: 1383229n,
        tokenIn: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        userAddress: '0xf1f73c677dbfff4147e57c2db22997998d282138',
        path: [
            '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
            '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        ],
        fees: ['500'],
        nonce: 0,
        sigR: '0x9699d776f2746468cecbf882543504acc6699a195c6de04b728cdb537734a2ef',
        sigS: '0x3d9c7d6c68975cce62a4663ec50178139c44ef65efeba3293d9ac43a42be2bfa',
        sigV: 27,
        toNativePath: [
            '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
            '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        ],
        toNativeFees: ['500'],
        isTokenOutNative: true,
    },
];

const sushiSwapTxn = [
    {
        tokenIn: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
        amountIn: '500000',
        tokenOut: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
        amountOutMin: '495470',
        to: '0xd7c9f3b280d4690c3232469f3bcb4361632bfc77',
        route: '0x03014b1f1e2435a9c96f7330faea190ef6a7c8d70001000000000000000000000000000000000000000000000000000000000007a1200a4b1f1e2435a9c96f7330faea190ef6a7c8d70001c2132d05d31c914a87c6611c10748aeb04b58e8f00d7c9f3b280d4690c3232469f3bcb4361632bfc77',
        sigR: '',
        sigS: '',
        sigV: '',
        nonce: 0
    }
]

let main;

describe('Generic Contract Functions', function () {
    before(async () => {
        main = await ethers.getContractAtFromArtifact(
            require('../artifacts/contracts/GaslessV3.sol/GaslessV3.json'),
            '0x2A613C61cF21746B17349Acad729A0d8620D942B'
        );
    });

    realTxn.forEach(setupRealTest);
});

function setupRealTest(test) {
    it('Do transaction', async () => {
        let tx = await main.swapWithoutFees(test, {
            gasPrice: ethers.utils.parseUnits('125.021414089', 'gwei'),
            gasLimit: 200000,
        });
        let txWait = await tx.wait();
        console.log(txWait);
    });
}
