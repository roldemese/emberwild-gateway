// SPDX-License-Identifier: MIT
// SIMULATION / NOT DEPLOYED
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {LeafCouncil} from "../src/LeafCouncil.sol";
import {LeafMintFactory} from "../src/LeafMintFactory.sol";
import {LeafMintGate} from "../src/LeafMintGate.sol";
import {LeafTimelock} from "../src/LeafTimelock.sol";
import {LeafToken} from "../src/LeafToken.sol";

/// @notice Local idle system. Keeper integers exist only inside Forge on chain 31337.
///         They are not wallets, not seeds, and they are never written out.
abstract contract MintFixture is Test {
    uint256 internal keeperKey;
    uint256 internal secondKey;
    address internal keeper;
    address internal secondKeeper;
    address internal guardian;
    address[] internal signers;
    LeafMintFactory internal factory;
    LeafToken internal token;
    LeafMintGate internal gate;
    LeafTimelock internal timelock;
    LeafCouncil internal council;

    function setUp() public virtual {
        keeperKey = _localKey("keeper");
        secondKey = _localKey("second-keeper");
        keeper = vm.addr(keeperKey);
        secondKeeper = vm.addr(secondKey);
        guardian = makeAddr("guardian");
        address[] memory councilSigners = new address[](5);
        councilSigners[0] = makeAddr("council-1");
        councilSigners[1] = makeAddr("council-2");
        councilSigners[2] = makeAddr("council-3");
        councilSigners[3] = makeAddr("council-4");
        councilSigners[4] = makeAddr("council-5");
        _sort(councilSigners);
        signers = councilSigners;

        factory = new LeafMintFactory();
        (token, gate, timelock, council) =
            factory.deploy(signers, 3, keeper, secondKeeper, guardian, keccak256("reference-idle"));

        assertEq(token.totalSupply(), 0);
        assertTrue(token.pinEngaged());
        assertTrue(token.mintPaused());
        assertFalse(factory.KEEPER_PLANS_TO_MINT());
    }

    function _localKey(string memory label) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked("SIMULATION-LOCAL-EVM-ONLY-NOT-A-WALLET", label)));
    }

    function _sign(uint256 key, bytes32 digest) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    function _sort(address[] memory items) internal pure {
        uint256 count = items.length;
        for (uint256 i; i < count; ++i) {
            for (uint256 j = i + 1; j < count; ++j) {
                if (items[j] < items[i]) {
                    (items[i], items[j]) = (items[j], items[i]);
                }
            }
        }
    }

    function _queue(bytes memory data, bytes32 salt, bytes32 predecessor) internal returns (bytes32 id) {
        uint256 delay = timelock.delay();
        for (uint256 i; i < council.threshold(); ++i) {
            vm.prank(signers[i]);
            council.approve(address(gate), 0, data, predecessor, salt, delay);
        }
        id = timelock.hashOperation(address(gate), 0, data, predecessor, salt);
        assertGt(timelock.readyAt(id), block.timestamp);
    }

    function _execute(bytes memory data, bytes32 salt, bytes32 predecessor) internal {
        bytes32 id = _queue(data, salt, predecessor);
        vm.warp(timelock.readyAt(id));
        timelock.execute(address(gate), 0, data, predecessor, salt);
        assertTrue(timelock.executed(id));
    }
}
