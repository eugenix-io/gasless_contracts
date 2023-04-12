pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import 'hardhat/console.sol';
import './interfaces/WrappedToken.sol';
import './interfaces/ISushiSwap.sol';

contract GaslessV3 is Ownable {
    ISwapRouter public immutable swapRouter;
    IQuoter public immutable quoter;
    ISushiSwap public immutable sushiSwapRouter;
    address public WrappedNative;
    address public constant SWAP_ROUTER_ADDRESS =
        0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address public constant QUOTER_ADDRESS =
        0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6;
    
    address public constant SUSHI_SWAP_ROUTER_ADDRESS = 
        0x0dc8E47a1196bcB590485eE8bF832c5c68A52f4B;

    address public constant selfUser = 0xd7C9F3b280D4690C3232469F3BCb4361632bfC77;

    uint24 public constant feeTier = 3000;
    uint public balance = 0;
    uint public gasForSwap = 130000;
    bytes32 public DOMAIN_SEPARATOR;
    string public constant name = 'Flint Gasless';
    string public EIP712_VERSION = '1';
    mapping(address => uint) public nonces;
    mapping(address => uint) public approvalNonces;
    bytes32 public constant GASLESS_SWAP_TYPEHASH =
        keccak256(
            bytes(
                'SwapWithoutFees(uint amountIn,address tokenIn,address tokenOut,address userAddress,address[] path,uint24[] fees,uint nonce,bool isTokenOutNative)'
            )
        );
    bytes32 public constant GASLESS_APPROVAL_TYPEHASH =
        keccak256(
            bytes(
                'ApproveWithoutFees(address userAddress,bytes32 approvalSigR,bytes32 approvalSigS,uint8 approvalSigV,address tokenAddress,uint approvalValue,uint approvalDeadline,uint fees,uint nonce)'
            )
        );

    bytes32 public constant GASLESS_SUSHISWAP_FLINT_TYPEHASH = keccak256(
        bytes(
            "SwapGaslessSushiSwapFlint(address tokenIn,uint amountIn,address tokenOut,uint amountOutMin,address to,uint nonce,bytes route)"
        )
    );
    


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

    struct ApproveWithoutFeesParams {
        address userAddress;
        bytes32 approvalSigR;
        bytes32 approvalSigS;
        uint8 approvalSigV;
        address tokenAddress;
        uint approvalValue;
        uint approvalDeadline;
        uint fees;
        uint nonce;
        bytes32 sigR;
        bytes32 sigS;
        uint8 sigV;
    }

    struct SwapWithSushiParams {
        address tokenIn;
        uint amountIn;
        address tokenOut;
        uint amountOutMin;
        address to;
        uint nonce;
        bool isNative;
        bytes route;
        bytes32 sigR;
        bytes32 sigS;
        uint8 sigV;
    }

    constructor(address wrappedNativeTokenAddress) {
        swapRouter = ISwapRouter(SWAP_ROUTER_ADDRESS);
        quoter = IQuoter(QUOTER_ADDRESS);
        sushiSwapRouter = ISushiSwap(SUSHI_SWAP_ROUTER_ADDRESS);

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

    function swapGaslessSushiSwapFlint(SwapWithSushiParams memory params) external returns(uint256) {

        bytes32 digest = _getDigestSushiSwap(
            params.tokenIn,
            params.amountIn,
            params.tokenOut,
            params.amountOutMin,
            params.to,
            params.nonce,
            params.route
        );

        _verifyDigest(
            digest,
            params.to,
            params.sigR,
            params.sigS,
            params.sigV,
            params.nonce
        );

        uint256 amountOutRouter = _swapOnSushiSwapGasless(params.tokenIn,params.amountIn,params.tokenOut,params.amountOutMin,params.to, params.route, params.isNative);

        return amountOutRouter;

    }

    function transferERC20ToFlintContract(address tokenIn, address userAddress, uint256 amountIn) internal {
        console.log('transferERC20ToFlintContract');
        console.log(tokenIn);
        console.log(amountIn);
        ERC20 tokenContract = ERC20(tokenIn);

        uint256 balErc20 = tokenContract.balanceOf(userAddress);

        console.log('Balance erc20');
        console.log(balErc20);

        uint256 allowance = tokenContract.allowance(userAddress, address(this));

        console.log('allowance & contract address');

        console.log(allowance);

        console.log(address(this));

        console.log('transfer from');
        tokenContract.transferFrom(
            userAddress,
            address(this),
            amountIn
        );
    }

    function approveRouterForFlintContract(address routerAddress, address tokenIn, uint256 amountIn) internal {
        console.log('approveRouterForFlintContract');
        console.log(routerAddress);
        console.log(tokenIn);
        console.log(amountIn);
        ERC20 tokenContract = ERC20(tokenIn);
        //check if we already have the allowance for fromTokenContract
        if (
            tokenContract.allowance(address(this), routerAddress) <
            amountIn
        ) {
            console.log('approval');
            TransferHelper.safeApprove(
                tokenIn,
                routerAddress,
                0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
            );
        }
    }

    function _swapOnSushiSwapGasless(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOutMin,
        address to,
        bytes memory route,
        bool isNative
    ) internal returns(uint256) {

        if (isNative == false) {
            console.log('ERC20 transfer to flint contract');
            transferERC20ToFlintContract(tokenIn, to, amountIn);

            approveRouterForFlintContract(SUSHI_SWAP_ROUTER_ADDRESS, tokenIn, amountIn);
        }


        // Perform swap on router

        // TODO: How to get route in bytes ??

        console.log('Swapping on sushi...');
        console.log(tokenIn);
        console.log(amountIn);
        console.log(tokenOut);
        console.log(amountOutMin);
        console.log(to);
        console.logBytes(route);


        uint256 amountOut = sushiSwapRouter.processRoute(
            tokenIn,
            amountIn,
            tokenOut,
            amountOutMin,
            to,
            route
        );

        return amountOut;

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

        transferERC20ToFlintContract(params.tokenIn, params.userAddress,params.amountIn);

        approveRouterForFlintContract(address(swapRouter), params.tokenIn, params.amountIn);

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

    function approveWithoutFees(
        ApproveWithoutFeesParams memory params
    ) external {
        bytes32 digest = keccak256(
            abi.encodePacked(
                '\x19\x01',
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        GASLESS_APPROVAL_TYPEHASH,
                        params.userAddress,
                        params.approvalSigR,
                        params.approvalSigS,
                        params.approvalSigV,
                        params.tokenAddress,
                        params.approvalValue,
                        params.approvalDeadline,
                        params.fees,
                        params.nonce
                    )
                )
            )
        );
        require(
            params.userAddress ==
                ecrecover(digest, params.sigV, params.sigR, params.sigS),
            '[APROVE WITHOUT FEES] Invalid signature'
        );
        require(
            params.nonce == approvalNonces[params.userAddress]++,
            '[APROVE WITHOUT FEES] Invalid nonce'
        );
        ERC20Permit token = ERC20Permit(params.tokenAddress);
        token.permit(
            params.userAddress,
            address(this),
            params.approvalValue,
            params.approvalDeadline,
            params.approvalSigV,
            params.approvalSigR,
            params.approvalSigS
        );
        token.transferFrom(params.userAddress, address(this), params.fees);
    }

    function _verifyDigest(
        bytes32 digest,
        address userAddress,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV,
        uint nonce
    ) internal {
        console.log("this is verify address");
        console.log(userAddress);
        console.log("this is recovered address");
        console.log(ecrecover(digest, sigV, sigR, sigS));
        require(
            userAddress == ecrecover(digest, sigV, sigR, sigS),
            '[SWAP WITHOUT FEES] Invalid signature'
        );
        require(
            nonce == nonces[userAddress]++,
            '[SWAP WITHOUT FEES] Invalid nonce'
        );
    }

    function _getDigestSushiSwap(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint amountOutMin,
        address to,
        uint nonce,
        bytes memory route
    ) internal view returns (bytes32) {
        
        return 
            keccak256(
                abi.encodePacked(
                    '\x19\x01',
                    DOMAIN_SEPARATOR,
                    keccak256(
                        abi.encode(
                            GASLESS_SUSHISWAP_FLINT_TYPEHASH,
                            tokenIn,
                            amountIn,
                            tokenOut,
                            amountOutMin,
                            to,
                            nonce,
                            keccak256(route)
                        )
                    )
                )
            );
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
    ) internal view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    '\x19\x01',
                    DOMAIN_SEPARATOR,
                    keccak256(
                        abi.encode(
                            GASLESS_SWAP_TYPEHASH,
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
    ) internal pure returns (bytes memory path) {
        path = abi.encodePacked(_path[0]);
        for (uint i = 0; i < _fees.length; i++) {
            path = abi.encodePacked(path, _fees[i], _path[i + 1]);
        }
    }

    function getChainId() internal view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }

    receive() external payable {}
}