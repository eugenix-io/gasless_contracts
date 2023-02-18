const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const ISwapRouterArtifact = require("@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json");
const sigUtil = require("@metamask/eth-sig-util");
const { config } = require('hardhat');
const ERC20Artifact = require('@openzeppelin/contracts/build/contracts/ERC20.json');

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

async function getSignature(wallet, functionSignature, usdtAddress) {

    const domainData = {
        name: "(PoS) Tether USD",
        version: "1",
        verifyingContract: usdtAddress,
        salt: "0x0000000000000000000000000000000000000000000000000000000000000089",
    };

    let usdtContract = await ethers.getContractAt("NativeMetaTransaction", usdtAddress);
    let nonce = await usdtContract.getNonce(wallet.address);
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

    return getSignatureParameters(signature);
}

describe("MainMatic", function () {

    describe("Swap without fees", function () {
        let main;
        let owner;
        let DAI;
        let WMatic;
        let USDT;

        before(async () => {
            const Main = await ethers.getContractFactory("MainMatic");
            main = await Main.deploy();
            const accounts = config.networks.hardhat.accounts;
            let wallet = ethers.Wallet.fromMnemonic(accounts.mnemonic, accounts.path + `/${0}`);
            owner = new ethers.Wallet(wallet.privateKey, ethers.provider);
            // let signers = await ethers.getSigners();
            // owner = signers[0];
            let daiAddress = await main.DAI();
            let WMaticAddress = await main.WMATIC();
            let usdtAddress = await main.USDT();
            DAI = await ethers.getContractAt("IERC20", daiAddress, owner);
            WMatic = await ethers.getContractAt("WrappedToken", WMaticAddress, owner);
            USDT = await ethers.getContractAt("IERC20", usdtAddress, owner);
        })

        it("DAI contract address", async () => {
            expect(await main.DAI()).to.equal('0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063');
        })

        it("Fund the smart contract", async () => {
            let amount = ethers.utils.parseEther('10', 'ether');
            await owner.sendTransaction({
                to: main.address,
                value: amount
            });
            expect(await main.getBalance()).to.equal(amount);
        })

        it("Wrap to WMatic", async () => {
            let amount = ethers.utils.parseEther('10', 'ether');
            await main.wrapEth(amount);
            expect(await WMatic.balanceOf(main.address)).eq(ethers.utils.parseEther('10', 'ether'));
        })

        it("Swap WMatic for DAI", async () => {
            let amount = ethers.utils.parseEther('2', 'ether');
            let daiAddress = await main.DAI();
            await main.swapWMatic(amount, daiAddress);
            let daiBalance = await DAI.balanceOf(owner.address);
            expect(daiBalance).greaterThan(ethers.utils.parseEther('2', 'ether'));
        })

        it("Swap WMatic for USDT", async () => {
            let usdtBalanceInitial = await USDT.balanceOf(owner.address);
            let amount = ethers.utils.parseEther('5', 'ether');
            await main.swapWMatic(amount, await main.USDT()); //using proxy address of USDT because Uniswap pools won't work with the actual address
            let usdtBalanceFinal = await USDT.balanceOf(owner.address);
            expect(usdtBalanceFinal).greaterThan(usdtBalanceInitial);
        })

        it("Approve self contract for DAI usage", async () => {
            await DAI.approve(main.address, ethers.utils.parseEther('1000', 'ether'));
            expect(await DAI.allowance(owner.address, main.address)).to.equal(ethers.utils.parseEther('1000', 'ether'));
        })

        it("Swap DAI for USDT without fees", async () => {
            let initialDai = await DAI.balanceOf(owner.address);

            let functionSignature = getApprovalFunctionSignature(main.address, ethers.utils.parseEther('1000', 'ether'));
            let { r, s, v } = await getSignature(owner, functionSignature, await main.USDT());
            let usdtBalance = await USDT.balanceOf(owner.address);
            let tx = await main.swapWithoutFeesSingle(
                10 ** 6,
                await main.USDT(),
                await main.DAI(),
                owner.address,
                functionSignature,
                r,
                s,
                v
            );
            let txWait = await tx.wait();
            console.log("This is gas used - ", txWait.gasUsed)
            let finalDai = await DAI.balanceOf(owner.address);
            expect(finalDai - initialDai).greaterThan(0);
        })

        // it("Get gas price", async () => {
        //     expect(await main.getGasPrice()).greaterThan(0);
        // })
    });
});
