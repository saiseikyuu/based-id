// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/BasedID.sol";

/// @dev Run after Deploy.s.sol to mint the auction reserve and open public minting.
contract SetupBasedID is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address payable contractAddr = payable(vm.envAddress("BASED_ID_ADDRESS"));

        BasedID basedID = BasedID(contractAddr);

        console.log("=== Setting up Based ID ===");
        console.log("Contract:  ", contractAddr);
        console.log("Deployer:  ", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Mint #1–#100 to deployer wallet (auction reserve)
        basedID.ownerMint(deployer);
        console.log("ownerMint done: #1-#100 minted to deployer");

        // Step 2: Open public minting at #101
        basedID.setPaused(false);
        console.log("setPaused(false) done: public mint open at #101");

        vm.stopBroadcast();

        console.log("=== Setup complete ===");
        console.log("totalMinted: ", basedID.totalMinted());
        console.log("nextTokenId: ", basedID.nextTokenId());
        console.log("mintingPaused:", basedID.mintingPaused());
    }
}
