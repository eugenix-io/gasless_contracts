const { expect } = require("chai");
const { ethers } = require("hardhat");
const sigUtil = require("@metamask/eth-sig-util");
const { config } = require("hardhat");

const domainType = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "verifyingContract", type: "address" },
  { name: "salt", type: "bytes32" },
];

const swapWithoutFees = [
  { type: "uint", name: "amountIn" },
  { type: "address", name: "tokenIn" },
  { type: "address", name: "tokenOut" },
  { type: "address", name: "userAddress" },
  { type: "address[]", name: "path" },
  { type: "uint24[]", name: "fees" },
  { type: "uint", name: "nonce" },
  { type: "bool", name: "isTokenOutMatic" },
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
    version: "1",
    verifyingContract: mainContract.address,
    salt: "0x0000000000000000000000000000000000000000000000000000000000000089",
  };

  let nonce = await main.nonces(wallet.address);
  message.nonce = parseInt(nonce);

  const dataToSign = {
    types: {
      EIP712Domain: domainType,
      SwapWithoutFees: swapWithoutFees,
    },
    domain: domainData,
    primaryType: "SwapWithoutFees",
    message: message,
  };

  let signature = sigUtil.signTypedData({
    privateKey: Buffer.from(wallet.privateKey.slice(2), "hex"),
    data: dataToSign,
    version: "V4",
  });

  return { ...getSignatureParameters(signature), nonce };
}

const EMTTokens = [
  {
    testName: "USDT -> DAI Single",
    fromTokenAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    toTokenAddress: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    decimals: 6,
  },
  {
    testName: "DAI -> USDT Single",
    fromTokenAddress: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    toTokenAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    decimals: 18,
  },
  {
    testName: "USDC -> DAI Single",
    fromTokenAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    toTokenAddress: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    nonceFunction: "nonces",
    decimals: 6,
  },
  {
    testName: "USDT -> SUSHI Multihop",
    fromTokenAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    toTokenAddress: "0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a",
    decimals: 6,
    path: [
      "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      "0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a",
    ],
    fees: [500, 3000],
  },
  {
    testName: "USDT -> ANKR Multihop",
    fromTokenAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    toTokenAddress: "0x101A023270368c0D50BFfb62780F4aFd4ea79C35",
    decimals: 6,
    path: [
      "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      "0x101A023270368c0D50BFfb62780F4aFd4ea79C35",
    ],
    fees: [10000, 3000],
  },
  {
    testName: "USDT -> BAL Multihop",
    fromTokenAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    toTokenAddress: "0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3",
    decimals: 6,
    path: [
      "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      "0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3",
    ],
    fees: [100, 10000],
  },
  {
    testName: "WETH -> QUICK Multihop",
    fromTokenAddress: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    toTokenAddress: "0x831753DD7087CaC61aB5644b308642cc1c33Dc13",
    decimals: 18,
    path: [
      "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      "0x831753DD7087CaC61aB5644b308642cc1c33Dc13",
    ],
    fees: [500, 3000],
    amountIn: ethers.utils.parseUnits("0.01", 18),
  },
  {
    testName: "USDT -> MATIC",
    fromTokenAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    toTokenAddress: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    decimals: 6,
  },
];

const WMATIC = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
let main;
let owner;
describe("Generic Contract Functions", function () {
  before(async () => {
    const Main = await ethers.getContractFactory("GaslessV3");
    main = await Main.deploy();
    console.log("MAIN ADDRESS FIRST DEPLOYMENT - ", main.address);
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

  it("Transfer of native token", async () => {
    let amount = ethers.utils.parseEther("10");
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
    ).greaterThan(ethers.utils.parseEther("9.9"));
  });

  it("Change gasForSwap", async () => {
    await main.setGasForSwap(1);
    expect(await main.gasForSwap()).equal(1);
  });

  it("Change gasForSwap not the owner", async () => {
    const accounts = config.networks.hardhat.accounts;
    let wallet = ethers.Wallet.fromMnemonic(
      accounts.mnemonic,
      accounts.path + `/${1}`
    );
    signer = new ethers.Wallet(wallet.privateKey, ethers.provider);
    await expect(main.connect(signer).setGasForSwap(1)).revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  describe("Swap without fees for all tokens", function () {
    before(async () => {
      const Main = await ethers.getContractFactory("GaslessV3");
      main = await Main.deploy();
      console.log("MAIN ADDRESS SECOND DEPLOYMENT - ", main.address);
    });

    EMTTokens.forEach((data) => {
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
      token = await ethers.getContractAt("IERC20", tokenAddress, owner);
    });

    it("Get token from Uniswap", async () => {
      let swapRouter = await ethers.getContractAt(
        "ISwapRouter",
        await main.SWAP_ROUTER_ADDRESS()
      );
      await swapRouter.exactInputSingle(
        {
          tokenIn: WMATIC,
          tokenOut: tokenAddress,
          fee: 3000,
          recipient: owner.address,
          deadline: (await ethers.provider.getBlock()).timestamp + 1000,
          amountIn: ethers.utils.parseEther("1000"),
          amountOutMinimum: 0,
          sqrtPriceLimitX96: 0,
        },
        {
          value: ethers.utils.parseEther("1000"),
        }
      );
      let tokenBalance = await token.balanceOf(owner.address);
      expect(tokenBalance).greaterThan(0);
    });

    it("Approve Contract for Token usage", async () => {
      let balance = await token.balanceOf(owner.address);
      await token.approve(main.address, balance);
      expect(await token.allowance(owner.address, main.address)).to.equal(
        balance
      );
    });

    it("Swap tokens without fees", async () => {
      let relayerSigner = getRelayerSigner();

      let mainRelayer = await main.connect(relayerSigner);

      let toToken = await ethers.getContractAt("ERC20", toTokenAddress);
      let initialTokenBalUser = await toToken.balanceOf(owner.address);
      let initialMaticBalUser = await ethers.provider.getBalance(owner.address);
      let initialFeesBalContract = await token.balanceOf(main.address);
      let initialNonce = await main.nonces(owner.address);

      let amountIn =
        data.decimals == 6
          ? ethers.BigNumber.from(10 ** 6)
          : ethers.utils.parseEther("1");
      let totalBalance = await token.balanceOf(owner.address);
      if (data.amountIn) {
        amountIn = data.amountIn;
      } else if (amountIn.gt(totalBalance)) {
        amountIn = totalBalance;
      }
      const isTokenOutMatic = toTokenAddress === WMATIC;
      let params = {
        amountIn: amountIn.toString(), //sign fails for large numbers so we need to convert to string
        tokenIn: tokenAddress,
        tokenOut: toTokenAddress,
        userAddress: owner.address,
        path: data.path && data.path.length > 0 ? data.path : [],
        fees: data.fees && data.fees.length > 0 ? data.fees : [],
        isTokenOutMatic: isTokenOutMatic,
      };
      let { r, s, v, nonce } = await getSignature(owner, main, params);

      let tx = await mainRelayer.swapWithoutFees(
        amountIn,
        tokenAddress,
        toTokenAddress,
        owner.address,
        data.path && data.path.length > 0 ? data.path : [],
        data.fees && data.fees.length > 0 ? data.fees : [],
        nonce,
        isTokenOutMatic,
        r,
        s,
        v
      );
      let txWait = await tx.wait();
      console.log(`This is gas used for ${data.testName} - `, txWait.gasUsed);

      let finalTokenBalUser = await toToken.balanceOf(owner.address);
      let finalMaticBalUser = await ethers.provider.getBalance(owner.address);
      let finalFeesBalContract = await token.balanceOf(main.address);
      let finalNonce = await main.nonces(owner.address);
      if (isTokenOutMatic) {
        expect(finalMaticBalUser).greaterThan(initialMaticBalUser);
        expect(finalTokenBalUser).equal(initialTokenBalUser);
      } else {
        //no matic used from the user
        expect(finalMaticBalUser).equal(initialMaticBalUser);
        //user gets the desired token
        expect(finalTokenBalUser - initialTokenBalUser).greaterThan(0);
      }

      //contract collects fees in from token
      expect(finalFeesBalContract - initialFeesBalContract).greaterThan(0);

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
