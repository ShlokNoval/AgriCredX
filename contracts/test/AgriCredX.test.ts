import { expect } from "chai";
import { ethers } from "hardhat";
import { AgriCredX } from "../typechain-types";

describe("AgriCredX Lifecycle", function () {
  let agricredx: AgriCredX;
  let admin: any;
  let verifier: any;
  let supplier: any;
  let buyer: any;
  let financier: any;

  beforeEach(async function () {
    [admin, verifier, supplier, buyer, financier] = await ethers.getSigners();
    const AgriCredXFactory = await ethers.getContractFactory("AgriCredX");
    agricredx = await AgriCredXFactory.deploy(verifier.address);
  });

  it("should enforce the canonical lifecycle: CREATED -> VERIFIED -> BUYER_ACCEPTED -> ATTESTED -> FINANCEABLE -> OUTSTANDING -> CLOSED", async function () {
    // 1. CREATED
    const invoiceId = "uuid-1234";
    const amount = ethers.parseEther("1000");
    const dueDate = Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60; // 60 days
    await agricredx.connect(supplier).createReceivable(invoiceId, buyer.address, amount, dueDate);
    
    let r = await agricredx.receivables(1);
    expect(r.status).to.equal(0); // CREATED

    // 2. VERIFIED
    await agricredx.connect(verifier).setVerified(1);
    r = await agricredx.receivables(1);
    expect(r.status).to.equal(1); // VERIFIED

    // 3. BUYER_ACCEPTED
    await agricredx.connect(buyer).buyerAccept(1);
    r = await agricredx.receivables(1);
    expect(r.status).to.equal(2); // BUYER_ACCEPTED

    // 4. ATTESTED
    const digest = ethers.keccak256(ethers.toUtf8Bytes("test-digest"));
    await agricredx.connect(verifier).anchorAttestation(1, digest);
    r = await agricredx.receivables(1);
    expect(r.status).to.equal(3); // ATTESTED

    // 5. FINANCEABLE
    await agricredx.connect(verifier).makeFinanceable(1);
    r = await agricredx.receivables(1);
    expect(r.status).to.equal(4); // FINANCEABLE

    // 6. FUNDED / OUTSTANDING
    const fundAmount = ethers.parseEther("950");
    await agricredx.connect(financier).fundReceivable(1, fundAmount);
    r = await agricredx.receivables(1);
    expect(r.status).to.equal(6); // OUTSTANDING (skips FUNDED in MVP contract logic)

    // 7. REPAID / CLOSED
    await agricredx.connect(buyer).markRepaid(1);
    r = await agricredx.receivables(1);
    expect(r.status).to.equal(8); // CLOSED (skips REPAID in MVP contract logic)
  });
});
