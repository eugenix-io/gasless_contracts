pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "./interfaces/WrappedToken.sol";
import "hardhat/console.sol";

contract Main is Ownable {
    ISwapRouter public immutable swapRouter;
    address public constant WETH9 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    uint24 public constant feeTier = 3000;
    uint public balance = 0;

    constructor() {
        swapRouter = ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function transfer(address payable to, uint256 amount) public onlyOwner {
        to.transfer(amount);
    }

    function transferERC20(
        address payable to,
        uint256 amount,
        address tokenAddress
    ) public onlyOwner {
        ERC20 token = ERC20(tokenAddress);
        token.transfer(to, amount);
    }

    function wrapEth(uint amount) public {
        WrappedToken weth = WrappedToken(WETH9);
        weth.deposit{value: amount}();
    }

    function swapWETHForDAI(
        uint amountIn,
        address tokenTo
    ) public returns (uint256 amountOut) {
        TransferHelper.safeApprove(WETH9, address(swapRouter), amountIn);
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: WETH9,
                tokenOut: tokenTo,
                fee: feeTier,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });
        amountOut = swapRouter.exactInputSingle(params);
        return amountOut;
    }

    function swapWithoutFees(
        uint amountIn
    ) external returns (uint256 amountOut) {
        ERC20 daiToken = ERC20(DAI);
        daiToken.transferFrom(_msgSender(), address(this), amountIn);
        TransferHelper.safeApprove(DAI, address(swapRouter), amountIn);
        ISwapRouter.ExactOutputSingleParams memory paramsOut = ISwapRouter
            .ExactOutputSingleParams({
                tokenIn: DAI,
                tokenOut: WETH9,
                fee: feeTier,
                recipient: address(this),
                deadline: block.timestamp,
                amountOut: 0.01 ether,
                amountInMaximum: amountIn,
                sqrtPriceLimitX96: 0
            });
        uint swappedIn = swapRouter.exactOutputSingle(paramsOut);
        ISwapRouter.ExactInputSingleParams memory paramsIn = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: DAI,
                tokenOut: USDT,
                fee: feeTier,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn - swappedIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });
        amountOut = swapRouter.exactInputSingle(paramsIn);
        return amountOut;
    }

    function init() external {
        wrapEth(address(this).balance);
        WrappedToken weth = WrappedToken(WETH9);
        swapWETHForDAI(weth.balanceOf(address(this)), DAI);
    }

    function getGasPrice() public view returns (uint) {
        return tx.gasprice;
    }

    receive() external payable {}
}
