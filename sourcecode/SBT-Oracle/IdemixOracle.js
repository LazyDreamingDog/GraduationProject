const axios = require('axios')
const BN = require('bn.js')
const common = require('./utils/common.js')
const SLEEP_INTERVAL = process.env.SLEEP_INTERVAL || 2000

var OracleJSON = require('./build/contracts/IdemixOracle.json')
var pendingGenRequests = []
var pendingVerRequests = []

// start here
async  function getOracleContract(web3js) {
    var networkId = await web3js.eth.net.getId()
    console.log(networkId)
    return new web3js.eth.Contract(OracleJSON.abi, OracleJSON.networks[networkId].address)
}

// 调用Idemix API的gen方法
async function credGen(name_,department_,onBoardingTime_,disclosure_) {
    console.log(name_)
    console.log(department_)
    console.log(onBoardingTime_)
    for (let i = 0; i < 3; i++) {
        disclosure_[i] = parseInt(disclosure_[i])   
    }
    console.log(disclosure_)

    const resp = await axios({
        url: "http://localhost:8888/cred/gen",
        data: {
            name: parseInt(name_),
            department: parseInt(department_),
            onBoardingTime: parseInt(onBoardingTime_),
            disclosure: disclosure_
        },
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        }
    })
    console.log(resp.data)
    console.log(resp.data.revealAttr)
    return [resp.data.revealAttr,resp.data.unRevealAttr,resp.data.nymCred]
}

// 调用Idemix API的ver方法
async function credVer(cred_) {
    const resp = await axios({
        url: "http://localhost:8888/cred/ver",
        data: {
            cred: cred_
        },
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        }
    })
    console.log(resp.data)
    console.log(resp.data.res)
    console.log(resp.data.verRes)
    return resp.data.res
}

// 监听事件
async function filterEvents(oracleContract, web3js) {
    
    // 监听获取生成请求的事件
    oracleContract.events.GetCredGenRequestEvent(async (err, event) => {
        if (err) {
          console.error('Error on event', err)
          return
        }
        await addRequestToQueue(event,1)
    })

    // 监听获取验证请求的事件
    oracleContract.events.GetCredVerRequestEvent(async (err, event_) => {
        if (err) {
            console.error('Error on event', err)
            return
          }
          await addRequestToQueue(event_,2)
    })

    oracleContract.events.SetCredGenOKEvent(async (err, event) => {
        if (err) console.error('Error on event', err)
    })

    oracleContract.events.SetCredVerOKEvent(async (err, event) => {
        if (err) console.error('Error on event', err)
    })
}

// 记录请求队列
async function addRequestToQueue(event,flag) {

    if(flag == 1){
        // event GetCredGenRequestEvent(address callerAddress,uint256 tokenId, int name_,int department_,int onBoardingTime_, int[] disclosure_,uint256 requestId);
        const callerAddress = event.returnValues.callerAddress
        const tokenId = event.returnValues.tokenId
        const name = event.returnValues.name_
        const department = event.returnValues.department_
        const onBoardingTime = event.returnValues.onBoardingTime_
        const disclosure = event.returnValues.disclosure_
        const requestId = event.returnValues.requestId
        pendingGenRequests.push({callerAddress, tokenId, name, department, onBoardingTime, disclosure, requestId})
        console.log("接收到一个生成凭证请求, requestId = ",requestId)
    }

    if(flag == 2){
        // event GetCredVerRequestEvent(address callerAddress,uint256 tokenId, string nymCred, uint256 requestId);
        const callerAddress = event.returnValues.callerAddress
        const tokenId = event.returnValues.tokenId
        const cred = event.returnValues.nymCred
        const requestId = event.returnValues.requestId
        pendingVerRequests.push({callerAddress, tokenId, cred, requestId})
        console.log("接收到一个验证凭证请求, requestId = ",requestId)
    }
 
}

// 处理队列
async function processQueue(oracleContract, ownerAddress) {
    let processedRequests = 0
    while((pendingGenRequests.length > 0 || pendingVerRequests.length > 0) && processedRequests < 3) {

        if(pendingGenRequests.length > 0) {
            const req = pendingGenRequests.shift()
            console.log("开始处理生成请求 id = "+req.requestId)
            await processGenRequest(oracleContract, ownerAddress, req.requestId, req.name, req.department, req.onBoardingTime, req.disclosure, req.tokenId, req.callerAddress)
            processedRequests++
        }
        
        if(pendingVerRequests.length > 0) {
            const req = pendingVerRequests.shift()
            console.log("开始处理验证请求 id = "+req.requestId)
            await processVerRequest(oracleContract, ownerAddress, req.requestId, req.cred, req.tokenId, req.callerAddress)
            processedRequests++
        }
    }
}

// 处理生成请求
async function processGenRequest(oracleContract, ownerAddress, requestId, name, department, onBoardingTime, disclosure, tokenId, callerAddress) {
    try {
        const [revealAttr, unReavealAttr, cred] = await credGen(name, department, onBoardingTime, disclosure)
        console.log("成功生成凭证 nymCred = " + cred)
        await setGenRes(oracleContract,callerAddress,ownerAddress, revealAttr, unReavealAttr, cred, requestId, tokenId)
    } catch (error) {
        console.log(error)
        return
    }
}

// 处理验证请求
async function processVerRequest(oracleContract, ownerAddress, requestId, nymCred, tokenId, callerAddress) {
    try {
        const verRes = await credVer(nymCred)
        console.log("成功验证凭证 verRes = " + verRes)
        await setVerRes(oracleContract,callerAddress,ownerAddress,verRes,requestId,tokenId)
    } catch (error) {
        console.log(error)
        return
    }
}

// 返回生成结果
async function setGenRes(oracleContract, callerAddress, ownerAddress, revealAttr, unRevealAttr, cred, requestId, tokenId) {
    const idInt = new BN(parseInt(requestId))
    try {
        // 调用合约方法
        // function setCredGenRes(
        //     uint256 tokenId_,
        //     uint256[] memory revealAttr,
        //     string memory unReavealAttr,
        //     string memory nymCred,
        //     address _callerAddress, 
        //     uint256 _requestId
        // )
        console.log(callerAddress)
        console.log(ownerAddress)
        console.log(revealAttr)
        console.log(unRevealAttr)
        console.log(cred)
        console.log(idInt)
        console.log(idInt.toString())
        await oracleContract.methods.setCredGenRes(tokenId, revealAttr, unRevealAttr, cred, callerAddress, idInt.toString()).send({gasLimit:3000000,from:ownerAddress})
    } catch (error) {
        console.log('Error encountered while calling setCredGenRes.')
        console.log(error);
    }
}

// 返回验证结果
async function setVerRes(oracleContract,callerAddress,ownerAddress,verRes,requestId,tokenId) {
    const idInt = new BN(parseInt(requestId))
    try {
        // 调用合约方法
        // function setCredVerRes(
        //     uint256 tokenId_,
        //     bool verRes_,
        //     address _callerAddress, 
        //     uint256 _requestId
        // )
        await oracleContract.methods.setCredVerRes(tokenId, verRes, callerAddress, idInt.toString()).send({gasLimit:3000000,from:ownerAddress})
    } catch (error) {
        console.log('Error encountered while calling setCredVerRes.')
        console.log(error);
    }
}

// init
async function init() {
    const { accounts, web3js } = await common.loadAccount()
    const ownerAddress = accounts[0]

    console.log("Oracle_Address = " + ownerAddress)

    const oracleContract = await getOracleContract(web3js)

    filterEvents(oracleContract,web3js)

    console.log("start to listen!")

    return {oracleContract,ownerAddress }
}

(async () => {
    const { oracleContract, ownerAddress } = await init()
    process.on( 'SIGINT', () => {
        console.log('Calling client.disconnect()')
        // 1. Execute client.disconnect
        //   client.disconnect()
        process.exit()
    })
    setInterval(async () => {
        // 2. Run processQueue
        await processQueue(oracleContract,ownerAddress)
    }, SLEEP_INTERVAL)
  })()