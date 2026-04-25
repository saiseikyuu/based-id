// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/BasedHunters.sol";

contract DeployHunters is Script {
    address constant BASED_ID_MAINNET = 0xe33b36dAA31a3C234D97ADa1E882E8D79Ee87A7d;
    address constant BASED_ID_SEPOLIA = 0xe33b36dAA31a3C234D97ADa1E882E8D79Ee87A7d;
    address constant USDC_MAINNET     = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant USDC_SEPOLIA     = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant TREASURY         = 0x0CC1984533619f37A82052af1f05997f9d44Ec02;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);
        address oracle      = 0x97D8023288548f73d191e58Da81ff4eE58E47eF7;
        bool    isMainnet   = block.chainid == 8453;
        address basedID     = isMainnet ? BASED_ID_MAINNET : BASED_ID_SEPOLIA;
        address usdcAddr    = isMainnet ? USDC_MAINNET     : USDC_SEPOLIA;
        string memory net   = isMainnet ? "Base Mainnet"   : "Base Sepolia";

        console.log("=== Deploying Based Hunters v3 ===");
        console.log("Network:   ", net);
        console.log("Deployer:  ", deployer);
        console.log("Oracle:    ", oracle);
        console.log("Treasury:  ", TREASURY);
        console.log("USDC:      ", usdcAddr);

        vm.startBroadcast(deployerKey);
        BasedHunters hunters = new BasedHunters(basedID, usdcAddr, TREASURY, oracle, deployer);
        vm.stopBroadcast();

        console.log("=== Deployed ===");
        console.log("BasedHunters:", address(hunters));
        console.log("Rank costs: D/C/B=$2, A=$5, S=$10, N=$20 USDC");
    }
}
