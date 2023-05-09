const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

// Get gasless approval
    // get signature

    // send signature
// Swap

describe('Starting Gas Router tests', () => {
    let gasRouter;
    beforeEach(async () => {

        const GasRouter = await ethers.getContractFactory('GasRouterV1');
        gasRouter = await upgrades.deployProxy(GasRouter, [], { initializer: 'initialize' });

        await gasRouter.deployed();

        console.log(gasRouter.address, "Gas router address");

    });

    it ('Approval gasless', async () => {
        
    })

    it('Check', async () => {
        const _transactionId = '0x8f2e0b7578694736181ac266cd9ed62e1e1173c59ba4ff8b87e79da88a901c72';
        const _integrator = 'jumper.exchange';
        const _referrer = '0x0000000000000000000000000000000000000000';
        const _receiver = '0xd7c9f3b280d4690c3232469f3bcb4361632bfc77';
        const _minAmount = '80';
        const _swapData = [{
            "callTo":"0x1111111254eeb25477b68fb85ed929f73a960582",
            "approveTo":"0x1111111254eeb25477b68fb85ed929f73a960582",
            "sendingAssetId":"0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
            "receivingAssetId":"0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
            "fromAmount":"81",
            "callData":"0x12aa3caf000000000000000000000000b97cd69145e5a9357b2acd6af6c5076380f17afb000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f0000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa84174000000000000000000000000b78906c8a461d6a39a57285c129843e1937c32780000000000000000000000001231deb6f5749ef6ce6943a275a1d3e7486f4eae0000000000000000000000000000000000000000000000000000000000000051000000000000000000000000000000000000000000000000000000000000004f0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008500000000000000000000000000000000000000000000000000000000006700206ae4071138000f4240b78906c8a461d6a39a57285c129843e1937c32781111111254eeb25477b68fb85ed929f73a960582000000000000000000000000000000000000000000000000000000000000004fc2132d05d31c914a87c6611c10748aeb04b58e8f0000000000000000000000000000000000000000000000000000002e9b3012",
            "requiresDeposit":true
        }]
        const val = await jumper.execJumperSwap(
            _transactionId,
            _integrator,
            _referrer,
            _receiver,
            _minAmount,
            _swapData
            );
        expect(val).to.equal(true);
    })
})