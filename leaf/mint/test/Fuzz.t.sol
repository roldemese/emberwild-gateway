// SPDX-License-Identifier: MIT
// SIMULATION / NOT DEPLOYED
pragma solidity 0.8.28;

import {MintFixture} from "./MintFixture.sol";
import {LeafLocal} from "../src/LeafLocal.sol";
import {LeafMintFactory} from "../src/LeafMintFactory.sol";
import {LeafToken} from "../src/LeafToken.sol";

contract FuzzTest is MintFixture {
    function testFuzz_randomMintLeavesSupplyAtZero(
        address caller,
        address to,
        uint256 amount,
        bytes memory keeperSig,
        bytes memory secondSig,
        uint256 deadline
    ) public {
        amount = bound(amount, 0, type(uint128).max);
        vm.prank(caller);
        vm.expectRevert();
        gate.mint(to, amount, keeperSig, secondSig, deadline);
        assertEq(token.totalSupply(), 0);
        assertTrue(token.pinEngaged());
        assertTrue(token.mintPaused());
    }

    function testFuzz_randomPinLiftLeavesSupplyAtZero(address caller, bytes memory first, bytes memory second, uint256 deadline)
        public
    {
        vm.prank(caller);
        vm.expectRevert();
        gate.liftPin(first, second, deadline);
        assertEq(token.totalSupply(), 0);
        assertTrue(token.pinEngaged());
    }

    function testFuzz_transferAndApproveDoNotMint(address to, address spender, uint256 amount) public {
        amount = bound(amount, 0, type(uint128).max);
        vm.assume(to != address(0) && spender != address(0));
        if (amount == 0) {
            assertTrue(token.transfer(to, 0));
        } else {
            vm.expectRevert();
            token.transfer(to, amount);
        }
        assertTrue(token.approve(spender, amount));
        assertEq(token.allowance(address(this), spender), amount);
        assertEq(token.totalSupply(), 0);
        assertEq(token.balanceOf(to), 0);
    }

    function testFuzz_strangerCannotPauseOrUnpause(address caller) public {
        vm.assume(caller != guardian && caller != address(timelock));
        vm.prank(caller);
        vm.expectRevert();
        gate.pause();
        vm.prank(caller);
        vm.expectRevert();
        gate.unpause();
        assertTrue(token.mintPaused());
        assertEq(token.totalSupply(), 0);
    }

    function testFuzz_liveChainRefused(uint64 chainId) public {
        vm.assume(chainId != 31337);
        vm.chainId(chainId);
        vm.expectRevert(abi.encodeWithSelector(LeafLocal.LiveChainRefused.selector, chainId));
        new LeafToken();
    }

    function testFuzz_everyDeploymentIsIdle(
        uint96 raw0,
        uint96 raw1,
        uint96 raw2,
        uint96 raw3,
        uint96 raw4,
        uint96 raw5,
        uint96 raw6,
        uint96 raw7,
        bytes32 salt
    ) public {
        address[8] memory raw = [
            address(uint160(raw0) + 1),
            address(uint160(raw1) + 2),
            address(uint160(raw2) + 3),
            address(uint160(raw3) + 4),
            address(uint160(raw4) + 5),
            address(uint160(raw5) + 6),
            address(uint160(raw6) + 7),
            address(uint160(raw7) + 8)
        ];
        for (uint256 i; i < raw.length; ++i) {
            for (uint256 j = i + 1; j < raw.length; ++j) {
                vm.assume(raw[i] != raw[j]);
            }
        }
        address[] memory councilSigners = new address[](5);
        for (uint256 i; i < 5; ++i) councilSigners[i] = raw[i];
        _sort(councilSigners);
        LeafMintFactory born = new LeafMintFactory();
        (LeafToken deployed,,,) = born.deploy(councilSigners, 3, raw[5], raw[6], raw[7], salt);
        assertEq(deployed.totalSupply(), 0);
        assertTrue(deployed.pinEngaged());
        assertTrue(deployed.mintPaused());
        assertEq(deployed.PINNED_SUPPLY(), 0);
    }
}
