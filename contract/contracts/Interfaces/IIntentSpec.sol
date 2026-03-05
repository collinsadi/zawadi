// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IIntentSpec
/// @notice ERC-8174: Interface for contracts that expose their Intent Spec metadata URI.
interface IIntentSpec {
    /// @notice Returns the URI where the Intent Spec JSON is stored.
    /// @return A URI (e.g. ipfs://... or https://...) pointing to the manifest.
    function getIntentSpecURI() external view returns (string memory);
}
