// SPDX-License-Identifier: MIT
// SIMULATION / NOT DEPLOYED
pragma solidity 0.8.28;

import {LeafCouncil} from "./LeafCouncil.sol";
import {LeafMintGate} from "./LeafMintGate.sol";
import {LeafTimelock} from "./LeafTimelock.sol";
import {LeafToken} from "./LeafToken.sol";
import {LeafLocal} from "./LeafLocal.sol";

/// @title Idle Leaf factory
/// @notice Deploys one idle mint system and keeps no role afterward.
///         Every system starts pinned at supply 0, with the mint paused.
///         There is no argument that arms the mint. The Keeper does not plan to mint.
contract LeafMintFactory {
    string public constant LABEL = "SIMULATION / NOT DEPLOYED";
    bool public constant KEEPER_PLANS_TO_MINT = false;

    error ZeroAddress();
    error RoleCollision();
    error BadThreshold();
    error SignersUnsorted();
    error SupplyPinned();
    error MintIdle();
    error BindRefused();

    event IdleMintDeployed(
        address indexed token, address indexed gate, address timelock, address council, uint256 pinnedSupply
    );

    function deploy(
        address[] calldata councilSigners,
        uint256 threshold,
        address keeper,
        address secondKeeper,
        address guardian,
        bytes32 salt
    ) external returns (LeafToken token, LeafMintGate gate, LeafTimelock timelock, LeafCouncil council) {
        LeafLocal.localOnly();
        if (keeper == address(0) || secondKeeper == address(0) || guardian == address(0)) revert ZeroAddress();
        if (keeper == secondKeeper || keeper == guardian || secondKeeper == guardian) revert RoleCollision();
        uint256 count = councilSigners.length;
        if (count != 5 || threshold != 3) revert BadThreshold();

        address previous = address(0);
        for (uint256 i; i < count; ++i) {
            address signer = councilSigners[i];
            if (signer <= previous) revert SignersUnsorted();
            if (signer == keeper || signer == secondKeeper || signer == guardian) revert RoleCollision();
            previous = signer;
        }

        council = new LeafCouncil{salt: salt}(councilSigners, threshold, address(this));
        timelock = new LeafTimelock{salt: keccak256(abi.encodePacked(salt, "timelock"))}(
            address(council), guardian, 7 days, address(this)
        );
        if (
            keeper == address(council) || secondKeeper == address(council) || guardian == address(council)
                || keeper == address(timelock) || secondKeeper == address(timelock) || guardian == address(timelock)
        ) {
            revert RoleCollision();
        }

        council.bindTimelock(address(timelock));
        token = new LeafToken{salt: keccak256(abi.encodePacked(salt, "token"))}();
        gate = new LeafMintGate{salt: keccak256(abi.encodePacked(salt, "gate"))}(
            address(token), address(timelock), keeper, secondKeeper, guardian
        );
        if (address(gate) == keeper || address(gate) == secondKeeper || address(gate) == guardian) {
            revert RoleCollision();
        }

        token.bindGate(address(gate));
        timelock.bindTarget(address(gate));

        if (token.totalSupply() != token.PINNED_SUPPLY() || token.totalSupply() != 0) revert SupplyPinned();
        if (!token.pinEngaged() || !token.mintPaused()) revert MintIdle();
        if (token.mintGate() != address(gate) || timelock.allowedTarget() != address(gate)) revert BindRefused();
        if (council.timelock() != address(timelock) || gate.keeper() != keeper || gate.secondKeeper() != secondKeeper) {
            revert BindRefused();
        }

        emit IdleMintDeployed(address(token), address(gate), address(timelock), address(council), 0);
    }

    receive() external payable {
        revert("SIMULATION / NOT DEPLOYED");
    }
}
