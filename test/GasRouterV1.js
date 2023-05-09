const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');
const usdtAbi = require('./usdt.json');
const usdcAbi = require('./usdc.json');

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
    {type: 'bytes32', name: '_transactionId'},
    {type: 'string', name: '_integrator'},
    {type: 'string', name: '_referrer'},
    {type: 'address', name: '_receiver'},
    {type: 'uint256', name: '_minAmount'},
    {type: 'uint', name: 'nonce'},
];

const _transactionId = '0x8f2e0b7578694736181ac266cd9ed62e1e1173c59ba4ff8b87e79da88a901c72';
const _integrator = 'jumper.exchange';
const _referrer = '0x0000000000000000000000000000000000000000';
const _receiver = '0xd7c9f3b280d4690c3232469f3bcb4361632bfc77';
const _minAmount = '80';
const _swapData = [{
    "callTo":"0x1111111254eeb25477b68fb85ed929f73a960582",
    "approveTo":"0x1111111254eeb25477b68fb85ed929f73a960582",
    "sendingAssetId":"0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
    "receivingAssetId":"0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
    "fromAmount":"81",
    "callData":"0x12aa3caf000000000000000000000000b97cd69145e5a9357b2acd6af6c5076380f17afb000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f0000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa84174000000000000000000000000b78906c8a461d6a39a57285c129843e1937c32780000000000000000000000001231deb6f5749ef6ce6943a275a1d3e7486f4eae0000000000000000000000000000000000000000000000000000000000000051000000000000000000000000000000000000000000000000000000000000004f0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008500000000000000000000000000000000000000000000000000000000006700206ae4071138000f4240b78906c8a461d6a39a57285c129843e1937c32781111111254eeb25477b68fb85ed929f73a960582000000000000000000000000000000000000000000000000000000000000004fc2132d05d31c914a87c6611c10748aeb04b58e8f0000000000000000000000000000000000000000000000000000002e9b3012",
    "requiresDeposit":true
}]

const USDT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
const tokenName = '(PoS) Tether USD'

describe('Starting Gas Router tests', () => {
    let gasRouter, owner, relayer;
    beforeEach(async () => {

        owner = getSigner(0);
        relayer = getSigner(1);

        const GasRouter = await ethers.getContractFactory('GasRouterV1');
        gasRouter = await upgrades.deployProxy(GasRouter, [], { initializer: 'initialize' });

        await gasRouter.deployed();

        console.log(gasRouter.address, "Gas router address");
        console.log(await upgrades.erc1967.getImplementationAddress(gasRouter.address), 'Imp address');
        console.log(await upgrades.erc1967.getAdminAddress(gasRouter.address), 'Admin address');

    });

    describe('Testing approval', () => {
        
        const tokenContract = new ethers.Contract(USDT, usdtAbi, relayer);
        const nonce = await tokenContract.getNonce(walletAddress);

        // Get allowance for proxy contract

        const initialAllowance = await tokenContract.allowance(owner.address, gasRouter.address);

        const functionSignature = await generateFunctionSignature(usdtAbi, gasRouter.address);

        const { dataToSign } = formatMetaTransactionSignature(nonce, functionSignature, owner.address);

        let signature = sigUtil.signTypedData({
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

        const finalAllowance = await tokenContract.allowance(owner.address, gasRouter.address);

        it ('Testing for allowance', () => {
            expect(finalAllowance).greaterThan(initialAllowance);
        })

    });

    describe('Swapping on jumper', () => {
        const NONCE = await gasRouter.getNonces(owner.address);
        const messagePayload = {
            _transactionId,
            _integrator,
            _referrer,
            _receiver,
            _minAmount,
            nonce: NONCE
        }

        const salt = '0x0000000000000000000000000000000000000000000000000000000000000089';

        const dataToSignForSwap = {
            types: {
                EIP712Domain: domainType,
                SwapWithoutFeesJumper: SwapWithJumperGasless,
            },
            domain: {
                name: await gasRouter.getName(),
                version: '1',
                verifyingContract: gasRouter.address,
                salt,
            },
            primaryType: 'SwapWithoutFeesJumper',
            message: messagePayload,
        };

        let signatureForSwap = sigUtil.signTypedData({
            privateKey: Buffer.from(owner.privateKey.slice(2), 'hex'),
            data: dataToSignForSwap,
            version: 'V4',
        });

        const tokenOut = new ethers.Contract(_swapData[0].receivingAssetId, usdcAbi, relayer);

        const initBal = await tokenOut.balanceOf(owner.address);

        const { r, s, v } = getSignatureParameters(signatureForSwap);

        const tx = await gasRouter.swapWithJumperGasless({
            _transactionId,
            _integrator,
            _referrer,
            _receiver,
            _minAmount,
            _swapData,
            nonce: NONCE,
            userAddress: owner.address,
            sigR: r,
            sigS: s,
            sigV: v
        });

        const finalBal = await tokenOut.balanceOf(owner.address);

        it ('Output balances check', () => {
            expect(finalBal).greaterThan(initBal);
        })

    })

    it('Check', async () => {
        
        const val = await jumper.execJumperSwap(
            _transactionId,
            _integrator,
            _referrer,
            _receiver,
            _minAmount,
            _swapData
            );
        expect(val).to.equal(true);
    })
})

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
        ethers.utils.parseUnits('10000000000000000000')
    ]);
};

const formatMetaTransactionSignature = async (nonce, targetFunctionSignature, walletAddress, fromToken) => {
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
}

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