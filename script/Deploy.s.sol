// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/BasedID.sol";

contract DeployBasedID is Script {
    address constant USDC_BASE_MAINNET = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        bool isMainnet = block.chainid == 8453;
        address usdcAddress = isMainnet ? USDC_BASE_MAINNET : USDC_BASE_SEPOLIA;
        string memory network = isMainnet ? "Base Mainnet" : "Base Sepolia";

        console.log("=== Deploying Based ID ===");
        console.log("Network:   ", network);
        console.log("Chain ID:  ", block.chainid);
        console.log("Deployer:  ", deployer);
        console.log("USDC:      ", usdcAddress);
        console.log("Price:      $2 USDC flat");

        vm.startBroadcast(deployerPrivateKey);
        BasedID basedID = new BasedID(usdcAddress, deployer);
        vm.stopBroadcast();

        console.log("=== Deployed ===");
        console.log("Contract:  ", address(basedID));
        console.log("");
        console.log("Next steps:");
        console.log("1. Copy the contract address above");
        console.log("2. Paste it into web/.env.local as NEXT_PUBLIC_CONTRACT_ADDRESS");
        console.log("3. Set NEXT_PUBLIC_CHAIN_ID to", block.chainid);
        console.log("4. Run: npm run build (in /web)");
    }
}
