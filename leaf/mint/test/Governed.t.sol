// SPDX-License-Identifier: MIT
// SIMULATION / NOT DEPLOYED
pragma solidity 0.8.28;

import {MintFixture} from "./MintFixture.sol";
import {LeafLocal} from "../src/LeafLocal.sol";
import {LeafMintFactory} from "../src/LeafMintFactory.sol";
import {LeafMintGate} from "../src/LeafMintGate.sol";
import {LeafTimelock} from "../src/LeafTimelock.sol";
import {LeafToken} from "../src/LeafToken.sol";

/// @notice The only suite that walks the governed path to completion.
///         It runs on Forge's in-memory chain and is discarded with the test.
///         The world pin stays 0. The Keeper does not plan to mint.
contract GovernedTest is MintFixture {
    function test_missingAnyStepLeavesSupplyAtZero() public {
        address to = makeAddr("recipient");
        uint256 deadline = block.timestamp + 20 days;
        bytes memory keeperSig = _sign(keeperKey, gate.hashMint(to, 1 ether, gate.mintNonce(), deadline));
        bytes memory secondSig = _sign(secondKey, gate.hashMint(to, 1 ether, gate.mintNonce(), deadline));
        bytes memory data = abi.encodeCall(LeafMintGate.mint, (to, 1 ether, keeperSig, secondSig, deadline));

        vm.expectRevert(LeafMintGate.NotTimelock.selector);
        gate.mint(to, 1 ether, keeperSig, secondSig, deadline);

        bytes32 id = _queue(data, keccak256("mint-too-soon"), bytes32(0));
        vm.warp(timelock.readyAt(id));
        vm.expectRevert(LeafToken.SupplyIsPinned.selector);
        timelock.execute(address(gate), 0, data, bytes32(0), keccak256("mint-too-soon"));
        assertEq(token.totalSupply(), 0, "pinned mint does not move supply");
        assertTrue(token.pinEngaged());
        assertTrue(token.mintPaused());
    }

    function test_oneKeeperIsNotEnough() public {
        uint256 deadline = block.timestamp + 20 days;
        bytes32 digest = gate.hashPinLift(gate.pinNonce(), deadline);
        bytes memory keeperSig = _sign(keeperKey, digest);
        bytes memory data = abi.encodeCall(LeafMintGate.liftPin, (keeperSig, keeperSig, deadline));
        bytes32 id = _queue(data, keccak256("one-keeper"), bytes32(0));
        vm.warp(timelock.readyAt(id));
        vm.expectRevert(LeafMintGate.BadSignature.selector);
        timelock.execute(address(gate), 0, data, bytes32(0), keccak256("one-keeper"));
        assertEq(token.totalSupply(), 0);
        assertTrue(token.pinEngaged());
    }

    function test_belowThresholdDoesNotSchedule() public {
        bytes memory data = abi.encodeCall(LeafMintGate.unpause, ());
        uint256 delay = timelock.delay();
        vm.prank(signers[0]);
        council.approve(address(gate), 0, data, bytes32(0), keccak256("short"), delay);
        vm.prank(signers[1]);
        council.approve(address(gate), 0, data, bytes32(0), keccak256("short"), delay);
        bytes32 id = timelock.hashOperation(address(gate), 0, data, bytes32(0), keccak256("short"));
        assertEq(timelock.readyAt(id), 0);
        vm.warp(block.timestamp + 8 days);
        vm.expectRevert(abi.encodeWithSelector(LeafTimelock.OperationMissing.selector, id));
        timelock.execute(address(gate), 0, data, bytes32(0), keccak256("short"));
        assertTrue(token.mintPaused());
        assertEq(token.totalSupply(), 0);
    }

    function test_signerCannotScheduleAlone() public {
        bytes memory data = abi.encodeCall(LeafMintGate.unpause, ());
        vm.prank(signers[0]);
        vm.expectRevert(LeafTimelock.NotProposer.selector);
        timelock.schedule(address(gate), 0, data, bytes32(0), keccak256("alone"), 7 days);
        assertEq(token.totalSupply(), 0);
    }

    function test_earlyExecuteAndGuardianCancelLeaveSupplyAtZero() public {
        uint256 deadline = block.timestamp + 20 days;
        bytes32 digest = gate.hashPinLift(gate.pinNonce(), deadline);
        bytes memory data =
            abi.encodeCall(LeafMintGate.liftPin, (_sign(keeperKey, digest), _sign(secondKey, digest), deadline));
        bytes32 salt = keccak256("cancel-me");
        bytes32 id = _queue(data, salt, bytes32(0));

        vm.expectRevert(abi.encodeWithSelector(LeafTimelock.OperationEarly.selector, id));
        timelock.execute(address(gate), 0, data, bytes32(0), salt);

        vm.prank(guardian);
        timelock.cancel(id);
        assertEq(timelock.readyAt(id), 0);
        vm.warp(block.timestamp + 8 days);
        vm.expectRevert(abi.encodeWithSelector(LeafTimelock.OperationMissing.selector, id));
        timelock.execute(address(gate), 0, data, bytes32(0), salt);
        assertEq(token.totalSupply(), 0);
        assertTrue(token.pinEngaged());
    }

    function test_timelockCannotCallTheTokenDirectly() public {
        bytes memory data = abi.encodeCall(LeafToken.mint, (keeper, 1 ether));
        vm.prank(address(council));
        vm.expectRevert(abi.encodeWithSelector(LeafTimelock.TargetRefused.selector, address(token)));
        timelock.schedule(address(token), 0, data, bytes32(0), keccak256("direct"), 7 days);
        assertEq(token.totalSupply(), 0);
    }

    function test_signatureFromAnotherGateDoesNotTravel() public {
        uint256 deadline = block.timestamp + 20 days;
        bytes32 foreign = gate.hashPinLift(0, deadline);
        bytes memory keeperSig = _sign(keeperKey, foreign);
        bytes memory secondSig = _sign(secondKey, foreign);

        LeafMintFactory other = new LeafMintFactory();
        (, LeafMintGate otherGate, LeafTimelock otherLock,) =
            other.deploy(signers, 3, keeper, secondKeeper, guardian, keccak256("other-gate"));
        assertTrue(otherGate.hashPinLift(0, deadline) != foreign);

        vm.prank(address(otherLock));
        vm.expectRevert(LeafMintGate.BadSignature.selector);
        otherGate.liftPin(keeperSig, secondSig, deadline);
        assertEq(token.totalSupply(), 0);
        assertEq(otherGate.pinNonce(), 0);
    }

    function test_highSSignatureIsRejected() public {
        uint256 deadline = block.timestamp + 20 days;
        bytes32 digest = gate.hashPinLift(gate.pinNonce(), deadline);
        (, bytes32 r, bytes32 s) = vm.sign(keeperKey, digest);
        uint256 curve = uint256(0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141);
        bytes32 high = bytes32(curve - uint256(s));
        bytes memory malleable = abi.encodePacked(r, high, uint8(27));
        bytes memory honest = _sign(secondKey, digest);
        bytes memory data = abi.encodeCall(LeafMintGate.liftPin, (malleable, honest, deadline));
        bytes32 id = _queue(data, keccak256("malleable"), bytes32(0));
        vm.warp(timelock.readyAt(id));
        vm.expectRevert(LeafMintGate.BadSignature.selector);
        timelock.execute(address(gate), 0, data, bytes32(0), keccak256("malleable"));
        assertTrue(token.pinEngaged());
        assertEq(token.totalSupply(), 0);
    }

    function test_chainIdChangeInvalidatesTheDigest() public {
        uint256 deadline = block.timestamp + 10 days;
        bytes32 local = gate.hashPinLift(0, deadline);
        bytes memory keeperSig = _sign(keeperKey, local);
        bytes memory secondSig = _sign(secondKey, local);
        vm.chainId(1);
        assertTrue(gate.hashPinLift(0, deadline) != local);
        vm.prank(address(timelock));
        vm.expectRevert(abi.encodeWithSelector(LeafLocal.LiveChainRefused.selector, 1));
        gate.liftPin(keeperSig, secondSig, deadline);
        vm.chainId(31337);
        assertTrue(token.pinEngaged());
        assertEq(token.totalSupply(), 0);
    }

    function test_governedPathMintsThenStopsAtTheCap() public {
        address to = makeAddr("recipient");
        _openMint();
        assertEq(token.totalSupply(), 0, "opening the path still mints nothing by itself");

        _mint(to, 1 ether);
        assertEq(token.totalSupply(), 1 ether);
        assertEq(token.balanceOf(to), 1 ether);
        assertFalse(token.pinEngaged());
        assertFalse(token.mintPaused());

        uint256 tooMuch = token.HARD_CAP();
        uint256 deadline = block.timestamp + 20 days;
        bytes32 digest = gate.hashMint(to, tooMuch, gate.mintNonce(), deadline);
        bytes memory over = abi.encodeCall(
            LeafMintGate.mint, (to, tooMuch, _sign(keeperKey, digest), _sign(secondKey, digest), deadline)
        );
        bytes32 overId = _queue(over, keccak256("over-cap"), bytes32(0));
        vm.warp(timelock.readyAt(overId));
        vm.expectRevert(LeafToken.CapExceeded.selector);
        timelock.execute(address(gate), 0, over, bytes32(0), keccak256("over-cap"));
        assertEq(token.totalSupply(), 1 ether);

        _mint(to, token.HARD_CAP() - 1 ether);
        assertEq(token.totalSupply(), token.HARD_CAP());
        assertEq(token.balanceOf(to), token.HARD_CAP());

        deadline = block.timestamp + 20 days;
        digest = gate.hashMint(to, 1, gate.mintNonce(), deadline);
        bytes memory oneMore =
            abi.encodeCall(LeafMintGate.mint, (to, 1, _sign(keeperKey, digest), _sign(secondKey, digest), deadline));
        bytes32 moreId = _queue(oneMore, keccak256("one-more"), bytes32(0));
        vm.warp(timelock.readyAt(moreId));
        vm.expectRevert(LeafToken.CapExceeded.selector);
        timelock.execute(address(gate), 0, oneMore, bytes32(0), keccak256("one-more"));
        assertEq(token.totalSupply(), token.HARD_CAP());
    }

    function test_mintDoesNotCallTheRecipientAndTransfersAreNotFrozen() public {
        address sink = address(new RevertingReceiver());
        _openMint();
        _mint(sink, 5 ether);
        assertEq(token.balanceOf(sink), 5 ether);
        assertEq(token.totalSupply(), 5 ether);

        address other = makeAddr("other");
        vm.prank(sink);
        assertTrue(token.transfer(other, 2 ether));
        assertEq(token.balanceOf(other), 2 ether);
        assertEq(token.balanceOf(sink), 3 ether);
        assertEq(token.totalSupply(), 5 ether);

        vm.prank(guardian);
        gate.pause();
        assertTrue(token.mintPaused());
        vm.prank(sink);
        assertTrue(token.transfer(other, 1 ether));
        assertEq(token.balanceOf(other), 3 ether);
        assertEq(token.totalSupply(), 5 ether);

        uint256 deadline = block.timestamp + 20 days;
        bytes32 digest = gate.hashMint(other, 1 ether, gate.mintNonce(), deadline);
        bytes memory data = abi.encodeCall(
            LeafMintGate.mint, (other, 1 ether, _sign(keeperKey, digest), _sign(secondKey, digest), deadline)
        );
        bytes32 id = _queue(data, keccak256("paused-mint"), bytes32(0));
        vm.warp(timelock.readyAt(id));
        vm.expectRevert(LeafToken.MintIsPaused.selector);
        timelock.execute(address(gate), 0, data, bytes32(0), keccak256("paused-mint"));
        assertEq(token.totalSupply(), 5 ether);
    }

    function test_unpauseWithoutLiftStillPinsSupply() public {
        _execute(abi.encodeCall(LeafMintGate.unpause, ()), keccak256("unpause-only"), bytes32(0));
        assertFalse(token.mintPaused());
        assertTrue(token.pinEngaged());
        address to = makeAddr("recipient");
        uint256 deadline = block.timestamp + 20 days;
        bytes32 digest = gate.hashMint(to, 1 ether, gate.mintNonce(), deadline);
        bytes memory data = abi.encodeCall(
            LeafMintGate.mint, (to, 1 ether, _sign(keeperKey, digest), _sign(secondKey, digest), deadline)
        );
        bytes32 id = _queue(data, keccak256("still-pinned"), bytes32(0));
        vm.warp(timelock.readyAt(id));
        vm.expectRevert(LeafToken.SupplyIsPinned.selector);
        timelock.execute(address(gate), 0, data, bytes32(0), keccak256("still-pinned"));
        assertEq(token.totalSupply(), 0);
    }

    function test_replayAndExpiredDeadlineDoNotMintAgain() public {
        address to = makeAddr("recipient");
        _openMint();
        uint256 deadline = block.timestamp + 20 days;
        uint256 nonce = gate.mintNonce();
        bytes32 digest = gate.hashMint(to, 1 ether, nonce, deadline);
        bytes memory keeperSig = _sign(keeperKey, digest);
        bytes memory secondSig = _sign(secondKey, digest);
        bytes memory data = abi.encodeCall(LeafMintGate.mint, (to, 1 ether, keeperSig, secondSig, deadline));
        _execute(data, keccak256("first-mint"), bytes32(0));
        assertEq(token.totalSupply(), 1 ether);

        bytes32 replayId = _queue(data, keccak256("replay"), bytes32(0));
        vm.warp(timelock.readyAt(replayId));
        vm.expectRevert(LeafMintGate.BadSignature.selector);
        timelock.execute(address(gate), 0, data, bytes32(0), keccak256("replay"));
        assertEq(token.totalSupply(), 1 ether);

        uint256 stale = block.timestamp - 1;
        bytes32 staleDigest = gate.hashMint(to, 1 ether, gate.mintNonce(), stale);
        bytes memory staleData = abi.encodeCall(
            LeafMintGate.mint,
            (to, 1 ether, _sign(keeperKey, staleDigest), _sign(secondKey, staleDigest), stale)
        );
        bytes32 staleId = _queue(staleData, keccak256("stale"), bytes32(0));
        vm.warp(timelock.readyAt(staleId));
        vm.expectRevert(abi.encodeWithSelector(LeafMintGate.Expired.selector, stale));
        timelock.execute(address(gate), 0, staleData, bytes32(0), keccak256("stale"));
        assertEq(token.totalSupply(), 1 ether);
    }

    function _openMint() internal {
        uint256 deadline = block.timestamp + 21 days;
        bytes32 digest = gate.hashPinLift(gate.pinNonce(), deadline);
        _execute(
            abi.encodeCall(LeafMintGate.liftPin, (_sign(keeperKey, digest), _sign(secondKey, digest), deadline)),
            keccak256(abi.encode("lift", deadline)),
            bytes32(0)
        );
        assertFalse(token.pinEngaged());
        assertTrue(token.mintPaused());
        assertEq(token.totalSupply(), 0);
        _execute(abi.encodeCall(LeafMintGate.unpause, ()), keccak256(abi.encode("unpause", deadline)), bytes32(0));
        assertFalse(token.mintPaused());
        assertEq(token.totalSupply(), 0);
    }

    function _mint(address to, uint256 amount) internal {
        uint256 opens = vm.getBlockTimestamp() + 20 days;
        bytes32 digest = gate.hashMint(to, amount, gate.mintNonce(), opens);
        _execute(
            abi.encodeCall(
                LeafMintGate.mint, (to, amount, _sign(keeperKey, digest), _sign(secondKey, digest), opens)
            ),
            keccak256(abi.encode("mint", gate.mintNonce(), to, amount)),
            bytes32(0)
        );
    }
}

contract RevertingReceiver {
    receive() external payable {
        revert("no value");
    }

    fallback() external payable {
        revert("no call");
    }
}
