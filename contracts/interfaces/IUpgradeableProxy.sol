interface IUpgradeableProxy {
    function implementation() external view virtual returns (address);
}
