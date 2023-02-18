interface WrappedToken {
    function deposit() external payable;

    function withdraw(uint256 amount) external;

    function balanceOf(address) external view returns (uint);

    function approve(address spender, uint256 amount) external returns (bool);

    function allowance(
        address owner,
        address spender
    ) external view returns (uint);
}
