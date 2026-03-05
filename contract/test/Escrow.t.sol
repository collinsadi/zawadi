// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Escrow} from "../contracts/Zawadi/Escrow.sol";
import {EscrowLib} from "../contracts/Libraries/EscrowLib.sol";
import {IIntentSpec} from "../contracts/Interfaces/IIntentSpec.sol";
import "../contracts/Errors/EscrowErrors.sol";
import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Mock ERC20 token for testing
contract MockERC20 is IERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;
    string public name;
    string public symbol;
    uint8 public decimals;

    constructor(string memory _name, string memory _symbol, uint256 _initialSupply) {
        name = _name;
        symbol = _symbol;
        decimals = 18;
        _totalSupply = _initialSupply;
        _balances[msg.sender] = _initialSupply;
    }

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        return true;
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        _allowances[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        _allowances[from][msg.sender] -= amount;
        _balances[from] -= amount;
        _balances[to] += amount;
        return true;
    }
}

contract EscrowTest is Test {
    Escrow public escrow;
    MockERC20 public mockToken;
    address public organizer;
    address public sponsor1;
    address public sponsor2;
    address public winner1;
    address public winner2;
    address public winner3;
    address public nonSponsor;

    event ChallengeAdded(uint256 indexed challengeId, address sponsor, uint256 totalPrize, string ipfsCid);
    event ChallengeFunded(uint256 indexed challengeId, address sponsor, uint256 amount);
    event WinnersAdded(uint256 indexed challengeId, address[] winners, uint256[] allocations);
    event DistributionApproved(uint256 indexed challengeId, address approver);
    event ConfigurationLocked();
    event ConfigurationUnLocked();
    event SponsorWhitelisted(address sponsor);
    event SponsorRevoked(address sponsor);
    event PrizeClaimed(uint256 indexed challengeId, address winner, uint256 amount);
    event ChallengeRefunded(uint256 indexed challengeId, address sponsor, uint256 amount);

    function setUp() public {
        organizer = makeAddr("organizer");
        sponsor1 = makeAddr("sponsor1");
        sponsor2 = makeAddr("sponsor2");
        winner1 = makeAddr("winner1");
        winner2 = makeAddr("winner2");
        winner3 = makeAddr("winner3");
        nonSponsor = makeAddr("nonSponsor");

        // Deploy mock ERC20 token
        mockToken = new MockERC20("TestToken", "TT", 1000000 * 10**18);

        // Deploy escrow contract
        vm.prank(organizer);
        escrow = new Escrow(organizer, "ipfs://escrow-test");
    }

    // Test Constructor
    function test_Constructor_ValidOrganizer() public view{
        assertEq(escrow.organizer(), organizer);
        assertEq(escrow.isLocked(), false);
        assertEq(escrow.challengeCount(), 0);
    }

    function test_Constructor_ZeroAddress() public {
        vm.expectRevert();
        new Escrow(address(0), "");
    }

    // Test whitelistSponsor function
    function test_WhitelistSponsor_ValidAddress() public {
        vm.prank(organizer);
        vm.expectEmit(true, false, false, false);
        emit SponsorWhitelisted(sponsor1);
        escrow.whitelistSponsor(sponsor1);

        assertTrue(escrow.sponsors(sponsor1));
    }

    function test_WhitelistSponsor_AlreadyWhitelisted() public {
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        vm.prank(organizer);
        vm.expectRevert();
        escrow.whitelistSponsor(sponsor1);
    }

    function test_WhitelistSponsor_OnlyOrganizer() public {
        vm.prank(sponsor1);
        vm.expectRevert();
        escrow.whitelistSponsor(sponsor2);
    }

    // Test addChallenge function
    function test_AddChallenge_ValidChallenge() public {
        // Whitelist sponsor first
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        uint256 totalPrize = 1000 * 10**18;
        string memory ipfsCid = "QmTest123";

        vm.prank(sponsor1);
        vm.expectEmit(true, true, false, true);
        emit ChallengeAdded(0, sponsor1, totalPrize, ipfsCid);
        escrow.addChallenge(totalPrize, address(mockToken), true, ipfsCid);

        // Verify challenge was added
        (uint256 totalPrize_, address sponsor, bool isPaidOut, address token, bool isERC20, string memory ipfsCid_, bool isFunded) = escrow.challenges(0);
        assertEq(totalPrize_, totalPrize);
        assertEq(sponsor, sponsor1);
        assertEq(isPaidOut, false);
        assertEq(token, address(mockToken));
        assertEq(isERC20, true);
        assertEq(ipfsCid_, ipfsCid);
        assertEq(isFunded, false);

        // Verify challenge count increased
        assertEq(escrow.challengeCount(), 1);
    }

    function test_AddChallenge_ZeroPrize() public {
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        vm.prank(sponsor1);
        vm.expectRevert();
        escrow.addChallenge(0, address(mockToken), true, "QmTest123");
    }

    function test_AddChallenge_NotWhitelisted() public {
        vm.prank(sponsor1);
        vm.expectRevert();
        escrow.addChallenge(1000 * 10**18, address(mockToken), true, "QmTest123");
    }

    function test_AddChallenge_ContractLocked() public {
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        // Lock the contract
        vm.prank(organizer);
        escrow.lockContract();

        vm.prank(sponsor1);
        vm.expectRevert();
        escrow.addChallenge(1000 * 10**18, address(mockToken), true, "QmTest123");
    }

    function test_AddChallenge_MultipleChallenges() public {
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor2);

        // Add first challenge
        vm.prank(sponsor1);
        escrow.addChallenge(1000 * 10**18, address(mockToken), true, "QmTest1");

        // Add second challenge
        vm.prank(sponsor2);
        escrow.addChallenge(2000 * 10**18, address(0), false, "QmTest2");

        assertEq(escrow.challengeCount(), 2);

        // Verify both challenges
        (uint256 totalPrize1, address sponsor1_, bool isPaidOut1, address token1, bool isERC20_1, string memory ipfsCid1, bool isFunded1) = escrow.challenges(0);
        (uint256 totalPrize2, address sponsor2_, bool isPaidOut2, address token2, bool isERC20_2, string memory ipfsCid2, bool isFunded2) = escrow.challenges(1);

        assertEq(sponsor1_, sponsor1);
        assertEq(totalPrize1, 1000 * 10**18);
        assertEq(isERC20_1, true);

        assertEq(sponsor2_, sponsor2);
        assertEq(totalPrize2, 2000 * 10**18);
        assertEq(isERC20_2, false);
    }

    // Test fundChallenge function
    function test_FundChallenge_ERC20_Success() public {
        // Setup
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        uint256 totalPrize = 1000 * 10**18;
        vm.prank(sponsor1);
        escrow.addChallenge(totalPrize, address(mockToken), true, "QmTest123");

        // Give sponsor tokens and approve escrow
        vm.prank(address(this));
        mockToken.transfer(sponsor1, totalPrize);

        vm.prank(sponsor1);
        mockToken.approve(address(escrow), totalPrize);

        // Fund challenge
        vm.prank(sponsor1);
        vm.expectEmit(true, true, false, false);
        emit ChallengeFunded(0, sponsor1, totalPrize);
        escrow.fundChallenge(0);

        // Verify challenge is funded
        (,,,,,, bool isFunded) = escrow.challenges(0);
        assertTrue(isFunded);
        assertEq(mockToken.balanceOf(address(escrow)), totalPrize);
    }

    function test_FundChallenge_ETH_Success() public {
        // Setup
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        uint256 totalPrize = 1 ether;
        vm.prank(sponsor1);
        escrow.addChallenge(totalPrize, address(0), false, "QmTest123");

        // Fund challenge with ETH
        vm.deal(sponsor1, totalPrize);
        vm.prank(sponsor1);
        vm.expectEmit(true, true, false, false);
        emit ChallengeFunded(0, sponsor1, totalPrize);
        escrow.fundChallenge{value: totalPrize}(0);

        // Verify challenge is funded
        (,,,,,, bool isFunded) = escrow.challenges(0);
        assertTrue(isFunded);
        assertEq(address(escrow).balance, totalPrize);
    }

    function test_FundChallenge_AlreadyFunded() public {
        // Setup and fund once
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        uint256 totalPrize = 1000 * 10**18;
        vm.prank(sponsor1);
        escrow.addChallenge(totalPrize, address(mockToken), true, "QmTest123");

        vm.prank(address(this));
        mockToken.transfer(sponsor1, totalPrize);

        vm.prank(sponsor1);
        mockToken.approve(address(escrow), totalPrize);
        vm.prank(sponsor1);
        escrow.fundChallenge(0);

        // Try to fund again
        vm.prank(sponsor1);
        vm.expectRevert();
        escrow.fundChallenge(0);
    }

    function test_FundChallenge_InvalidChallengeId() public {
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        vm.prank(sponsor1);
        vm.expectRevert();
        escrow.fundChallenge(999);
    }

    function test_FundChallenge_OnlySponsor() public {
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        uint256 totalPrize = 1000 * 10**18;
        vm.prank(sponsor1);
        escrow.addChallenge(totalPrize, address(mockToken), true, "QmTest123");

        vm.prank(sponsor2);
        vm.expectRevert();
        escrow.fundChallenge(0);
    }

    function test_FundChallenge_InsufficientAllowance() public {
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        uint256 totalPrize = 1000 * 10**18;
        vm.prank(sponsor1);
        escrow.addChallenge(totalPrize, address(mockToken), true, "QmTest123");

        // Don't approve enough tokens
        vm.prank(sponsor1);
        mockToken.approve(address(escrow), totalPrize - 1);

        vm.prank(sponsor1);
        vm.expectRevert();
        escrow.fundChallenge(0);
    }

    function test_FundChallenge_InvalidEthAmount() public {
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        uint256 totalPrize = 1 ether;
        vm.prank(sponsor1);
        escrow.addChallenge(totalPrize, address(0), false, "QmTest123");

        vm.deal(sponsor1, totalPrize);
        vm.prank(sponsor1);
        vm.expectRevert();
        escrow.fundChallenge{value: totalPrize - 1}(0);
    }

    function test_FundChallenge_ContractLocked() public {
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        uint256 totalPrize = 1000 * 10**18;
        vm.prank(sponsor1);
        escrow.addChallenge(totalPrize, address(mockToken), true, "QmTest123");

        // Lock the contract
        vm.prank(organizer);
        escrow.lockContract();

        vm.prank(address(this));
        mockToken.transfer(sponsor1, totalPrize);

        vm.prank(sponsor1);
        mockToken.approve(address(escrow), totalPrize);

        vm.prank(sponsor1);
        vm.expectRevert();
        escrow.fundChallenge(0);
    }

    // Test lockContract function
    function test_LockContract_Success() public {
        vm.prank(organizer);
        vm.expectEmit(false, false, false, false);
        emit ConfigurationLocked();
        escrow.lockContract();

        assertTrue(escrow.isLocked());
    }

    function test_LockContract_OnlyOrganizer() public {
        vm.prank(sponsor1);
        vm.expectRevert();
        escrow.lockContract();
    }

    function test_LockContract_AlreadyLocked() public {
        vm.prank(organizer);
        escrow.lockContract();

        vm.prank(organizer);
        vm.expectRevert();
        escrow.lockContract();
    }

    // Test addWinners function
    function test_AddWinners_ValidWinners() public {
        // Setup
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        uint256 totalPrize = 1000 * 10**18;
        vm.prank(sponsor1);
        escrow.addChallenge(totalPrize, address(mockToken), true, "QmTest123");

        // Fund challenge
        vm.prank(address(this));
        mockToken.transfer(sponsor1, totalPrize);

        vm.prank(sponsor1);
        mockToken.approve(address(escrow), totalPrize);
        vm.prank(sponsor1);
        escrow.fundChallenge(0);

        // Add winners
        address[] memory winners = new address[](2);
        winners[0] = winner1;
        winners[1] = winner2;

        uint256[] memory allocations = new uint256[](2);
        allocations[0] = 600 * 10**18;
        allocations[1] = 400 * 10**18;

        vm.prank(organizer);
        vm.expectEmit(true, false, false, true);
        emit WinnersAdded(0, winners, allocations);
        escrow.addWinners(0, winners, allocations);

        // Verify allocations
        (uint256 position1, uint256 amount1, address winner1_, bool claimed1, uint256 challenge1) = escrow.allocations(winner1, 0);
        (uint256 position2, uint256 amount2, address winner2_, bool claimed2, uint256 challenge2) = escrow.allocations(winner2, 0);

        assertEq(position1, 1);
        assertEq(amount1, 600 * 10**18);
        assertEq(winner1_, winner1);
        assertEq(claimed1, false);
        assertEq(challenge1, 0);

        assertEq(position2, 2);
        assertEq(amount2, 400 * 10**18);
        assertEq(winner2_, winner2);
        assertEq(claimed2, false);
        assertEq(challenge2, 0);
    }

    function test_AddWinners_ChallengeNotFunded() public {
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        uint256 totalPrize = 1000 * 10**18;
        vm.prank(sponsor1);
        escrow.addChallenge(totalPrize, address(mockToken), true, "QmTest123");

        address[] memory winners = new address[](1);
        winners[0] = winner1;

        uint256[] memory allocations = new uint256[](1);
        allocations[0] = 1000 * 10**18;

        vm.prank(organizer);
        vm.expectRevert();
        escrow.addWinners(0, winners, allocations);
    }

    function test_AddWinners_InvalidAllocation() public {
        // Setup
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        uint256 totalPrize = 1000 * 10**18;
        vm.prank(sponsor1);
        escrow.addChallenge(totalPrize, address(mockToken), true, "QmTest123");

        vm.prank(address(this));
        mockToken.transfer(sponsor1, totalPrize);

        vm.prank(sponsor1);
        mockToken.approve(address(escrow), totalPrize);
        vm.prank(sponsor1);
        escrow.fundChallenge(0);

        // Test empty winners array
        address[] memory emptyWinners = new address[](0);
        uint256[] memory emptyAllocations = new uint256[](0);

        vm.prank(organizer);
        vm.expectRevert();
        escrow.addWinners(0, emptyWinners, emptyAllocations);

        // Test mismatched arrays
        address[] memory winners = new address[](2);
        winners[0] = winner1;
        winners[1] = winner2;

        uint256[] memory allocations = new uint256[](1);
        allocations[0] = 1000 * 10**18;

        vm.prank(organizer);
        vm.expectRevert();
        escrow.addWinners(0, winners, allocations);

        // Test zero address winner
        address[] memory invalidWinners = new address[](1);
        invalidWinners[0] = address(0);

        uint256[] memory validAllocations = new uint256[](1);
        validAllocations[0] = 1000 * 10**18;

        vm.prank(organizer);
        vm.expectRevert();
        escrow.addWinners(0, invalidWinners, validAllocations);

        // Test zero allocation
        address[] memory validWinners = new address[](1);
        validWinners[0] = winner1;

        uint256[] memory zeroAllocations = new uint256[](1);
        zeroAllocations[0] = 0;

        vm.prank(organizer);
        vm.expectRevert();
        escrow.addWinners(0, validWinners, zeroAllocations);

        // Test total allocation doesn't match prize
        address[] memory winners2 = new address[](1);
        winners2[0] = winner1;

        uint256[] memory wrongAllocations = new uint256[](1);
        wrongAllocations[0] = 500 * 10**18; // Less than total prize

        vm.prank(organizer);
        vm.expectRevert();
        escrow.addWinners(0, winners2, wrongAllocations);
    }

    function test_AddWinners_OnlyOrganizer() public {
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        uint256 totalPrize = 1000 * 10**18;
        vm.prank(sponsor1);
        escrow.addChallenge(totalPrize, address(mockToken), true, "QmTest123");

        vm.prank(address(this));
        mockToken.transfer(sponsor1, totalPrize);

        vm.prank(sponsor1);
        mockToken.approve(address(escrow), totalPrize);
        vm.prank(sponsor1);
        escrow.fundChallenge(0);

        address[] memory winners = new address[](1);
        winners[0] = winner1;

        uint256[] memory allocations = new uint256[](1);
        allocations[0] = 1000 * 10**18;

        vm.prank(sponsor1);
        vm.expectRevert();
        escrow.addWinners(0, winners, allocations);
    }

    function test_AddWinners_ContractLocked() public {
        // Setup
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        uint256 totalPrize = 1000 * 10**18;
        vm.prank(sponsor1);
        escrow.addChallenge(totalPrize, address(mockToken), true, "QmTest123");

        vm.prank(address(this));
        mockToken.transfer(sponsor1, totalPrize);

        vm.prank(sponsor1);
        mockToken.approve(address(escrow), totalPrize);
        vm.prank(sponsor1);
        escrow.fundChallenge(0);

        // Lock contract
        vm.prank(organizer);
        escrow.lockContract();

        address[] memory winners = new address[](1);
        winners[0] = winner1;

        uint256[] memory allocations = new uint256[](1);
        allocations[0] = 1000 * 10**18;

        vm.prank(organizer);
        vm.expectRevert();
        escrow.addWinners(0, winners, allocations);
    }

    // Test approveDistribution function
    function test_ApproveDistribution_SponsorApproval() public {
        // Setup
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        uint256 totalPrize = 1000 * 10**18;
        vm.prank(sponsor1);
        escrow.addChallenge(totalPrize, address(mockToken), true, "QmTest123");

        vm.prank(address(this));
        mockToken.transfer(sponsor1, totalPrize);

        vm.prank(sponsor1);
        mockToken.approve(address(escrow), totalPrize);
        vm.prank(sponsor1);
        escrow.fundChallenge(0);

        // Sponsor approves
        vm.prank(sponsor1);
        vm.expectEmit(true, false, false, false);
        emit DistributionApproved(0, sponsor1);
        escrow.approveDistribution(0);

        // Verify approval
        (bool sponsorApproved, bool organiserApproved) = escrow.approvals(0);
        assertTrue(sponsorApproved);
        assertFalse(organiserApproved);
    }

    function test_ApproveDistribution_OrganizerApproval() public {
        // Setup
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        uint256 totalPrize = 1000 * 10**18;
        vm.prank(sponsor1);
        escrow.addChallenge(totalPrize, address(mockToken), true, "QmTest123");

        vm.prank(address(this));
        mockToken.transfer(sponsor1, totalPrize);

        vm.prank(sponsor1);
        mockToken.approve(address(escrow), totalPrize);
        vm.prank(sponsor1);
        escrow.fundChallenge(0);

        // Organizer approves
        vm.prank(organizer);
        vm.expectEmit(true, false, false, false);
        emit DistributionApproved(0, organizer);
        escrow.approveDistribution(0);

        // Verify approval
        (bool sponsorApproved, bool organiserApproved) = escrow.approvals(0);
        assertFalse(sponsorApproved);
        assertTrue(organiserApproved);
    }

    function test_ApproveDistribution_SponsorAlreadyApproved() public {
        // Setup
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        uint256 totalPrize = 1000 * 10**18;
        vm.prank(sponsor1);
        escrow.addChallenge(totalPrize, address(mockToken), true, "QmTest123");

        vm.prank(address(this));
        mockToken.transfer(sponsor1, totalPrize);

        vm.prank(sponsor1);
        mockToken.approve(address(escrow), totalPrize);
        vm.prank(sponsor1);
        escrow.fundChallenge(0);

        // First approval
        vm.prank(sponsor1);
        escrow.approveDistribution(0);

        // Try to approve again
        vm.prank(sponsor1);
        vm.expectRevert();
        escrow.approveDistribution(0);
    }

    function test_ApproveDistribution_OrganizerAlreadyApproved() public {
        // Setup
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        uint256 totalPrize = 1000 * 10**18;
        vm.prank(sponsor1);
        escrow.addChallenge(totalPrize, address(mockToken), true, "QmTest123");

        vm.prank(address(this));
        mockToken.transfer(sponsor1, totalPrize);

        vm.prank(sponsor1);
        mockToken.approve(address(escrow), totalPrize);
        vm.prank(sponsor1);
        escrow.fundChallenge(0);

        // First approval
        vm.prank(organizer);
        escrow.approveDistribution(0);

        // Try to approve again
        vm.prank(organizer);
        vm.expectRevert();
        escrow.approveDistribution(0);
    }

    function test_ApproveDistribution_UnauthorizedAccess() public {
        // Setup
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        uint256 totalPrize = 1000 * 10**18;
        vm.prank(sponsor1);
        escrow.addChallenge(totalPrize, address(mockToken), true, "QmTest123");

        vm.prank(address(this));
        mockToken.transfer(sponsor1, totalPrize);

        vm.prank(sponsor1);
        mockToken.approve(address(escrow), totalPrize);
        vm.prank(sponsor1);
        escrow.fundChallenge(0);

        // Non-authorized user tries to approve
        vm.prank(nonSponsor);
        vm.expectRevert();
        escrow.approveDistribution(0);
    }

    function test_ApproveDistribution_ContractLocked_StillAllowed() public {
        // Setup
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        uint256 totalPrize = 1000 * 10**18;
        vm.prank(sponsor1);
        escrow.addChallenge(totalPrize, address(mockToken), true, "QmTest123");

        vm.prank(address(this));
        mockToken.transfer(sponsor1, totalPrize);

        vm.prank(sponsor1);
        mockToken.approve(address(escrow), totalPrize);
        vm.prank(sponsor1);
        escrow.fundChallenge(0);

        // Lock contract
        vm.prank(organizer);
        escrow.lockContract();

        // [M-02] Approval should succeed even when locked
        vm.prank(sponsor1);
        escrow.approveDistribution(0);

        (bool sponsorApproved, ) = escrow.approvals(0);
        assertTrue(sponsorApproved);
    }

    // Test unLockContract function
    function test_UnLockContract_Success() public {
        // Lock first
        vm.prank(organizer);
        escrow.lockContract();

        // Unlock
        vm.prank(organizer);
        vm.expectEmit(false, false, false, false);
        emit ConfigurationUnLocked();
        escrow.unLockContract();

        assertFalse(escrow.isLocked());
    }

    function test_UnLockContract_OnlyOrganizer() public {
        vm.prank(sponsor1);
        vm.expectRevert();
        escrow.unLockContract();
    }

    // Test edge cases and gas usage
    function test_AddChallenge_GasUsage() public {
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        uint256 gasStart = gasleft();
        vm.prank(sponsor1);
        escrow.addChallenge(1000 * 10**18, address(mockToken), true, "QmTest123");
        uint256 gasUsed = gasStart - gasleft();

        console.log("Gas used for addChallenge:", gasUsed);
        assertTrue(gasUsed < 200_000);
    }

    function test_FundChallenge_GasUsage() public {
        // Setup
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        uint256 totalPrize = 1000 * 10**18;
        vm.prank(sponsor1);
        escrow.addChallenge(totalPrize, address(mockToken), true, "QmTest123");

        vm.prank(address(this));
        mockToken.transfer(sponsor1, totalPrize);

        vm.prank(sponsor1);
        mockToken.approve(address(escrow), totalPrize);

        uint256 gasStart = gasleft();
        vm.prank(sponsor1);
        escrow.fundChallenge(0);
        uint256 gasUsed = gasStart - gasleft();

        console.log("Gas used for fundChallenge:", gasUsed);
        assertTrue(gasUsed < 150_000);
    }

    // Test multiple challenges workflow
    function test_MultipleChallengesWorkflow() public {
        // Setup
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor2);

        // Create two challenges
        vm.prank(sponsor1);
        escrow.addChallenge(1000 * 10**18, address(mockToken), true, "QmTest1");

        vm.prank(sponsor2);
        escrow.addChallenge(2 ether, address(0), false, "QmTest2");

        // Fund both challenges
        vm.prank(address(this));
        mockToken.transfer(sponsor1, 1000 * 10**18);

        vm.prank(sponsor1);
        mockToken.approve(address(escrow), 1000 * 10**18);
        vm.prank(sponsor1);
        escrow.fundChallenge(0);

        vm.deal(sponsor2, 2 ether);
        vm.prank(sponsor2);
        escrow.fundChallenge{value: 2 ether}(1);

        // Add winners for both challenges
        address[] memory winners1 = new address[](1);
        winners1[0] = winner1;
        uint256[] memory allocations1 = new uint256[](1);
        allocations1[0] = 1000 * 10**18;

        address[] memory winners2 = new address[](2);
        winners2[0] = winner2;
        winners2[1] = winner3;
        uint256[] memory allocations2 = new uint256[](2);
        allocations2[0] = 1.2 ether;
        allocations2[1] = 0.8 ether;

        vm.prank(organizer);
        escrow.addWinners(0, winners1, allocations1);

        vm.prank(organizer);
        escrow.addWinners(1, winners2, allocations2);

        // Approve distributions
        vm.prank(sponsor1);
        escrow.approveDistribution(0);

        vm.prank(organizer);
        escrow.approveDistribution(0);

        vm.prank(sponsor2);
        escrow.approveDistribution(1);

        vm.prank(organizer);
        escrow.approveDistribution(1);

        // Verify final state
        assertEq(escrow.challengeCount(), 2);
        (,,,,,, bool isFunded1) = escrow.challenges(0);
        (,,,,,, bool isFunded2) = escrow.challenges(1);
        assertTrue(isFunded1);
        assertTrue(isFunded2);

        (uint256 position1, uint256 amount1, address winner1_, bool claimed1, uint256 challenge1) = escrow.allocations(winner1, 0);
        assertEq(amount1, 1000 * 10**18);
        assertEq(challenge1, 0);

        (uint256 position2, uint256 amount2, address winner2_, bool claimed2, uint256 challenge2) = escrow.allocations(winner2, 1);
        assertEq(amount2, 1.2 ether);
        assertEq(challenge2, 1);

        (uint256 position3, uint256 amount3, address winner3_, bool claimed3, uint256 challenge3) = escrow.allocations(winner3, 1);
        assertEq(amount3, 0.8 ether);
        assertEq(challenge3, 1);
    }

    // =========================================================================
    // ERC-165 + IntentSpec
    // =========================================================================

    function test_SupportsInterface_ERC165() public view {
        assertTrue(escrow.supportsInterface(0x01ffc9a7));
    }

    function test_SupportsInterface_IIntentSpec() public view {
        assertTrue(escrow.supportsInterface(type(IIntentSpec).interfaceId));
    }

    function test_SupportsInterface_InvalidId() public view {
        assertFalse(escrow.supportsInterface(0xffffffff));
    }

    function test_GetIntentSpecURI() public view {
        assertEq(escrow.getIntentSpecURI(), "ipfs://escrow-test");
    }

    function test_SetIntentSpecURI_Success() public {
        vm.prank(organizer);
        escrow.setIntentSpecURI("ipfs://new-uri");
        assertEq(escrow.getIntentSpecURI(), "ipfs://new-uri");
    }

    function test_SetIntentSpecURI_OnlyOrganizer() public {
        vm.prank(sponsor1);
        vm.expectRevert(Escrow__OnlyOrganizerCanAccess.selector);
        escrow.setIntentSpecURI("ipfs://bad");
    }

    // =========================================================================
    // revokeSponsor
    // =========================================================================

    function test_RevokeSponsor_Success() public {
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);
        assertTrue(escrow.sponsors(sponsor1));

        vm.prank(organizer);
        vm.expectEmit(true, false, false, false);
        emit SponsorRevoked(sponsor1);
        escrow.revokeSponsor(sponsor1);

        assertFalse(escrow.sponsors(sponsor1));
        address[] memory list = escrow.getWhitelistedSponsors();
        assertEq(list.length, 0);
    }

    function test_RevokeSponsor_MultipleSponsorsList() public {
        vm.startPrank(organizer);
        escrow.whitelistSponsor(sponsor1);
        escrow.whitelistSponsor(sponsor2);
        escrow.revokeSponsor(sponsor1);
        vm.stopPrank();

        address[] memory list = escrow.getWhitelistedSponsors();
        assertEq(list.length, 1);
        assertEq(list[0], sponsor2);
    }

    function test_RevokeSponsor_NotWhitelisted() public {
        vm.prank(organizer);
        vm.expectRevert(Escrow__SponsorNotWhitelisted.selector);
        escrow.revokeSponsor(sponsor1);
    }

    function test_RevokeSponsor_OnlyOrganizer() public {
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        vm.prank(sponsor1);
        vm.expectRevert(Escrow__OnlyOrganizerCanAccess.selector);
        escrow.revokeSponsor(sponsor1);
    }

    function test_RevokeSponsor_ContractLocked() public {
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        vm.prank(organizer);
        escrow.lockContract();

        vm.prank(organizer);
        vm.expectRevert(Escrow__ConfigurationLocked.selector);
        escrow.revokeSponsor(sponsor1);
    }

    function test_RevokeSponsor_BlocksNewChallenges() public {
        vm.startPrank(organizer);
        escrow.whitelistSponsor(sponsor1);
        escrow.revokeSponsor(sponsor1);
        vm.stopPrank();

        vm.prank(sponsor1);
        vm.expectRevert(Escrow__SponsorNotWhitelisted.selector);
        escrow.addChallenge(1000 * 10**18, address(mockToken), true, "QmTest");
    }

    // =========================================================================
    // addWinners – duplicate detection & approval reset
    // =========================================================================

    function test_AddWinners_DuplicateWinner() public {
        _setupFundedChallenge(1000 * 10**18, true);

        address[] memory winners = new address[](2);
        winners[0] = winner1;
        winners[1] = winner1;

        uint256[] memory allocs = new uint256[](2);
        allocs[0] = 600 * 10**18;
        allocs[1] = 400 * 10**18;

        vm.prank(organizer);
        vm.expectRevert(Escrow__DuplicateWinner.selector);
        escrow.addWinners(0, winners, allocs);
    }

    function test_AddWinners_ResetsApprovals() public {
        _setupFundedChallenge(1000 * 10**18, true);

        address[] memory winners = new address[](1);
        winners[0] = winner1;
        uint256[] memory allocs = new uint256[](1);
        allocs[0] = 1000 * 10**18;

        vm.prank(organizer);
        escrow.addWinners(0, winners, allocs);

        vm.prank(sponsor1);
        escrow.approveDistribution(0);
        vm.prank(organizer);
        escrow.approveDistribution(0);

        (bool sBefore, bool oBefore) = escrow.approvals(0);
        assertTrue(sBefore);
        assertTrue(oBefore);

        vm.prank(organizer);
        escrow.unLockContract();

        // Re-add winners (different set) – approvals must reset
        address[] memory winners2 = new address[](1);
        winners2[0] = winner2;
        uint256[] memory allocs2 = new uint256[](1);
        allocs2[0] = 1000 * 10**18;

        vm.prank(organizer);
        escrow.addWinners(0, winners2, allocs2);

        (bool sAfter, bool oAfter) = escrow.approvals(0);
        assertFalse(sAfter);
        assertFalse(oAfter);
    }

    // =========================================================================
    // claimPayout – ERC20
    // =========================================================================

    function test_ClaimPayout_ERC20_Success() public {
        _setupFundedChallenge(1000 * 10**18, true);
        _addWinnersAndApprove_ERC20();

        uint256 balBefore = mockToken.balanceOf(winner1);

        vm.prank(winner1);
        vm.expectEmit(true, false, false, true);
        emit PrizeClaimed(0, winner1, 600 * 10**18);
        escrow.claimPayout(0);

        uint256 balAfter = mockToken.balanceOf(winner1);
        assertEq(balAfter - balBefore, 600 * 10**18);

        (, , , bool claimed, ) = escrow.allocations(winner1, 0);
        assertTrue(claimed);
    }

    function test_ClaimPayout_ETH_Success() public {
        uint256 prize = 2 ether;
        _setupFundedETHChallenge(prize);
        _addWinnersAndApprove_ETH(prize);

        uint256 balBefore = winner1.balance;

        vm.prank(winner1);
        escrow.claimPayout(0);

        assertEq(winner1.balance - balBefore, 1.2 ether);
    }

    function test_ClaimPayout_NotWinner() public {
        _setupFundedChallenge(1000 * 10**18, true);
        _addWinnersAndApprove_ERC20();

        vm.prank(nonSponsor);
        vm.expectRevert(Escrow__UnauthorizedAccess.selector);
        escrow.claimPayout(0);
    }

    function test_ClaimPayout_AlreadyClaimed() public {
        _setupFundedChallenge(1000 * 10**18, true);
        _addWinnersAndApprove_ERC20();

        vm.prank(winner1);
        escrow.claimPayout(0);

        vm.prank(winner1);
        vm.expectRevert(Escrow__PayoutAlreadyClaimed.selector);
        escrow.claimPayout(0);
    }

    function test_ClaimPayout_NotApproved() public {
        _setupFundedChallenge(1000 * 10**18, true);

        address[] memory winners = new address[](1);
        winners[0] = winner1;
        uint256[] memory allocs = new uint256[](1);
        allocs[0] = 1000 * 10**18;
        vm.prank(organizer);
        escrow.addWinners(0, winners, allocs);

        vm.prank(winner1);
        vm.expectRevert(Escrow__UnauthorizedAccess.selector);
        escrow.claimPayout(0);
    }

    function test_ClaimPayout_OnlyOneSideApproved() public {
        _setupFundedChallenge(1000 * 10**18, true);

        address[] memory winners = new address[](1);
        winners[0] = winner1;
        uint256[] memory allocs = new uint256[](1);
        allocs[0] = 1000 * 10**18;
        vm.prank(organizer);
        escrow.addWinners(0, winners, allocs);

        vm.prank(sponsor1);
        escrow.approveDistribution(0);

        vm.prank(winner1);
        vm.expectRevert(Escrow__UnauthorizedAccess.selector);
        escrow.claimPayout(0);
    }

    function test_ClaimPayout_AllClaimed_SetsPaidOut() public {
        _setupFundedChallenge(1000 * 10**18, true);
        _addWinnersAndApprove_ERC20();

        vm.prank(winner1);
        escrow.claimPayout(0);

        (, , bool isPaidOutBefore, , , , ) = escrow.challenges(0);
        assertFalse(isPaidOutBefore);

        vm.prank(winner2);
        escrow.claimPayout(0);

        (, , bool isPaidOutAfter, , , , ) = escrow.challenges(0);
        assertTrue(isPaidOutAfter);
        assertEq(escrow.claimedCount(0), 2);
        assertEq(escrow.winnerCount(0), 2);
    }

    // =========================================================================
    // refundChallenge
    // =========================================================================

    function test_RefundChallenge_ERC20_Success() public {
        _setupFundedChallenge(1000 * 10**18, true);

        uint256 balBefore = mockToken.balanceOf(sponsor1);

        vm.prank(sponsor1);
        vm.expectEmit(true, false, false, true);
        emit ChallengeRefunded(0, sponsor1, 1000 * 10**18);
        escrow.refundChallenge(0);

        uint256 balAfter = mockToken.balanceOf(sponsor1);
        assertEq(balAfter - balBefore, 1000 * 10**18);

        (, , , , , , bool isFunded) = escrow.challenges(0);
        assertFalse(isFunded);
    }

    function test_RefundChallenge_ETH_Success() public {
        uint256 prize = 1 ether;
        _setupFundedETHChallenge(prize);

        uint256 balBefore = sponsor1.balance;

        vm.prank(sponsor1);
        escrow.refundChallenge(0);

        assertEq(sponsor1.balance - balBefore, prize);

        (, , , , , , bool isFunded) = escrow.challenges(0);
        assertFalse(isFunded);
    }

    function test_RefundChallenge_NotSponsor() public {
        _setupFundedChallenge(1000 * 10**18, true);

        vm.prank(organizer);
        vm.expectRevert(Escrow__OnlySponsorCanAccess.selector);
        escrow.refundChallenge(0);
    }

    function test_RefundChallenge_NotFunded() public {
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        vm.prank(sponsor1);
        escrow.addChallenge(1000 * 10**18, address(mockToken), true, "QmTest");

        vm.prank(sponsor1);
        vm.expectRevert(Escrow__RefundWindowNotOpen.selector);
        escrow.refundChallenge(0);
    }

    function test_RefundChallenge_BothApproved_Blocked() public {
        _setupFundedChallenge(1000 * 10**18, true);

        address[] memory winners = new address[](1);
        winners[0] = winner1;
        uint256[] memory allocs = new uint256[](1);
        allocs[0] = 1000 * 10**18;
        vm.prank(organizer);
        escrow.addWinners(0, winners, allocs);

        vm.prank(sponsor1);
        escrow.approveDistribution(0);
        vm.prank(organizer);
        escrow.approveDistribution(0);

        vm.prank(sponsor1);
        vm.expectRevert(Escrow__RefundWindowNotOpen.selector);
        escrow.refundChallenge(0);
    }

    function test_RefundChallenge_PartialApproval_Allowed() public {
        _setupFundedChallenge(1000 * 10**18, true);

        address[] memory winners = new address[](1);
        winners[0] = winner1;
        uint256[] memory allocs = new uint256[](1);
        allocs[0] = 1000 * 10**18;
        vm.prank(organizer);
        escrow.addWinners(0, winners, allocs);

        vm.prank(sponsor1);
        escrow.approveDistribution(0);

        vm.prank(sponsor1);
        escrow.refundChallenge(0);

        (, , , , , , bool isFunded) = escrow.challenges(0);
        assertFalse(isFunded);

        (bool sApproved, bool oApproved) = escrow.approvals(0);
        assertFalse(sApproved);
        assertFalse(oApproved);
    }

    function test_RefundChallenge_ResetsApprovals() public {
        _setupFundedChallenge(1000 * 10**18, true);

        address[] memory winners = new address[](1);
        winners[0] = winner1;
        uint256[] memory allocs = new uint256[](1);
        allocs[0] = 1000 * 10**18;
        vm.prank(organizer);
        escrow.addWinners(0, winners, allocs);

        vm.prank(organizer);
        escrow.approveDistribution(0);

        vm.prank(sponsor1);
        escrow.refundChallenge(0);

        (bool s, bool o) = escrow.approvals(0);
        assertFalse(s);
        assertFalse(o);
    }

    // =========================================================================
    // getChallengesPage
    // =========================================================================

    function test_GetChallengesPage_Basic() public {
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        vm.startPrank(sponsor1);
        escrow.addChallenge(100, address(mockToken), true, "c0");
        escrow.addChallenge(200, address(mockToken), true, "c1");
        escrow.addChallenge(300, address(mockToken), true, "c2");
        vm.stopPrank();

        (EscrowLib.Challenge[] memory items, uint256[] memory ids) = escrow.getChallengesPage(0, 2);
        assertEq(items.length, 2);
        assertEq(ids[0], 0);
        assertEq(ids[1], 1);
        assertEq(items[0].totalPrize, 100);
        assertEq(items[1].totalPrize, 200);
    }

    function test_GetChallengesPage_OffsetBeyondLength() public {
        (EscrowLib.Challenge[] memory items, uint256[] memory ids) = escrow.getChallengesPage(10, 5);
        assertEq(items.length, 0);
        assertEq(ids.length, 0);
    }

    function test_GetChallengesPage_LimitExceedsRemaining() public {
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        vm.prank(sponsor1);
        escrow.addChallenge(100, address(mockToken), true, "c0");

        (EscrowLib.Challenge[] memory items, uint256[] memory ids) = escrow.getChallengesPage(0, 100);
        assertEq(items.length, 1);
        assertEq(ids[0], 0);
    }

    // =========================================================================
    // Internal helpers
    // =========================================================================

    function _setupFundedChallenge(uint256 prize, bool isERC20) internal {
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        vm.prank(sponsor1);
        escrow.addChallenge(prize, address(mockToken), isERC20, "QmTest");

        mockToken.transfer(sponsor1, prize);
        vm.prank(sponsor1);
        mockToken.approve(address(escrow), prize);
        vm.prank(sponsor1);
        escrow.fundChallenge(0);
    }

    function _setupFundedETHChallenge(uint256 prize) internal {
        vm.prank(organizer);
        escrow.whitelistSponsor(sponsor1);

        vm.prank(sponsor1);
        escrow.addChallenge(prize, address(0), false, "QmTestETH");

        vm.deal(sponsor1, prize);
        vm.prank(sponsor1);
        escrow.fundChallenge{value: prize}(0);
    }

    function _addWinnersAndApprove_ERC20() internal {
        address[] memory winners = new address[](2);
        winners[0] = winner1;
        winners[1] = winner2;
        uint256[] memory allocs = new uint256[](2);
        allocs[0] = 600 * 10**18;
        allocs[1] = 400 * 10**18;

        vm.prank(organizer);
        escrow.addWinners(0, winners, allocs);

        vm.prank(sponsor1);
        escrow.approveDistribution(0);
        vm.prank(organizer);
        escrow.approveDistribution(0);
    }

    function _addWinnersAndApprove_ETH(uint256 prize) internal {
        address[] memory winners = new address[](2);
        winners[0] = winner1;
        winners[1] = winner2;
        uint256[] memory allocs = new uint256[](2);
        allocs[0] = (prize * 60) / 100;
        allocs[1] = prize - allocs[0];

        vm.prank(organizer);
        escrow.addWinners(0, winners, allocs);

        vm.prank(sponsor1);
        escrow.approveDistribution(0);
        vm.prank(organizer);
        escrow.approveDistribution(0);
    }
}
