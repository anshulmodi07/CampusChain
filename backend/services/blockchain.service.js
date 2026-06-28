import { ethers } from "ethers";
import ExpressError from "../utils/ExpressError.js";

// WHY: Isolate all Ethereum/proof-registry concerns in one place.
// Controllers remain thin; DB + anchoring orchestration happens at the call site.

let cached = null;

const getEnv = () => {
  const PROOF_REGISTRY_ADDRESS = process.env.PROOF_REGISTRY_ADDRESS;
  const ANCHOR_PRIVATE_KEY = process.env.ANCHOR_PRIVATE_KEY;
  const RPC_URL = process.env.RPC_URL;

  if (!PROOF_REGISTRY_ADDRESS) {
    throw new ExpressError(500, "Missing PROOF_REGISTRY_ADDRESS in .env");
  }
  if (!ANCHOR_PRIVATE_KEY) {
    throw new ExpressError(500, "Missing ANCHOR_PRIVATE_KEY in .env");
  }
  if (!RPC_URL) {
    throw new ExpressError(500, "Missing RPC_URL in .env");
  }

  return { PROOF_REGISTRY_ADDRESS, ANCHOR_PRIVATE_KEY, RPC_URL };
};

const getDonationProofRegistryAbi = () => {
  // WHY: Keep ABI local and minimal; backend only calls anchorDonation(bytes32).
  return [
    {
      inputs: [{ internalType: "bytes32", name: "donationHash", type: "bytes32" }],
      name: "anchorDonation",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ];
};

const init = () => {
  if (cached) return cached;

  const { PROOF_REGISTRY_ADDRESS, ANCHOR_PRIVATE_KEY, RPC_URL } = getEnv();

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(ANCHOR_PRIVATE_KEY, provider);

  const contract = new ethers.Contract(
    PROOF_REGISTRY_ADDRESS,
    getDonationProofRegistryAbi(),
    signer
  );

  cached = { provider, signer, contract };
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
      donor_address,
      amountEncoded,
      paymentMethodStr,
      paymentRefStr,
      BigInt(tsSeconds),
    ]
  );

  return ethers.keccak256(encoded);
};

export const anchorDonation = async (donationHash) => {
  const { contract } = init();

  // WHY: Call the only on-chain function that anchors the immutable donation hash.
  if (!donationHash || donationHash === ethers.ZeroHash) {
    throw new ExpressError(400, "donationHash must be non-zero bytes32");
  }

  const tx = await contract.anchorDonation(donationHash);

  // WHY: Wait for confirmation so we can return the transaction hash + block number.
  const receipt = await tx.wait();

  return {
    anchorTxHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
};


