// SPDX-License-Identifier: MIT
// SIMULATION / NOT DEPLOYED
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ILeafToken} from "./ILeaf.sol";
import {LeafLocal} from "./LeafLocal.sol";

/// @title Leaf
/// @notice ERC-20 reference token for the Emberwild Leaf.
///         SIMULATION / NOT DEPLOYED. The Keeper does not plan to mint.
///
///         Supply is pinned at 0. There is no premine, no founder allocation,
///         and no constructor argument that can start the mint armed or unpaused.
///         Transfers are never paused and there is no denylist. The mint is a
///         separate switch, and it stays off until the gate lifts the pin and
///         unpauses. The gate can do that only through the timelock.
///
///         The token is not a proxy and has no upgrade function. The one-time
///         gate binding cannot be changed.
contract LeafToken is ERC20, ILeafToken {
    /// @notice Whole-token ceiling if a governed mint is ever carried out.
    ///         150_000 tokens, one thousand for each of 150 seats. Not a plan to mint.
    uint256 public constant HARD_CAP = 150_000 ether;

    /// @notice The only supply this reference accepts until the pin is lifted.
    uint256 public constant PINNED_SUPPLY = 0;

    address public immutable factory;
    address public mintGate;
    bool public pinEngaged = true;
    bool public mintPaused = true;

    error BindRefused();
    error NotMintGate();
    error SupplyIsPinned();
    error MintIsPaused();
    error ZeroAddress();
    error ZeroAmount();
    error CapExceeded();
    error PinAlreadyLifted();
    error NoValue();

    event SupplyPinned(uint256 pinnedSupply);
    event MintStartsPaused();
    event GateBound(address indexed gate);
    event PinLifted(uint256 supply);
    event MintPaused(address indexed gate);
    event MintUnpaused(address indexed gate);
    event LeafMinted(address indexed to, uint256 amount, uint256 supplyAfter);

    constructor() ERC20("Leaf", "LEAF") {
        LeafLocal.localOnly();
        factory = msg.sender;
        emit SupplyPinned(PINNED_SUPPLY);
        emit MintStartsPaused();
    }

    function totalSupply() public view override(ERC20, ILeafToken) returns (uint256) {
        return super.totalSupply();
    }

    /// @notice Bind the mint gate once. The factory calls this in the deploy transaction.
    ///         There is no unbind and no second bind.
    function bindGate(address gate) external {
        LeafLocal.localOnly();
        if (msg.sender != factory || mintGate != address(0)) revert BindRefused();
        if (gate.code.length == 0) revert BindRefused();
        mintGate = gate;
        emit GateBound(gate);
    }

    /// @notice Lift the supply pin. Supply must still be the pinned value.
    ///         Lifting the pin does not unpause the mint.
    function liftPin() external {
        LeafLocal.localOnly();
        if (msg.sender != mintGate || mintGate == address(0)) revert NotMintGate();
        if (!pinEngaged) revert PinAlreadyLifted();
        if (totalSupply() != PINNED_SUPPLY) revert SupplyIsPinned();
        pinEngaged = false;
        emit PinLifted(totalSupply());
    }

    function pauseMint() external {
        LeafLocal.localOnly();
        if (msg.sender != mintGate || mintGate == address(0)) revert NotMintGate();
        if (mintPaused) return;
        mintPaused = true;
        emit MintPaused(msg.sender);
    }

    /// @notice Unpausing does not lift the supply pin.
    function unpauseMint() external {
        LeafLocal.localOnly();
        if (msg.sender != mintGate || mintGate == address(0)) revert NotMintGate();
        if (!mintPaused) return;
        mintPaused = false;
        emit MintUnpaused(msg.sender);
    }

    /// @notice Mint up to the hard cap. Refuses while the pin holds or the mint is paused.
    ///         Does not call the recipient. Transfers of existing balances are a separate path
    ///         and are not switched off here.
    function mint(address to, uint256 amount) external {
        LeafLocal.localOnly();
        if (msg.sender != mintGate || mintGate == address(0)) revert NotMintGate();
        if (pinEngaged) revert SupplyIsPinned();
        if (mintPaused) revert MintIsPaused();
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        // totalSupply never exceeds HARD_CAP, so this subtraction does not underflow.
        if (amount > HARD_CAP - totalSupply()) revert CapExceeded();
        _mint(to, amount);
        emit LeafMinted(to, amount, totalSupply());
    }

    receive() external payable {
        revert NoValue();
    }
}
