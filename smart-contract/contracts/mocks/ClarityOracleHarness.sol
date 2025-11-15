// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ClarityOracle} from "../ClarityOracle.sol";

/// @notice Testing helper that exposes the fulfillment hook.
contract ClarityOracleHarness is ClarityOracle {
    constructor(
        address router,
        uint64 subscriptionId,
        bytes32 donId,
        uint32 gasLimit
    ) ClarityOracle(router, subscriptionId, donId, gasLimit) {}

    function seedRequest(bytes32 requestId, address requester, string calldata question) external {
        requesters[requestId] = requester;
        s_resolutions[requestId].question = question;
        s_resolutions[requestId].requester = requester;
    }

    function mockFulfill(
        bytes32 requestId,
        bytes calldata response,
        bytes calldata err
    ) external {
        _fulfillRequest(requestId, response, err);
    }
}
