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
    address public WrappedNative;
    address public constant SWAP_ROUTER_ADDRESS =
        0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address public constant QUOTER_ADDRESS =
        0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6;
    uint24 public constant feeTier = 3000;
    uint public balance = 0;
    uint public gasForSwap = 130000;
    bytes32 public DOMAIN_SEPARATOR;
    string public constant name = 'Flint Gasless';
    string public EIP712_VERSION = '1';
    mapping(address => uint) public nonces;
    bytes32 public constant META_TRANSACTION_TYPEHASH =
        keccak256(
            bytes(
                'SwapWithoutFees(uint amountIn,address tokenIn,address tokenOut,address userAddress,address[] path,uint24[] fees,uint nonce,bool isTokenOutNative)'
            )
        );

    constructor(address wrappedNativeTokenAddress) {
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
        WrappedNative = wrappedNativeTokenAddress;
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

    struct SwapWithoutFeesParams {
        uint amountIn;
        address tokenIn;
        address tokenOut;
        address userAddress;
        address[] path;
        uint24[] fees;
        uint nonce;
        bool isTokenOutNative;
        address[] toNativePath;
        uint24[] toNativeFees;
        bytes32 sigR;
        bytes32 sigS;
        uint8 sigV;
    }

    function swapWithoutFees(
        SwapWithoutFeesParams memory params
    ) external returns (uint256) {
        console.log('getting digest');
        bytes32 digest = _getDigest(
            params.amountIn,
            params.tokenIn,
            params.tokenOut,
            params.userAddress,
            params.path,
            params.fees,
            params.nonce,
            params.isTokenOutNative
        );
        console.log('verifying digest');
        _verifyDigest(
            digest,
            params.userAddress,
            params.sigR,
            params.sigS,
            params.sigV,
            params.nonce
        );

        if (params.tokenOut != WrappedNative) {
            params.isTokenOutNative = false;
        }

        console.log('internal swap');
        return _swapWithoutFees(params);
    }

    function _swapWithoutFees(
        SwapWithoutFeesParams memory params
    ) internal returns (uint256 amountOut) {
        ERC20 tokenContract = ERC20(params.tokenIn);

        console.log('transfer from');
        tokenContract.transferFrom(
            params.userAddress,
            address(this),
            params.amountIn
        );
        //check if we already have the allowance for fromTokenContract
        if (
            tokenContract.allowance(address(this), address(swapRouter)) <
            params.amountIn
        ) {
            console.log('approval');
            TransferHelper.safeApprove(
                params.tokenIn,
                address(swapRouter),
                0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
            );
        }

        //convert input token into Native to collect the fees
        uint swappedIn = 0;
        uint uniswapFees = tx.gasprice > 0
            ? gasForSwap * tx.gasprice
            : gasForSwap * 1000 gwei;

        require(
            params.toNativePath[params.toNativePath.length - 1] ==
                params.tokenIn,
            'Fees should be collected in tokenIn'
        );
        require(
            params.toNativePath[0] == WrappedNative,
            'Fees should be collected according to WrappedNative price'
        );

        console.log('GETTING THE SWAPPED IN AMOUNT');
        console.logBytes(
            _encodePathV3(params.toNativePath, params.toNativeFees)
        );
        swappedIn = quoter.quoteExactOutput(
            _encodePathV3(params.toNativePath, params.toNativeFees),
            uniswapFees
        );

        console.log('THIS IS SWAPPED IN -> ', swappedIn);

        require(swappedIn < params.amountIn, 'Swap amount is too low');

        //do the desired swap
        if (params.path.length == 0) {
            ISwapRouter.ExactInputSingleParams memory paramsIn = ISwapRouter
                .ExactInputSingleParams({
                    tokenIn: params.tokenIn,
                    tokenOut: params.tokenOut,
                    fee: feeTier,
                    recipient: params.isTokenOutNative
                        ? address(this)
                        : params.userAddress,
                    deadline: block.timestamp,
                    amountIn: params.amountIn - swappedIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                });
            amountOut = swapRouter.exactInputSingle(paramsIn);
        } else {
            ISwapRouter.ExactInputParams memory paramsIn = ISwapRouter
                .ExactInputParams({
                    path: _encodePathV3(params.path, params.fees),
                    recipient: params.isTokenOutNative
                        ? address(this)
                        : params.userAddress,
                    deadline: block.timestamp,
                    amountIn: params.amountIn - swappedIn,
                    amountOutMinimum: 0
                });
            amountOut = swapRouter.exactInput(paramsIn);
        }

        if (params.isTokenOutNative) {
            WrappedToken wrappedToken = WrappedToken(WrappedNative);
            wrappedToken.withdraw(amountOut);
            payable(params.userAddress).transfer(amountOut);
        }

        return amountOut;
    }

    function _verifyDigest(
        bytes32 digest,
        address userAddress,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV,
        uint nonce
    ) internal {
        require(
            userAddress == ecrecover(digest, sigV, sigR, sigS),
            '[SWAP WITHOUT FEES] Invalid signature'
        );
        require(nonce == nonces[userAddress]++, 'Invalid nonce');
    }

    function _getDigest(
        uint amountIn,
        address tokenIn,
        address tokenOut,
        address userAddress,
        address[] memory path,
        uint24[] memory fees,
        uint nonce,
        bool isTokenOutNative
    ) internal returns (bytes32) {
        return
            keccak256(
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
                            isTokenOutNative
                        )
                    )
                )
            );
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
