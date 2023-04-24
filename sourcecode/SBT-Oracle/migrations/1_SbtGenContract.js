const SbtGenContract = artifacts.require("SbtGenContract")

module.exports = function(deployer) {
    deployer.deploy(SbtGenContract,"0x6db883DFed2A108b66C37bc5014D4ad60f0D41dd")
};