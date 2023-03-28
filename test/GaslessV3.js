const { expect } = require('chai');
const { ethers } = require('hardhat');
const sigUtil = require('@metamask/eth-sig-util');
const { config } = require('hardhat');
const axios = require('axios');

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

const domainType = [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'verifyingContract', type: 'address' },
    { name: 'salt', type: 'bytes32' },
];

const swapWithoutFees = [
    { type: 'uint', name: 'amountIn' },
    { type: 'address', name: 'tokenIn' },
    { type: 'address', name: 'tokenOut' },
    { type: 'address', name: 'userAddress' },
    { type: 'address[]', name: 'path' },
    { type: 'uint24[]', name: 'fees' },
    { type: 'uint', name: 'nonce' },
    { type: 'bool', name: 'isTokenOutNative' },
];

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

async function getSignature(wallet, mainContract, message) {
    let domainData = {
        name: await mainContract.name(),
        version: '1',
        verifyingContract: mainContract.address,
        salt: ethers.utils.hexZeroPad(
            `0x${config.networks.hardhat.chainId.toString(16)}`,
            32
        ),
    };

    let nonce = await main.nonces(wallet.address);
    message.nonce = parseInt(nonce);

    const dataToSign = {
        types: {
            EIP712Domain: domainType,
            SwapWithoutFees: swapWithoutFees,
        },
        domain: domainData,
        primaryType: 'SwapWithoutFees',
        message: message,
    };

    let signature = sigUtil.signTypedData({
        privateKey: Buffer.from(wallet.privateKey.slice(2), 'hex'),
        data: dataToSign,
        version: 'V4',
    });

    return { ...getSignatureParameters(signature), nonce };
}

const WrappedNative = config.networks.hardhat.wrappedTokenAddress;
let main;
let owner;
describe('Generic Contract Functions', function () {
    before(async () => {
        const Main = await ethers.getContractFactory('GaslessV3');
        main = await Main.deploy(WrappedNative);
        console.log('MAIN ADDRESS FIRST DEPLOYMENT - ', main.address);
    });

    this.beforeAll(() => {
        const accounts = config.networks.hardhat.accounts;
        //get owner signer
        let wallet = ethers.Wallet.fromMnemonic(
            accounts.mnemonic,
            accounts.path + `/${0}`
        );
        owner = new ethers.Wallet(wallet.privateKey, ethers.provider);
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
        const accounts = config.networks.hardhat.accounts;
        let wallet = ethers.Wallet.fromMnemonic(
            accounts.mnemonic,
            accounts.path + `/${1}`
        );
        signer = new ethers.Wallet(wallet.privateKey, ethers.provider);
        await expect(main.connect(signer).setGasForSwap(1)).revertedWith(
            'Ownable: caller is not the owner'
        );
    });

    describe('Swap without fees for all tokens', function () {
        before(async () => {
            const Main = await ethers.getContractFactory('GaslessV3');
            main = await Main.deploy(WrappedNative);
            console.log('MAIN ADDRESS SECOND DEPLOYMENT - ', main.address);
        });

        TestCases.forEach((data) => {
            describeTestForToken(data);
        });
    });
});

function describeTestForToken(data) {
    describe(`Swap without fees - ${data.testName}`, function () {
        let tokenAddress = data.fromTokenAddress;
        let token;
        let toTokenAddress = data.toTokenAddress;

        this.beforeAll(async () => {
            token = await ethers.getContractAt('ERC20', tokenAddress, owner);
        });

        it('Get token from Uniswap', async () => {
            let swapRouter = await ethers.getContractAt(
                'ISwapRouter',
                await main.SWAP_ROUTER_ADDRESS()
            );

            let swapParams = {
                recipient: owner.address,
                deadline: (await ethers.provider.getBlock()).timestamp + 1000,
                amountIn: ethers.utils.parseEther('500'),
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
                        value: ethers.utils.parseEther('500'),
                    }
                );
            } else {
                await swapRouter.exactInputSingle(
                    {
                        tokenIn: WrappedNative,
                        tokenOut: tokenAddress,
                        fee: data.nativeFeeTier ? data.nativeFeeTier : 3000,
                        sqrtPriceLimitX96: 0,
                        ...swapParams,
                    },
                    {
                        value: ethers.utils.parseEther('500'),
                    }
                );
            }
            let tokenBalance = await token.balanceOf(owner.address);
            expect(tokenBalance).greaterThan(0);
        });

        it('Approve Contract for Token usage', async () => {
            let balance = await token.balanceOf(owner.address);
            await token.approve(main.address, balance);
            expect(await token.allowance(owner.address, main.address)).to.equal(
                balance
            );
        });

        it('Swap tokens without fees', async () => {
            let relayerSigner = getRelayerSigner();

            let mainRelayer = await main.connect(relayerSigner);

            let toToken = await ethers.getContractAt('ERC20', toTokenAddress);
            let initialTokenBalUser = await toToken.balanceOf(owner.address);
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
            };

            let { r, s, v, nonce } = await getSignature(owner, main, params);

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

function getRelayerSigner() {
    const accounts = config.networks.hardhat.accounts;
    let relayerWallet = ethers.Wallet.fromMnemonic(
        accounts.mnemonic,
        accounts.path + `/${1}`
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
