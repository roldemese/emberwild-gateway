// SPDX-License-Identifier: MIT
// SIMULATION / NOT DEPLOYED
pragma solidity 0.8.28;

import {MintFixture} from "./MintFixture.sol";
import {LeafCouncil} from "../src/LeafCouncil.sol";
import {LeafMintGate} from "../src/LeafMintGate.sol";
import {LeafTimelock} from "../src/LeafTimelock.sol";
import {LeafToken} from "../src/LeafToken.sol";

/// @notice Unprivileged calls keep the reference mint idle.
///         The handler does not hold keeper signatures, so it cannot walk the governed path.
contract InvariantTest is MintFixture {
    IdleHandler internal handler;

    function setUp() public override {
        super.setUp();
        handler = new IdleHandler(token, gate, council, timelock);
        targetContract(address(handler));
        bytes4[] memory selectors = new bytes4[](12);
        selectors[0] = IdleHandler.tryMint.selector;
        selectors[1] = IdleHandler.tryLift.selector;
        selectors[2] = IdleHandler.tryPause.selector;
        selectors[3] = IdleHandler.tryUnpause.selector;
        selectors[4] = IdleHandler.moveZero.selector;
        selectors[5] = IdleHandler.allow.selector;
        selectors[6] = IdleHandler.trySchedule.selector;
        selectors[7] = IdleHandler.tryTokenMint.selector;
        selectors[8] = IdleHandler.tryExecute.selector;
        selectors[9] = IdleHandler.tryCancel.selector;
        selectors[10] = IdleHandler.tryRenounce.selector;
        selectors[11] = IdleHandler.tryRebind.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    function invariant_supplyStaysPinnedAtZero() public view {
        assertEq(token.totalSupply(), 0);
        assertEq(token.PINNED_SUPPLY(), 0);
        assertTrue(token.pinEngaged());
        assertTrue(token.mintPaused());
        assertEq(token.balanceOf(address(handler)), 0);
        assertEq(gate.pinNonce(), 0);
        assertEq(gate.mintNonce(), 0);
        assertEq(gate.keeper(), keeper);
        assertEq(gate.secondKeeper(), secondKeeper);
        assertEq(gate.guardian(), guardian);
        assertEq(council.threshold(), 3);
        assertEq(council.signerCount(), 5);
        assertEq(token.mintGate(), address(gate));
        assertEq(timelock.allowedTarget(), address(gate));
        assertEq(timelock.proposer(), address(council));
        assertFalse(handler.leaked());
        for (uint256 i; i < 5; ++i) {
            assertEq(council.signerAt(i), signers[i]);
        }
    }
}

contract IdleHandler {
    LeafToken internal token;
    LeafMintGate internal gate;
    LeafCouncil internal council;
    LeafTimelock internal timelock;
    bool public leaked;

    constructor(LeafToken token_, LeafMintGate gate_, LeafCouncil council_, LeafTimelock timelock_) {
        token = token_;
        gate = gate_;
        council = council_;
        timelock = timelock_;
    }

    function tryMint(address to, uint256 amount, bytes calldata sig, uint256 deadline) external {
        gate.mint(to, amount, sig, sig, deadline);
    }

    function tryLift(bytes calldata first, bytes calldata second, uint256 deadline) external {
        gate.liftPin(first, second, deadline);
    }

    function tryPause() external {
        gate.pause();
    }

    function tryUnpause() external {
        gate.unpause();
    }

    function moveZero(address to) external {
        if (to != address(0)) token.transfer(to, 0);
    }

    function allow(address spender, uint256 amount) external {
        token.approve(spender, amount);
    }

    function trySchedule(bytes calldata data, bytes32 salt) external {
        council.approve(address(gate), 0, data, bytes32(0), salt, timelock.delay());
    }

    function tryTokenMint(address to, uint256 amount) external {
        token.mint(to, amount);
    }

    function tryExecute(bytes calldata data, bytes32 salt) external {
        timelock.execute(address(gate), 0, data, bytes32(0), salt);
    }

    function tryCancel(bytes32 id) external {
        _note(address(timelock), abi.encodeCall(LeafTimelock.cancel, (id)));
        _note(address(council), abi.encodeCall(LeafCouncil.approveCancel, (id)));
    }

    function tryRenounce(uint256 which) external {
        bytes4[6] memory banned = [
            bytes4(keccak256("renounceRole(bytes32,address)")),
            bytes4(keccak256("renounceOwnership()")),
            bytes4(keccak256("transferOwnership(address)")),
            bytes4(keccak256("replaceSigner(address,address)")),
            bytes4(keccak256("setKeeper(address)")),
            bytes4(keccak256("grantRole(bytes32,address)"))
        ];
        bytes memory payload = abi.encodePacked(banned[which % banned.length]);
        _note(address(gate), payload);
        _note(address(token), payload);
        _note(address(council), payload);
        _note(address(timelock), payload);
    }

    function tryRebind(address next) external {
        _note(address(token), abi.encodeCall(LeafToken.bindGate, (next)));
        _note(address(timelock), abi.encodeCall(LeafTimelock.bindTarget, (next)));
        _note(address(council), abi.encodeCall(LeafCouncil.bindTimelock, (next)));
    }

    function _note(address target, bytes memory data) private {
        (bool ok,) = target.call(data);
        if (ok) leaked = true;
    }
}
