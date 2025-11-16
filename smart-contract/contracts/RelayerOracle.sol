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

    error UnauthorizedRelayer(address caller);
    error RequestAlreadyFulfilled(bytes32 requestId);
    error InvalidQuestion();
    error InvalidSignature();

    constructor(address _trustedRelayer) ConfirmedOwner(msg.sender) {
        require(_trustedRelayer != address(0), "Invalid relayer address");
        trustedRelayer = _trustedRelayer;
    }

    /// @notice Submit a question for AI resolution
    /// @param question Natural language market question
    /// @return requestId Unique identifier for this request
    function requestResolution(string calldata question) 
        external 
        returns (bytes32 requestId) 
    {
        if (bytes(question).length == 0) revert InvalidQuestion();

        requestId = keccak256(abi.encodePacked(
            block.timestamp,
            msg.sender,
            requestCounter++,
            question
        ));

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
        if (res.fulfilled) revert RequestAlreadyFulfilled(requestId);

        res.verdict = verdict;
        res.summary = summary;
        res.relayer = msg.sender;
        res.fulfilled = true;
        
        // Store sources
        for (uint256 i = 0; i < sources.length; i++) {
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

