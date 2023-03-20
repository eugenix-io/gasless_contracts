const { expect } = require('chai');
const { ethers } = require('hardhat');

const realTxn = [
    {
        amountIn: 5000000,
        tokenIn: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        tokenOut: '0xB7b31a6BC18e48888545CE79e83E06003bE70930',
        userAddress: '0x80E2dB20022F9a4c372897F97C09dbCb74C12820',
        path: [],
        fees: [],
        nonce: 0,
        isTokenOutMatic: false,
        sigR: '0x374dc3a4b15a9f4a819f19c90b055252b171af270527bd38602bf1d747f66f07',
        sigS: '0x1f4392c011348c096c586d85c9b6566358d9ea3ecd56cc57f31b21e09058a153',
        sigV: 27,
    },
];

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
        let tx = await main.swapWithoutFees(
            test.amountIn,
            test.tokenIn,
            test.tokenOut,
            test.userAddress,
            test.path,
            test.fees,
            test.nonce,
            test.isTokenOutMatic,
            test.sigR,
            test.sigS,
            test.sigV,
            {
                gasPrice: ethers.utils.parseUnits('125.021414089', 'gwei'),
                gasLimit: 200000,
            }
        );
        let txWait = await tx.wait();
        console.log(txWait);
    });
}
