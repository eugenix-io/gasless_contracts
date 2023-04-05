//SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;


import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./interfaces/ISushiSwap.sol";

contract SushiSwapGasless {

    struct SwapWithSushiParams {
        address tokenIn;
        address tokenOut;
        address userAddress;
        uint amountIn;
        uint256 eqNativeToken;
        uint256 amountOutMin;
        uint deadline;
        uint nonce;
        bytes32 sigR;
        bytes32 sigS;
        uint8 sigV;
    }

    ISushiSwap public immutable sushiSwapRouter;
    bytes32 public DOMAIN_SEPARATOR;
    string public EIP_712VERSION = "1";
    string public name = "Flint Sushi swap";

    address public immutable WETH = 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619;
    mapping(address => uint256) nonces;

    bytes32 GASLESS_SUSHISWAP_FLINT_TYPEHASH = keccak256(
        bytes(
            "swapGaslessSushiSwapFlint(address tokenIn,address tokenOut,address userAddress,uint amountIn,uint256 eqNativeToken,uint256 amountOutMin,uint deadline)"
        )
    );

    address[] public path;
    
    address public immutable router = 0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506;
    constructor() {
        sushiSwapRouter = ISushiSwap(router);
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,address verifyingContract,bytes32 salt)"
                ),
                keccak256(bytes(name)),
                keccak256(bytes(EIP_712VERSION)),
                address(this),
                bytes32(getChainId())
            )
        );
    }

    function _getDigest(
        address tokenIn,
        address tokenOut,
        address userAddress,
        uint amountIn,
        uint256 eqNativeToken,
        uint256 amountOutMin,
        uint deadline,
        uint nonce
    ) internal view returns (bytes32 digest) {
        return 
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    DOMAIN_SEPARATOR,
                    keccak256(
                        abi.encode(
                            GASLESS_SUSHISWAP_FLINT_TYPEHASH,
                            tokenIn,
                            tokenOut,
                            userAddress,
                            amountIn,
                            eqNativeToken,
                            amountOutMin,
                            deadline,
                            nonce
                        )
                    )
                )
            );
    }

    function _verifyDigest(
        bytes32 digest,
        address userAddress,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV,
        uint nonce
    ) internal {
        require(userAddress == ecrecover(digest, sigV, sigR, sigS), "Invalid signature for digest");

        require(nonce == nonces[userAddress]++, "Invalid nonce for user transaction");
    }

    function swapGaslessSushiSwapFlint(SwapWithSushiParams memory params) external {

        // console.log('getting digest');

        bytes32 digest = _getDigest(
            params.tokenIn,
            params.tokenOut,
            params.userAddress,
            params.amountIn,
            params.eqNativeToken,
            params.amountOutMin,
            params.deadline,
            params.nonce
        );

        // Verify digest

        _verifyDigest(
            digest,
            params.userAddress,
            params.sigR,
            params.sigS,
            params.sigV,
            params.nonce
        );

        _swapGaslessSushiSwapFlint(params);
        
    }

    function _swapGaslessSushiSwapFlint(SwapWithSushiParams memory params) internal {

        path = [WETH, params.tokenOut];

        // Check approval for ERC-20
        ERC20 erc20token = ERC20(params.tokenIn);

        uint256 allowanceForToken = erc20token.allowance(params.userAddress, address(this));

        require(allowanceForToken >= params.amountIn, "Not enough allowance for token");

        // Transfer equivalent amount of erc20 token to this contract

        require(erc20token.transferFrom(params.userAddress, address(this), params.amountIn), "Failed to transfer ERC-20 to contract");

        sushiSwapRouter.swapExactETHForTokens{value: params.eqNativeToken}(
            params.amountOutMin,
            path,
            params.userAddress,
            params.deadline
        );
    }

    function getChainId() internal view returns(uint) {
        uint id;

        assembly {
            id := chainid()
        }

        return id;
    }

    receive() external payable {}
}