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
  const envPath = path.join(__dirname, "../../apps/web/.env.local");
  let envContent = "";
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    // Replace if exists, otherwise append
    if (envContent.includes('VITE_AGRICREDX_CONTRACT_ADDRESS=')) {
      envContent = envContent.replace(/VITE_AGRICREDX_CONTRACT_ADDRESS=.*/, `VITE_AGRICREDX_CONTRACT_ADDRESS=${contractAddress}`);
    } else {
      envContent += `\nVITE_AGRICREDX_CONTRACT_ADDRESS=${contractAddress}\n`;
    }
  } else {
    envContent = `VITE_AGRICREDX_CONTRACT_ADDRESS=${contractAddress}\n`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log("Updated frontend config in apps/web/.env.local");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
