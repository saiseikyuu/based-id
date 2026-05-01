// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MemeWar.sol";

contract DeployMemeWar is Script {
    address constant USDC_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant USDC_MAINNET = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);
        bool    isMainnet   = block.chainid == 8453;
        address usdc        = isMainnet ? USDC_MAINNET : USDC_SEPOLIA;

        vm.startBroadcast(deployerKey);
        MemeWar memeWar = new MemeWar(usdc, deployer);
        vm.stopBroadcast();

        console.log("MemeWar deployed to:", address(memeWar));
        console.log("Owner:              ", deployer);
        console.log("USDC:               ", usdc);
        console.log("Chain ID:           ", block.chainid);
    }
}
