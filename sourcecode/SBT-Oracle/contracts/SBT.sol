//SPDX-License-Identifier:MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@solvprotocol/erc-3525/ERC3525.sol";
import "./IdemixOracle.sol";

contract SBT is ERC3525 {
    using Strings for uint256;

    address public owner;
    address private idemixOracleAddress;    //oracle的地址

    constructor(
        address owner_
    )ERC3525("SBT","ERC3525GS", 18){
        owner = owner_;
    }
    // 维护一个请求list，类似cookie
    mapping (uint256 => bool) myRequests;

    // 记录铸币的事件
    event mintSBT(address to, uint256 tokenId);
    // 记录生成tokenURI请求的事件
    event ReceivedNewTokenURIRequestEvent(uint256 tokenId, uint256 requestId);
    // 记录TokenURI生成的事件
    event TokenURIGenEvent(uint256 tokenId,string tokenURI);
    // 记录生成token验证请求的事件
    event ReceivedNewTokenVerRequestEvent(uint256 tokenId, uint256 requestId);
    // 记录Token验证的事件
    event TokenVerEvent(uint256 tokenId,bool verRes);

    // SBT 铸币函数
    function mint(
        address to_,
        uint256 slot_,
        uint256 amount_,
        int name_,
        int department_,
        int onBoardingTime_,
        int[] memory disclosure_,
        address _oracleAddress
    ) external returns (uint256) {
        require(msg.sender == owner, "SBT: only owner can mint");
        uint256 tokenId;
        tokenId = _mint(to_, slot_, amount_);
        tokenURI_Request(tokenId, name_, department_, onBoardingTime_, disclosure_, _oracleAddress);
        return tokenId;
    }

    // 请求生成tokenURI记录SBT的信息
    function tokenURI_Request(
        uint256 tokenId_,
        int name_,
        int department_,
        int onBoardingTime_,
        int[] memory disclosure_,
        address _oracleAddress
    ) public {
        require(msg.sender == owner, "SBT: only owner can gen tokenURI");
        idemixOracleAddress = _oracleAddress;
        uint256 requestId = IdemixOracle(_oracleAddress).getCredGenRequest(tokenId_, name_, department_, onBoardingTime_, disclosure_);
        myRequests[requestId] = true;
        emit ReceivedNewTokenURIRequestEvent(tokenId_, requestId);
    }

    // 回调函数，接收返回数据并包装成tokenURI
    function tokenURI_Res(
        uint256 tokenId_,
        uint256[] memory revealAttr,
        string memory unRevealAttr,
        string memory nymCred,
        uint256 _requestId
    )public onlyOracle {
        require(myRequests[_requestId],"This request is not in my pending list.");
        delete myRequests[_requestId];
        string memory tokenURI = string(
                abi.encodePacked(
                            '{"title":"Graduate Project SBT"',
                            '","description":"Proof of incumbency"',
                            '","tokenId":"',
                                tokenId_.toString(),
                            '","reveal Attr":"{',
                                "attr1:",revealAttr[0].toString(),
                                ",attr2:",revealAttr[1].toString(),
                            '}"',
                            '","unReveal Attr":',
                                unRevealAttr,
                            '","Proof Data":',  
                                nymCred,  
                            "}"
                )
            );
        emit TokenURIGenEvent(tokenId_,tokenURI);
    }
    
    // 发起token验证的请求
    function tokenVer_Request(
        uint256 tokenId_,
        string memory nymCred_,
        address _oracleAddress
    ) public {
        // 谁都可以执行这个验证
        idemixOracleAddress = _oracleAddress;
        uint256 requestId = IdemixOracle(_oracleAddress).getCredVerRequest(tokenId_, nymCred_);
        myRequests[requestId] = true;
        emit ReceivedNewTokenVerRequestEvent(tokenId_, requestId);
    }

    // 回调函数，接收验证结果并记录存证
    function tokenVer_Res(
        uint256 tokenId_,
        bool verRes_,
        uint256 _requestId
    )public onlyOracle {
        require(myRequests[_requestId],"This request is not in my pending list.");
        delete myRequests[_requestId];
        emit TokenVerEvent(tokenId_, verRes_);
    }

    // 定义modifier
    modifier onlyOracle {
        require(msg.sender == idemixOracleAddress,"You are not authorized to call this function."); // 检查调用者是否为owner地址
        _; // 如果是的话，继续运行函数主体；否则报错并revert交易
    }

}