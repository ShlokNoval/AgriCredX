import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const verifierNode = signers.length > 1 ? signers[1] : deployer;

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Verifier Node set to:", verifierNode.address);

  const AgriCredX = await ethers.getContractFactory("AgriCredX");
  const agricredx = await AgriCredX.deploy(verifierNode.address);

  await agricredx.waitForDeployment();

  const contractAddress = await agricredx.getAddress();
  const txHash = agricredx.deploymentTransaction()?.hash;
  console.log("AgriCredX deployed to:", contractAddress);
  console.log("Deployment Transaction Hash:", txHash);

  // Write deployment config for frontend
  const envContent = `VITE_AGRICREDX_CONTRACT_ADDRESS=${contractAddress}\n`;
  fs.writeFileSync(path.join(__dirname, "../../apps/web/.env.local"), envContent);
  console.log("Wrote frontend config to apps/web/.env.local");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
