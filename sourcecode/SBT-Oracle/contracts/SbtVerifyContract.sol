//SPDX-License-Identifier:MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/Strings.sol";
import "./IdemixOracle.sol";

contract SbtVerifyContract {
    using Strings for uint256;

    address private idemixOracleAddress;    //oracle的地址

    // 记录生成token验证请求的事件
    event ReceivedNewTokenVerRequestEvent(uint256 tokenId, uint256 requestId);
    // 记录Token验证的事件
    event TokenVerEvent(uint256 tokenId,bool verRes);

    // 发起token验证的请求
    function tokenVer_Request(
        uint256 tokenId_,
        string memory nymCred_,
        address _oracleAddress
    ) public {
        // 谁都可以执行这个验证
        idemixOracleAddress = _oracleAddress;
        uint256 requestId = IdemixOracle(_oracleAddress).getCredVerRequest(tokenId_, nymCred_);
        // myRequests[requestId] = true;
        emit ReceivedNewTokenVerRequestEvent(tokenId_, requestId);
    }

    // 回调函数，接收验证结果并记录存证
    function tokenVer_Res(
        uint256 tokenId_,
        bool verRes_
        // uint256 _requestId
    )public onlyOracle {
        // require(myRequests[_requestId],"This request is not in my pending list.");
        // delete myRequests[_requestId];
        emit TokenVerEvent(tokenId_, verRes_);
    }

    // 定义modifier
    modifier onlyOracle {
        require(msg.sender == idemixOracleAddress,"You are not authorized to call this function."); // 检查调用者是否为owner地址
        _; // 如果是的话，继续运行函数主体；否则报错并revert交易
    }
}