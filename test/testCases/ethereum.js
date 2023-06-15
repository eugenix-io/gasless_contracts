module.exports = {
    gaslessSwaps: [

        {
            testName: 'USDC -> USDT Single',
            fromTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            toTokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            nonceFunction: 'nonces',
            nativeFeeTier: 500,
            decimals: 6,


        },
        {
            testName: 'USDT -> DAI Single',
            fromTokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            toTokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            decimals: 6,
            nativeFeeTier: 500,
            path: [
                '0xdAC17F958D2ee523a2206206994597C13D831ec7',
                '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            ],
            fees: [500],
        },
        {
            testName: 'USDC -> DAI Single',
            fromTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            toTokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            nonceFunction: 'nonces',
            nativeFeeTier: 500,
            decimals: 6,
        },
        {
            testName: 'USDT -> SUSHI Multihop',
            fromTokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            toTokenAddress: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2',
            nativeFeeTier: 500,
            decimals: 6,
            path: [
                '0xdAC17F958D2ee523a2206206994597C13D831ec7',
                '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
                '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2',
            ],
            fees: [500, 3000],
        }

    ],
    gaslessApproval: [
        {
            testName: 'USDC Approval',
            tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            decimals: 6,
            fee: 1_000_000,
            domainVersion: '2',
            symbol: 'USDC'
        },
        {
            testName: 'DAI Approval',
            tokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            decimals: 18,
            fee: 1_000_000,
            domainVersion: '1',
            symbol: 'DAI',
            binaryPermitType: true
        },
        {
            testName: 'ARB Approval',
            tokenAddress: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1',
            decimals: 18,
            fee: 1_000_000,
            domainVersion: '1',
            symbol: 'ARB'
        },
        {
            testName: '1INCH Approval',
            tokenAddress: '0x111111111117dC0aa78b770fA6A738034120C302',
            decimals: 18,
            fee: 1_000_000,
            domainVersion: '1',
            symbol: '1INCH'
        },
        {
            testName: 'AAVE Approval',
            tokenAddress: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
            decimals: 18,
            fee: 1_000_000,
            domainVersion: '1',
            symbol: 'AAVE_ETH'
        },
        {
            testName: 'Uniswap Approval',
            tokenAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
            decimals: 18,
            fee: 1_000_000,
            symbol: 'UNI'
        }
    ],
    constants: {
        permitType: {
            types: [
                { name: 'owner', type: 'address' },
                { name: 'spender', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'nonce', type: 'uint256' },
                { name: 'deadline', type: 'uint256' },
            ],
            name: 'Permit',
        },
        daiPermitType: {
            types: [
                { name: 'holder', type: 'address' },
                { name: 'spender', type: 'address' },
                { name: 'nonce', type: 'uint256' },
                { name: 'expiry', type: 'uint256' },
                { name: 'allowed', type: 'bool' },
            ],
            name: 'Permit',
        },
        domainType: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
        ],
        uniswapDomainType: [
            { name: 'name', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
        ]
    },
};