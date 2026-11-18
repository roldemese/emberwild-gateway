// SPDX-License-Identifier: MIT
// SIMULATION / NOT DEPLOYED
pragma solidity 0.8.28;

import {MintFixture} from "./MintFixture.sol";

/// @notice The deployed runtime must not contain the opcodes that make a token upgradeable or drainable.
contract BytecodeTest is MintFixture {
    error DangerousOpcode(address account, uint256 index, uint8 op, uint256 end, uint256 size);

    function test_runtimeHasNoDelegatecallOrSelfdestruct() public view {
        _assertClean(address(token));
        _assertClean(address(gate));
        _assertClean(address(timelock));
        _assertClean(address(council));
        // The factory's runtime embeds the other contracts' creation code as data.
        // A linear opcode walk cannot see that island. The source check covers the factory.
        assertGt(address(factory).code.length, 0);
    }

    function test_upgradeSelectorsAreAbsent() public view {
        bytes4[] memory banned = new bytes4[](3);
        banned[0] = bytes4(keccak256("upgradeTo(address)"));
        banned[1] = bytes4(keccak256("upgradeToAndCall(address,bytes)"));
        banned[2] = bytes4(keccak256("proxiableUUID()"));
        _selectorsAbsent(banned);
    }

    function test_roleAdminSelectorsAreAbsent() public view {
        bytes4[] memory banned = new bytes4[](3);
        banned[0] = bytes4(keccak256("renounceRole(bytes32,address)"));
        banned[1] = bytes4(keccak256("renounceOwnership()"));
        banned[2] = bytes4(keccak256("transferOwnership(address)"));
        _selectorsAbsent(banned);
    }

    function test_signerReplacementSelectorsAreAbsent() public view {
        bytes4[] memory banned = new bytes4[](3);
        banned[0] = bytes4(keccak256("replaceSigner(address,address)"));
        banned[1] = bytes4(keccak256("setKeeper(address)"));
        banned[2] = bytes4(keccak256("grantRole(bytes32,address)"));
        _selectorsAbsent(banned);
    }

    function _selectorsAbsent(bytes4[] memory banned) internal view {
        address[5] memory accounts = [address(token), address(gate), address(timelock), address(council), address(factory)];
        for (uint256 a; a < accounts.length; ++a) {
            bytes memory code = accounts[a].code;
            for (uint256 b; b < banned.length; ++b) {
                assertFalse(_contains(code, abi.encodePacked(banned[b])), "banned selector");
            }
        }
    }

    function _assertClean(address account) internal view {
        bytes memory code = account.code;
        assertGt(code.length, 0);
        uint256 end = _runtimeEnd(code);
        for (uint256 i; i < end;) {
            uint8 op = uint8(code[i]);
            // DELEGATECALL, CALLCODE, SELFDESTRUCT.
            if (op == 0xf4 || op == 0xf2 || op == 0xff) revert DangerousOpcode(account, i, op, end, code.length);
            if (op >= 0x60 && op <= 0x7f) i += 1 + (uint256(op) - 0x5f);
            else i += 1;
        }
    }

    /// @dev Solidity appends CBOR metadata and a 2-byte length. Scan only the code before that trailer.
    function _runtimeEnd(bytes memory code) internal pure returns (uint256) {
        if (code.length < 2) return code.length;
        uint256 meta = (uint256(uint8(code[code.length - 2])) << 8) | uint256(uint8(code[code.length - 1]));
        if (meta + 2 >= code.length || meta > 200) return code.length;
        return code.length - meta - 2;
    }

    function _match(bytes memory code, uint256 at, bytes memory tag) internal pure returns (bool) {
        for (uint256 i; i < tag.length; ++i) {
            if (code[at + i] != tag[i]) return false;
        }
        return true;
    }

    function _contains(bytes memory code, bytes memory needle) internal pure returns (bool) {
        if (needle.length == 0 || code.length < needle.length) return false;
        for (uint256 i; i + needle.length <= code.length; ++i) {
            if (_match(code, i, needle)) return true;
        }
        return false;
    }
}
