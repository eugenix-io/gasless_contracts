const { expect } = require('chai');
const { ethers } = require('hardhat');
const sigUtil = require('@metamask/eth-sig-util');
const { config } = require('hardhat');
const axios = require('axios');
const { domainType } = require('ethers-eip712');

const getTestCases = () => {
    switch (process.env.TEST_NETWORK) {
        case 'polygon':
            return require('./testCases/polygon');
        case 'arbitrum':
            return require('./testCases/arbitrum');
    }
    throw 'TEST_NETWORK must be defined to run test cases';
};

const TestCases = getTestCases();

//domain types
const gaslessDomainType = [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'verifyingContract', type: 'address' },
    { name: 'salt', type: 'bytes32' },
];

//message types
const swapWithoutFees = {
    types: [
        { type: 'uint', name: 'amountIn' },
        { type: 'address', name: 'tokenIn' },
        { type: 'address', name: 'tokenOut' },
        { type: 'address', name: 'userAddress' },
        { type: 'address[]', name: 'path' },
        { type: 'uint24[]', name: 'fees' },
        { type: 'uint', name: 'nonce' },
        { type: 'bool', name: 'isTokenOutNative' },
    ],
    name: 'SwapWithoutFees',
};

const approveWithoutFees = {
    types: [
        { type: 'address', name: 'userAddress' },
        { type: 'bytes32', name: 'approvalSigR' },
        { type: 'bytes32', name: 'approvalSigS' },
        { type: 'uint8', name: 'approvalSigV' },
        { type: 'address', name: 'tokenAddress' },
        { type: 'uint', name: 'approvalValue' },
        { type: 'uint', name: 'approvalDeadline' },
        { type: 'uint', name: 'fees' },
        { type: 'uint', name: 'nonce' },
    ],
    name: 'ApproveWithoutFees',
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

async function getDomainData(mainContract) {
    return {
        name: await mainContract.name(),
        version: '1',
        verifyingContract: mainContract.address,
        salt: ethers.utils.hexZeroPad(
            `0x${config.networks.hardhat.chainId.toString(16)}`,
            32
        ),
    };
}

async function getSignature({
    wallet,
    message,
    messageType,
    domainType,
    domainData,
}) {
    const dataToSign = {
        types: {
            EIP712Domain: domainType,
        },
        domain: domainData,
        primaryType: messageType.name,
        message: message,
    };

    dataToSign.types[messageType.name] = messageType.types;

    console.log('data to sign', JSON.stringify(dataToSign));

    let signature = sigUtil.signTypedData({
        privateKey: Buffer.from(wallet.privateKey.slice(2), 'hex'),
        data: dataToSign,
        version: 'V4',
    });

    return getSignatureParameters(signature);
}

const WrappedNative = config.networks.hardhat.wrappedTokenAddress;

let main;
let owner;
let relayer;
describe('Generic Contract Functions', function () {
    before(async () => {
        //get owner signer
        owner = getSigner(0);
        relayer = getSigner(1);
        const Main = await ethers.getContractFactory('GaslessV3');
        main = await Main.deploy(WrappedNative);
        console.log('MAIN ADDRESS FIRST DEPLOYMENT - ', main.address);
    });

    it('Transfer of native token', async () => {
        let amount = ethers.utils.parseEther('10');
        await owner.sendTransaction({
            to: main.address,
            value: amount,
        });
        expect(await main.getBalance()).to.equal(amount);
        let initialBalance = await ethers.provider.getBalance(owner.address);
        await main.transfer(owner.address, amount);
        let finalBalance = await ethers.provider.getBalance(owner.address);

        //TODO: optimize to get gas used in transactions and to a exact match instead of greaterThan
        expect(
            ethers.BigNumber.from(String(finalBalance - initialBalance))
        ).greaterThan(ethers.utils.parseEther('9.9'));
    });

    it('Change gasForSwap', async () => {
        await main.setGasForSwap(1);
        expect(await main.gasForSwap()).equal(1);
    });

    it('Change gasForSwap not the owner', async () => {
        await expect(main.connect(relayer).setGasForSwap(1)).revertedWith(
            'Ownable: caller is not the owner'
        );
    });

    describe('Iterative test cases', function () {
        before(async () => {
            const Main = await ethers.getContractFactory('GaslessV3');
            main = await Main.deploy(WrappedNative);
            console.log('MAIN ADDRESS SECOND DEPLOYMENT - ', main.address);
        });

        // if (TestCases.gaslessSwaps) {
        //     TestCases.gaslessSwaps.forEach((data) => {
        //         describeTestForGaslessSwaps(data);
        //     });
        // } else {
        //     console.warn('No gasless swap test found');
        // }

        // if (TestCases.gaslessApproval) {
        //     TestCases.gaslessApproval.forEach((data) => {
        //         describeTestsForGaslessApproval(data);
        //     });
        // } else {
        //     console.warn('No gasless approval test found');
        // }
    });

    describe('Initiating sushi swap test ->', () => {
        const tokenIn = '0xc2132d05d31c914a87c6611c10748aeb04b58e8f';
        const amountIn = '500000';
        const tokenOut = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';
        const amountOutMin = '395470';
        const isNative = false;
        const route =
            '0x03014b1f1e2435a9c96f7330faea190ef6a7c8d70001000000000000000000000000000000000000000000000000000000000007a1200a4b1f1e2435a9c96f7330faea190ef6a7c8d70001c2132d05d31c914a87c6611c10748aeb04b58e8f00d7c9f3b280d4690c3232469f3bcb4361632bfc77';

        let token;

        this.beforeAll('Get the token', async () => {
            token = await ethers.getContractAt('ERC20', tokenIn, owner);
        });

        it('Buying erc-20 token from sushiswap', async () => {
            const initBalanceOfERC20 = await token.balanceOf(owner.address);

            await getERC20TokenFromSushiSwap(owner, main, tokenIn);

            const finalBalanceOfERC20 = await token.balanceOf(owner.address);

            expect(parseInt(finalBalanceOfERC20)).greaterThan(parseInt(initBalanceOfERC20));

        })

        it('Getting approval of token for Sushiswap', async () => {
            const balanceOfOwner = await token.balanceOf(owner.address);
            console.log(balanceOfOwner, 'balanceOfOwner of ###');
            await token.approve(main.address, balanceOfOwner);
            const currAllow = await token.allowance(owner.address, main.address);
            console.log(currAllow, main.address, 'Allowance of user@@@@');
            expect(currAllow).to.equal(
                balanceOfOwner
            );
        });

        it('Swapping on sushiSwap', async () => {
            const nonce = await main.nonces(owner.address);
            // 0x0d6e43d4d7944408d9a5A10BC57B4348d61cD764
            // 0x0d6e43d4d7944408d9a5a10bc57b4348d61cd764
            console.log(nonce, 'Nonce of owner...');

            let messagePayload = {
                tokenIn,
                amountIn,
                tokenOut,
                amountOutMin,
                to: owner.address,
                nonce: parseInt(nonce),
                route,
                isNative
            };

            const domainData = await getDomainData(main);
            console.log(domainData, 'Domain data sushi swap');

            const { r, s, v } = await getSignature({
                wallet: owner,
                message: messagePayload,
                messageType: {
                    types: [
                        { type: 'address', name: 'tokenIn' },
                        { type: 'uint', name: 'amountIn' },
                        { type: 'address', name: 'tokenOut' },
                        { type: 'uint', name: 'amountOutMin' },
                        { type: 'address', name: 'to' },
                        { type: 'uint', name: 'nonce' },
                        { type: 'bytes', name: 'route'}
                    ],
                    name: 'SwapGaslessSushiSwapFlint',
                },
                domainType: gaslessDomainType,
                domainData: domainData,
            });

            console.log(r, s, v, 'Signature RSV');

            

            const toToken = await ethers.getContractAt(
                'ERC20',
                tokenOut,
                owner
            );
            const initialToTokenBal = await toToken.balanceOf(owner.address);

            console.log(initialToTokenBal, 'Token out balance for owner...');

            const payload = {
                ...messagePayload,
                sigR: r,
                sigS: s,
                sigV: v,
            };

            console.log(payload, 'Payload for tx...');

            console.log(main.address, '###### contract address###');

            const tx = await main.swapGaslessSushiSwapFlint(payload);

            let txWait = await tx.wait();

            console.log(txWait, 'Swap tx...');

            expect(await toToken.balanceOf(owner.address)).greaterThan(
                initialToTokenBal
            );
        });
    });
});

function describeTestForGaslessSwaps(data) {
    describe(`Swap without fees - ${data.testName}`, function () {
        let tokenAddress = data.fromTokenAddress;
        let token;
        let toTokenAddress = data.toTokenAddress;

        this.beforeAll(async () => {
            token = await ethers.getContractAt('ERC20', tokenAddress, owner);
        });

        it('Get token from Uniswap', async () => {
            await getTokenFromUniswap(data, token, tokenAddress);
        });

        it('Approve Contract for Token usage', async () => {
            let balance = await token.balanceOf(owner.address);
            await token.approve(main.address, balance);
            expect(await token.allowance(owner.address, main.address)).to.equal(
                balance
            );
        });

        it('Swap tokens without fees', async () => {
            let mainRelayer = await main.connect(relayer);

            let toToken = await ethers.getContractAt('ERC20', toTokenAddress);
            let initialTokenBalUser = await toToken.balanceOf(owner.address);
            console.log('this is initial token: ' + initialTokenBalUser);
            let initialnativeBalUser = await ethers.provider.getBalance(
                owner.address
            );
            let initialFeesBalContract = await token.balanceOf(main.address);
            let initialNonce = await main.nonces(owner.address);

            let amountIn =
                data.decimals == 6
                    ? ethers.BigNumber.from(10 ** 6)
                    : ethers.utils.parseEther('1');
            let totalBalance = await token.balanceOf(owner.address);
            if (data.amountIn) {
                amountIn = data.amountIn;
            } else if (amountIn.gt(totalBalance)) {
                amountIn = totalBalance;
            }

            let uniswapGas = await main.gasForSwap();
            let [tonativePath, tonativeFees] = await getRoute(
                ethers.utils.parseUnits('100', 'gwei') * uniswapGas,
                'exactOut',
                tokenAddress,
                WrappedNative
            );

            const isTokenOutnative = toTokenAddress === WrappedNative;
            let nonce = await main.nonces(owner.address);
            let params = {
                amountIn: amountIn.toString(), //sign fails for large numbers so we need to convert to string
                tokenIn: tokenAddress,
                tokenOut: toTokenAddress,
                userAddress: owner.address,
                path: data.path && data.path.length > 0 ? data.path : [],
                fees: data.fees && data.fees.length > 0 ? data.fees : [],
                isTokenOutNative: isTokenOutnative,
                toNativePath: tonativePath.reverse(),
                toNativeFees: tonativeFees.reverse(),
                nonce: parseInt(nonce),
            };

            let { r, s, v } = await getSignature({
                wallet: owner,
                mainContract: main,
                message: params,
                domainType: gaslessDomainType,
                messageType: swapWithoutFees,
                domainData: await getDomainData(main),
            });

            console.log('THESE ARE THE PARAMS - ', params);

            console.log('GOING TO DO THE SWAP NOW!!');
            let tx = await mainRelayer.swapWithoutFees({
                ...params,
                sigR: r,
                sigS: s,
                sigV: v,
                nonce: nonce,
            });
            let txWait = await tx.wait();
            console.log(
                `This is gas used for ${data.testName} - `,
                txWait.gasUsed
            );

            let finalTokenBalUser = await toToken.balanceOf(owner.address);
            let finalnativeBalUser = await ethers.provider.getBalance(
                owner.address
            );
            let finalFeesBalContract = await token.balanceOf(main.address);
            let finalNonce = await main.nonces(owner.address);
            if (isTokenOutnative) {
                expect(finalnativeBalUser).greaterThan(initialnativeBalUser);
                expect(finalTokenBalUser).equal(initialTokenBalUser);
            } else {
                //no native used from the user
                expect(finalnativeBalUser).equal(initialnativeBalUser);
                //user gets the desired token
                expect(finalTokenBalUser - initialTokenBalUser).greaterThan(0);
            }

            //contract collects fees in from token
            expect(finalFeesBalContract - initialFeesBalContract).greaterThan(
                0
            );

            //nonce should increment by 1
            expect(finalNonce - initialNonce).equal(1);
        });
    });
}

function describeTestsForGaslessApproval(data) {
    describe(`Approve without fees - ${data.testName}`, function () {
        let tokenAddress = data.tokenAddress;

        this.beforeAll(async () => {
            token = await ethers.getContractAt('ERC20', tokenAddress, owner);
        });

        it('Get token from Uniswap', async () => {
            await getTokenFromUniswap(data, token, tokenAddress);
        });

        it('Get approval', async () => {
            let deadline = Math.round(new Date().getTime() / 1000 + 10_000);
            let value = ethers.utils.parseEther('10000').toString();

            let tokenNonces = await ethers.getContractAt(
                'ERC20Nonces',
                tokenAddress
            );
            let tokenNonce = parseInt(await tokenNonces.nonces(owner.address));
            let {
                r: approvalSigR,
                s: approvalSigS,
                v: approvalSigV,
            } = await getSignature({
                wallet: owner,
                message: {
                    owner: owner.address,
                    spender: main.address,
                    value: value,
                    nonce: tokenNonce,
                    deadline,
                },
                messageType: TestCases.constants.permitType,
                domainType: TestCases.constants.domainType,
                domainData: {
                    name: await token.name(),
                    version: data.domainVersion || '1',
                    verifyingContract: tokenAddress,
                    chainId: config.networks.hardhat.chainId,
                },
            });
            let contractNonce = await main.approvalNonces(owner.address);
            let fee = data.fee;
            let params = {
                userAddress: owner.address,
                approvalSigR,
                approvalSigS,
                approvalSigV,
                tokenAddress,
                approvalValue: value,
                approvalDeadline: deadline,
                fees: fee,
                nonce: parseInt(contractNonce),
            };
            let {
                r: sigR,
                s: sigS,
                v: sigV,
            } = await getSignature({
                wallet: owner,
                message: params,
                messageType: approveWithoutFees,
                domainType: gaslessDomainType,
                domainData: await getDomainData(main),
            });

            let initialTokenBalance = await token.balanceOf(main.address);
            await main.approveWithoutFees({
                ...params,
                sigR,
                sigS,
                sigV,
            });
            let finalTokenBalance = await token.balanceOf(main.address);
            console.log('initial balance', initialTokenBalance);
            console.log('final balance', finalTokenBalance);
            expect(finalTokenBalance - initialTokenBalance).to.equal(fee);
        });
    });
}

async function getTokenFromUniswap(data, token, tokenAddress) {
    console.log('inside over here!!');
    let swapRouter = await ethers.getContractAt(
        'ISwapRouter',
        await main.SWAP_ROUTER_ADDRESS()
    );

    let amountIn = ethers.utils.parseEther('1');
    console.log('this is amount in -', amountIn);
    let swapParams = {
        recipient: owner.address,
        deadline: (await ethers.provider.getBlock()).timestamp + 1000,
        amountIn: amountIn,
        amountOutMinimum: 0,
    };

    if (data.acquireTokenPath && data.acquireTokenPath.length > 2) {
        let types = ['address'];
        let values = [data.acquireTokenPath[0]];
        for (let i = 0; i < data.acquireTokenPath.length - 1; i++) {
            types.push('uint24');
            types.push('address');
            values.push(data.acquireTokenFee[i]);
            values.push(data.acquireTokenPath[i + 1]);
        }
        await swapRouter.exactInput(
            {
                path: ethers.utils.solidityPack(types, values),
                ...swapParams,
            },
            {
                value: amountIn,
            }
        );
    } else {
        console.log('swapping exact input');
        await swapRouter.exactInputSingle(
            {
                tokenIn: WrappedNative,
                tokenOut: tokenAddress,
                fee: data.nativeFeeTier ? data.nativeFeeTier : 3000,
                sqrtPriceLimitX96: 0,
                ...swapParams,
            },
            {
                value: amountIn,
            }
        );
    }
    let tokenBalance = await token.balanceOf(owner.address);
    console.log(
        'this is the token balance after acquiring',
        tokenAddress,
        tokenBalance
    );
    expect(tokenBalance).greaterThan(0);
}

async function getERC20TokenFromSushiSwap(owner, mainContract, erc20TokenAddress) {

    const currNativeBal = await ethers.provider.getBalance(owner.address);

    console.log(currNativeBal, '$$$$$ balance');

    const sushiAbi = [
        "function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)"
    ];

    const amountOut = '1000000';
    const path = ['0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',erc20TokenAddress]

    const ISushiAbi = new ethers.utils.Interface(sushiAbi);
    const callDataPayload = ISushiAbi.encodeFunctionData("swapETHForExactTokens", [
        amountOut,
        path,
        owner.address,
        '1681453977'
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

function getSigner(index) {
    const accounts = config.networks.hardhat.accounts;
    let relayerWallet = ethers.Wallet.fromMnemonic(
        accounts.mnemonic,
        accounts.path + `/${index}`
    );
    return new ethers.Wallet(relayerWallet.privateKey, ethers.provider);
}

async function getRoute(amount, type, tokenIn, tokenOut) {
    const validTypes = ['exactIn', 'exactOut'];
    if (!validTypes.includes(type)) {
        throw `Type must be one of - ${validTypes}`;
    }
    const response = await axios.get(
        `https://api.uniswap.org/v1/quote?protocols=v2%2Cv3%2Cmixed&tokenInAddress=${tokenIn}&tokenInChainId=${config.networks.hardhat.chainId}&tokenOutAddress=${tokenOut}&tokenOutChainId=${config.networks.hardhat.chainId}&amount=${amount}&type=exactOut`,
        {
            headers: {
                origin: 'https://app.uniswap.org',
            },
        }
    );
    let tokenPath = [
        ...response.data.route[0].map((pair) => pair.tokenIn.address),
        tokenOut,
    ];
    let feePath = response.data.route[0].map((pair) => pair.fee);
    return [tokenPath, feePath];
}
