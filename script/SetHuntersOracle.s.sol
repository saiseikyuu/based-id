// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

interface IHunters {
    function setOracle(address _oracle) external;
}

contract SetHuntersOracle is Script {
    function run() external {
        uint256 pk   = vm.envUint("PRIVATE_KEY");
        address oracle = 0x97D8023288548f73d191e58Da81ff4eE58E47eF7;
        vm.startBroadcast(pk);
        IHunters(0xbD550795D6a3461c1D1BfB89eBE00a752a8B48ad).setOracle(oracle);
        vm.stopBroadcast();
        console.log("Oracle updated to:", oracle);
    }
}
