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
            testName: 'USDT Approval',
            tokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            decimals: 6,
            fee: 1_000_000,
        },
        {
            testName: 'USDC Approval',
            tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            decimals: 6,
            fee: 1_000_000,
        },
        {
            testName: 'DAI Approval',
            tokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            decimals: 18,
            fee: 1_000_000,
            domainVersion: '2',
        },
        {
            testName: 'ARB Approval',
            tokenAddress: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1',
            decimals: 18,
            fee: 1_000_000,
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
        domainType: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
        ],
    },
};