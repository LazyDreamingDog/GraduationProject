// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./SBT.sol";

contract IdemixOracle {
    uint private randNonce = 0;
    uint private modulus = 1000;

    // 处理队列
    mapping (uint256 => bool) pendingRequests;

    // 记录生成凭证请求的事件
    event GetCredGenRequestEvent(address callerAddress,uint256 tokenId, int name_,int department_,int onBoardingTime_, int[] disclosure_,uint256 requestId);
    // 记录凭证成功生成的事件
    event SetCredGenOKEvent(uint256 tokenId,address callerAddress);
    // 记录验证凭证请求的事件
    event GetCredVerRequestEvent(address callerAddress,uint256 tokenId, string nymCred, uint256 requestId);
    // 记录凭证成功验证的事件
    event SetCredVerOKEvent(uint256 tokenId,address callerAddress);

    // 该函数供caller调用，实现发起生成凭证请求
    function getCredGenRequest(
        uint256 tokenId_,
        int name_,
        int department_,
        int onBoardingTime_,
        int[] memory disclosure_
    ) public returns(uint256){
        randNonce++;
        uint256 requestId = uint(keccak256(abi.encodePacked(block.timestamp,msg.sender,randNonce))) % modulus;
        pendingRequests[requestId] = true;
        emit GetCredGenRequestEvent(msg.sender,tokenId_, name_, department_, onBoardingTime_, disclosure_, requestId);
        return requestId;
    }

    // 调用该函数返回凭证结果
    function setCredGenRes(
        uint256 tokenId_,
        uint256[] memory revealAttr,
        string memory unReavealAttr,
        string memory nymCred,
        address _callerAddress, 
        uint256 _requestId
    ) public {
        require(pendingRequests[_requestId],"This request is not in my pending list.");
        delete pendingRequests[_requestId];
        SBT(_callerAddress).tokenURI_Res(tokenId_, revealAttr, unReavealAttr, nymCred, _requestId);
        emit SetCredGenOKEvent(tokenId_, _callerAddress);
    }

    // 该函数供caller调用，实现发起验证凭证
    function getCredVerRequest(
        uint256 tokenId_,
        string memory nymCred_
    ) public returns(uint256){
        randNonce++;
        uint256 requestId = uint(keccak256(abi.encodePacked(block.timestamp,msg.sender,randNonce))) % modulus;
        pendingRequests[requestId] = true;
        emit GetCredVerRequestEvent(msg.sender, tokenId_, nymCred_, requestId);
        return requestId;
    }

    // 调用该函数返回凭证结果
    function setCredVerRes(
        uint256 tokenId_,
        bool verRes_,
        address _callerAddress, 
        uint256 _requestId
    ) public {
        require(pendingRequests[_requestId],"This request is not in my pending list.");
        delete pendingRequests[_requestId];
        SBT(_callerAddress).tokenVer_Res(tokenId_, verRes_, _requestId);
        emit SetCredVerOKEvent(tokenId_, _callerAddress);
    }

}

