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
        IHunters(0x9948275197eF91168def6Da11140A9Da0855603B).setOracle(oracle);
        vm.stopBroadcast();
        console.log("Oracle updated to:", oracle);
    }
}
