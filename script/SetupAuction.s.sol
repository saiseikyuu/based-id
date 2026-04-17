// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/BasedID.sol";

/// @dev Approves AuctionHouse to transfer all auction-reserve NFTs from deployer wallet.
contract SetupAuction is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address payable basedIdAddr     = payable(vm.envAddress("BASED_ID_ADDRESS"));
        address auctionHouseAddr = vm.envAddress("AUCTION_HOUSE_ADDRESS");

        BasedID basedId = BasedID(basedIdAddr);

        console.log("=== Approving AuctionHouse ===");
        console.log("BasedID:      ", basedIdAddr);
        console.log("AuctionHouse: ", auctionHouseAddr);

        vm.startBroadcast(deployerPrivateKey);
        basedId.setApprovalForAll(auctionHouseAddr, true);
        vm.stopBroadcast();

        console.log("Done: AuctionHouse approved to transfer all Based IDs");
    }
}
