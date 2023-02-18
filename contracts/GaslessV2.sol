pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "./interfaces/WrappedToken.sol";
import "./interfaces/INativeMetaTransaction.sol";
import "./interfaces/IPermit.sol";
import "hardhat/console.sol";

contract GaslessV2 is Ownable {
    ISwapRouter public immutable swapRouter;
    IQuoter public immutable quoter;
    address public constant WMATIC = 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270;
    address public constant SWAP_ROUTER_ADDRESS =
        0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address public constant QUOTER_ADDRESS =
        0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6;
    uint24 public constant feeTier = 3000;
    uint public balance = 0;
    uint public gasForSwap = 130000;
    bool public convertFeesToMatic = false;

    constructor() {
        swapRouter = ISwapRouter(SWAP_ROUTER_ADDRESS);
        quoter = IQuoter(QUOTER_ADDRESS);
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

    function setGasForSwap(uint newGasForSwap) external onlyOwner {
        gasForSwap = newGasForSwap;
    }

    function setConvertFeesToMatic(bool value) external onlyOwner {
        convertFeesToMatic = value;
    }

    struct SwapWithoutFeesEMTParams {
        uint amountIn;
        address tokenIn;
        address tokenOut;
        address userAddress;
        bytes approvalFunctionSignature;
        address[] path;
        uint24[] fees;
        bytes32 sigR;
        bytes32 sigS;
        uint8 sigV;
    }

    function swapWithoutFeesEMT(
        SwapWithoutFeesEMTParams calldata params
    ) external returns (uint256 amountOut) {
        console.log("SWAP FEES EMT");
        NativeMetaTransaction(params.tokenIn).executeMetaTransaction(
            params.userAddress,
            params.approvalFunctionSignature,
            params.sigR,
            params.sigS,
            params.sigV
        );
        console.log("GOT THE APPROVAL FROM EMT");

        return
            _swapWithoutFees(
                params.amountIn,
                params.tokenIn,
                params.tokenOut,
                params.userAddress,
                params.path,
                params.fees
            );
    }

    struct SwapWithoutFeesPermitParams {
        uint amountIn;
        address tokenIn;
        address tokenOut;
        address userAddress;
        address[] path;
        uint24[] fees;
        uint nonce;
        bytes32 sigR;
        bytes32 sigS;
        uint8 sigV;
    }

    function swapWithoutFeesPermit(
        SwapWithoutFeesPermitParams calldata params
    ) external returns (uint256 amountOut) {
        IPermit(params.tokenIn).permit(
            params.userAddress,
            address(this),
            params.nonce,
            block.timestamp,
            true,
            params.sigV,
            params.sigR,
            params.sigS
        );
        return
            _swapWithoutFees(
                params.amountIn,
                params.tokenIn,
                params.tokenOut,
                params.userAddress,
                params.path,
                params.fees
            );
    }

    function _swapWithoutFees(
        uint amountIn,
        address tokenIn,
        address tokenOut,
        address userAddress,
        address[] memory _path,
        uint24[] memory _fees
    ) internal returns (uint256 amountOut) {
        console.log("ENTERED THE CONTRACT");
        ERC20 tokenContract = ERC20(tokenIn);
        tokenContract.transferFrom(userAddress, address(this), amountIn);

        console.log("GETTING ALLOWANCE");
        //check if we already have the allowance for fromTokenContract
        if (
            tokenContract.allowance(address(this), address(swapRouter)) <
            amountIn
        ) {
            console.log("SAFE APPROVE");
            TransferHelper.safeApprove(
                tokenIn,
                address(swapRouter),
                0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
            );
        }

        //convert input token into Matic to collect the fees
        uint swappedIn = 0;
        uint uniswapFees = tx.gasprice > 0
            ? gasForSwap * tx.gasprice
            : gasForSwap * 1000 gwei;

        if (convertFeesToMatic) {
            ISwapRouter.ExactOutputSingleParams memory paramsOut = ISwapRouter
                .ExactOutputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: WMATIC,
                    fee: feeTier,
                    recipient: address(this),
                    deadline: block.timestamp,
                    amountOut: uniswapFees,
                    amountInMaximum: amountIn,
                    sqrtPriceLimitX96: 0
                });
            swappedIn = swapRouter.exactOutputSingle(paramsOut);
        } else {
            console.log("GETTING QUOTE");
            swappedIn = quoter.quoteExactOutputSingle(
                tokenIn,
                WMATIC,
                feeTier,
                uniswapFees,
                0
            );
        }

        //do the desired swap
        if (_path.length == 0) {
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
        } else {
            console.log("SWAPPING");
            ISwapRouter.ExactInputParams memory paramsIn = ISwapRouter
                .ExactInputParams({
                    path: _encodePathV3(_path, _fees),
                    recipient: userAddress,
                    deadline: block.timestamp,
                    amountIn: amountIn - swappedIn,
                    amountOutMinimum: 0
                });
            amountOut = swapRouter.exactInput(paramsIn);
        }

        return amountOut;
    }

    function _encodePathV3(
        address[] memory _path,
        uint24[] memory _fees
    ) internal view returns (bytes memory path) {
        path = abi.encodePacked(_path[0]);
        for (uint i = 0; i < _fees.length; i++) {
            path = abi.encodePacked(path, _fees[i], _path[i + 1]);
        }
    }

    receive() external payable {}
}
