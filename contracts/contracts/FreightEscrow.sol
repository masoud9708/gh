// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract FreightEscrow is ERC2771Context, AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    IERC20 public immutable token;
    address public platformWallet;
    uint256 public platformFeeBasisPoints = 200; // 2%

    enum State {
        NONE,
        CREATED,
        FUNDED,
        ACCEPTED,
        PICKED_UP,
        IN_TRANSIT,
        DELIVERED,
        CONFIRMED,
        RELEASED,
        DISPUTED,
        CANCELLED
    }

    struct Freight {
        string id;
        address shipper;
        address driver;
        uint256 amount;
        uint256 cargoValue;
        uint256 collateralAmount;
        bytes32 pickupHash;
        bytes32 deliveryHash;
        bytes32 photoHash;
        string photoUrl;
        uint256 deliveryDeadline;
        uint256 latePenaltyPerDay;
        State state;
        uint256 createdAt;
        uint256 fundedAt;
        uint256 acceptedAt;
        uint256 pickedUpAt;
        uint256 deliveredAt;
        uint256 confirmedAt;
        uint256 releasedAt;
    }

    mapping(string => Freight) public freights;
    mapping(address => uint256) public driverBonds;

    event FreightCreated(string id, address indexed shipper, uint256 amount, uint256 cargoValue);
    event FreightFunded(string id);
    event FreightAccepted(string id, address indexed driver, uint256 collateral);
    event FreightPickedUp(string id);
    event TransitStarted(string id, uint256 deadline, uint256 penalty);
    event FreightDelivered(string id);
    event FreightConfirmed(string id);
    event FreightReleased(string id, uint256 amount);
    event FreightDisputed(string id);
    event FreightCancelled(string id);
    event BondStaked(address indexed driver, uint256 amount);
    event BondWithdrawn(address indexed driver, uint256 amount);

    constructor(
        address trustedForwarder,
        address _tokenAddress,
        address _platformWallet
    ) ERC2771Context(trustedForwarder) {
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(ADMIN_ROLE, _msgSender());
        _grantRole(PAUSER_ROLE, _msgSender());
        token = IERC20(_tokenAddress);
        platformWallet = _platformWallet;
    }

    function createFreight(
        string calldata id,
        bytes32 pickupHash,
        bytes32 deliveryHash,
        uint256 cargoValue
    ) external whenNotPaused {
        require(freights[id].createdAt == 0, "Freight already exists");

        freights[id] = Freight({
            id: id,
            shipper: _msgSender(),
            driver: address(0),
            amount: 0,
            cargoValue: cargoValue,
            collateralAmount: 0,
            pickupHash: pickupHash,
            deliveryHash: deliveryHash,
            photoHash: bytes32(0),
            photoUrl: "",
            deliveryDeadline: 0,
            latePenaltyPerDay: 0,
            state: State.CREATED,
            createdAt: block.timestamp,
            fundedAt: 0,
            acceptedAt: 0,
            pickedUpAt: 0,
            deliveredAt: 0,
            confirmedAt: 0,
            releasedAt: 0
        });

        emit FreightCreated(id, _msgSender(), 0, cargoValue);
    }

    function fund(string calldata id, uint256 amount) external nonReentrant whenNotPaused {
        Freight storage f = freights[id];
        require(f.state == State.CREATED, "Invalid state for funding");
        require(f.shipper == _msgSender(), "Only shipper can fund");
        require(amount > 0, "Amount must be > 0");

        f.amount = amount;
        f.state = State.FUNDED;
        f.fundedAt = block.timestamp;

        token.safeTransferFrom(_msgSender(), address(this), amount);
        emit FreightFunded(id);
    }

    function acceptJob(string calldata id, uint256 collateral) external nonReentrant whenNotPaused {
        Freight storage f = freights[id];
        require(f.state == State.FUNDED, "Invalid state to accept");
        require(collateral >= f.cargoValue, "Insufficient collateral");

        f.driver = _msgSender();
        f.collateralAmount = collateral;
        f.state = State.ACCEPTED;
        f.acceptedAt = block.timestamp;

        token.safeTransferFrom(_msgSender(), address(this), collateral);
        emit FreightAccepted(id, _msgSender(), collateral);
    }

    function pickUp(string calldata id, string calldata pickupCode, bytes32 photoHash, string calldata photoUrl) external whenNotPaused {
        Freight storage f = freights[id];
        require(f.state == State.ACCEPTED, "Invalid state for pickup");
        require(f.driver == _msgSender(), "Only driver can pickup");
        require(keccak256(abi.encodePacked(pickupCode)) == f.pickupHash, "Invalid pickup code");

        f.photoHash = photoHash;
        f.photoUrl = photoUrl;
        f.state = State.PICKED_UP;
        f.pickedUpAt = block.timestamp;

        emit FreightPickedUp(id);
    }

    function startTransit(string calldata id, uint256 deadline, uint256 penaltyPerDay) external whenNotPaused {
        Freight storage f = freights[id];
        require(f.state == State.PICKED_UP, "Invalid state to start transit");
        require(f.driver == _msgSender(), "Only driver can start transit");

        f.deliveryDeadline = deadline;
        f.latePenaltyPerDay = penaltyPerDay;
        f.state = State.IN_TRANSIT;

        emit TransitStarted(id, deadline, penaltyPerDay);
    }

    function markDelivered(string calldata id) external whenNotPaused {
        Freight storage f = freights[id];
        require(f.state == State.IN_TRANSIT, "Invalid state for delivery");
        require(f.driver == _msgSender(), "Only driver can deliver");

        f.state = State.DELIVERED;
        f.deliveredAt = block.timestamp;

        emit FreightDelivered(id);
    }

    function confirmDelivery(string calldata id, string calldata deliveryCode) external nonReentrant whenNotPaused {
        Freight storage f = freights[id];
        require(f.state == State.DELIVERED, "Invalid state for confirmation");
        require(keccak256(abi.encodePacked(deliveryCode)) == f.deliveryHash, "Invalid delivery code");

        _confirmAndRelease(id);
    }

    function confirmAsShipper(string calldata id) external nonReentrant whenNotPaused {
        Freight storage f = freights[id];
        require(f.state == State.DELIVERED, "Invalid state for confirmation");
        require(f.shipper == _msgSender(), "Only shipper can confirm without code");

        _confirmAndRelease(id);
    }

    function _confirmAndRelease(string calldata id) internal {
        Freight storage f = freights[id];
        f.state = State.CONFIRMED;
        f.confirmedAt = block.timestamp;
        emit FreightConfirmed(id);

        uint256 fee = (f.amount * platformFeeBasisPoints) / 10000;
        uint256 driverPayment = f.amount - fee;

        uint256 penalty = 0;
        if (f.deliveryDeadline > 0 && block.timestamp > f.deliveryDeadline) {
            uint256 daysLate = (block.timestamp - f.deliveryDeadline) / 1 days;
            penalty = (f.amount * (daysLate * f.latePenaltyPerDay)) / 10000;
            // Max 20% penalty
            uint256 maxPenalty = (f.amount * 2000) / 10000;
            if (penalty > maxPenalty) {
                penalty = maxPenalty;
            }
        }

        driverPayment -= penalty;
        fee += penalty;

        f.state = State.RELEASED;
        f.releasedAt = block.timestamp;

        // Return collateral to driver
        if (f.collateralAmount > 0) {
            token.safeTransfer(f.driver, f.collateralAmount);
        }

        // Pay driver
        token.safeTransfer(f.driver, driverPayment);

        // Pay platform
        token.safeTransfer(platformWallet, fee);

        emit FreightReleased(id, driverPayment);
    }

    function raiseDispute(string calldata id) external whenNotPaused {
        Freight storage f = freights[id];
        require(
            f.state == State.ACCEPTED || f.state == State.PICKED_UP || f.state == State.IN_TRANSIT || f.state == State.DELIVERED,
            "Invalid state for dispute"
        );
        require(_msgSender() == f.shipper || _msgSender() == f.driver, "Only parties can dispute");

        f.state = State.DISPUTED;
        emit FreightDisputed(id);
    }

    function resolveDispute(string calldata id, uint256 shipperAmount, uint256 driverAmount, uint256 platformAmount) external onlyRole(ADMIN_ROLE) nonReentrant {
        Freight storage f = freights[id];
        require(f.state == State.DISPUTED, "Freight not disputed");
        require(shipperAmount + driverAmount + platformAmount <= f.amount + f.collateralAmount, "Amounts exceed pool");

        f.state = State.RELEASED;

        if (shipperAmount > 0) token.safeTransfer(f.shipper, shipperAmount);
        if (driverAmount > 0) token.safeTransfer(f.driver, driverAmount);
        if (platformAmount > 0) token.safeTransfer(platformWallet, platformAmount);

        emit FreightReleased(id, driverAmount);
    }

    function cancel(string calldata id) external nonReentrant whenNotPaused {
        Freight storage f = freights[id];
        require(f.state == State.CREATED || f.state == State.FUNDED, "Cannot cancel now");
        require(_msgSender() == f.shipper, "Only shipper can cancel");

        State oldState = f.state;
        f.state = State.CANCELLED;

        if (oldState == State.FUNDED) {
            token.safeTransfer(f.shipper, f.amount);
        }

        emit FreightCancelled(id);
    }

    function _msgSender() internal view override(Context, ERC2771Context) returns (address) {
        return ERC2771Context._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Context) returns (bytes calldata) {
        return ERC2771Context._msgData();
    }

    function _contextSuffixLength() internal view override(Context, ERC2771Context) returns (uint256) {
        return ERC2771Context._contextSuffixLength();
    }
}
