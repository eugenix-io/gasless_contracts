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
        { type: 'address[]', name: 'toNativePath' },
        { type: 'uint24[]', name: 'toNativeFees' },
        { type: 'uint', name: 'gasForApproval' },
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

    let signature = sigUtil.signTypedData({
        privateKey: Buffer.from(wallet.privateKey.slice(2), 'hex'),
        data: dataToSign,
        version: 'V4',
    });

    return getSignatureParameters(signature);
}

const chainConfig = config.networks.hardhat.config;
console.log('this is chain config', chainConfig);
const WrappedNative = chainConfig.wrappedTokenAddress;

let main;
let owner;
let relayer;
describe('Generic Contract Functions', function () {
    before(async () => {
        //get owner signer
        owner = getSigner(0);
        relayer = getSigner(1);
        main = await deployContract();
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
            main = await deployContract();
            console.log('MAIN ADDRESS SECOND DEPLOYMENT - ', main.address);
        });

        if (TestCases.gaslessSwaps) {
            TestCases.gaslessSwaps.forEach((data) => {
                describeTestForGaslessSwaps(data);
            });
        } else {
            console.warn('No gasless swap test found');
        }

        if (TestCases.gaslessApproval) {
            TestCases.gaslessApproval.forEach((data) => {
                describeTestsForGaslessApproval(data);
            });
        } else {
            console.warn('No gasless approval test found');
        }
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
            let gasPrice = await ethers.provider.getGasPrice();

            let [toNativePath, toNativeFees] = await getRoute(
                gasPrice * chainConfig.gasForApproval,
                'exactOut',
                tokenAddress,
                WrappedNative
            );
            let gasForApproval = await main.gasForApproval();
            let params = {
                userAddress: owner.address,
                approvalSigR,
                approvalSigS,
                approvalSigV,
                tokenAddress,
                approvalValue: value,
                approvalDeadline: deadline,
                toNativePath: toNativePath.reverse(),
                toNativeFees: toNativeFees.reverse(),
                gasForApproval: gasForApproval.toString(),
                nonce: parseInt(contractNonce),
            };

            console.log('these are the params', params);
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
            expect(finalTokenBalance - initialTokenBalance).greaterThan(0);
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

function getSigner(index) {
    const accounts = config.networks.hardhat.accounts;
    let relayerWallet = ethers.Wallet.fromMnemonic(
        accounts.mnemonic,
        accounts.path + `/${index}`
    );
    return new ethers.Wallet(relayerWallet.privateKey, ethers.provider);
}

async function deployContract() {
    console.log('deploying main contract...');
    const Main = await ethers.getContractFactory('GaslessV3');
    return await Main.deploy(
        WrappedNative,
        ethers.BigNumber.from(chainConfig.gasForSwap),
        ethers.BigNumber.from(chainConfig.gasForApproval),
        ethers.BigNumber.from(chainConfig.defaultGasPrice)
    );
}

async function getRoute(amount, type, tokenIn, tokenOut) {
    console.log('getting the route', amount, type, tokenIn, tokenOut);
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
