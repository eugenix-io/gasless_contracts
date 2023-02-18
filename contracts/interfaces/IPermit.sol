interface IPermit {
    function permit(
        address holder,
        address spender,
        uint256 nonce,
        uint256 expiry,
        bool allowed,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function getNonce(address user) external view returns (uint256 nonce);

    function nonces(address user) external view returns (uint256 nonce);
}
