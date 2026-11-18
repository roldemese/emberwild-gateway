// SPDX-License-Identifier: MIT
// SIMULATION / NOT DEPLOYED
pragma solidity 0.8.28;

/// @notice Accounting surface of the Leaf token. The gate is the only caller of the writers.
interface ILeafToken {
    function mint(address to, uint256 amount) external;
    function pauseMint() external;
    function unpauseMint() external;
    function liftPin() external;
    function pinEngaged() external view returns (bool);
    function mintPaused() external view returns (bool);
    function totalSupply() external view returns (uint256);
    function mintGate() external view returns (address);
}

/// @notice The only call the council is allowed to make: schedule a delayed gate call.
interface ILeafTimelock {
    function schedule(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt,
        uint256 delay
    ) external returns (bytes32 id);

    function cancel(bytes32 id) external;
}
