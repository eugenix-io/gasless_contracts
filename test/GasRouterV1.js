const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');
const usdtAbi = require('./usdt.json');
const usdcAbi = require('./usdc.json');
const { config } = require('hardhat');
const sigUtil = require('@metamask/eth-sig-util');

const domainType = [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'verifyingContract', type: 'address' },
    { name: 'salt', type: 'bytes32' },
];

const metaTransactionType = [
    { name: 'nonce', type: 'uint256' },
    { name: 'from', type: 'address' },
    { name: 'functionSignature', type: 'bytes' },
];

const SwapWithJumperGasless = [
    { type: 'uint', name: 'nonce' },
    { type: 'uint', name: 'minAmount'},
    { type: 'address', name: 'receiver'}
];

const transactionId =
    '0x8f2e0b7578694736181ac266cd9ed62e1e1173c59ba4ff8b87e79da88a901c72';
const integrator = 'jumper.exchange';
const referrer = '0x0000000000000000000000000000000000000000';
const minAmount = 80;
const swapData = [
    {
        callTo: '0x1111111254eeb25477b68fb85ed929f73a960582',
        approveTo: '0x1111111254eeb25477b68fb85ed929f73a960582',
        sendingAssetId: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
        receivingAssetId: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
        fromAmount: '81',
        callData:
            '0x12aa3caf000000000000000000000000b97cd69145e5a9357b2acd6af6c5076380f17afb000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f0000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa84174000000000000000000000000b78906c8a461d6a39a57285c129843e1937c32780000000000000000000000001231deb6f5749ef6ce6943a275a1d3e7486f4eae0000000000000000000000000000000000000000000000000000000000000051000000000000000000000000000000000000000000000000000000000000004f0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008500000000000000000000000000000000000000000000000000000000006700206ae4071138000f4240b78906c8a461d6a39a57285c129843e1937c32781111111254eeb25477b68fb85ed929f73a960582000000000000000000000000000000000000000000000000000000000000004fc2132d05d31c914a87c6611c10748aeb04b58e8f0000000000000000000000000000000000000000000000000000002e9b3012',
        requiresDeposit: true,
    },
];

const USDT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
const tokenName = '(PoS) Tether USD';

async function getERC20TokenFromSushiSwap(owner, erc20TokenAddress) {

    const currNativeBal = await ethers.provider.getBalance(owner.address);

    console.log(currNativeBal, '$$$$$ balance');

    const sushiAbi = [
        "function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)"
    ];

    const amountOut = '800000';
    const path = ['0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',erc20TokenAddress]

    // 10 mins deadline
    const tw = 10 * 60;
    const d = new Date();
    const seconds = d.getTime() / 1000;

    const deadline = tw + parseInt(seconds);



    const ISushiAbi = new ethers.utils.Interface(sushiAbi);
    const callDataPayload = ISushiAbi.encodeFunctionData("swapETHForExactTokens", [
        amountOut,
        path,
        owner.address,
        deadline
    ]);

    const txOption = {
        to: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        value: '1000000000000000000',
        data: callDataPayload
    };

    console.log(txOption, 'tx options');

    const tx = await owner.sendTransaction(txOption);

    console.log(tx, 'Buying erc txn');

    const tokenContract = await ethers.getContractAt('ERC20', erc20TokenAddress, owner);

    const bal = await tokenContract.balanceOf(owner.address);

    console.log(bal, 'balance now %%%%');

}

describe('Starting Gas Router tests', async () => {

    let gasRouter, owner, relayer, tokenContract;
    before(async () => {

        owner = getSigner(0);
        relayer = getSigner(1);

        tokenContract = new ethers.Contract(USDT, usdtAbi, relayer);

        const GasRouter = await ethers.getContractFactory('GasRouterV1');
        gasRouter = await upgrades.deployProxy(GasRouter, [], {
            initializer: 'initialize',
        });

        await gasRouter.deployed();

        console.log(gasRouter.address, 'Gas router address');
        console.log(
            await upgrades.erc1967.getImplementationAddress(gasRouter.address),
            'Imp address'
        );
        console.log(
            await upgrades.erc1967.getAdminAddress(gasRouter.address),
            'Admin address'
        );
    });

    // Buy ERC-20 tokens for owner
    it('Buying erc-20 token from sushiswap', async () => {
        const initBalanceOfERC20 = await tokenContract.balanceOf(owner.address);

        await getERC20TokenFromSushiSwap(owner, USDT);

        const finalBalanceOfERC20 = await tokenContract.balanceOf(owner.address);

        expect(parseInt(finalBalanceOfERC20)).greaterThan(parseInt(initBalanceOfERC20));

    })

    it('Testing approval', async () => {
        const nonce = await tokenContract.getNonce(owner.address);

        // Get allowance for proxy contract

        const initialAllowance = await tokenContract.allowance(
            owner.address,
            gasRouter.address
        );

        console.log(initialAllowance, 'initialAllowance for owner & spender');

        const functionSignature = await generateFunctionSignature(
            usdtAbi,
            gasRouter.address
        );

        console.log(functionSignature, 'functionSignature for this $$$');

        const dataToSign = formatMetaTransactionSignature(
            nonce,
            functionSignature,
            owner.address,
            USDT
        );

        let signature = await sigUtil.signTypedData({
            privateKey: Buffer.from(owner.privateKey.slice(2), 'hex'),
            data: dataToSign,
            version: 'V4',
        });

        const { r, s, v } = getSignatureParameters(signature);

        const approvalGaslessTx = await tokenContract.executeMetaTransaction(
            owner.address,
            functionSignature,
            r,
            s,
            v
        );

        console.log(approvalGaslessTx, 'Tx details for approve gasless');

        const finalAllowance = await tokenContract.allowance(
            owner.address,
            gasRouter.address
        );

        console.log(finalAllowance, 'finalAllowance of owner & spender');

        expect(finalAllowance).greaterThan(initialAllowance);
    });

    describe('Swapping on jumper', async () => {
        
        it('Testing swap', async () => {
            console.log(gasRouter.address, 'Router address...');
            console.log(relayer.address, 'Realayer address..');
            console.log(owner.address, 'Owner address..');
            let receiver = owner.address;
            const NONCE = await gasRouter.nonces(owner.address);
            const messagePayload = {
                nonce: parseInt(NONCE),
                minAmount,
                receiver
            };

            const salt =
                '0x0000000000000000000000000000000000000000000000000000000000000089';

            const dataToSignForSwap = {
                types: {
                    EIP712Domain: domainType,
                    SwapWithoutFeesJumper: SwapWithJumperGasless,
                },
                domain: {
                    name: await gasRouter.name(),
                    version: '1',
                    verifyingContract: gasRouter.address,
                    salt,
                },
                primaryType: 'SwapWithoutFeesJumper',
                message: messagePayload,
            };

            console.log(JSON.stringify(dataToSignForSwap), 'Swap data sign');

            let signatureForSwap = await sigUtil.signTypedData({
                privateKey: Buffer.from(owner.privateKey.slice(2), 'hex'),
                data: dataToSignForSwap,
                version: 'V4',
            });

            const tokenOut = new ethers.Contract(
                swapData[0].receivingAssetId,
                usdcAbi,
                relayer
            );

            const initBal = await tokenOut.balanceOf(owner.address);

            const { r, s, v } = getSignatureParameters(signatureForSwap);

            console.log(r,s,v, "RSV params");
            console.log(owner.address, 'Owner address...clear');

            const tx = await gasRouter.swapWithJumperGasless({
                transactionId,
                integrator,
                referrer,
                receiver,
                minAmount,
                swapData,
                nonce: NONCE,
                userAddress: owner.address,
                sigR: r,
                sigS: s,
                sigV: v,
            });

            console.log(tx, 'Tx jumper data');

            const finalBal = await tokenOut.balanceOf(owner.address);
            expect(finalBal).greaterThan(initBal);
        });
    });
});

function getSigner(index) {
    const accounts = config.networks.hardhat.accounts;
    let relayerWallet = ethers.Wallet.fromMnemonic(
        accounts.mnemonic,
        accounts.path + `/${index}`
    );
    return new ethers.Wallet(relayerWallet.privateKey, ethers.provider);
}

const generateFunctionSignature = async (targetAbi, spender) => {
    const iface = new ethers.utils.Interface(targetAbi);
    // Approve amount for spender 1 matic
    return iface.encodeFunctionData('approve', [
        spender,
        ethers.utils.parseUnits('10000000000000000000'),
    ]);
};

const formatMetaTransactionSignature = (
    nonce,
    targetFunctionSignature,
    walletAddress,
    fromToken
) => {
    const messagePayload = {
        nonce: parseInt(nonce),
        from: walletAddress,
        functionSignature: targetFunctionSignature,
    };

    const dataToSign = {
        types: {
            EIP712Domain: domainType,
            MetaTransaction: metaTransactionType,
        },
        domain: {
            name: tokenName,
            version: '1',
            verifyingContract: fromToken,
            salt: '0x0000000000000000000000000000000000000000000000000000000000000089',
        },
        primaryType: 'MetaTransaction',
        message: messagePayload,
    };

    return dataToSign;
};

const getSignatureParameters = (signature) => {
    if (!ethers.utils.isHexString(signature)) {
        throw new Error(
            'Given value "'.concat(signature, '" is not a valid hex string.')
        );
    }
    var r = signature.slice(0, 66);
    var s = '0x'.concat(signature.slice(66, 130));
    var v = '0x'.concat(signature.slice(130, 132));
    v = parseInt(Number(v));
    if (![27, 28].includes(v)) v += 27;
    return {
        r: r,
        s: s,
        v: v,
    };
};
