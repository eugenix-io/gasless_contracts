pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";
import "./interfaces/WrappedToken.sol";
import "./interfaces/INativeMetaTransaction.sol";

contract MainMatic is Ownable {
    ISwapRouter public immutable swapRouter;
    address public constant WMATIC = 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270;
    address public constant DAI = 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063;
    address public constant USDT = 0xc2132D05D31c914a87C6611C10748AEb04B58e8F;
    address public constant MATIC = 0x0000000000000000000000000000000000001010;
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
        WrappedToken weth = WrappedToken(WMATIC);
        weth.deposit{value: amount}();
    }

    function swapWMatic(
        uint amountIn,
        address tokenTo
    ) public returns (uint256 amountOut) {
        TransferHelper.safeApprove(WMATIC, address(swapRouter), amountIn);
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: WMATIC,
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

    function swapWithoutFeesSingle(
        uint amountIn,
        address tokenIn,
        address tokenOut,
        address userAddress,
        bytes memory approvalFunctionSignature,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV
    ) external returns (uint256 amountOut) {
        NativeMetaTransaction(tokenIn).executeMetaTransaction(
            userAddress,
            approvalFunctionSignature,
            sigR,
            sigS,
            sigV
        );

        ERC20 tokenContract = ERC20(tokenIn);
        tokenContract.transferFrom(userAddress, address(this), amountIn);

        //check if we already have the allowance for fromTokenContract
        if (
            tokenContract.allowance(address(this), address(swapRouter)) <
            amountIn
        ) {
            TransferHelper.safeApprove(
                tokenIn,
                address(swapRouter),
                uint256(
                    0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
                )
            );
        }

        //convert input token into Matic to collect the fees
        ISwapRouter.ExactOutputSingleParams memory paramsOut = ISwapRouter
            .ExactOutputSingleParams({
                tokenIn: tokenIn,
                tokenOut: MATIC,
                fee: feeTier,
                recipient: address(this),
                deadline: block.timestamp,
                amountOut: 346650 * tx.gasprice,
                amountInMaximum: amountIn,
                sqrtPriceLimitX96: 0
            });
        uint swappedIn = swapRouter.exactOutputSingle(paramsOut);

        //do the desired swap
        ISwapRouter.ExactInputSingleParams memory paramsIn = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: feeTier,
                recipient: userAddress,
                deadline: block.timestamp,
                amountIn: amountIn - swappedIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });
        amountOut = swapRouter.exactInputSingle(paramsIn);
        return amountOut;
    }

    receive() external payable {}
}
