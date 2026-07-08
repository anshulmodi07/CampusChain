// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DonationProofRegistry
 * @author CampusChain
 * @notice Stores immutable cryptographic proofs of donation records.
 * @dev This contract DOES NOT handle payments.
 *      It only stores hashes of donation records to provide
 *      tamper-proof verification of off-chain data.
 */
contract DonationProofRegistry {

    struct Proof {
        uint256 timestamp;      // When the proof was anchored
        address anchoredBy;     // Who anchored it
    }

    // donationHash => Proof
    mapping(bytes32 => Proof) private proofs;

    event DonationAnchored(
        bytes32 indexed donationHash,
        address indexed anchoredBy,
        uint256 timestamp
    );

    /**
     * @notice Anchor a donation hash permanently.
     * @param donationHash keccak256 hash of an immutable donation record.
     */
    function anchorDonation(bytes32 donationHash) external {

        require(
            donationHash != bytes32(0),
            "Invalid donation hash"
        );

        require(
            proofs[donationHash].timestamp == 0,
            "Donation already anchored"
        );

        proofs[donationHash] = Proof({
            timestamp: block.timestamp,
            anchoredBy: msg.sender
        });

        emit DonationAnchored(
            donationHash,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @notice Check whether a donation hash has been anchored.
     * @param donationHash Hash of the donation.
     * @return True if anchored, false otherwise.
     */
    function verifyDonation(bytes32 donationHash)
        external
        view
        returns (bool)
    {
        return proofs[donationHash].timestamp != 0;
    }

    /**
     * @notice Fetch metadata for an anchored donation.
     * @param donationHash Hash of the donation.
     */
    function getProof(bytes32 donationHash)
        external
        view
        returns (
            uint256 timestamp,
            address anchoredBy
        )
    {
        Proof memory proof = proofs[donationHash];

        require(
            proof.timestamp != 0,
            "Proof not found"
        );

        return (
            proof.timestamp,
            proof.anchoredBy
        );
    }
}