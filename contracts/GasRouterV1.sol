//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "hardhat/console.sol";

struct SwapData {
    address callTo;
    address approveTo;
    address sendingAssetId;
    address receivingAssetId;
    uint256 fromAmount;
    bytes callData;
    bool requiresDeposit;
}

interface ILifiDiamond {
    function executeSwap(
        bytes32 _transactionId,
        string calldata _integrator,
        string calldata _referrer,
        address payable _receiver,
        uint _minAmount,
        SwapData[] calldata _swapData
    ) external;
}

contract GasRouterV1 is Initializable, OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    ILifiDiamond private lifiDiamond;
    mapping (address => uint) public nonces;

    bytes32 public DOMAIN_SEPARATOR;
    string public constant name = "Flint Gas Router";
    string public EIP712_VERSION;
    
    bytes32 public constant JUMPER_SWAP_TYPEHASH = 
        keccak256(
            bytes(
                'SwapWithoutFeesJumper(uint nonce)'
            )
        );

    address private constant LifiDiamondProxyAddress = 0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE;

    struct SwapWithJumperGaslessParams {
        bytes32 transactionId;
        string integrator;
        string referrer;
        address payable receiver;
        uint minAmount;
        SwapData[] swapData;
        uint nonce;
        address userAddress;
        bytes32 sigR;
        bytes32 sigS;
        uint8 sigV;
    }
   
    function initialize () external initializer {
        __Ownable_init();
        EIP712_VERSION = '1';
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

        lifiDiamond = ILifiDiamond(LifiDiamondProxyAddress);
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function transfer(address payable to, uint256 amount) public onlyOwner {
        (bool success, ) = to.call{value: amount}('');
        require(success);
    }

    function transferERC20(
        address payable to,
        uint256 amount,
        address tokenAddress
    ) public onlyOwner {
        ERC20Upgradeable token = ERC20Upgradeable(tokenAddress);
        require(token.transfer(to, amount), 'Failed to transfer ERC20 token');
    }

    function swapWithJumperGasless (SwapWithJumperGaslessParams memory params) external returns(uint) {

        console.log("Inside contract data:");
        console.logBytes32(bytes32(getChainId()));
        console.log(address(this));
        console.logBytes32(params.transactionId);
        console.log(params.integrator);
        console.log(params.referrer);
        console.log(params.receiver);
        console.log(params.minAmount);
        console.log(params.nonce);

        bytes32 digest = _getDigestJumper(
            params.transactionId,
            params.integrator,
            params.referrer,
            params.receiver,
            params.minAmount,
            params.swapData,
            params.nonce
        );

        _verifyDigest(digest, params.userAddress, params.sigR, params.sigS, params.sigV, params.nonce);
        uint amountOut = _swapWithJumperGaslessImplement(params);

        return amountOut;
    }

    function _swapWithJumperGaslessImplement (SwapWithJumperGaslessParams memory params) internal returns(uint) {

        // Check the from token and transfer the amountIn to this contract
        IERC20Upgradeable token = IERC20Upgradeable(params.swapData[0].sendingAssetId);
        token.safeTransferFrom(params.userAddress, address(this), params.swapData[0].fromAmount);

        // Check whether Flint contract has given allowance or not
        if (
            token.allowance(address(this), LifiDiamondProxyAddress) <
            params.swapData[0].fromAmount
        ) {
            token.safeApprove(
                LifiDiamondProxyAddress,
                0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
            );
        }

        console.log("Reached herer!!!!!");

        // Check the initial balance of output token
        IERC20Upgradeable tokenOut = IERC20Upgradeable(params.swapData[0].receivingAssetId);

        uint userInitBalance = tokenOut.balanceOf(params.receiver);

        // Execute this transaction to diamond jumper

        console.log("Reached herer!!!!!222222");

        lifiDiamond.executeSwap(
            params.transactionId,
            params.integrator,
            params.referrer,
            params.receiver,
            params.minAmount,
            params.swapData
        );

        console.log("Reached herer!!!!!333333");

        uint userFinalBalance = tokenOut.balanceOf(params.receiver);

        uint amountOut = userFinalBalance - userInitBalance;

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
        console.log("_verifyDigest $$$");
        console.logBytes32(digest);
        console.log(userAddress);
        console.logBytes32(sigR);
        console.logBytes32(sigS);
        console.log(sigV);
        console.log(nonce);

        address recAddress = ecrecover(digest, sigV, sigR, sigS);

        console.log("Recovered address");
        console.log(recAddress);

        require(
            userAddress == recAddress,
            '[SWAP WITHOUT FEES] Invalid signature'
        );
        require(
            nonce == nonces[userAddress]++,
            '[SWAP WITHOUT FEES] Invalid nonce'
        );
    }

    function _getDigestJumper (
        bytes32 transactionId,
        string memory integrator,
        string memory referrer,
        address receiver,
        uint minAmount,
        SwapData[] memory swapData,
        uint nonce
    ) internal view returns(bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    '\x19\x01',
                    DOMAIN_SEPARATOR,
                    keccak256(
                        abi.encode(
                            JUMPER_SWAP_TYPEHASH,
                            nonce
                        )
                    )
                )
            );
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