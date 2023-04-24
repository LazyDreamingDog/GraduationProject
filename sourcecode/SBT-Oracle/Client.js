const common = require('./utils/common.js')
const SLEEP_INTERVAL = process.env.SLEEP_INTERVAL || 20000
const SbtGenJson = require('./build/contracts/SbtGenContract.json')
const OracleJSON = require('./build/contracts/IdemixOracle.json')
const SbtVerJson = require('./build/contracts/SbtVerifyContract.json')
const readline = require("readline");

// 创建接口实例
let r1 = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

async function getSbtGenContract(web3js) {
    const networkId = await web3js.eth.net.getId()
    console.log(networkId)
    console.log(SbtGenJson.networks[networkId].address)
    return new web3js.eth.Contract(SbtGenJson.abi, SbtGenJson.networks[networkId].address)
}

async function getSbtVerContract(web3js) {
  const networkId = await web3js.eth.net.getId()
  console.log(networkId)
  console.log(SbtVerJson.networks[networkId].address)
  return new web3js.eth.Contract(SbtVerJson.abi, SbtVerJson.networks[networkId].address)
}

async function filterEvents (SbtGenCallerContract,SbtVerCallerContract) {
    // // 记录铸币的事件
    // event mintSBT(address to, uint256 tokenId);
    // // 记录生成tokenURI请求的事件
    // event ReceivedNewTokenURIRequestEvent(uint256 tokenId, uint256 requestId);
    // // 记录TokenURI生成的事件
    // event TokenURIGenEvent(uint256 tokenId,string tokenURI);
    // // 记录生成token验证请求的事件
    // event ReceivedNewTokenVerRequestEvent(uint256 tokenId, uint256 requestId);
    // // 记录Token验证的事件
    // event TokenVerEvent(uint256 tokenId,bool verRes);
    SbtGenCallerContract.events.mintSBT({ filter: { } }, async (err, event) => {
      if (err) console.error('Error on event', err)
      console.log('* New mintSBT event. TokenId: ' + event.returnValues.tokenId)
    })
    SbtGenCallerContract.events.TokenURIGenEvent({ filter: { } }, async (err, event) => {
      if (err) console.error('Error on event', err)
      console.log('* New TokenURIGen event. TokenURI: ' + event.returnValues.tokenURI)
    })
    SbtVerCallerContract.events.TokenVerEvent({ filter: { } }, async (err, event) => {
        if (err) console.error('Error on event', err)
        console.log('* New TokenVer event. verRes: ' + event.returnValues.verRes)
    })
}

async function init () {
    const { accounts, web3js } = await common.loadAccount()
    const ownerAddress = accounts[0]
    console.log("Caller_Address = " + ownerAddress)
    const SbtGenCallerContract = await getSbtGenContract(web3js)
    const SbtVerCallerContract = await getSbtVerContract(web3js)
    filterEvents(SbtGenCallerContract,SbtVerCallerContract)
    return { SbtGenCallerContract, SbtVerCallerContract, ownerAddress, web3js }
}

(async () => {
    const { SbtGenCallerContract, SbtVerCallerContract, ownerAddress, web3js } = await init()
    process.on( 'SIGINT', () => {
      console.log('Calling client.disconnect()')
      // client.disconnect();
      process.exit();
    })

    const networkId = await web3js.eth.net.getId()
    const oracleAddress =  OracleJSON.networks[networkId].address
    console.log(oracleAddress)
    // await callerContract.methods.setOracleInstanceAddress(oracleAddress).send({ from: ownerAddress })
    // setInterval( async () => {
    //   // Start here
    //   i=1;
    //   console.log("start " + i)
    //   await callerContract.methods.hashRequest("hello world", oracleAddress).send({gasLimit: 1000000,from:ownerAddress})
    //   console.log("Have send a request!");
    //   i=i+1
    // }, SLEEP_INTERVAL);
    // start here
    // 发送一个铸币请求，然后循环等待键入
    // function mint(
    //     address to_,
    //     uint256 slot_,
    //     uint256 amount_,
    //     int name_,
    //     int department_,
    //     int onBoardingTime_,
    //     int[] memory disclosure_,
    //     address _oracleAddress
    // )
    await SbtGenCallerContract.methods.mint(ownerAddress, 1, 1, 19271135, 2, 230423, [parseInt(1),parseInt(1),parseInt(0)], oracleAddress).send({gasLimit: 3000000,from:ownerAddress})
    console.log("Have send a mint request!")
    console.log("wait to input")
    SLEEP_INTERVAL
    r1.setPrompt("输入验证数据:");
    r1.prompt();
    r1.on("line", function (line) {
      // 发起token验证的请求
      // function tokenVer_Request(
      //   uint256 tokenId_,
      //   string memory nymCred_,
      //   address _oracleAddress
      // )
      SbtVerCallerContract.methods.tokenVer_Request(1,line.toString(),oracleAddress).send({gasLimit: 3000000,from:ownerAddress})
    })

})()