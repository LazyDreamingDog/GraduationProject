const SbtVerifyContract = artifacts.require("SbtVerifyContract")

module.exports = function(deployer) {
    deployer.deploy(SbtVerifyContract)
};