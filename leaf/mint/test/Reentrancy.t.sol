// SPDX-License-Identifier: MIT
// SIMULATION / NOT DEPLOYED
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {LeafMintGate} from "../src/LeafMintGate.sol";
import {LeafTimelock} from "../src/LeafTimelock.sol";

/// @notice A token that calls back into the gate must not be able to reenter.
contract ReentrancyTest is Test {
    EvilToken internal evil;
    Dummy internal lock;
    LeafMintGate internal gate;
    uint256 internal keeperKey;
    uint256 internal secondKey;

    function test_pauseReentrancyReverts() public {
        _arm("pause");
        vm.prank(gate.guardian());
        vm.expectRevert(ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
        gate.pause();
        assertEq(evil.calls(), 0);
    }

    function test_mintReentrancyRevertsBeforeASecondEntry() public {
        _arm("mint");
        uint256 deadline = block.timestamp + 10 days;
        bytes32 digest = gate.hashMint(address(this), 1 ether, 0, deadline);
        bytes memory first = _pack(keeperKey, digest);
        bytes memory second = _pack(secondKey, digest);
        vm.prank(address(lock));
        vm.expectRevert(ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
        gate.mint(address(this), 1 ether, first, second, deadline);
        assertEq(gate.mintNonce(), 0);
        assertEq(evil.calls(), 0);
    }

    function test_timelockExecuteCannotNestASecondCall() public {
        ReenteringGate target = new ReenteringGate();
        address factory = makeAddr("reenter-factory");
        LeafTimelock delayed = new LeafTimelock(address(this), makeAddr("cancel"), 7 days, factory);
        vm.prank(factory);
        delayed.bindTarget(address(target));
        bytes memory inner = abi.encodeCall(ReenteringGate.touch, ());
        bytes memory outer = abi.encodeCall(ReenteringGate.attack, (delayed, inner));
        bytes32 saltIn = keccak256("inner");
        bytes32 saltOut = keccak256("outer");
        delayed.schedule(address(target), 0, inner, bytes32(0), saltIn, 7 days);
        delayed.schedule(address(target), 0, outer, bytes32(0), saltOut, 7 days);
        vm.warp(block.timestamp + 7 days);
        vm.expectRevert(ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
        delayed.execute(address(target), 0, outer, bytes32(0), saltOut);
        assertFalse(delayed.executed(delayed.hashOperation(address(target), 0, inner, bytes32(0), saltIn)));
        assertFalse(delayed.executed(delayed.hashOperation(address(target), 0, outer, bytes32(0), saltOut)));
        assertEq(target.touches(), 0);
    }

    function _arm(string memory label) internal {
        evil = new EvilToken();
        lock = new Dummy();
        keeperKey = uint256(keccak256(abi.encodePacked("SIMULATION-LOCAL-EVM-ONLY-NOT-A-WALLET", label, "keeper")));
        secondKey = uint256(keccak256(abi.encodePacked("SIMULATION-LOCAL-EVM-ONLY-NOT-A-WALLET", label, "second")));
        gate = new LeafMintGate(address(evil), address(lock), vm.addr(keeperKey), vm.addr(secondKey), makeAddr(label));
        evil.setGate(gate);
    }

    function _pack(uint256 key, bytes32 digest) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }
}

contract Dummy {}

contract ReenteringGate {
    uint256 public touches;

    function touch() external {
        touches += 1;
    }

    function attack(LeafTimelock lock, bytes calldata inner) external {
        lock.execute(address(this), 0, inner, bytes32(0), keccak256("inner"));
    }
}

contract EvilToken {
    LeafMintGate public gate;
    uint256 public calls;

    function setGate(LeafMintGate gate_) external {
        gate = gate_;
    }

    function pauseMint() external {
        calls += 1;
        gate.pause();
    }

    function mint(address to, uint256 amount) external {
        calls += 1;
        gate.mint(to, amount, "", "", block.timestamp + 1);
    }

    function unpauseMint() external {}

    function liftPin() external {}

    function pinEngaged() external pure returns (bool) {
        return false;
    }

    function mintPaused() external pure returns (bool) {
        return false;
    }

    function totalSupply() external pure returns (uint256) {
        return 0;
    }

    function mintGate() external view returns (address) {
        return address(gate);
    }
}
