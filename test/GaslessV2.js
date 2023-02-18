const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const ISwapRouterArtifact = require("@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json");
const sigUtil = require("@metamask/eth-sig-util");
const { config } = require('hardhat');
const ERC20Artifact = require('@openzeppelin/contracts/build/contracts/ERC20.json');
const axios = require('axios');
const domainDataJSON = require('./util/domainData.json');

const domainType = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "verifyingContract", type: "address" },
    { name: "salt", type: "bytes32" }
];

const metaTransactionType = [
    { name: "nonce", type: "uint256" },
    { name: "from", type: "address" },
    { name: "functionSignature", type: "bytes" }
];



const getSignatureParameters = (signature) => {
    if (!ethers.utils.isHexString(signature)) {
        throw new Error(
            'Given value "'.concat(signature, '" is not a valid hex string.')
        );
    }
    var r = signature.slice(0, 66);
    var s = "0x".concat(signature.slice(66, 130));
    var v = "0x".concat(signature.slice(130, 132));
    ethers.utils.hex
    v = parseInt(Number(v));
    if (![27, 28].includes(v)) v += 27;
    return {
        r: r,
        s: s,
        v: v,
    };
};

const getApprovalFunctionSignature = (spender, amount) => {
    let iface = new ethers.utils.Interface(ERC20Artifact.abi);
    return iface.encodeFunctionData("approve", [spender, amount]);
}

async function getSignature(wallet, mainContract, data) {

    // let res = await axios.get(`https://api.polygonscan.com/api?module=contract&action=getabi&address=${"0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"}&apikey=DDZ33H8RZYENMTDX5KCM67FW1HBJD5CRUC`)
    // let abi = JSON.parse(res.data.result);

    let domainData = domainDataJSON[data.fromTokenAddress];
    let functionSignature = getApprovalFunctionSignature(mainContract.address, ethers.utils.parseEther('100'));
    let tokenContract = await ethers.getContractAt("NativeMetaTransaction", domainData.verifyingContract);

    let nonce;
    if (data.nonceFunction == "nonces") {
        nonce = await tokenContract.nonces(wallet.address);
    } else {
        nonce = await tokenContract.getNonce(wallet.address);
    }
    let message = {
        nonce: parseInt(nonce),
        from: wallet.address,
        functionSignature: functionSignature
    };
    const dataToSign = {
        types: {
            EIP712Domain: domainType,
            MetaTransaction: metaTransactionType,
        },
        domain: domainData,
        primaryType: "MetaTransaction",
        message: message,
    };
    let signature = sigUtil.signTypedData({
        privateKey: Buffer.from(wallet.privateKey.slice(2), "hex"),
        data: dataToSign,
        version: "V4"
    })

    return { ...getSignatureParameters(signature), functionSignature };
}

const EMTTokens = [
    {
        testName: "USDT -> DAI Single",
        fromTokenAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        toTokenAddress: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
        decimals: 6
    },
    {
        testName: "DAI -> USDT Single",
        fromTokenAddress: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
        toTokenAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        decimals: 18
    },
    {
        testName: "USDC -> DAI Single",
        fromTokenAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        toTokenAddress: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
        nonceFunction: "nonces",
        decimals: 6
    },
    {
        testName: "USDT -> SUSHI Multihop",
        fromTokenAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        toTokenAddress: "0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a",
        decimals: 6,
        path: ["0xc2132D05D31c914a87C6611C10748AEb04B58e8F", "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", "0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a"],
        fees: [500, 3000]
    },
    {
        testName: "USDT -> ANKR Multihop",
        fromTokenAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        toTokenAddress: "0x101A023270368c0D50BFfb62780F4aFd4ea79C35",
        decimals: 6,
        path: ["0xc2132D05D31c914a87C6611C10748AEb04B58e8F", "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", "0x101A023270368c0D50BFfb62780F4aFd4ea79C35"],
        fees: [10000, 3000]
    },
    {
        testName: "USDT -> BAL Multihop",
        fromTokenAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        toTokenAddress: "0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3",
        decimals: 6,
        path: ["0xc2132D05D31c914a87C6611C10748AEb04B58e8F", "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", "0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3"],
        fees: [100, 10000]
    },
    {
        testName: "WETH -> QUICK Multihop",
        fromTokenAddress: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
        toTokenAddress: "0x831753DD7087CaC61aB5644b308642cc1c33Dc13",
        decimals: 18,
        path: ["0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", "0x831753DD7087CaC61aB5644b308642cc1c33Dc13"],
        fees: [500, 3000]
    }
];
const exactParamsTest = [{
    testName: 'STF ERROR APOORV',
    params: {
        amountIn: 500000,
        tokenIn: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        tokenOut: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        userAddress: "0x1Fb8B18101194AdB78E0737b7E15087d2296dC1a",
        approvalFunctionSignature: "0x095ea7b300000000000000000000000065a6b9613550de688b75e12b50f28b33c07580bc00000000000000000000000000000000000000000000021e19e0c9bab2400000",
        sigR: "0x129497fd7886feef85a145d6ee58f2b1b25559bf3f03d71f42af133578134c5b",
        sigS: "0x2c19f0f50e9c6b266e232c2f06425433cd6ad9a4f1247f37ec02a3a93977f96b",
        sigV: 28,
        path: [],
        fees: []
    }
}]
const WMATIC = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
let main;
let owner;
describe("Generic Contract Functions", function () {

    this.beforeEach(async () => {
        const Main = await ethers.getContractFactory("GaslessV2");
        main = await Main.deploy();
        main.connect
    })

    this.beforeAll(() => {
        const accounts = config.networks.hardhat.accounts;
        //get owner signer
        let wallet = ethers.Wallet.fromMnemonic(accounts.mnemonic, accounts.path + `/${0}`);
        owner = new ethers.Wallet(wallet.privateKey, ethers.provider);
    })

    it("Transfer of native token", async () => {
        let amount = ethers.utils.parseEther('10');
        await owner.sendTransaction({
            to: main.address,
            value: amount
        });
        expect(await main.getBalance()).to.equal(amount);
        let initialBalance = await ethers.provider.getBalance(owner.address);
        await main.transfer(owner.address, amount);
        let finalBalance = await ethers.provider.getBalance(owner.address);

        //TODO: optimize to get gas used in transactions and to a exact match instead of greaterThan
        expect(ethers.BigNumber.from(String(finalBalance - initialBalance))).greaterThan(ethers.utils.parseEther('9.9'));
    })

    it("Change gasForSwap", async () => {
        await main.setGasForSwap(1);
        expect(await main.gasForSwap()).equal(1);
    })

    it("Change gasForSwap not the owner", async () => {
        const accounts = config.networks.hardhat.accounts;
        let wallet = ethers.Wallet.fromMnemonic(accounts.mnemonic, accounts.path + `/${1}`);
        signer = new ethers.Wallet(wallet.privateKey, ethers.provider);
        await expect(main.connect(signer).setGasForSwap(1)).revertedWith("Ownable: caller is not the owner");
    })

    it("Approve Uniswap for WMATIC usage", async () => {
        let token = await ethers.getContractAt('ERC20', WMATIC);
        await token.approve(main.address, ethers.utils.parseEther('1000'));
        expect(await token.allowance(owner.address, main.address)).to.equal(ethers.utils.parseEther('1000'));
    })

});

describe("Swap without fees for all tokens", function () {
    this.beforeAll(async () => {
        const Main = await ethers.getContractFactory("GaslessV2");
        main = await Main.deploy();
    })

    EMTTokens.forEach((data) => {
        describeTestForToken(data);
    });

    exactParamsTest.forEach((data) => {
        describeExactParamsTest(data);
    });
})


function describeTestForToken(data) {
    describe(`Swap without fees - ${data.testName}`, function () {
        let tokenAddress = data.fromTokenAddress;
        let token;
        let toTokenAddress = data.toTokenAddress;

        this.beforeAll(async () => {
            token = await ethers.getContractAt("IERC20", tokenAddress, owner);
        })

        it("Get token from Uniswap", async () => {
            let swapRouter = await ethers.getContractAt('ISwapRouter', await main.SWAP_ROUTER_ADDRESS());
            await swapRouter.exactInputSingle({
                tokenIn: WMATIC,
                tokenOut: tokenAddress,
                fee: 3000,
                recipient: owner.address,
                deadline: (await ethers.provider.getBlock()).timestamp + 1000,
                amountIn: ethers.utils.parseEther('2000'),
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            }, {
                value: ethers.utils.parseEther('2000')
            });
            let tokenBalance = await token.balanceOf(owner.address);
            console.log("TOKEN BALANCE - ", tokenBalance);
            expect(tokenBalance).greaterThan(0);
        })

        it("Swap tokens without fees", async () => {
            let relayerSigner = getRelayerSigner();
            let mainRelayer = await main.connect(relayerSigner);


            let toToken = await ethers.getContractAt('ERC20', toTokenAddress);
            let initialTokenBalUser = await toToken.balanceOf(owner.address);
            let initialMaticBalUser = await ethers.provider.getBalance(owner.address);
            let initialFeesBalContract = await token.balanceOf(main.address);

            let { r, s, v, functionSignature } = await getSignature(owner, main, data);
            let amountIn = data.decimals == 6 ? 10 ** 6 : ethers.utils.parseEther('1');

            //Getting gas fees estimate
            // const iface = new ethers.utils.Interface(['function swapWithoutFeesEMT(uint amountIn,address tokenIn,address tokenOut,address userAddress,address[] memory _path,uint24[] memory _fees,bytes memory approvalFunctionSignature,bytes32 sigR,bytes32 sigS,uint8 sigV)']);
            // let encodedFunctionData = iface.encodeFunctionData('swapWithoutFeesEMT', [
            //     amountIn,
            //     tokenAddress,
            //     toTokenAddress,
            //     owner.address,
            //     data.path || [],
            //     data.fees || [],
            //     data.path.length > 0 ? undefined : functionSignature,
            //     r,
            //     s,
            //     v
            // ]);
            // let gasEstimate = await ethers.provider.estimateGas({
            //     from: relayerWallet.address,
            //     to: mainRelayer.address,
            //     data: encodedFunctionData,
            // });

            let params = {
                amountIn: amountIn,
                tokenIn: tokenAddress,
                tokenOut: toTokenAddress,
                userAddress: owner.address,
                approvalFunctionSignature: functionSignature,
                sigR: r,
                sigS: s,
                sigV: v,
                path: data.path && data.path.length > 0 ? data.path : [],
                fees: data.fees && data.fees.length > 0 ? data.fees : []
            }

            console.log("CALLING SWAP WITHOUT FEES");
            let tx = await mainRelayer.swapWithoutFeesEMT(params);
            let txWait = await tx.wait();

            let finalTokenBalUser = await toToken.balanceOf(owner.address);
            let finalMaticBalUser = await ethers.provider.getBalance(owner.address);
            let finalFeesBalContract = await token.balanceOf(main.address);

            //user gets the desired token
            expect(finalTokenBalUser - initialTokenBalUser).greaterThan(0);

            //contract collects fees in from token
            expect(finalFeesBalContract - initialFeesBalContract).greaterThan(0);

            //no matic used from the user
            expect(finalMaticBalUser).equal(initialMaticBalUser);
        })
    });
}

function describeExactParamsTest(data) {
    describe(data.testName, () => {
        it("Running with given params", async () => {
            let params = data.params;
            console.log("These are params - ", params);

            let relayerSigner = getRelayerSigner();
            let mainRelayer = await main.connect(relayerSigner);
            // const prodContract = await ethers.getContractAt("GaslessV2", "0x65a6b9613550de688b75e12b50f28b33c07580bc", relayerSigner);

            let tx = await mainRelayer.swapWithoutFeesEMT(params);
            let txWait = await tx.wait();
        })
    })
}

function getRelayerSigner() {
    const accounts = config.networks.hardhat.accounts;
    let relayerWallet = ethers.Wallet.fromMnemonic(accounts.mnemonic, accounts.path + `/${1}`);
    return new ethers.Wallet(relayerWallet.privateKey, ethers.provider);
}
