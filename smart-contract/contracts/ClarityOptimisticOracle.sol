// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ClarityOptimisticOracle v2
 * @dev Hybrid AI-powered optimistic oracle with 3-layer escalation:
 *      Layer 0: Multi-AI consensus (off-chain)
 *      Layer 1: Optimistic verification with bonds (on-chain)
 *      Layer 2: Gnosis Safe Multisig arbitration (on-chain)
 * 
 * This contract replaces the naive v1 (single API) and avoids UMA's plutocratic token voting.
 */
contract ClarityOptimisticOracle is Ownable, ReentrancyGuard {
    
    struct Assertion {
        bytes data;             // The AI answer (e.g. "SUPPORTED", "REFUTED", "UNCLEAR")
        address proposer;       // The AI relayer address
        address disputer;       // Who disputed the assertion
        uint256 bond;           // Proposer's bond
        uint256 disputeBond;    // Disputer's bond
        uint256 challengeWindowEnd; // Timestamp when challenge window ends
        bool isDisputed;        // Whether this assertion was disputed
        bool isResolved;        // Whether arbitrator has resolved
        bool isFinalized;       // FIX: Track if assertion was finalized (prevent double finalization)
        bool resolutionOutcome;  // Final outcome determined by arbitrator
    }

    // Mapping from assertion ID (keccak256(question)) to Assertion
    mapping(bytes32 => Assertion) public assertions;

    // Configuration constants
    uint256 public constant PROPOSER_BOND = 0.01 ether; // Lower for testnet (1 ETH on mainnet)
    uint256 public constant DISPUTER_BOND = 0.02 ether; // Must be higher than proposer bond (spam protection)
    // FIX: Reduced from 48 hours to 60 seconds for demo (adjust via setter if needed)
    uint256 public LIVENESS_PERIOD = 60; // Challenge window in seconds (default: 60s for demo, can be updated by owner)

    // Events
    event QuestionRequested(
        bytes32 indexed assertionId,
        address indexed requester,
        string question,
        uint256 timestamp
    );
    
    event AssertionProposed(
        bytes32 indexed assertionId,
        address indexed proposer,
        bytes data,
        uint256 challengeWindowEnd
    );
    
    event AssertionDisputed(
        bytes32 indexed assertionId,
        address indexed disputer,
        uint256 timestamp
    );
    
    event AssertionResolved(
        bytes32 indexed assertionId,
        bool indexed outcome,
        address indexed winner
    );

    event AssertionFinalized(
        bytes32 indexed assertionId,
        address indexed proposer
    );

    event LivenessPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);

    error AlreadyProposed(bytes32 assertionId);
    error AlreadyDisputed(bytes32 assertionId);
    error AlreadyResolved(bytes32 assertionId);
    error AlreadyFinalized(bytes32 assertionId);
    error ChallengeWindowExpired();
    error ChallengeWindowNotExpired();
    error IncorrectBond(uint256 expected, uint256 provided);
    error NotDisputed(bytes32 assertionId);
    error TransferFailed();

    /**
     * @dev Constructor sets the Gnosis Safe as the arbitrator (owner)
     * @param _arbitrator Address of the Gnosis Safe multisig wallet
     */
    constructor(address _arbitrator) Ownable(_arbitrator) {
        require(_arbitrator != address(0), "Invalid arbitrator");
    }

    /**
     * @dev Users can request a question to be answered
     * @param question The question to be answered
     * @return assertionId The unique identifier for this question (keccak256(question))
     */
    function requestQuestion(string calldata question) external returns (bytes32 assertionId) {
        require(bytes(question).length > 0, "Empty question");
        // FIX: Add length limit to prevent gas limit issues
        require(bytes(question).length <= 500, "Question too long");
        
        assertionId = keccak256(bytes(question));
        
        // Check if already proposed
        if (assertions[assertionId].proposer != address(0)) {
            revert AlreadyProposed(assertionId);
        }
        
        emit QuestionRequested(assertionId, msg.sender, question, block.timestamp);
    }

    /**
     * @dev Layer 1: AI Relayer proposes an assertion with bond
     * @param _assertionId Unique identifier (keccak256(question))
     * @param _data The AI consensus result (encoded verdict, summary, sources)
     */
    function proposeAssertion(
        bytes32 _assertionId,
        bytes calldata _data
    ) external payable nonReentrant {
        if (msg.value != PROPOSER_BOND) {
            revert IncorrectBond(PROPOSER_BOND, msg.value);
        }

        // FIX: Add length limit to prevent gas limit issues
        require(_data.length <= 5000, "Data too long");

        Assertion storage assertion = assertions[_assertionId];
        if (assertion.proposer != address(0)) {
            revert AlreadyProposed(_assertionId);
        }
        // FIX: Prevent proposing if already finalized or resolved
        if (assertion.isFinalized) {
            revert AlreadyFinalized(_assertionId);
        }
        if (assertion.isResolved) {
            revert AlreadyResolved(_assertionId);
        }
        // Note: isDisputed check removed - you can propose even if previously disputed/resolved (new proposal)

        assertions[_assertionId] = Assertion({
            data: _data,
            proposer: msg.sender,
            disputer: address(0),
            bond: msg.value,
            disputeBond: 0,
            challengeWindowEnd: block.timestamp + LIVENESS_PERIOD,
            isDisputed: false,
            isResolved: false,
            isFinalized: false,
            resolutionOutcome: false
        });

        emit AssertionProposed(
            _assertionId,
            msg.sender,
            _data,
            block.timestamp + LIVENESS_PERIOD
        );
    }

    /**
     * @dev Layer 1: Anyone can dispute an assertion
     * @param _assertionId The assertion to dispute
     */
    function disputeAssertion(bytes32 _assertionId) external payable nonReentrant {
        Assertion storage assertion = assertions[_assertionId];
        
        if (assertion.proposer == address(0)) {
            revert("Not proposed");
        }
        if (block.timestamp >= assertion.challengeWindowEnd) {
            revert ChallengeWindowExpired();
        }
        if (assertion.isDisputed) {
            revert AlreadyDisputed(_assertionId);
        }
        // FIX: Prevent disputing if already finalized or resolved
        if (assertion.isFinalized) {
            revert AlreadyFinalized(_assertionId);
        }
        if (assertion.isResolved) {
            revert AlreadyResolved(_assertionId);
        }
        if (msg.value != DISPUTER_BOND) {
            revert IncorrectBond(DISPUTER_BOND, msg.value);
        }

        assertion.isDisputed = true;
        assertion.disputer = msg.sender;
        assertion.disputeBond = msg.value;

        emit AssertionDisputed(_assertionId, msg.sender, block.timestamp);
    }

    /**
     * @dev Layer 2: Gnosis Safe arbitrator resolves dispute
     * @param _assertionId The disputed assertion
     * @param _outcome true = proposer was correct, false = disputer was correct
     */
    function resolveDispute(
        bytes32 _assertionId,
        bool _outcome
    ) external onlyOwner nonReentrant {
        Assertion storage assertion = assertions[_assertionId];
        
        if (!assertion.isDisputed) {
            revert NotDisputed(_assertionId);
        }
        if (assertion.isResolved) {
            revert AlreadyResolved(_assertionId);
        }
        // FIX: Prevent resolving if already finalized
        if (assertion.isFinalized) {
            revert AlreadyFinalized(_assertionId);
        }

        assertion.isResolved = true;
        assertion.resolutionOutcome = _outcome;

        // Winner takes all: proposer bond + disputer bond
        address winner = _outcome ? assertion.proposer : assertion.disputer;
        uint256 totalPot = assertion.bond + assertion.disputeBond;

        // FIX: Use low-level call with explicit gas limit for safety
        (bool success, ) = winner.call{value: totalPot, gas: 30000}("");
        if (!success) {
            revert TransferFailed();
        }

        emit AssertionResolved(_assertionId, _outcome, winner);
    }

    /**
     * @dev Finalize assertion if no dispute occurred after challenge window
     * @param _assertionId The assertion to finalize
     */
    function finalizeAssertion(bytes32 _assertionId) external nonReentrant {
        Assertion storage assertion = assertions[_assertionId];
        
        if (assertion.proposer == address(0)) {
            revert("Not proposed");
        }
        if (assertion.isDisputed) {
            revert AlreadyDisputed(_assertionId);
        }
        // FIX: Prevent double finalization
        if (assertion.isFinalized) {
            revert AlreadyFinalized(_assertionId);
        }
        // FIX: Prevent finalizing if already resolved
        if (assertion.isResolved) {
            revert AlreadyResolved(_assertionId);
        }
        if (block.timestamp < assertion.challengeWindowEnd) {
            revert ChallengeWindowNotExpired();
        }

        assertion.isFinalized = true;

        // Return bond to proposer (they were correct, no dispute)
        // FIX: Use low-level call with explicit gas limit for safety
        (bool success, ) = assertion.proposer.call{value: assertion.bond, gas: 30000}("");
        if (!success) {
            revert TransferFailed();
        }

        emit AssertionFinalized(_assertionId, assertion.proposer);
    }

    /**
     * @dev Update liveness period (owner only - for demo flexibility)
     * @param _newPeriod New liveness period in seconds
     */
    function setLivenessPeriod(uint256 _newPeriod) external onlyOwner {
        require(_newPeriod >= 30 && _newPeriod <= 7 days, "Invalid period");
        uint256 oldPeriod = LIVENESS_PERIOD;
        LIVENESS_PERIOD = _newPeriod;
        emit LivenessPeriodUpdated(oldPeriod, _newPeriod);
    }

    /**
     * @dev Get assertion details
     * @param _assertionId The assertion ID
     * @return assertion The full assertion struct
     */
    function getAssertion(bytes32 _assertionId) 
        external 
        view 
        returns (Assertion memory assertion) 
    {
        return assertions[_assertionId];
    }

    /**
     * @dev Check if assertion can be disputed
     * @param _assertionId The assertion ID
     * @return Whether the assertion can still be disputed
     */
    function canDispute(bytes32 _assertionId) external view returns (bool) {
        Assertion storage assertion = assertions[_assertionId];
        // FIX: Added isResolved check (can't dispute if already resolved)
        return assertion.proposer != address(0) 
            && !assertion.isDisputed 
            && !assertion.isFinalized
            && !assertion.isResolved
            && block.timestamp < assertion.challengeWindowEnd;
    }
}
