// SPDX-License-Identifier: MIT
// SIMULATION / NOT DEPLOYED
pragma solidity 0.8.28;

/// @notice This repository has no deployment script. Running it reverts.
///         Do not broadcast. Do not attach an RPC. Do not pass a key.
contract RefuseBroadcast {
    error NotDeployed();

    function run() external pure {
        revert NotDeployed();
    }
}
