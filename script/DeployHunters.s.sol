// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/BasedHunters.sol";

contract DeployHunters is Script {
    // Mainnet Based ID contract
    address constant BASED_ID_MAINNET = 0xe33b36dAA31a3C234D97ADa1E882E8D79Ee87A7d;
    // Sepolia placeholder — replace with actual Sepolia Based ID if testing
    address constant BASED_ID_SEPOLIA = 0xe33b36dAA31a3C234D97ADa1E882E8D79Ee87A7d;

    function run() external {
        uint256 deployerKey   = vm.envUint("PRIVATE_KEY");
        address deployer      = vm.addr(deployerKey);
        address oracle        = vm.envOr("HUNTERS_ORACLE_ADDRESS", deployer); // default oracle = deployer key
        bool    isMainnet     = block.chainid == 8453;
        address basedID       = isMainnet ? BASED_ID_MAINNET : BASED_ID_SEPOLIA;
        string  memory net    = isMainnet ? "Base Mainnet" : "Base Sepolia";

        console.log("=== Deploying Based Hunters ===");
        console.log("Network:       ", net);
        console.log("Chain ID:      ", block.chainid);
        console.log("Deployer:      ", deployer);
        console.log("Based ID:      ", basedID);
        console.log("Rank Oracle:   ", oracle);

        vm.startBroadcast(deployerKey);
        BasedHunters hunters = new BasedHunters(basedID, oracle, deployer);
        vm.stopBroadcast();

        console.log("=== Deployed ===");
        console.log("BasedHunters:  ", address(hunters));
        console.log("");
        console.log("Next steps:");
        console.log("1. Add to web/.env.local:");
        console.log("   NEXT_PUBLIC_HUNTERS_ADDRESS=", address(hunters));
        console.log("2. Set HUNTERS_ORACLE_ADDRESS in Vercel env (your oracle signing key)");
        console.log("3. Verify on Basescan (run after deploy):");
        console.log("   forge verify-contract <ADDRESS> src/BasedHunters.sol:BasedHunters --chain base");
    }
}
