// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/dev/v1_X/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/dev/v1_X/libraries/FunctionsRequest.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

/// @title ClarityOracle – AI-assisted prediction market oracle prototype
/// @notice Submits natural language market questions to Chainlink Functions and stores immutable, citeable resolutions on-chain.
contract ClarityOracle is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;

    struct Resolution {
        string question;
        string verdict;
        string summary;
        string[] sources;
        uint256 timestamp;
        address requester;
        address proposer;
    }

    /// @dev requestId => stored resolution
    mapping(bytes32 => Resolution) internal s_resolutions;
    /// @dev requestId => EOA/dApp that initiated the request
    mapping(bytes32 => address) public requesters;

    /// @notice Inline JavaScript source executed by Chainlink Functions DON
    string public sourceCode;
    /// @notice Chainlink Functions subscription funding data
    uint64 public subscriptionId;
    /// @notice DON identifier (e.g. fun-avalanche-1)
    bytes32 public donId;
    /// @notice Gas limit forwarded to Chainlink Functions fulfillments
    uint32 public fulfillGasLimit;

    event ResolutionRequested(bytes32 indexed requestId, address indexed requester, string question);
    event ResolutionFulfilled(bytes32 indexed requestId, string verdict, string summary, string[] sources);
    event SourceCodeUpdated(string newSource);
    event SubscriptionUpdated(uint64 newSubscriptionId);
    event DonIdUpdated(bytes32 newDonId);
    event FulfillGasLimitUpdated(uint32 newGasLimit);

    error SourceNotConfigured();
    error InvalidQuestion();
    error EmptyResponse();
    error FunctionsError(bytes details);

    constructor(
        address router,
        uint64 _subscriptionId,
        bytes32 _donId,
        uint32 _fulfillGasLimit
    ) FunctionsClient(router) ConfirmedOwner(msg.sender) {
        subscriptionId = _subscriptionId;
        donId = _donId;
        fulfillGasLimit = _fulfillGasLimit;
    }

    /// @notice Owner can update the JS source executed by Chainlink Functions
    function setSourceCode(string calldata newSource) external onlyOwner {
        sourceCode = newSource;
        emit SourceCodeUpdated(newSource);
    }

    function setSubscriptionId(uint64 newSubscriptionId) external onlyOwner {
        subscriptionId = newSubscriptionId;
        emit SubscriptionUpdated(newSubscriptionId);
    }

    function setDonId(bytes32 newDonId) external onlyOwner {
        donId = newDonId;
        emit DonIdUpdated(newDonId);
    }

    function setFulfillGasLimit(uint32 newGasLimit) external onlyOwner {
        fulfillGasLimit = newGasLimit;
        emit FulfillGasLimitUpdated(newGasLimit);
    }

    /// @notice Sends a Chainlink Functions request containing the free-form market question.
    /// @param question Natural-language market description to resolve.
    function requestResolution(string calldata question) external returns (bytes32 requestId) {
        if (bytes(sourceCode).length == 0) revert SourceNotConfigured();
        if (bytes(question).length == 0) revert InvalidQuestion();

        FunctionsRequest.Request memory req;
    req._initializeRequestForInlineJavaScript(sourceCode);

        string[] memory args = new string[](1);
        args[0] = question;
    req._setArgs(args);

    requestId = _sendRequest(req._encodeCBOR(), subscriptionId, fulfillGasLimit, donId);

        requesters[requestId] = msg.sender;
        s_resolutions[requestId].question = question;
        s_resolutions[requestId].requester = msg.sender;

        emit ResolutionRequested(requestId, msg.sender, question);
    }

    /// @dev Chainlink Functions fulfillment entry point. Expects ABI-encoded (string verdict, string summary, string[] sources).
    function _fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err) internal override {
        if (err.length > 0) revert FunctionsError(err);
        if (response.length == 0) revert EmptyResponse();

        (string memory verdict, string memory summary, string[] memory sources) = abi.decode(
            response,
            (string, string, string[])
        );

        Resolution storage record = s_resolutions[requestId];
        record.verdict = verdict;
        record.summary = summary;
        _replaceSources(record, sources);
        record.timestamp = block.timestamp;
        record.proposer = msg.sender;

    emit ResolutionFulfilled(requestId, verdict, summary, sources);
    }

    /// @notice Returns the stored resolution for a given requestId.
    function getResolution(bytes32 requestId) external view returns (Resolution memory) {
        return s_resolutions[requestId];
    }

    /// @notice Convenience helper for front-ends that only need the raw bytes payload.
    function getResolutionSources(bytes32 requestId) external view returns (string[] memory) {
        return s_resolutions[requestId].sources;
    }

    function _replaceSources(Resolution storage record, string[] memory newSources) private {
        uint256 existingLength = record.sources.length;
        if (existingLength > 0) {
            for (uint256 i = existingLength; i > 0; i--) {
                record.sources.pop();
            }
        }
        for (uint256 i = 0; i < newSources.length; i++) {
            record.sources.push(newSources[i]);
        }
    }
}
