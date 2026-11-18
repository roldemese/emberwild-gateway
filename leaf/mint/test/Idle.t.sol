// SPDX-License-Identifier: MIT
// SIMULATION / NOT DEPLOYED
pragma solidity 0.8.28;

import {MintFixture} from "./MintFixture.sol";
import {LeafCouncil} from "../src/LeafCouncil.sol";
import {LeafLocal} from "../src/LeafLocal.sol";
import {LeafMintFactory} from "../src/LeafMintFactory.sol";
import {LeafTimelock} from "../src/LeafTimelock.sol";
import {LeafToken} from "../src/LeafToken.sol";
import {RefuseBroadcast} from "../script/RefuseBroadcast.sol";

contract IdleTest is MintFixture {
    function test_referenceSystemIsIdle() public view {
        assertEq(token.name(), "Leaf");
        assertEq(token.symbol(), "LEAF");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), 0);
        assertEq(token.PINNED_SUPPLY(), 0);
        assertEq(token.HARD_CAP(), 150_000 ether);
        assertTrue(token.pinEngaged());
        assertTrue(token.mintPaused());
        assertEq(token.mintGate(), address(gate));
        assertEq(token.factory(), address(factory));
        assertEq(token.balanceOf(keeper), 0);
        assertEq(token.balanceOf(address(this)), 0);
        assertEq(factory.LABEL(), "SIMULATION / NOT DEPLOYED");
        assertFalse(factory.KEEPER_PLANS_TO_MINT());
        assertEq(timelock.delay(), 7 days);
        assertEq(timelock.MIN_DELAY(), 7 days);
        assertEq(timelock.proposer(), address(council));
        assertEq(timelock.canceller(), guardian);
        assertEq(timelock.allowedTarget(), address(gate));
        assertEq(council.threshold(), 3);
        assertEq(council.signerCount(), 5);
        assertEq(gate.keeper(), keeper);
        assertEq(gate.secondKeeper(), secondKeeper);
        assertEq(gate.guardian(), guardian);
        assertEq(gate.MAX_SIGNATURE_WINDOW(), 30 days);
        assertEq(gate.STATEMENT(), keccak256("SIMULATION / NOT DEPLOYED"));
    }

    function test_domainIsThisGateOnTheLocalChain() public view {
        (bytes1 fields, string memory name, string memory version, uint256 chainId, address verifying,,) =
            gate.eip712Domain();
        assertEq(fields, hex"0f");
        assertEq(name, "Leaf");
        assertEq(version, "1");
        assertEq(chainId, 31337);
        assertEq(verifying, address(gate));
    }

    function test_directMintRevertLeavesSupplyAtZero(address caller, uint256 amount) public {
        vm.assume(caller != address(gate));
        vm.prank(caller);
        vm.expectRevert(LeafToken.NotMintGate.selector);
        token.mint(makeAddr("someone"), amount);
        assertEq(token.totalSupply(), 0);
    }

    function test_secondBindIsRefused() public {
        vm.prank(address(factory));
        vm.expectRevert(LeafToken.BindRefused.selector);
        token.bindGate(address(gate));
        vm.prank(address(factory));
        vm.expectRevert(LeafTimelock.BindRefused.selector);
        timelock.bindTarget(address(gate));
        assertEq(token.totalSupply(), 0);
    }

    function test_shortDelayIsRefused() public {
        vm.expectRevert(abi.encodeWithSelector(LeafTimelock.DelayTooShort.selector, 7 days - 1, 7 days));
        new LeafTimelock(makeAddr("proposer"), makeAddr("canceller"), 7 days - 1, makeAddr("factory"));
    }

    function test_liveChainsAreRefused() public {
        uint256[8] memory chains = [uint256(1), 8453, 84532, 11155111, 17000, 10, 42161, 137];
        for (uint256 i; i < chains.length; ++i) {
            vm.chainId(chains[i]);
            vm.expectRevert(abi.encodeWithSelector(LeafLocal.LiveChainRefused.selector, chains[i]));
            new LeafToken();
        }
    }

    function test_broadcastScriptReverts() public {
        RefuseBroadcast script = new RefuseBroadcast();
        vm.expectRevert(RefuseBroadcast.NotDeployed.selector);
        script.run();
    }

    function test_weakerCouncilIsRefused() public {
        address[] memory four = new address[](4);
        four[0] = makeAddr("four-a");
        four[1] = makeAddr("four-b");
        four[2] = makeAddr("four-c");
        four[3] = makeAddr("four-d");
        _sort(four);
        vm.expectRevert(LeafMintFactory.BadThreshold.selector);
        factory.deploy(four, 3, keeper, secondKeeper, guardian, keccak256("four"));
        vm.expectRevert(LeafMintFactory.BadThreshold.selector);
        factory.deploy(signers, 2, keeper, secondKeeper, guardian, keccak256("two-of-five"));
        vm.expectRevert(LeafMintFactory.BadThreshold.selector);
        factory.deploy(signers, 5, keeper, secondKeeper, guardian, keccak256("five-of-five"));
        vm.expectRevert(LeafCouncil.BadThreshold.selector);
        new LeafCouncil(four, 2, address(factory));
        assertEq(token.totalSupply(), 0);
        assertEq(council.threshold(), 3);
        assertEq(council.signerCount(), 5);
    }

    function test_factoryKeepsNoRole() public view {
        assertTrue(address(factory) != token.mintGate());
        assertTrue(address(factory) != timelock.proposer());
        assertTrue(address(factory) != timelock.canceller());
        assertTrue(address(factory) != gate.keeper());
        assertTrue(address(factory) != gate.guardian());
    }

    function test_twoDeploymentsStayIdle() public {
        LeafMintFactory other = new LeafMintFactory();
        (LeafToken second,,,) = other.deploy(signers, 3, keeper, secondKeeper, guardian, keccak256("also-idle"));
        assertEq(second.totalSupply(), 0);
        assertTrue(second.pinEngaged());
        assertTrue(second.mintPaused());
        assertTrue(address(second) != address(token));
    }
}
