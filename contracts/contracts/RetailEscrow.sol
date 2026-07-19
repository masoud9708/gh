// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract RetailEscrow is ERC2771Context, AccessControl, Pausable, ReentrancyGuard {
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
        DELIVERED,
        CONFIRMED,
        REFUNDED,
        DISPUTED
    }

    struct Order {
        string id;
        address buyer;
        address seller;
        address driver;
        uint256 amount;
        uint256 shipping;
        uint256 total;
        bytes32 deliveryHash;
        State state;
        uint256 createdAt;
        uint256 fundedAt;
        uint256 confirmedAt;
    }

    mapping(string => Order) public orders;

    event OrderCreated(string id, address indexed buyer, address indexed seller, uint256 total);
    event OrderFunded(string id);
    event DriverAssigned(string id, address indexed driver);
    event OrderDelivered(string id);
    event OrderConfirmed(string id);
    event OrderDisputed(string id);
    event OrderRefunded(string id);

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

    function createOrder(
        string calldata id,
        address seller,
        uint256 amount,
        uint256 shipping,
        bytes32 deliveryHash
    ) external whenNotPaused {
        require(orders[id].createdAt == 0, "Order exists");

        uint256 total = amount + shipping;

        orders[id] = Order({
            id: id,
            buyer: _msgSender(),
            seller: seller,
            driver: address(0),
            amount: amount,
            shipping: shipping,
            total: total,
            deliveryHash: deliveryHash,
            state: State.CREATED,
            createdAt: block.timestamp,
            fundedAt: 0,
            confirmedAt: 0
        });

        emit OrderCreated(id, _msgSender(), seller, total);
    }

    function fund(string calldata id) external nonReentrant whenNotPaused {
        Order storage o = orders[id];
        require(o.state == State.CREATED, "Invalid state");
        require(o.buyer == _msgSender(), "Only buyer");

        o.state = State.FUNDED;
        o.fundedAt = block.timestamp;

        token.safeTransferFrom(_msgSender(), address(this), o.total);
        emit OrderFunded(id);
    }

    function assignDriver(string calldata id, address driver) external whenNotPaused {
        Order storage o = orders[id];
        require(o.state == State.FUNDED, "Invalid state");
        require(o.seller == _msgSender() || hasRole(ADMIN_ROLE, _msgSender()), "Unauthorized");

        o.driver = driver;
        emit DriverAssigned(id, driver);
    }

    function markDelivered(string calldata id) external whenNotPaused {
        Order storage o = orders[id];
        require(o.state == State.FUNDED, "Invalid state");
        require(o.driver == _msgSender(), "Only driver");

        o.state = State.DELIVERED;
        emit OrderDelivered(id);
    }

    function confirmDelivery(string calldata id, string calldata deliveryCode) external nonReentrant whenNotPaused {
        Order storage o = orders[id];
        require(o.state == State.DELIVERED, "Invalid state");
        require(keccak256(abi.encodePacked(deliveryCode)) == o.deliveryHash, "Invalid code");
        require(o.buyer == _msgSender() || o.seller == _msgSender(), "Unauthorized");

        o.state = State.CONFIRMED;
        o.confirmedAt = block.timestamp;
        emit OrderConfirmed(id);

        uint256 platformFee = (o.amount * platformFeeBasisPoints) / 10000;
        uint256 sellerPayment = o.amount - platformFee;

        // Pay seller
        token.safeTransfer(o.seller, sellerPayment);
        // Pay driver
        if (o.driver != address(0) && o.shipping > 0) {
            token.safeTransfer(o.driver, o.shipping);
        } else if (o.shipping > 0) {
            token.safeTransfer(o.seller, o.shipping); // fallback
        }
        // Pay platform
        token.safeTransfer(platformWallet, platformFee);
    }

    function raiseDispute(string calldata id) external whenNotPaused {
        Order storage o = orders[id];
        require(o.state == State.FUNDED || o.state == State.DELIVERED, "Invalid state");
        require(_msgSender() == o.buyer || _msgSender() == o.seller || _msgSender() == o.driver, "Unauthorized");

        o.state = State.DISPUTED;
        emit OrderDisputed(id);
    }

    function resolveDispute(string calldata id, uint256 buyerAmount, uint256 sellerAmount, uint256 driverAmount, uint256 platformAmount) external onlyRole(ADMIN_ROLE) nonReentrant {
        Order storage o = orders[id];
        require(o.state == State.DISPUTED, "Not disputed");
        require(buyerAmount + sellerAmount + driverAmount + platformAmount <= o.total, "Exceeds pool");

        o.state = State.CONFIRMED;

        if (buyerAmount > 0) token.safeTransfer(o.buyer, buyerAmount);
        if (sellerAmount > 0) token.safeTransfer(o.seller, sellerAmount);
        if (driverAmount > 0) token.safeTransfer(o.driver, driverAmount);
        if (platformAmount > 0) token.safeTransfer(platformWallet, platformAmount);
    }

    function refund(string calldata id) external onlyRole(ADMIN_ROLE) nonReentrant {
        Order storage o = orders[id];
        require(o.state == State.DISPUTED || o.state == State.FUNDED, "Invalid state");

        o.state = State.REFUNDED;
        token.safeTransfer(o.buyer, o.total);

        emit OrderRefunded(id);
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
