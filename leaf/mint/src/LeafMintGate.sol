// SPDX-License-Identifier: MIT
// SIMULATION / NOT DEPLOYED
pragma solidity 0.8.28;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ILeafToken} from "./ILeaf.sol";
import {LeafLocal} from "./LeafLocal.sol";

/// @title Leaf mint gate
/// @notice The only address that may ask the token to mint, pause, unpause, or lift the pin.
///
///         Lifting the pin and minting each require two distinct EIP-712 signatures:
///         the Keeper and the Second Keeper, over that exact action. The timelock is
///         the only caller, so the council and the seven-day delay sit in front of
///         those signatures. The guardian may pause and may not do anything else.
///
///         The signed statement is the label "SIMULATION / NOT DEPLOYED". A signature
///         over any other statement, chain, or gate does not verify here.
contract LeafMintGate is EIP712, ReentrancyGuard {
    bytes32 public constant PIN_LIFT_TYPEHASH = keccak256(
        "PinLift(address keeper,address secondKeeper,uint256 nonce,uint256 deadline,bytes32 statement)"
    );
    bytes32 public constant MINT_AUTHORIZATION_TYPEHASH = keccak256(
        "MintAuthorization(address to,uint256 amount,uint256 nonce,uint256 deadline,bytes32 statement)"
    );
    bytes32 public constant STATEMENT = keccak256("SIMULATION / NOT DEPLOYED");

    /// @notice A keeper signature is valid for at most this long, so a signed mint cannot wait forever.
    uint256 public constant MAX_SIGNATURE_WINDOW = 30 days;

    address public immutable token;
    address public immutable timelock;
    address public immutable keeper;
    address public immutable secondKeeper;
    address public immutable guardian;

    uint256 public pinNonce;
    uint256 public mintNonce;

    error BindRefused();
    error ZeroAddress();
    error RoleCollision();
    error NotTimelock();
    error NotGuardian();
    error BadSignature();
    error Expired(uint256 deadline);

    event PinLifted(address indexed keeper, address indexed secondKeeper, uint256 nonce);
    event MintAuthorized(address indexed to, uint256 amount, uint256 nonce);
    event PauseRequested(address indexed by);
    event UnpauseRequested(address indexed by);

    constructor(address token_, address timelock_, address keeper_, address secondKeeper_, address guardian_)
        EIP712("Leaf", "1")
    {
        LeafLocal.localOnly();
        if (token_.code.length == 0 || timelock_.code.length == 0) revert BindRefused();
        if (keeper_ == address(0) || secondKeeper_ == address(0) || guardian_ == address(0)) revert ZeroAddress();
        if (
            _same(keeper_, secondKeeper_) || _same(keeper_, guardian_) || _same(secondKeeper_, guardian_)
                || _same(keeper_, token_) || _same(secondKeeper_, token_) || _same(guardian_, token_)
                || _same(keeper_, timelock_) || _same(secondKeeper_, timelock_) || _same(guardian_, timelock_)
                || _same(keeper_, address(this)) || _same(secondKeeper_, address(this))
                || _same(guardian_, address(this))
        ) {
            revert RoleCollision();
        }
        token = token_;
        timelock = timelock_;
        keeper = keeper_;
        secondKeeper = secondKeeper_;
        guardian = guardian_;
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function hashPinLift(uint256 nonce, uint256 deadline) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(abi.encode(PIN_LIFT_TYPEHASH, keeper, secondKeeper, nonce, deadline, STATEMENT))
        );
    }

    function hashMint(address to, uint256 amount, uint256 nonce, uint256 deadline) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(abi.encode(MINT_AUTHORIZATION_TYPEHASH, to, amount, nonce, deadline, STATEMENT))
        );
    }

    /// @notice Pause the mint. Transfers are untouched. The guardian does not need the timelock.
    function pause() external nonReentrant {
        LeafLocal.localOnly();
        if (msg.sender != guardian && msg.sender != timelock) revert NotGuardian();
        ILeafToken(token).pauseMint();
        emit PauseRequested(msg.sender);
    }

    /// @notice Unpause. This does not lift the supply pin, and only the timelock may ask.
    function unpause() external nonReentrant onlyTimelock {
        LeafLocal.localOnly();
        ILeafToken(token).unpauseMint();
        emit UnpauseRequested(msg.sender);
    }

    /// @notice Lift the supply pin after both keepers have signed this gate, this nonce, and this deadline.
    function liftPin(bytes calldata keeperSig, bytes calldata secondSig, uint256 deadline)
        external
        nonReentrant
        onlyTimelock
    {
        LeafLocal.localOnly();
        _fresh(deadline);
        uint256 nonce = pinNonce;
        bytes32 digest = hashPinLift(nonce, deadline);
        if (_signer(digest, keeperSig) != keeper || _signer(digest, secondSig) != secondKeeper) revert BadSignature();
        pinNonce = nonce + 1;
        ILeafToken(token).liftPin();
        emit PinLifted(keeper, secondKeeper, nonce);
    }

    /// @notice Mint one amount to one address. Both keepers must have signed that exact pair.
    function mint(address to, uint256 amount, bytes calldata keeperSig, bytes calldata secondSig, uint256 deadline)
        external
        nonReentrant
        onlyTimelock
    {
        LeafLocal.localOnly();
        _fresh(deadline);
        uint256 nonce = mintNonce;
        bytes32 digest = hashMint(to, amount, nonce, deadline);
        if (_signer(digest, keeperSig) != keeper || _signer(digest, secondSig) != secondKeeper) revert BadSignature();
        mintNonce = nonce + 1;
        ILeafToken(token).mint(to, amount);
        emit MintAuthorized(to, amount, nonce);
    }

    function _fresh(uint256 deadline) internal view {
        if (block.timestamp > deadline || deadline > block.timestamp + MAX_SIGNATURE_WINDOW) revert Expired(deadline);
    }

    function _signer(bytes32 digest, bytes calldata signature) internal pure returns (address) {
        (address recovered, ECDSA.RecoverError err,) = ECDSA.tryRecover(digest, signature);
        if (err != ECDSA.RecoverError.NoError || recovered == address(0)) revert BadSignature();
        return recovered;
    }

    function _same(address left, address right) private pure returns (bool) {
        return left == right;
    }

    modifier onlyTimelock() {
        if (msg.sender != timelock) revert NotTimelock();
        _;
    }

    receive() external payable {
        revert NoValue();
    }

    error NoValue();
}
