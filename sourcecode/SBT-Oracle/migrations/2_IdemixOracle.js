const IdemixOracle = artifacts.require("IdemixOracle")

module.exports = function(deployer) {
    deployer.deploy(IdemixOracle)
};