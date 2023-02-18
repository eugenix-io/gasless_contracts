const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Main", function () {

    describe("Swap without fees", function () {
        let main;
        let owner;
        let DAI;
        let WETH;
        let USDT;

        before(async () => {
            const Main = await ethers.getContractFactory("Main");
            main = await Main.deploy();
            let signers = await ethers.getSigners();
            owner = signers[0];
            let daiAddress = await main.DAI();
            let wethAddress = await main.WETH9();
            let usdtAddress = await main.USDT();
            DAI = await ethers.getContractAt("IERC20", daiAddress);
            WETH = await ethers.getContractAt("WrappedToken", wethAddress);
            USDT = await ethers.getContractAt("IERC20", usdtAddress);
        })

        it("DAI contract address", async () => {
            expect(await main.DAI()).to.equal('0x6B175474E89094C44Da98b954EedeAC495271d0F');
        })

        it("Fund the smart contract", async () => {
            let amount = ethers.utils.parseEther('2', 'ether');
            await owner.sendTransaction({
                to: main.address,
                value: amount
            });
            expect(await main.getBalance()).to.equal(amount);
        })

        it("Wrap to WETH", async () => {
            let amount = ethers.utils.parseEther('2', 'ether');
            await main.wrapEth(amount);
            let wethAddress = await main.WETH9();
            expect(await WETH.balanceOf(main.address)).eq(ethers.utils.parseEther('2', 'ether'))
        })

        it("Swap WETH for DAI", async () => {
            let amount = ethers.utils.parseEther('2', 'ether');
            let daiAddress = await main.DAI();
            await main.swapWETHForDAI(amount, daiAddress);
            let daiBalance = await DAI.balanceOf(owner.address);
            expect(daiBalance).greaterThan(ethers.utils.parseEther('2', 'ether'))
        })

        it("Approve DAI usage", async () => {
            await DAI.approve(main.address, ethers.utils.parseEther('1000', 'ether'));
            expect(await DAI.allowance(owner.address, main.address)).to.equal(ethers.utils.parseEther('1000', 'ether'));
        })

        it("Swap DAI for USDT without fees", async () => {
            let initialUsdt = await USDT.balanceOf(owner.address);
            await main.swapWithoutFees(ethers.utils.parseEther('1000', 'ether'));
            expect(await WETH.balanceOf(main.address)).to.equal(ethers.utils.parseEther('0.01', 'ether'));
            let finalUsdt = await USDT.balanceOf(owner.address);
            console.log("Different in USDT", finalUsdt - initialUsdt);
            expect(finalUsdt - initialUsdt).greaterThan(0);
        })

        it("Get gas price", async () => {
            expect(await main.getGasPrice()).greaterThan(0);
        })
    });
});
