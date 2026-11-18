// SPDX-License-Identifier: MIT
// SIMULATION / NOT DEPLOYED
pragma solidity 0.8.28;

/// @notice Chain guard for the reference Leaf mint.
///         Construction is allowed only on the in-memory Forge/Anvil chain.
///         Every public chain id, including Ethereum, Base, and their testnets, reverts.
library LeafLocal {
    /// @dev Forge and Anvil use this id. It is not a network this repository contacts.
    uint256 internal constant LOCAL_CHAIN = 31337;

    error LiveChainRefused(uint256 chainId);

    function localOnly() internal view {
        if (block.chainid != LOCAL_CHAIN) revert LiveChainRefused(block.chainid);
    }
}
