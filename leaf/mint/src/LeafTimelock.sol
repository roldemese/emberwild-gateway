// SPDX-License-Identifier: MIT
// SIMULATION / NOT DEPLOYED
pragma solidity 0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ILeafTimelock} from "./ILeaf.sol";
import {LeafLocal} from "./LeafLocal.sol";

/// @title Leaf timelock
/// @notice Delays every governed call by at least seven days.
///         The council is the only proposer. The guardian may cancel and may not propose.
///         After the delay, anyone may execute. The only allowed target is the mint gate.
///         The timelock holds no ether and cannot be retargeted.
contract LeafTimelock is ReentrancyGuard, ILeafTimelock {
    uint256 public constant MIN_DELAY = 7 days;
    uint256 private constant _DONE = 1;

    uint256 public immutable delay;
    address public immutable proposer;
    address public immutable canceller;
    address public immutable factory;
    address public allowedTarget;

    /// @dev 0 = unknown, 1 = executed, any other value = the timestamp at which the call may run.
    mapping(bytes32 id => uint256 readyOrDone) public state;

    error BindRefused();
    error ZeroAddress();
    error RoleCollision();
    error DelayTooShort(uint256 given, uint256 minimum);
    error NotProposer();
    error NotCanceller();
    error TargetRefused(address target);
    error NoValue();
    error EmptyCall();
    error OperationExists(bytes32 id);
    error OperationMissing(bytes32 id);
    error OperationEarly(bytes32 id);
    error OperationDone(bytes32 id);
    error PredecessorPending(bytes32 id);

    event TargetBound(address indexed target);
    event Scheduled(bytes32 indexed id, uint256 readyAt);
    event Cancelled(bytes32 indexed id);
    event Executed(bytes32 indexed id);

    constructor(address proposer_, address canceller_, uint256 delay_, address factory_) {
        LeafLocal.localOnly();
        if (proposer_ == address(0) || canceller_ == address(0) || factory_ == address(0)) revert ZeroAddress();
        if (proposer_ == canceller_ || proposer_ == factory_ || canceller_ == factory_) revert RoleCollision();
        if (delay_ < MIN_DELAY) revert DelayTooShort(delay_, MIN_DELAY);
        proposer = proposer_;
        canceller = canceller_;
        factory = factory_;
        delay = delay_;
    }

    function bindTarget(address target) external nonReentrant {
        LeafLocal.localOnly();
        if (msg.sender != factory || allowedTarget != address(0)) revert BindRefused();
        if (target.code.length == 0) revert BindRefused();
        if (target == proposer || target == canceller || target == factory) revert RoleCollision();
        allowedTarget = target;
        emit TargetBound(target);
    }

    function hashOperation(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(target, value, data, predecessor, salt));
    }

    function schedule(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt,
        uint256 delay_
    ) external nonReentrant returns (bytes32 id) {
        LeafLocal.localOnly();
        if (msg.sender != proposer) revert NotProposer();
        if (allowedTarget == address(0) || target != allowedTarget) revert TargetRefused(target);
        if (value != 0) revert NoValue();
        if (data.length == 0) revert EmptyCall();
        if (delay_ < delay) revert DelayTooShort(delay_, delay);
        id = hashOperation(target, value, data, predecessor, salt);
        if (state[id] != 0) revert OperationExists(id);
        uint256 opensAt = block.timestamp + delay_;
        // 1 is the executed sentinel. A legal delay cannot land on it.
        if (opensAt <= _DONE) revert DelayTooShort(delay_, delay);
        state[id] = opensAt;
        emit Scheduled(id, opensAt);
    }

    /// @notice The guardian or the council may cancel a call that has not yet executed.
    function cancel(bytes32 id) external nonReentrant {
        LeafLocal.localOnly();
        if (msg.sender != canceller && msg.sender != proposer) revert NotCanceller();
        uint256 current = state[id];
        if (current == 0 || current == _DONE) revert OperationMissing(id);
        state[id] = 0;
        emit Cancelled(id);
    }

    /// @notice Execute one scheduled gate call. The done flag is written before the call.
    function execute(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt
    ) external nonReentrant {
        LeafLocal.localOnly();
        if (target != allowedTarget || allowedTarget == address(0)) revert TargetRefused(target);
        if (value != 0) revert NoValue();
        bytes32 id = hashOperation(target, value, data, predecessor, salt);
        uint256 opensAt = state[id];
        if (opensAt == 0) revert OperationMissing(id);
        if (opensAt == _DONE) revert OperationDone(id);
        if (block.timestamp < opensAt) revert OperationEarly(id);
        if (predecessor != bytes32(0) && state[predecessor] != _DONE) revert PredecessorPending(predecessor);
        state[id] = _DONE;
        (bool ok, bytes memory reason) = target.call(data);
        if (!ok) {
            assembly ("memory-safe") {
                revert(add(reason, 0x20), mload(reason))
            }
        }
        emit Executed(id);
    }

    function readyAt(bytes32 id) external view returns (uint256) {
        uint256 current = state[id];
        return current == _DONE ? 0 : current;
    }

    function executed(bytes32 id) external view returns (bool) {
        return state[id] == _DONE;
    }

    receive() external payable {
        revert NoValue();
    }
}
