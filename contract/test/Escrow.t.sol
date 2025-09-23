// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Escrow} from "../contracts/Zawadi/Escrow.sol";
import {EscrowLib} from "../contracts/Libraries/EscrowLib.sol";
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
        escrow = new Escrow(organizer);
    }

    // Test Constructor
    function test_Constructor_ValidOrganizer() public view{
        assertEq(escrow.organizer(), organizer);
        assertEq(escrow.isLocked(), false);
        assertEq(escrow.challengeCount(), 0);
    }

    function test_Constructor_ZeroAddress() public {
        vm.expectRevert();
        new Escrow(address(0));
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
        (uint256 position1, uint256 amount1, address winner1_, bool claimed1, uint256 challenge1) = escrow.allocations(winner1);
        (uint256 position2, uint256 amount2, address winner2_, bool claimed2, uint256 challenge2) = escrow.allocations(winner2);

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

    function test_ApproveDistribution_ContractLocked() public {
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

        // Try to approve after locking
        vm.prank(sponsor1);
        vm.expectRevert();
        escrow.approveDistribution(0);
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

        (uint256 position1, uint256 amount1, address winner1_, bool claimed1, uint256 challenge1) = escrow.allocations(winner1);
        assertEq(amount1, 1000 * 10**18);
        assertEq(challenge1, 0);

        (uint256 position2, uint256 amount2, address winner2_, bool claimed2, uint256 challenge2) = escrow.allocations(winner2);
        assertEq(amount2, 1.2 ether);
        assertEq(challenge2, 1);

        (uint256 position3, uint256 amount3, address winner3_, bool claimed3, uint256 challenge3) = escrow.allocations(winner3);
        assertEq(amount3, 0.8 ether);
        assertEq(challenge3, 1);
    }
}
