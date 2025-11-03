import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("Deploying CryptoToken contract...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Default token parameters
  const name = process.env.TOKEN_NAME || "MyToken";
  const symbol = process.env.TOKEN_SYMBOL || "MTK";
  const initialSupply = process.env.INITIAL_SUPPLY || "1000000";
  const maxSupply = process.env.MAX_SUPPLY || "10000000";

  const CryptoToken = await hre.ethers.getContractFactory("CryptoToken");
  const token = await CryptoToken.deploy(name, symbol, initialSupply, maxSupply);

  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  console.log("CryptoToken deployed to:", tokenAddress);
  console.log("Token Name:", name);
  console.log("Token Symbol:", symbol);
  console.log("Initial Supply:", initialSupply);
  console.log("Max Supply:", maxSupply);

  // Save deployment info
  const deploymentInfo = {
    address: tokenAddress,
    name: name,
    symbol: symbol,
    initialSupply: initialSupply,
    maxSupply: maxSupply,
    deployer: deployer.address,
    network: hre.network.name,
    timestamp: new Date().toISOString()
  };

  const deploymentPath = path.join(__dirname, "../deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to:", deploymentPath);

  return deploymentInfo;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;