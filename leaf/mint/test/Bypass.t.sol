// SPDX-License-Identifier: MIT
// SIMULATION / NOT DEPLOYED
pragma solidity 0.8.28;

import {MintFixture} from "./MintFixture.sol";
import {LeafCouncil} from "../src/LeafCouncil.sol";
import {LeafLocal} from "../src/LeafLocal.sol";
import {LeafMintGate} from "../src/LeafMintGate.sol";
import {LeafTimelock} from "../src/LeafTimelock.sol";

/// @notice Attempts to mint by dropping a role, swapping a signer, cancelling,
///         replaying, malleating a signature, or moving the signature to another chain.
///         Every attempt leaves the supply at 0 unless the full governed path has already run,
///         and a replay after that path does not mint again.
contract BypassTest is MintFixture {
    address internal recipient;

    function setUp() public override {
        super.setUp();
        recipient = makeAddr("recipient");
    }

    function test_roleRenounceDoesNotDropARequiredSigner() public {
        bytes4[5] memory banned = [
            bytes4(keccak256("renounceRole(bytes32,address)")),
            bytes4(keccak256("renounceOwnership()")),
            bytes4(keccak256("transferOwnership(address)")),
            bytes4(keccak256("replaceSigner(address,address)")),
            bytes4(keccak256("setKeeper(address)"))
        ];
        for (uint256 i; i < banned.length; ++i) {
            bytes memory payload = abi.encodePacked(banned[i], bytes32(0), bytes32(uint256(uint160(recipient))));
            assertFalse(_call(address(token), payload));
            assertFalse(_call(address(gate), payload));
            assertFalse(_call(address(council), payload));
            assertFalse(_call(address(timelock), payload));
        }
        assertEq(gate.keeper(), keeper);
        assertEq(gate.secondKeeper(), secondKeeper);
        assertEq(gate.guardian(), guardian);
        assertEq(council.signerCount(), 5);
        assertEq(council.threshold(), 3);
        _assertStillPinned();
    }

    function test_oneCouncilSignerCannotCancelOrReplaceTheSet() public {
        bytes memory data = abi.encodeCall(LeafMintGate.unpause, ());
        bytes32 salt = keccak256("one-signer-cancel");
        bytes32 id = _queue(data, salt, bytes32(0));

        vm.prank(signers[0]);
        vm.expectRevert(LeafTimelock.NotCanceller.selector);
        timelock.cancel(id);

        vm.prank(signers[0]);
        council.approveCancel(id);
        assertEq(council.cancelApprovals(id), 1);
        assertGt(timelock.readyAt(id), 0);

        address intruder = makeAddr("intruder");
        assertFalse(council.isSigner(intruder));
        vm.prank(intruder);
        vm.expectRevert(LeafCouncil.NotSigner.selector);
        council.approveCancel(id);

        for (uint256 i; i < 5; ++i) {
            assertEq(council.signerAt(i), signers[i]);
            assertTrue(council.isSigner(signers[i]));
        }
        assertFalse(council.isSigner(keeper));
        _assertStillPinned();
    }

    function test_threeOfFiveCanCancelAndTheCallDoesNotRun() public {
        uint256 deadline = block.timestamp + 20 days;
        bytes32 digest = gate.hashMint(recipient, 1 ether, gate.mintNonce(), deadline);
        bytes memory data = abi.encodeCall(
            LeafMintGate.mint,
            (recipient, 1 ether, _sign(keeperKey, digest), _sign(secondKey, digest), deadline)
        );
        bytes32 salt = keccak256("council-cancel");
        bytes32 id = _queue(data, salt, bytes32(0));

        vm.prank(signers[0]);
        council.approveCancel(id);
        vm.prank(signers[1]);
        council.approveCancel(id);
        assertEq(timelock.readyAt(id), block.timestamp + 7 days, "two votes do not cancel");

        vm.prank(signers[2]);
        council.approveCancel(id);
        assertEq(timelock.readyAt(id), 0);
        assertFalse(timelock.executed(id));

        vm.warp(block.timestamp + 8 days);
        vm.expectRevert(abi.encodeWithSelector(LeafTimelock.OperationMissing.selector, id));
        timelock.execute(address(gate), 0, data, bytes32(0), salt);
        _assertStillPinned();

        vm.prank(signers[3]);
        vm.expectRevert(LeafCouncil.AlreadyQueued.selector);
        council.approveCancel(id);
        _assertStillPinned();
    }

    function test_executedCallCannotBeReplayedOrCancelledIntoASecondMint() public {
        _openThenMint();
        assertEq(token.totalSupply(), 1 ether);

        uint256 deadline = block.timestamp + 20 days;
        uint256 usedNonce = gate.mintNonce() - 1;
        bytes32 digest = gate.hashMint(recipient, 1 ether, usedNonce, deadline);
        bytes memory data = abi.encodeCall(
            LeafMintGate.mint,
            (recipient, 1 ether, _sign(keeperKey, digest), _sign(secondKey, digest), deadline)
        );
        // The executed operation used a different salt inside _openThenMint. Replay the same
        // authorization bytes under a new salt: the nonce has moved, so the signature is dead.
        bytes32 salt = keccak256("replay-after");
        bytes32 id = _queue(data, salt, bytes32(0));
        vm.warp(timelock.readyAt(id));
        vm.expectRevert(LeafMintGate.BadSignature.selector);
        timelock.execute(address(gate), 0, data, bytes32(0), salt);
        assertEq(token.totalSupply(), 1 ether);

        bytes32 again = keccak256("replay-same-id");
        bytes memory fresh = _freshMintData(1 ether);
        bytes32 first = _executeReturning(fresh, again);
        assertEq(token.totalSupply(), 2 ether);
        vm.expectRevert(abi.encodeWithSelector(LeafTimelock.OperationDone.selector, first));
        timelock.execute(address(gate), 0, fresh, bytes32(0), again);
        assertEq(token.totalSupply(), 2 ether);

        vm.prank(guardian);
        vm.expectRevert(abi.encodeWithSelector(LeafTimelock.OperationMissing.selector, first));
        timelock.cancel(first);
        assertEq(token.totalSupply(), 2 ether);
    }

    function test_highSAndFlippedVDoNotAuthorizeAMint() public {
        uint256 curve = uint256(0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141);
        _rejectMalleable(curve, true, false, keccak256("high-s"));
        _rejectMalleable(curve, false, false, keccak256("flipped-v"));
        _rejectMalleable(curve, true, true, keccak256("high-s-second"));
        _assertStillPinned();
    }

    function test_foreignChainAndWrongNonceDoNotReplay() public {
        uint256 deadline = block.timestamp + 12 days;
        address to = recipient;
        bytes32 local = gate.hashMint(to, 1 ether, 0, deadline);

        vm.chainId(8453);
        bytes32 baseDigest = gate.hashMint(to, 1 ether, 0, deadline);
        assertTrue(baseDigest != local);
        bytes memory baseKeeper = _sign(keeperKey, baseDigest);
        bytes memory baseSecond = _sign(secondKey, baseDigest);

        vm.chainId(1);
        vm.prank(address(timelock));
        vm.expectRevert(abi.encodeWithSelector(LeafLocal.LiveChainRefused.selector, 1));
        gate.mint(to, 1 ether, baseKeeper, baseSecond, deadline);
        vm.prank(address(gate));
        vm.expectRevert(abi.encodeWithSelector(LeafLocal.LiveChainRefused.selector, 1));
        token.mint(to, 1 ether);

        vm.chainId(31337);
        _rejectMint(baseKeeper, baseSecond, deadline, keccak256("base-replay"));

        uint256 later = block.timestamp + 20 days;
        bytes32 futureNonce = gate.hashMint(to, 1 ether, 1, later);
        _rejectMint(_sign(keeperKey, futureNonce), _sign(secondKey, futureNonce), later, keccak256("nonce-plus"));

        uint256 amountDeadline = block.timestamp + 20 days;
        bytes32 otherAmount = gate.hashMint(to, 2 ether, 0, amountDeadline);
        bytes memory amountData = abi.encodeCall(
            LeafMintGate.mint,
            (to, 1 ether, _sign(keeperKey, otherAmount), _sign(secondKey, otherAmount), amountDeadline)
        );
        bytes32 amountId = _queue(amountData, keccak256("amount-mismatch"), bytes32(0));
        vm.warp(timelock.readyAt(amountId));
        vm.expectRevert(LeafMintGate.BadSignature.selector);
        timelock.execute(address(gate), 0, amountData, bytes32(0), keccak256("amount-mismatch"));
        _assertStillPinned();
    }

    function test_directRoleCallsLeaveThePinOn() public {
        vm.prank(keeper);
        vm.expectRevert();
        gate.mint(recipient, 1 ether, "", "", block.timestamp + 1 days);
        vm.prank(guardian);
        vm.expectRevert(LeafMintGate.NotTimelock.selector);
        gate.liftPin("", "", block.timestamp + 1 days);
        vm.prank(guardian);
        vm.expectRevert(LeafMintGate.NotTimelock.selector);
        gate.unpause();
        vm.prank(signers[0]);
        vm.expectRevert(LeafTimelock.NotProposer.selector);
        timelock.schedule(address(gate), 0, abi.encodeCall(LeafMintGate.unpause, ()), bytes32(0), keccak256("no"), 7 days);
        _assertStillPinned();
    }

    function _rejectMalleable(uint256 curve, bool highS, bool onSecond, bytes32 salt) internal {
        uint256 deadline = block.timestamp + 20 days;
        bytes32 digest = gate.hashMint(recipient, 1 ether, 0, deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(onSecond ? secondKey : keeperKey, digest);
        bytes32 sValue = highS ? bytes32(curve - uint256(s)) : s;
        uint8 vValue = highS ? v : uint8(v == 27 ? 28 : 27);
        bytes memory bad = abi.encodePacked(r, sValue, vValue);
        bytes memory honest = _sign(onSecond ? keeperKey : secondKey, digest);
        if (onSecond) _rejectMint(honest, bad, deadline, salt);
        else _rejectMint(bad, honest, deadline, salt);
    }

    function _rejectMint(bytes memory keeperSig, bytes memory secondSig, uint256 deadline, bytes32 salt) internal {
        bytes memory data = abi.encodeCall(LeafMintGate.mint, (recipient, 1 ether, keeperSig, secondSig, deadline));
        bytes32 id = _queue(data, salt, bytes32(0));
        vm.warp(timelock.readyAt(id));
        vm.expectRevert(LeafMintGate.BadSignature.selector);
        timelock.execute(address(gate), 0, data, bytes32(0), salt);
    }

    function _freshMintData(uint256 amount) internal view returns (bytes memory) {
        uint256 deadline = block.timestamp + 20 days;
        bytes32 digest = gate.hashMint(recipient, amount, gate.mintNonce(), deadline);
        return abi.encodeCall(
            LeafMintGate.mint, (recipient, amount, _sign(keeperKey, digest), _sign(secondKey, digest), deadline)
        );
    }

    function _executeReturning(bytes memory data, bytes32 salt) internal returns (bytes32 id) {
        id = _queue(data, salt, bytes32(0));
        vm.warp(timelock.readyAt(id));
        timelock.execute(address(gate), 0, data, bytes32(0), salt);
    }

    function _openThenMint() internal {
        uint256 deadline = block.timestamp + 21 days;
        bytes32 pinDigest = gate.hashPinLift(gate.pinNonce(), deadline);
        _execute(
            abi.encodeCall(LeafMintGate.liftPin, (_sign(keeperKey, pinDigest), _sign(secondKey, pinDigest), deadline)),
            keccak256("bypass-lift"),
            bytes32(0)
        );
        _execute(abi.encodeCall(LeafMintGate.unpause, ()), keccak256("bypass-unpause"), bytes32(0));
        _execute(_freshMintData(1 ether), keccak256("bypass-mint"), bytes32(0));
    }

    function _call(address target, bytes memory payload) internal returns (bool ok) {
        (ok,) = target.call(payload);
    }

    function _assertStillPinned() internal view {
        assertEq(token.totalSupply(), 0);
        assertTrue(token.pinEngaged());
        assertTrue(token.mintPaused());
        assertEq(token.PINNED_SUPPLY(), 0);
    }
}
