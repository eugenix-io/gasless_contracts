pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT

import "hardhat/console.sol";

contract Test {
    bytes32 private constant META_TRANSACTION_TYPEHASH =
        keccak256(
            bytes(
                "SwapWithoutFees(uint amountIn,address tokenIn,address tokenOut,address userAddress,address[] path,uint24[] fees,uint nonce)"
            )
        );
    bytes32 public DOMAIN_SEPARATOR;
    string public constant name = "Flint Gasless";
    string public EIP712_VERSION = "1";

    constructor() {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,address verifyingContract,bytes32 salt)"
                ),
                keccak256(bytes(name)),
                keccak256(bytes(EIP712_VERSION)),
                getChainId(),
                address(this)
            )
        );
    }

    function setDomainSeperator(
        uint amountIn,
        address tokenIn,
        address tokenOut,
        address userAddress,
        address[] memory path,
        uint24[] memory fees,
        uint nonce
    ) external {
        console.log("ABI ENCODE");
        bytes memory a = abi.encode(
            META_TRANSACTION_TYPEHASH,
            amountIn,
            tokenIn,
            tokenOut,
            userAddress,
            path,
            fees
        );
        console.logBytes(a);
        console.log("FIRST KECCACK");
        console.logBytes32(keccak256(a));
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        META_TRANSACTION_TYPEHASH,
                        amountIn,
                        tokenIn,
                        tokenOut,
                        userAddress,
                        path,
                        fees
                    )
                )
            )
        );
    }

    function getChainId() internal returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }
}
