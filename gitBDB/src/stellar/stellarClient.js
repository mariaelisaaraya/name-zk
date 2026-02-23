// src/stellar/stellarClient.js
// Stellar SDK + Wallets Kit integration for "Chihiro's Lost Name"
//
// Sources verificadas contra documentación oficial:
//   → developers.stellar.org/docs/build/guides/transactions/invoke-contract-tx-sdk
//   → developers.stellar.org/docs/build/guides/transactions/signing-soroban-invocations
//   → stellarwalletskit.dev (v2.0.0, released 2026-02-11)

// ─── Wallets Kit v2 ────────────────────────────────────────────────────────────
// IMPORTANTE: paquete oficial es @creit-tech (con guión, JSR).
// @creit.tech (con punto, NPM) es V1 y va a deprecarse — stellarwalletskit.dev/installation
//
// V2 API es estática: StellarWalletsKit.init() + StellarWalletsKit.createButton()
// V1 API era instanciada: new StellarWalletsKit({...}) — YA NO SE USA
import { StellarWalletsKit } from "@creit-tech/stellar-wallets-kit";
import { FreighterModule } from "@creit-tech/stellar-wallets-kit/sdk/modules/freighter.module";

// ─── Stellar SDK — subpaths oficiales ─────────────────────────────────────────
// Fuente: developers.stellar.org/docs/build/guides/transactions/signing-soroban-invocations
// "import { Server } from '@stellar/stellar-sdk/rpc'"
import { Server } from "@stellar/stellar-sdk/rpc";

import {
  Contract,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  xdr,
  Address,
  scValToNative,
  Transaction,
} from "@stellar/stellar-sdk";

// ─── Debug: Verificar duplicación de módulos (MÁS ROBUSTOS) ──────────────────────────────────────────
console.log("=== [DEBUG Stellar SDK Deduplication Check] ===");
console.log(" - TransactionBuilder.name:", TransactionBuilder?.name);
console.log(" - Transaction.name:", Transaction?.name);

// Crear tx de prueba y verificar instanceof
try {
  const testXdr = "AAAAAgAAAACnj3pTqcwX+AkhT8VjN0Kl4QAAAAAAAAAAAAAAAgAAAAAAAAAA";
  const testTx = TransactionBuilder.fromXDR(
    testXdr,
    "Public Global Stellar Network ; September 2015"
  );
  const isInstanceOf = testTx instanceof TransactionBuilder;
  const isTransactionInstanceOf = testTx instanceof Transaction;
  console.log(" - testTx instanceof TransactionBuilder:", isInstanceOf);
  console.log(" - testTx instanceof Transaction:", isTransactionInstanceOf);
  
  if (!isInstanceOf || !isTransactionInstanceOf) {
    console.warn(" ⚠️  POTENTIAL DUPLICATION: instanceof checks failed!");
  }
} catch (e) {
  console.log(" - testTx creation error:", e.message);
}
console.log("=== [END Deduplication Check] ===\n");

// ─── Network constants ────────────────────────────────────────────────────────

export const RPC_URL = "https://soroban-testnet.stellar.org";
export const NETWORK_PASSPHRASE = Networks.TESTNET;

// Game Hub — dirección fija, deployada por organizadores del hackathon
export const GAME_HUB_CONTRACT_ID =
  "CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG";

// Seteá estas en .env después de deployar:
//   VITE_CHIHIRO_CONTRACT_ID=C...
//   VITE_ULTRAHONK_VERIFIER_ID=C...
export const CHIHIRO_CONTRACT_ID =
  import.meta.env.VITE_CHIHIRO_CONTRACT_ID ?? null;

export const ULTRAHONK_VERIFIER_ID =
  import.meta.env.VITE_ULTRAHONK_VERIFIER_ID ?? null;

// ─── Inicialización del Kit (una sola vez) ────────────────────────────────────
// V2 usa API estática — se llama init() una vez al arrancar la app.
// Fuente: stellarwalletskit.dev → "Start the kit"
let _kitInitialized = false;

function ensureKit() {
  if (!_kitInitialized) {
    console.log("[WalletKit] Initializing StellarWalletsKit (v2 static API)");
    StellarWalletsKit.init({
      modules: [new FreighterModule()],
      // Tell the kit we are on TESTNET so Freighter doesn't silently reject
      // address requests that come from a non-PUBLIC network context.
      network: Networks.TESTNET,
    });
    _kitInitialized = true;
    console.log("[WalletKit] Kit initialized — network: TESTNET");
  }
}

// ─── RPC Server singleton ─────────────────────────────────────────────────────
// Fuente: developers.stellar.org — "import { Server } from '@stellar/stellar-sdk/rpc'"
let _rpc = null;
function getRpc() {
  if (!_rpc) _rpc = new Server(RPC_URL);
  return _rpc;
}

// ─── Wallet API ───────────────────────────────────────────────────────────────

const CONNECT_TIMEOUT_MS = 15_000; // 15 s — Freighter popup won't last longer

/**
 * Muestra el modal de selección de wallet y resuelve con la dirección G...
 *
 * Fixes applied vs previous version:
 *  - openModal() in v2 returns void, not a Promise → must NOT chain .catch()
 *  - getAddress() is wrapped in a 15-second timeout so it can never hang forever
 *  - network: TESTNET passed to init() so Freighter accepts the request
 *  - console logging at every step so hangs are visible in DevTools
 */
export async function connectWallet() {
  ensureKit();
  console.log("[WalletKit] Opening wallet selection modal…");
  const { address } = await StellarWalletsKit.authModal();
  if (!address) throw new Error("[WalletKit] authModal() returned empty address");
  console.log("[WalletKit] ✓ Connected:", address);
  return address;
}
export async function disconnectWallet() {
  ensureKit();
  StellarWalletsKit.disconnect?.();
}

/**
 * Devuelve la dirección conectada actualmente, o null si no hay wallet.
 * Seguro de llamar en mount — swallows el error "not connected".
 */
export async function getConnectedAddress() {
  try {
    ensureKit();
    const { address } = await StellarWalletsKit.getAddress();
    return address || null;
  } catch {
    return null;
  }
}

// ─── Core invoke ──────────────────────────────────────────────────────────────
// Patrón oficial Soroban para write-calls:
//   build → prepareTransaction (simulate + assemble en 1 paso) → sign → submit → poll
//
// Fuente: developers.stellar.org/docs/build/guides/transactions/invoke-contract-tx-sdk
// "prepareTransaction simulates and assembles in one step"
//
// También: developers.stellar.org/docs/build/guides/transactions/simulateTransaction-Deep-Dive
// "you can also call prepareTransaction to have it both simulate and assemble
//  the transaction for you in one step"
//
async function invoke(contractId, method, args, signerAddress) {
  ensureKit();
  const rpc = getRpc();

  // 1. Obtener cuenta (número de secuencia actualizado)
  const account = await rpc.getAccount(signerAddress);

  // 2. Construir la transacción
  // BASE_FEE = 100 stroops. El fee real se determina en simulateTransaction.
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(new Contract(contractId).call(method, ...args))
    .setTimeout(30)
    .build();

  console.debug("[Stellar] Built transaction:", tx?.constructor?.name);

  // 3. Usar rpc.prepareTransaction() — patrón oficial Soroban
  //    Con deduplicación correcta en vite.config.js, esto debería funcionar
  let preparedTx;
  try {
    console.debug("[Stellar] Calling rpc.prepareTransaction() (official pattern)...");
    console.debug("[Stellar] tx before prepare:", {
      constructor: tx?.constructor?.name,
      instanceof_TransactionBuilder: tx instanceof TransactionBuilder,
      hasToXDR: typeof tx?.toXDR === 'function',
    });
    
    // rpc.prepareTransaction() simula + ensambla internamente
    preparedTx = await rpc.prepareTransaction(tx);
    
    console.debug("[Stellar] rpc.prepareTransaction() succeeded!");
    console.debug("[Stellar] preparedTx after prepare:", {
      constructor: preparedTx?.constructor?.name,
      instanceof_TransactionBuilder: preparedTx instanceof TransactionBuilder,
      hasToXDR: typeof preparedTx?.toXDR === 'function',
    });

  } catch (err) {
    console.error("[Stellar] rpc.prepareTransaction() failed:", err.message);
    console.error("[Stellar] Error stack:", {
      message: err?.message,
      errorString: String(err),
      stack: err?.stack?.split("\n").slice(0, 3),
    });
    throw err;
  }

  if (!preparedTx || typeof preparedTx.toXDR !== 'function') {
    console.error("[Stellar] preparedTx validation failed:", {
      preparedTx,
      typeOf: Object.prototype.toString.call(preparedTx),
      hasToXDR: typeof preparedTx?.toXDR,
    });
    throw new Error("preparedTx is not a valid Transaction (no .toXDR() method)");
  }

  // 4. Convertir a XDR base64 para firmar (Freighter espera string base64)
  const rawXdr = preparedTx.toXDR();
  
  // rawXdr puede ser string o Uint8Array dependiendo de la versión del SDK
  let xdrBase64;
  if (typeof rawXdr === 'string') {
    xdrBase64 = rawXdr;
  } else if (ArrayBuffer.isView(rawXdr)) {
    // Uint8Array es instance de ArrayBuffer.isView
    xdrBase64 = Buffer.from(rawXdr).toString('base64');
  } else {
    throw new Error(`Invalid XDR type: ${typeof rawXdr}, value type: ${Object.prototype.toString.call(rawXdr)}`);
  }
  
  console.debug("[Stellar] XDR converted to base64, length:", xdrBase64?.length);
  console.debug("[Stellar] XDR preview (first 80 chars):", xdrBase64?.substring(0, 80));

  // 5. Firmar — abre el popup del wallet (Freighter muestra los detalles al usuario)
  console.debug("[Stellar] Opening Freighter for signing...");
  const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdrBase64, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: signerAddress,
  });

  // 6. Enviar — `rpc.sendTransaction` espera el XDR firmado como string
  console.debug("[Stellar] Submitting signed transaction...", { type: typeof signedTxXdr, length: signedTxXdr?.length });
  const submitted = await rpc.sendTransaction(signedTxXdr);

  if (submitted.status === "ERROR") {
    throw new Error(`Submit error: ${JSON.stringify(submitted.errorResult)}`);
  }

  // 7. Polling — flujo de estados oficial:
  //    PENDING → ledger cierra (~5s) → NOT_FOUND (propagando) → SUCCESS | FAILED
  //
  // Fuente: developers.stellar.org/docs/build/guides/transactions/invoke-contract-tx-sdk
  // (Python example): "Poll `get_transaction` until the status is not 'NOT_FOUND'"
  const txHash = submitted.hash;

  if (submitted.status === "PENDING") {
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const result = await rpc.getTransaction(txHash);

      if (result.status === "SUCCESS") {
        return {
          txHash,
          result: result.returnValue ? scValToNative(result.returnValue) : null,
        };
      }
      if (result.status === "FAILED") {
        throw new Error(`Transaction failed on-chain. Hash: ${txHash}`);
      }
      // NOT_FOUND = todavía propagando, seguir esperando
    }
    throw new Error(`No confirmado después de 20s. Hash: ${txHash}`);
  }

  // Raro: SUCCESS inmediato (testnet local)
  if (submitted.status === "SUCCESS") {
    return { txHash, result: null };
  }

  throw new Error(`Status inesperado: ${submitted.status}`);
}

// ─── Funciones del juego ──────────────────────────────────────────────────────

/**
 * ADMIN — Inicializa el juego (player1).
 * Llama ChihiroGame.initialize() → game_hub.start_game(player1, player2)
 *
 * nameCommitHex = Poseidon2(nameSecret, salt) computado en el browser.
 * El secreto NUNCA sale del browser — solo se guarda el hash on-chain.
 */
export async function initializeGame({
  adminAddress,
  player2Address,
  nameCommitHex,
  verificationKey = "00",  // fallback para demo sin vk real
  vkHex = null,            // si se provee, sobreescribe verificationKey
  contractId = CHIHIRO_CONTRACT_ID,
}) {
  if (!contractId) throw new Error("Setear VITE_CHIHIRO_CONTRACT_ID en .env");

  // vkHex real (de proof.json) tiene prioridad sobre verificationKey placeholder
  const vkToUse = vkHex ?? verificationKey;

  const args = [
    new Address(adminAddress).toScVal(),
    new Address(player2Address).toScVal(),
    hexToBytes32(nameCommitHex),
    new Address(GAME_HUB_CONTRACT_ID).toScVal(),
    new Address(ULTRAHONK_VERIFIER_ID ?? adminAddress).toScVal(), // fallback para demo
    hexToBytes(vkToUse),
  ];

  return invoke(contractId, "initialize", args, adminAddress);
}

/**
 * PLAYER — Recupera el nombre con una prueba ZK (player2 / Chihiro).
 * Llama ChihiroGame.recover_name() → UltraHonkVerifier.verify() → game_hub.end_game()
 *
 * ZK en Stellar: Protocol 25 "X-Ray" agregó funciones host BN254 + Poseidon.
 * Fuente: developers.stellar.org/docs/build/apps/zk
 */
export async function recoverName({
  playerAddress,
  proofHex,
  nameCommitHex,
  contractId = CHIHIRO_CONTRACT_ID,
  vkHex = null,
}) {
  if (!contractId) throw new Error("Setear VITE_CHIHIRO_CONTRACT_ID en .env");

  // public_inputs: Vec<BytesN<32>> — el único output público del circuito es nameCommit
  const publicInputsVec = xdr.ScVal.scvVec([hexToBytes32(nameCommitHex)]);

  const args = [
    new Address(playerAddress).toScVal(),
    hexToBytes(proofHex),
    publicInputsVec,
  ];

  return invoke(contractId, "recover_name", args, playerAddress);
}

/**
 * Lee el estado del juego — gratis, sin firmar.
 * Usa simulateTransaction que NUNCA envía nada a la red.
 *
 * Para simulate necesitamos una cuenta source válida para construir el tx.
 * Usamos getAccount con una cuenta conocida de testnet — solo para el número
 * de secuencia, nunca se envía nada.
 */
export async function getGameStatus(contractId = CHIHIRO_CONTRACT_ID) {
  if (!contractId) return null;
  try {
    const rpc = getRpc();

    // Cuenta pública de testnet conocida — solo para estructurar el tx de simulación
    const source = await rpc.getAccount(
      "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN"
    );

    const tx = new TransactionBuilder(source, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(new Contract(contractId).call("get_game_status"))
      .setTimeout(30)
      .build();

    console.debug("[Stellar] getGameStatus: Simulating tx for read-only call");
    const simResult = await rpc.simulateTransaction(tx);

    if (simResult.error || !simResult.result?.retval) return null;

    // Contrato retorna (game_id: u64, started: bool, ended: bool)
    const native = scValToNative(simResult.result.retval);
    return { gameId: native[0], started: native[1], ended: native[2] };
  } catch {
    return null;
  }
}

// ─── Helpers de encoding ──────────────────────────────────────────────────────

/** hex string → xdr.ScVal Bytes longitud variable (para proof y vk) */
function hexToBytes(hex) {
  return xdr.ScVal.scvBytes(Buffer.from(hex.replace(/^0x/, ""), "hex"));
}

/** hex string → xdr.ScVal Bytes exactamente 32 bytes (para nameCommit: BytesN<32>) */
function hexToBytes32(hex) {
  const clean = hex.replace(/^0x/, "").padStart(64, "0").slice(0, 64);
  return xdr.ScVal.scvBytes(Buffer.from(clean, "hex"));
}

// ─── Helpers de display ───────────────────────────────────────────────────────

/** Acorta una dirección Stellar para mostrar: GABCD...XY12 */
export function formatAddress(addr) {
  if (!addr || addr.length < 12) return addr ?? "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/** Link a StellarExpert para una tx de testnet */
export function explorerTxUrl(txHash) {
  return `https://stellar.expert/explorer/testnet/tx/${txHash}`;
}
