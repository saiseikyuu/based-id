// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AuctionHouse.sol";

contract DeployAuction is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address payable basedIdAddr = payable(vm.envAddress("BASED_ID_ADDRESS"));

        console.log("=== Deploying AuctionHouse ===");
        console.log("Network:   ", block.chainid == 8453 ? "Base Mainnet" : "Base Sepolia");
        console.log("Deployer:  ", deployer);
        console.log("BasedID:   ", basedIdAddr);
        console.log("Treasury:  ", deployer);

        vm.startBroadcast(deployerPrivateKey);

        AuctionHouse house = new AuctionHouse(
            basedIdAddr,
            block.chainid == 8453
                ? 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913  // USDC mainnet
                : 0x036CbD53842c5426634e7929541eC2318f3dCF7e, // USDC sepolia
            deployer, // treasury = deployer wallet
            deployer  // owner
        );

        vm.stopBroadcast();

        console.log("=== Deployed ===");
        console.log("AuctionHouse:", address(house));
        console.log("");
        console.log("Next steps:");
        console.log("1. Set NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS in web/.env.local");
        console.log("2. From your wallet: basedId.setApprovalForAll(auctionHouse, true)");
        console.log("3. Call createAuction(tokenId, reservePrice, duration) to start bidding");
    }
}
