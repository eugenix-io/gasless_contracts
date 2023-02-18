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

describe("Test", function () {

    describe("Test", function () {
        let main;
        let owner;
        let DAI;
        let WMatic;
        let USDT;

        before(async () => {
            const Main = await ethers.getContractFactory("Test");
            main = await Main.deploy();
            const accounts = config.networks.hardhat.accounts;
            let wallet = ethers.Wallet.fromMnemonic(accounts.mnemonic, accounts.path + `/${0}`);
            owner = new ethers.Wallet(wallet.privateKey, ethers.provider);
        })

        it("Test set domain seperator", async () => {
            await main.setDomainSeperator(
                1000000,
                "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
                "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
                "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                [],
                [],
                0
            );
        })
    });
});