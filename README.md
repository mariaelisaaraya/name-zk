# 🌊 Chihiro's Lost Name — gitBDB

> **Stellar Hacks: ZK Gaming Edition**
> An on-chain Git learning game where you recover a stolen name using zero-knowledge proofs.

## What is this?

Chihiro's Lost Name is a browser-based Git simulator that teaches Git through narrative gameplay. Yubaba has stolen your name — to recover it you must complete a sacred Git ritual (init → branch → commit), then prove you know the secret name *without revealing it* using a Noir UltraHonk ZK proof verified on Stellar Soroban (Protocol 25).

**ZK is essential because** the game must verify that the player knows the correct name without ever transmitting it on-chain. The `nameCommit = Poseidon2(secret, salt)` is stored publicly; the ZK proof proves knowledge of the preimage. No secret ever leaves the browser.

---

## Monorepo Structure

```
gitBDB/           ← React 19 frontend (Vite 7) + isomorphic-git browser simulator
gitBDB-contracts/ ← ChihiroGame Soroban contract (Rust)
gitBDB-circuits/  ← Noir UltraHonk ZK circuit (chihiro-name)
```

---

## Run in 2 minutes

```bash
./scripts/demo.sh
# or manually:
cd gitBDB && npm install && npm run dev
# → http://localhost:5173
```

---

## Frontend (`gitBDB/`)

```bash
cd gitBDB
npm install
npm run dev          # dev server → http://localhost:5173
npm run build        # production build → dist/
npm run test         # run 21 unit tests (gitService + branch/checkout logic)
```

### Environment variables (copy `.env.example` → `.env`)

```bash
VITE_CHIHIRO_CONTRACT_ID=C...        # deployed ChihiroGame contract on testnet
VITE_ULTRAHONK_VERIFIER_ID=C...     # UltraHonk verifier contract on testnet
# Game Hub is hardcoded: CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG
```

Leave both empty to play without blockchain — the Git simulator and UI work fully offline.

---

## ZK Circuit (`gitBDB-circuits/`)

The circuit proves: *"I know (secret, salt) such that Poseidon2(secret, salt) == nameCommit"*

```bash
cd gitBDB-circuits/chihiro-name

# Run tests
nargo test

# Compile (generates target/chihiro_name.json for browser integration)
nargo build
```

**Note:** Current frontend uses a mock proof generator. Replace `generateZKProof()` in
`gitBDB/src/components/chihiro/ChihiroZKPanel.jsx` with `@noir-lang/backend_barretenberg`
after compiling the circuit.

---

## Soroban Contract (`gitBDB-contracts/`)

```bash
cd gitBDB-contracts

# Run unit tests
cargo test

# Build WASM
cargo build --target wasm32v1-none --release

# Deploy to testnet (requires Stellar CLI + funded account)
stellar contract upload \
  --wasm target/wasm32v1-none/release/chihiro_game.wasm \
  --source admin \
  --network testnet

stellar contract deploy \
  --wasm-hash <HASH_FROM_UPLOAD> \
  --source admin \
  --network testnet
# → Copy the output address to VITE_CHIHIRO_CONTRACT_ID in gitBDB/.env
```

### Game Hub integration

The contract calls `start_game(player1, player2)` and `end_game(game_id, player2)` on the
hackathon-provided Game Hub at:
```
CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG
```

---

## Wallet

Install [Freighter](https://freighter.app) (Chrome/Firefox extension, free). Switch to
**Testnet** in Freighter settings, then use the Admin panel in-game to fund your account
via the built-in faucet link.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 7 + TypeScript |
| Git simulator | isomorphic-git + Lightning FS (in-browser) |
| ZK proofs | Noir UltraHonk (mock) → Barretenberg WASM |
| Blockchain | Stellar Soroban — Protocol 25 "X-Ray" |
| Wallet | Stellar Wallets Kit v2 (Freighter) |
| i18n | react-i18next (ES/EN, 3 namespaces) |
| Tests | Vitest + memfs |
