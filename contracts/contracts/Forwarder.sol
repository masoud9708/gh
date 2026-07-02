// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Forwarder is EIP712 {
    using ECDSA for bytes32;

    struct ForwardRequest {
        address from;
        address target;
        uint256 value;
        uint256 nonce;
        bytes data;
        uint256 deadline;
    }

    bytes32 private constant _TYPEHASH =
        keccak256("ForwardRequest(address from,address target,uint256 value,uint256 nonce,bytes data,uint256 deadline)");

    mapping(address => uint256) private _nonces;

    constructor() EIP712("GhachaghForwarder", "1") {}

    function getNonce(address from) public view returns (uint256) {
        return _nonces[from];
    }

    function verify(ForwardRequest calldata req, bytes calldata signature) public view returns (bool) {
        address signer = _hashTypedDataV4(
            keccak256(abi.encode(_TYPEHASH, req.from, req.target, req.value, req.nonce, keccak256(req.data), req.deadline))
        ).recover(signature);
        return _nonces[req.from] == req.nonce && signer == req.from && block.timestamp <= req.deadline;
    }

    function execute(ForwardRequest calldata req, bytes calldata signature) public payable returns (bool, bytes memory) {
        require(verify(req, signature), "Forwarder: signature does not match request");
        _nonces[req.from] = req.nonce + 1;

        // EIP-2771: append the from address to the calldata
        bytes memory encodedData = abi.encodePacked(req.data, req.from);

        (bool success, bytes memory returndata) = req.target.call{value: req.value}(encodedData);
        if (!success) {
            if (returndata.length > 0) {
                assembly {
                    let returndata_size := mload(returndata)
                    revert(add(32, returndata), returndata_size)
                }
            } else {
                revert("Forwarder: call reverted without message");
            }
        }
        return (success, returndata);
    }
}
