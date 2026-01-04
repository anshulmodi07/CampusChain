// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CampusChainCrowdfunding
 * @dev A blockchain-based crowdfunding smart contract designed
 *      specifically for college campuses. It enables student clubs,
 *      campus NGOs, and social initiatives to raise funds transparently,
 *      with all donations recorded immutably on-chain.
 */
contract CampusChainCrowdfunding {

    // ---------------- STRUCTS ----------------

    struct Fundraiser {
        uint256 id;
        address payable owner;     // Club / NGO / Student organizer
        string title;              // Fundraiser title
        string description;        // Description of the campus initiative
        uint256 goal;              // Fundraising goal in wei
        uint256 raised;            // Total funds raised
        bool active;               // Whether fundraiser is active
    }

    struct Donation {
        address donor;             // Student / Alumni donor
        uint256 amount;            // Amount donated
        uint256 timestamp;         // Time of donation
    }

    // ---------------- STATE VARIABLES ----------------

    uint256 public fundraiserCount;

    // fundraiserId => Fundraiser
    mapping(uint256 => Fundraiser) public fundraisers;

    // fundraiserId => list of donations
    mapping(uint256 => Donation[]) public donations;

    // ---------------- EVENTS ----------------

    event FundraiserCreated(
        uint256 indexed fundraiserId,
        address indexed owner,
        string title,
        uint256 goal
    );

    event DonationMade(
        uint256 indexed fundraiserId,
        address indexed donor,
        uint256 amount
    );

    event FundraiserClosed(uint256 indexed fundraiserId);

    // ---------------- MODIFIERS ----------------

    modifier fundraiserExists(uint256 _id) {
        require(_id < fundraiserCount, "Fundraiser does not exist");
        _;
    }

    modifier onlyOwner(uint256 _id) {
        require(msg.sender == fundraisers[_id].owner, "Not fundraiser owner");
        _;
    }

    // ---------------- FUNCTIONS ----------------

    /**
     * @notice Create a new campus fundraiser
     * @param _title Title of the campus initiative
     * @param _description Description of the fundraiser
     * @param _goal Fundraising goal in wei
     */
    function createFundraiser(
        string calldata _title,
        string calldata _description,
        uint256 _goal
    ) external {
        require(_goal > 0, "Goal must be greater than zero");

        fundraisers[fundraiserCount] = Fundraiser({
            id: fundraiserCount,
            owner: payable(msg.sender),
            title: _title,
            description: _description,
            goal: _goal,
            raised: 0,
            active: true
        });

        emit FundraiserCreated(
            fundraiserCount,
            msg.sender,
            _title,
            _goal
        );

        fundraiserCount++;
    }

    /**
     * @notice Donate ETH to support a campus fundraiser
     * @param _fundraiserId ID of the fundraiser
     */
    function donate(uint256 _fundraiserId)
        external
        payable
        fundraiserExists(_fundraiserId)
    {
        Fundraiser storage fundraiser = fundraisers[_fundraiserId];

        require(fundraiser.active, "Fundraiser is not active");
        require(msg.value > 0, "Donation must be greater than zero");

        fundraiser.raised += msg.value;

        donations[_fundraiserId].push(
            Donation({
                donor: msg.sender,
                amount: msg.value,
                timestamp: block.timestamp
            })
        );

        // Transfer ETH directly to fundraiser owner (club / NGO)
        fundraiser.owner.transfer(msg.value);

        emit DonationMade(_fundraiserId, msg.sender, msg.value);

        // Auto-close fundraiser if goal is reached
        if (fundraiser.raised >= fundraiser.goal) {
            fundraiser.active = false;
            emit FundraiserClosed(_fundraiserId);
        }
    }

    /**
     * @notice Get all donations for a specific fundraiser
     */
    function getDonations(uint256 _fundraiserId)
        external
        view
        fundraiserExists(_fundraiserId)
        returns (Donation[] memory)
    {
        return donations[_fundraiserId];
    }

    /**
     * @notice Close a fundraiser manually (only by owner)
     */
    function closeFundraiser(uint256 _fundraiserId)
        external
        fundraiserExists(_fundraiserId)
        onlyOwner(_fundraiserId)
    {
        fundraisers[_fundraiserId].active = false;
        emit FundraiserClosed(_fundraiserId);
    }

    /**
     * @notice Get details of a single fundraiser
     */
    function getFundraiser(uint256 _fundraiserId)
        external
        view
        fundraiserExists(_fundraiserId)
        returns (
            uint256 id,
            address owner,
            string memory title,
            string memory description,
            uint256 goal,
            uint256 raised,
            bool active
        )
    {
        Fundraiser memory f = fundraisers[_fundraiserId];
        return (
            f.id,
            f.owner,
            f.title,
            f.description,
            f.goal,
            f.raised,
            f.active
        );
    }
}
