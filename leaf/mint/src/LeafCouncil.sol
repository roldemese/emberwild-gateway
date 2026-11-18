// SPDX-License-Identifier: MIT
// SIMULATION / NOT DEPLOYED
pragma solidity 0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ILeafTimelock} from "./ILeaf.sol";
import {LeafLocal} from "./LeafLocal.sol";

/// @title Leaf council
/// @notice On-chain multisig. Five signers, threshold three, both fixed.
///         When three signers agree, the council schedules a timelock call.
///         The same three can cancel a call that has not executed.
///         A signer cannot schedule or cancel alone, and the council cannot skip the timelock.
contract LeafCouncil is ReentrancyGuard {
    uint256 public immutable threshold;
    address public immutable factory;
    address public timelock;

    mapping(address signer => bool allowed) public isSigner;
    address[] private _signers;

    mapping(bytes32 id => uint256 count) public approvals;
    mapping(bytes32 id => mapping(address signer => bool voted)) public voted;
    mapping(bytes32 id => bool done) public queued;

    mapping(bytes32 id => uint256 count) public cancelApprovals;
    mapping(bytes32 id => mapping(address signer => bool voted)) public cancelVoted;

    error BindRefused();
    error BadThreshold();
    error SignersUnsorted();
    error Unbound();
    error NotSigner();
    error AlreadyVoted();
    error NotVoted();
    error AlreadyQueued();
    error NoValue();

    event TimelockBound(address indexed timelock);
    event Approved(bytes32 indexed id, address indexed signer, uint256 count);
    event Revoked(bytes32 indexed id, address indexed signer, uint256 count);
    event Queued(bytes32 indexed id, bytes32 indexed timelockId);
    event CancelApproved(bytes32 indexed id, address indexed signer, uint256 count);
    event CancelRevoked(bytes32 indexed id, address indexed signer, uint256 count);
    event CouncilCancelled(bytes32 indexed id);

    constructor(address[] memory signers_, uint256 threshold_, address factory_) {
        LeafLocal.localOnly();
        uint256 count = signers_.length;
        if (count != 5 || threshold_ != 3) revert BadThreshold();
        if (factory_ == address(0)) revert BadThreshold();
        factory = factory_;
        threshold = threshold_;
        address previous = address(0);
        for (uint256 i; i < count; ++i) {
            address signer = signers_[i];
            // Strictly increasing addresses: unique, nonzero, and a canonical order.
            if (signer <= previous) revert SignersUnsorted();
            isSigner[signer] = true;
            _signers.push(signer);
            previous = signer;
        }
    }

    function signerCount() external view returns (uint256) {
        return _signers.length;
    }

    function signerAt(uint256 index) external view returns (address) {
        return _signers[index];
    }

    function bindTimelock(address timelock_) external {
        LeafLocal.localOnly();
        if (msg.sender != factory || timelock != address(0)) revert BindRefused();
        if (timelock_.code.length == 0) revert BindRefused();
        timelock = timelock_;
        emit TimelockBound(timelock_);
    }

    /// @notice Approve one delayed call. The vote that reaches the threshold schedules it.
    function approve(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt,
        uint256 delay
    ) external nonReentrant {
        LeafLocal.localOnly();
        if (!isSigner[msg.sender]) revert NotSigner();
        if (timelock == address(0)) revert Unbound();
        if (value != 0) revert NoValue();
        bytes32 id = keccak256(abi.encode(target, value, keccak256(data), predecessor, salt, delay));
        if (queued[id]) revert AlreadyQueued();
        if (voted[id][msg.sender]) revert AlreadyVoted();
        voted[id][msg.sender] = true;
        uint256 count = approvals[id] + 1;
        approvals[id] = count;
        emit Approved(id, msg.sender, count);
        if (count == threshold) {
            queued[id] = true;
            bytes32 timelockId =
                ILeafTimelock(timelock).schedule(target, value, data, predecessor, salt, delay);
            emit Queued(id, timelockId);
        }
    }

    /// @notice Take back a vote before the threshold is reached.
    function revoke(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt,
        uint256 delay
    ) external nonReentrant {
        LeafLocal.localOnly();
        if (value != 0) revert NoValue();
        bytes32 id = keccak256(abi.encode(target, value, keccak256(data), predecessor, salt, delay));
        if (queued[id]) revert AlreadyQueued();
        if (!voted[id][msg.sender]) revert NotVoted();
        voted[id][msg.sender] = false;
        approvals[id] -= 1;
        emit Revoked(id, msg.sender, approvals[id]);
    }

    /// @notice Vote to cancel one timelock call. The vote that reaches the threshold cancels it.
    ///         Cancel cannot mint, unpause, or lift the pin.
    function approveCancel(bytes32 id) external nonReentrant {
        LeafLocal.localOnly();
        if (!isSigner[msg.sender]) revert NotSigner();
        if (timelock == address(0)) revert Unbound();
        if (cancelApprovals[id] >= threshold) revert AlreadyQueued();
        if (cancelVoted[id][msg.sender]) revert AlreadyVoted();
        cancelVoted[id][msg.sender] = true;
        uint256 count = cancelApprovals[id] + 1;
        cancelApprovals[id] = count;
        emit CancelApproved(id, msg.sender, count);
        if (count == threshold) {
            ILeafTimelock(timelock).cancel(id);
            emit CouncilCancelled(id);
        }
    }

    /// @notice Take back a cancel vote before the threshold is reached.
    function revokeCancel(bytes32 id) external nonReentrant {
        LeafLocal.localOnly();
        if (cancelApprovals[id] >= threshold) revert AlreadyQueued();
        if (!cancelVoted[id][msg.sender]) revert NotVoted();
        cancelVoted[id][msg.sender] = false;
        cancelApprovals[id] -= 1;
        emit CancelRevoked(id, msg.sender, cancelApprovals[id]);
    }

    receive() external payable {
        revert NoValue();
    }
}
