pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import 'hardhat/console.sol';
import './interfaces/WrappedToken.sol';

contract GaslessV3 is Ownable {
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
    bytes32 public DOMAIN_SEPARATOR;
    string public constant name = 'Flint Gasless';
    string public EIP712_VERSION = '1';
    mapping(address => uint) public nonces;
    bytes32 public constant META_TRANSACTION_TYPEHASH =
        keccak256(
            bytes(
                'SwapWithoutFees(uint amountIn,address tokenIn,address tokenOut,address userAddress,address[] path,uint24[] fees,uint nonce,bool isTokenOutMatic)'
            )
        );

    constructor() {
        swapRouter = ISwapRouter(SWAP_ROUTER_ADDRESS);
        quoter = IQuoter(QUOTER_ADDRESS);
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    'EIP712Domain(string name,string version,address verifyingContract,bytes32 salt)'
                ),
                keccak256(bytes(name)),
                keccak256(bytes(EIP712_VERSION)),
                address(this),
                bytes32(getChainId())
            )
        );
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

    function swapWithoutFees(
        uint amountIn,
        address tokenIn,
        address tokenOut,
        address userAddress,
        address[] memory path,
        uint24[] memory fees,
        uint nonce,
        bool isTokenOutMatic,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV
    ) external returns (uint256 amountOut) {
        bytes32 digest = keccak256(
            abi.encodePacked(
                '\x19\x01',
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        META_TRANSACTION_TYPEHASH,
                        amountIn,
                        tokenIn,
                        tokenOut,
                        userAddress,
                        keccak256(abi.encodePacked(path)),
                        keccak256(abi.encodePacked(fees)),
                        nonce,
                        isTokenOutMatic
                    )
                )
            )
        );
        if (tokenOut != WMATIC) {
            isTokenOutMatic = false;
        }
        require(
            userAddress == ecrecover(digest, sigV, sigR, sigS),
            '[SWAP WITHOUT FEES] Invalid signature'
        );
        require(nonce == nonces[userAddress]++, 'Invalid nonce');
        return
            _swapWithoutFees(
                amountIn,
                tokenIn,
                tokenOut,
                userAddress,
                path,
                fees,
                isTokenOutMatic
            );
    }

    function _swapWithoutFees(
        uint amountIn,
        address tokenIn,
        address tokenOut,
        address userAddress,
        address[] memory path,
        uint24[] memory fees,
        bool isTokenOutMatic
    ) internal returns (uint256 amountOut) {
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
            swappedIn = quoter.quoteExactOutputSingle(
                tokenIn,
                WMATIC,
                feeTier,
                uniswapFees,
                0
            );
        }

        //do the desired swap
        if (path.length == 0) {
            ISwapRouter.ExactInputSingleParams memory paramsIn = ISwapRouter
                .ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    fee: feeTier,
                    recipient: isTokenOutMatic ? address(this) : userAddress,
                    deadline: block.timestamp,
                    amountIn: amountIn - swappedIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                });
            amountOut = swapRouter.exactInputSingle(paramsIn);
        } else {
            ISwapRouter.ExactInputParams memory paramsIn = ISwapRouter
                .ExactInputParams({
                    path: _encodePathV3(path, fees),
                    recipient: isTokenOutMatic ? address(this) : userAddress,
                    deadline: block.timestamp,
                    amountIn: amountIn - swappedIn,
                    amountOutMinimum: 0
                });
            amountOut = swapRouter.exactInput(paramsIn);
        }

        if (isTokenOutMatic) {
            WrappedToken wrappedToken = WrappedToken(WMATIC);
            wrappedToken.withdraw(amountOut);
            payable(userAddress).transfer(amountOut);
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

    function getChainId() internal returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }

    receive() external payable {}
}
