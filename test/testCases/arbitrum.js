module.exports = {
    gaslessSwaps: [
        {
            testName: 'USDT -> DAI Single',
            fromTokenAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
            toTokenAddress: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
            decimals: 6,
            nativeFeeTier: 500,
            path: [
                '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
                '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
            ],
            fees: [500],
        },
        {
            testName: 'DAI -> USDT Single',
            fromTokenAddress: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
            toTokenAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
            nativeFeeTier: 500,
            decimals: 18,
            acquireTokenPath: [
                '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
                '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
                '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
            ],
            acquireTokenFee: ['500', '500'],
        },
        {
            testName: 'USDC -> DAI Single',
            fromTokenAddress: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
            toTokenAddress: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
            nonceFunction: 'nonces',
            nativeFeeTier: 500,
            decimals: 6,
        },
        {
            testName: 'USDT -> SUSHI Multihop',
            fromTokenAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
            toTokenAddress: '0xd4d42F0b6DEF4CE0383636770eF773390d85c61A',
            nativeFeeTier: 500,
            decimals: 6,
            path: [
                '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
                '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
                '0xd4d42F0b6DEF4CE0383636770eF773390d85c61A',
            ],
            fees: [500, 3000],
        },
        {
            testName: 'USDT -> BAL Multihop',
            fromTokenAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
            toTokenAddress: '0x040d1EdC9569d4Bab2D15287Dc5A4F10F56a56B8',
            decimals: 6,
            nativeFeeTier: 500,
            path: [
                '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
                '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
                '0x040d1EdC9569d4Bab2D15287Dc5A4F10F56a56B8',
            ],
            fees: [100, 10000],
        },
    ],
    gaslessApproval: [
        {
            testName: 'USDT Approval',
            tokenAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
            decimals: 6,
            fee: 1_000_000,
        },
        {
            testName: 'USDC Approval',
            tokenAddress: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
            decimals: 6,
            fee: 1_000_000,
        },
        {
            testName: 'DAI Approval',
            tokenAddress: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
            decimals: 18,
            fee: 1_000_000,
            domainVersion: '2',
        },
        {
            testName: 'ARB Approval',
            tokenAddress: '0x912CE59144191C1204E64559FE8253a0e49E6548',
            decimals: 18,
            fee: 1_000_000,
        },
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
