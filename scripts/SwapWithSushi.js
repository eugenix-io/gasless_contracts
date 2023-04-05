const { ethers } = require('ethers');
require('dotenv').config();

const abi = [
    "function swapExactETHForTokensFlint(address tokenIn, address userAddress, uint amountIn)"
]

const IAbi  = new ethers.Interface(abi);
const callData = IAbi.encodeFunctionData("swapExactETHForTokensFlint", [
    '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    '0xd7C9F3b280D4690C3232469F3BCb4361632bfC77',
    500000
]);

const SushiFlintSwapAdd = '0xC24b0c8e1A87660a3a97c4D4AceAD276B9ab4BF9';

const provider = new ethers.JsonRpcProvider('https://polygon-mainnet.g.alchemy.com/v2/eI-tHTF7FqIhl_kQS4oMnqeA6nyZMSmc');

const main = async () => {

    const signer = new ethers.Wallet(process.env.NEW_PRIVATE_KEY, provider);

    const txOption = {
        to: SushiFlintSwapAdd,
        value: 0,
        data: callData
    };

    const tx = await signer.sendTransaction(txOption);

    console.log(tx, 'Transaction...');

};

// main()

// contract address: 0xC24b0c8e1A87660a3a97c4D4AceAD276B9ab4BF9

const abiUsdt = [
    "function approve(address spender, uint256 amount) external returns (bool)"
];

const IAbiUsdt = new ethers.Interface(abiUsdt);
const callDataUsdt = IAbiUsdt.encodeFunctionData("approve", ['0xC24b0c8e1A87660a3a97c4D4AceAD276B9ab4BF9', 10000000000]);

const approveUSDT = async () => {

    const signer = new ethers.Wallet(process.env.NEW_PRIVATE_KEY, provider);

    const txOption = {
        to: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        value: 0,
        data: callDataUsdt
    };

    const tx = await signer.sendTransaction(txOption);

    console.log(tx, 'Approve Transaction...');

}

approveUSDT();