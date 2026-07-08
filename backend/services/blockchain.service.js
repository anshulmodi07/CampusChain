import { ethers } from "ethers";
import ExpressError from "../utils/ExpressError.js";

// WHY: Isolate all Ethereum/proof-registry concerns in one place.
// Controllers remain thin; DB + anchoring orchestration happens at the call site.

let cached = null;

const getEnv = () => {
  const PROOF_REGISTRY_ADDRESS = process.env.PROOF_REGISTRY_ADDRESS;
  const ANCHOR_PRIVATE_KEY = process.env.ANCHOR_PRIVATE_KEY;
  const RPC_URL = process.env.RPC_URL;

  const isConfigured = !!(PROOF_REGISTRY_ADDRESS && ANCHOR_PRIVATE_KEY && RPC_URL);

  return { PROOF_REGISTRY_ADDRESS, ANCHOR_PRIVATE_KEY, RPC_URL, isConfigured };
};

const getDonationProofRegistryAbi = () => {
  // WHY: Minimal ABI used for proof verification + anchoring.
  return [
    {
      inputs: [{ internalType: "bytes32", name: "donationHash", type: "bytes32" }],
      name: "anchorDonation",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [{ internalType: "bytes32", name: "donationHash", type: "bytes32" }],
      name: "verifyDonation",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "view",
      type: "function",
    },
  ];
};


const init = () => {
  if (cached) return cached;

  const env = getEnv();

  if (!env.isConfigured) {
    console.warn("Blockchain anchoring configuration is incomplete in .env. Mocking blockchain anchoring.");
    cached = {
      isMock: true,
      contract: {
        anchorDonation: async (donationHash) => {
          return {
            hash: `0xmock_anchor_tx_${ethers.keccak256(ethers.toUtf8Bytes(donationHash)).slice(2, 34)}`,
            wait: async () => ({
              hash: `0xmock_anchor_tx_${ethers.keccak256(ethers.toUtf8Bytes(donationHash)).slice(2, 34)}`,
              blockNumber: 12345678,
            }),
          };
        },
        verifyDonation: async (donationHash) => {
          return true;
        },
      },
    };
    return cached;
  }

  const provider = new ethers.JsonRpcProvider(env.RPC_URL);
  const signer = new ethers.Wallet(env.ANCHOR_PRIVATE_KEY, provider);

  const contract = new ethers.Contract(
    env.PROOF_REGISTRY_ADDRESS,
    getDonationProofRegistryAbi(),
    signer
  );

  cached = { isMock: false, provider, signer, contract };
  return cached;
};

const toSolidityUint256 = (v) => {
  // WHY: EVM uint256 needs integer-like representation.
  // donation amount is stored as float in SQL; we deterministically convert to a string
  // representation by using exact decimal text if provided.
  if (typeof v === "bigint") return v;
  if (typeof v === "number") {
    // Keep integers exactly, for floats rely on string conversion upstream.
    return BigInt(v);
  }
  return BigInt(v);
};

export const generateDonationHash = ({
  donationId,
  fundraiser_id,
  donor_address,
  amount,
  payment_method,
  payment_reference,
  donatedAt,
}) => {
  // WHY: Deterministic keccak256 over immutable fields.
  // DO NOT include tx_hash or anchor_tx_hash.

  if (!donationId || !fundraiser_id || !donor_address) {
    throw new ExpressError(400, "Missing required fields for donation hash");
  }

  // WHY: Bypasses encoding errors if user signed up with physical address/invalid wallet string.
  let cleanDonorAddress = donor_address;
  if (!ethers.isAddress(cleanDonorAddress)) {
    cleanDonorAddress = ethers.ZeroAddress;
  }

  // Convert donatedAt to uint256 timestamp (seconds).
  const tsSeconds = Math.floor(new Date(donatedAt).getTime() / 1000);

  // Deterministic amount representation:
  // Convert to string with full precision; then hash as a bytes32 derived from its keccak.
  // To keep ABI encoding simple, we encode amount as uint256 using wei-like scaling if needed.
  // Here we treat `amount` as a base-unit integer if it's already integral-like.
  // If it's a float, we encode it as string-hash to avoid rounding.
  const amountStr = String(amount);
  let amountEncoded;
  if (/^\d+$/.test(amountStr)) {
    amountEncoded = toSolidityUint256(amountStr);
  } else {
    // WHY: avoid rounding floats; instead commit to the exact decimal string.
    // We hash the decimal string to a uint256-compatible value.
    amountEncoded = ethers.toBigInt(ethers.keccak256(ethers.toUtf8Bytes(amountStr)));
  }

  const paymentMethodStr = payment_method ?? "";
  const paymentRefStr = payment_reference ?? "";

  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    [
      "uint256", // donation_id
      "uint256", // fundraiser_id
      "address", // donor_address
      "uint256", // amount (deterministic representation)
      "string", // payment_method
      "string", // payment_reference
      "uint256", // donated_at timestamp (seconds)
    ],
    [
      BigInt(donationId),
      BigInt(fundraiser_id),
      cleanDonorAddress,
      amountEncoded,
      paymentMethodStr,
      paymentRefStr,
      BigInt(tsSeconds),
    ]
  );

  return ethers.keccak256(encoded);
};

export const verifyDonation = async (donationHash) => {
  const { contract, isMock } = init();

  // WHY: Verify only needs a view call; no signer or tx needed.
  if (!donationHash || donationHash === ethers.ZeroHash) {
    throw new ExpressError(400, "donationHash must be non-zero bytes32");
  }

  if (isMock) {
    return true;
  }

  const verified = await contract.verifyDonation(donationHash);
  return verified;
};


export const anchorDonation = async (donationHash) => {
  const { contract, isMock } = init();


  // WHY: Call the only on-chain function that anchors the immutable donation hash.
  if (!donationHash || donationHash === ethers.ZeroHash) {
    throw new ExpressError(400, "donationHash must be non-zero bytes32");
  }

  if (isMock) {
    const mockTx = await contract.anchorDonation(donationHash);
    const mockReceipt = await mockTx.wait();
    return {
      anchorTxHash: mockReceipt.hash,
      blockNumber: mockReceipt.blockNumber,
    };
  }

  const tx = await contract.anchorDonation(donationHash);

  // WHY: Wait for confirmation so we can return the transaction hash + block number.
  const receipt = await tx.wait();

  return {
    anchorTxHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
};


