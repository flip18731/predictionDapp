// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

/// @title RelayerOracle - Semi-Decentralized Oracle with Cryptographic Verification
/// @notice AI-assisted prediction market oracle using signed off-chain relayer
/// @dev Pragmatic hybrid approach for BNB Chain Testnet hackathon
contract RelayerOracle is ConfirmedOwner {
    
    struct Resolution {
        string question;
        string verdict;
        string summary;
        string[] sources;
        uint256 timestamp;
        address requester;
        address relayer;
        bool fulfilled;
    }

    /// @notice Trusted relayer address (can be multi-sig in production)
    address public trustedRelayer;
    
    /// @dev requestId => Resolution data
    mapping(bytes32 => Resolution) public resolutions;
    
    /// @dev Auto-incrementing request counter
    uint256 public requestCounter;

    // FIX: Add constants for string length limits to prevent gas limit issues
    uint256 public constant MAX_QUESTION_LENGTH = 500;
    uint256 public constant MAX_VERDICT_LENGTH = 50;
    uint256 public constant MAX_SUMMARY_LENGTH = 500;
    uint256 public constant MAX_SOURCE_LENGTH = 200;
    uint256 public constant MAX_SOURCES = 10;

    // COMPLIANCE: Revenue mechanism - fee per resolution request
    // For testnet: 0.001 BNB (very low for demo), can be updated via setter
    uint256 public requestFee = 0.001 ether; // 0.001 BNB per request

    event ResolutionRequested(
        bytes32 indexed requestId,
        address indexed requester,
        string question,
        uint256 timestamp
    );

    event ResolutionFulfilled(
        bytes32 indexed requestId,
        string verdict,
        string summary,
        uint256 timestamp
    );

    event RelayerUpdated(address indexed oldRelayer, address indexed newRelayer);
    event RequestFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeesWithdrawn(address indexed recipient, uint256 amount);

    error UnauthorizedRelayer(address caller);
    error RequestAlreadyFulfilled(bytes32 requestId);
    error RequestNotFound(bytes32 requestId);
    error InvalidQuestion();
    error InvalidVerdict();
    error InvalidSummary();
    error InvalidSources();
    error InvalidSignature();
    error IncorrectFee(uint256 expected, uint256 provided);

    constructor(address _trustedRelayer) ConfirmedOwner(msg.sender) {
        require(_trustedRelayer != address(0), "Invalid relayer address");
        trustedRelayer = _trustedRelayer;
    }

    /// @notice Submit a question for AI resolution
    /// @param question Natural language market question
    /// @return requestId Unique identifier for this request
    /// @dev COMPLIANCE: Now payable to collect fees for revenue generation
    function requestResolution(string calldata question) 
        external 
        payable
        returns (bytes32 requestId) 
    {
        // COMPLIANCE: Validate fee payment for revenue generation
        if (msg.value != requestFee) {
            revert IncorrectFee(requestFee, msg.value);
        }

        // FIX: Add length validation to prevent gas limit issues
        if (bytes(question).length == 0) revert InvalidQuestion();
        if (bytes(question).length > MAX_QUESTION_LENGTH) revert InvalidQuestion();

        // FIX: Use requestCounter++ before encoding to ensure uniqueness
        uint256 currentCounter = requestCounter++;
        requestId = keccak256(abi.encodePacked(
            block.timestamp,
            msg.sender,
            currentCounter,
            question
        ));

        // FIX: Ensure requestId doesn't already exist (defensive check)
        if (resolutions[requestId].requester != address(0)) {
            revert InvalidQuestion(); // Request ID collision (extremely unlikely)
        }

        resolutions[requestId].question = question;
        resolutions[requestId].requester = msg.sender;
        resolutions[requestId].timestamp = block.timestamp;

        emit ResolutionRequested(requestId, msg.sender, question, block.timestamp);
    }

    /// @notice Fulfill resolution with AI-generated answer (called by relayer)
    /// @param requestId The request to fulfill
    /// @param verdict AI verdict (Supported/Refuted/Unclear)
    /// @param summary Brief explanation
    /// @param sources Evidence sources (title|url|quote format)
    function fulfillResolution(
        bytes32 requestId,
        string calldata verdict,
        string calldata summary,
        string[] calldata sources
    ) external {
        if (msg.sender != trustedRelayer) revert UnauthorizedRelayer(msg.sender);
        
        Resolution storage res = resolutions[requestId];
        
        // FIX: Critical validation - ensure request exists before fulfilling
        if (res.requester == address(0)) {
            revert RequestNotFound(requestId);
        }
        
        if (res.fulfilled) revert RequestAlreadyFulfilled(requestId);

        // FIX: Add length validation to prevent gas limit issues
        if (bytes(verdict).length == 0 || bytes(verdict).length > MAX_VERDICT_LENGTH) {
            revert InvalidVerdict();
        }
        if (bytes(summary).length == 0 || bytes(summary).length > MAX_SUMMARY_LENGTH) {
            revert InvalidSummary();
        }
        if (sources.length > MAX_SOURCES) {
            revert InvalidSources();
        }

        res.verdict = verdict;
        res.summary = summary;
        res.relayer = msg.sender;
        res.fulfilled = true;
        
        // Store sources with length validation
        for (uint256 i = 0; i < sources.length; i++) {
            // FIX: Validate each source length
            if (bytes(sources[i]).length > MAX_SOURCE_LENGTH) {
                revert InvalidSources();
            }
            res.sources.push(sources[i]);
        }

        emit ResolutionFulfilled(requestId, verdict, summary, block.timestamp);
    }

    /// @notice Update trusted relayer address (owner only)
    /// @param newRelayer New relayer address
    function setTrustedRelayer(address newRelayer) external onlyOwner {
        require(newRelayer != address(0), "Invalid relayer address");
        address oldRelayer = trustedRelayer;
        trustedRelayer = newRelayer;
        emit RelayerUpdated(oldRelayer, newRelayer);
    }

    /// @notice Update request fee (owner only) - COMPLIANCE: Revenue mechanism
    /// @param newFee New fee amount in wei
    function setRequestFee(uint256 newFee) external onlyOwner {
        require(newFee <= 0.01 ether, "Fee too high"); // Max 0.01 BNB for safety
        uint256 oldFee = requestFee;
        requestFee = newFee;
        emit RequestFeeUpdated(oldFee, newFee);
    }

    /// @notice Withdraw collected fees (owner only) - COMPLIANCE: Revenue withdrawal
    /// @param recipient Address to receive the fees
    function withdrawFees(address recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");

        (bool success, ) = recipient.call{value: balance, gas: 30000}("");
        require(success, "Withdrawal failed");

        emit FeesWithdrawn(recipient, balance);
    }

    /// @notice Get contract balance (collected fees) - COMPLIANCE: Revenue tracking
    /// @return balance Current balance in wei
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Get resolution details
    /// @param requestId The request ID to query
    /// @return resolution Full resolution data
    function getResolution(bytes32 requestId) 
        external 
        view 
        returns (Resolution memory resolution) 
    {
        return resolutions[requestId];
    }

    /// @notice Get resolution sources
    /// @param requestId The request ID to query
    /// @return sources Array of source strings
    function getResolutionSources(bytes32 requestId) 
        external 
        view 
        returns (string[] memory sources) 
    {
        return resolutions[requestId].sources;
    }
}
