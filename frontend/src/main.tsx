import React from "react";
import ReactDOM from "react-dom/client";
import {
  WagmiConfig,
  configureChains,
  createConfig,
  useAccount,
  useConnect,
  useDisconnect,
  useContractRead,
  useContractWrite,
  useWaitForTransaction,
  useBalance,
  useNetwork
} from "wagmi";
import { sepolia } from "wagmi/chains";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import { InjectedConnector } from "wagmi/connectors/injected";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { formatEther, parseEther } from "viem";
import { vaultAbi } from "./abi/vaultAbi";

/* ── inline styles ─────────────────────────────────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Barlow:wght@300;400;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #0a0a08;
    --surface:   #111109;
    --border:    #2a2a20;
    --amber:     #f5a623;
    --amber-dim: #7a5010;
    --green:     #39ff70;
    --red:       #ff3b3b;
    --text:      #e8e0cc;
    --muted:     #6b6555;
    --mono:      'Share Tech Mono', monospace;
    --sans:      'Barlow', sans-serif;
  }

  html, body, #root {
    height: 100%;
    background: var(--bg);
    color: var(--text);
    font-family: var(--sans);
    font-weight: 300;
  }

  /* scanline overlay */
  body::before {
    content: '';
    position: fixed; inset: 0; z-index: 9999;
    pointer-events: none;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.04) 2px,
      rgba(0,0,0,0.04) 4px
    );
  }

  /* grid noise bg */
  body::after {
    content: '';
    position: fixed; inset: 0; z-index: 0;
    pointer-events: none;
    background-image:
      linear-gradient(var(--border) 1px, transparent 1px),
      linear-gradient(90deg, var(--border) 1px, transparent 1px);
    background-size: 40px 40px;
    opacity: 0.35;
  }

  .shell {
    position: relative; z-index: 1;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48px 16px 80px;
  }

  /* ── header ── */
  .hdr {
    width: 100%; max-width: 680px;
    display: flex; align-items: flex-end; justify-content: space-between;
    margin-bottom: 40px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 16px;
  }
  .hdr-left { display: flex; flex-direction: column; gap: 4px; }
  .hdr-tag {
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 0.2em;
    color: var(--amber);
    text-transform: uppercase;
  }
  .hdr-title {
    font-family: var(--mono);
    font-size: 22px;
    font-weight: 400;
    color: var(--text);
    letter-spacing: 0.04em;
  }
  .hdr-sub {
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 0.08em;
    font-family: var(--mono);
  }
  .status-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--green);
    box-shadow: 0 0 8px var(--green);
    animation: pulse 2s ease-in-out infinite;
  }
  .status-dot.off { background: var(--red); box-shadow: 0 0 8px var(--red); }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }

  /* ── panel ── */
  .panel {
    width: 100%; max-width: 680px;
    border: 1px solid var(--border);
    background: var(--surface);
    position: relative;
  }
  .panel + .panel { margin-top: 2px; }

  .panel-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border);
    background: rgba(245,166,35,0.04);
  }
  .panel-head-label {
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 0.18em;
    color: var(--amber);
    text-transform: uppercase;
  }
  .panel-head-index {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--muted);
  }
  .panel-body { padding: 20px 24px; }

  /* ── metrics row ── */
  .metrics {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2px;
    margin-bottom: 2px;
  }
  .metric {
    border: 1px solid var(--border);
    background: var(--surface);
    padding: 16px 18px;
    display: flex; flex-direction: column; gap: 6px;
  }
  .metric-label {
    font-family: var(--mono);
    font-size: 9px;
    letter-spacing: 0.2em;
    color: var(--muted);
    text-transform: uppercase;
  }
  .metric-value {
    font-family: var(--mono);
    font-size: 20px;
    color: var(--amber);
    letter-spacing: 0.02em;
    line-height: 1;
  }
  .metric-unit {
    font-size: 10px;
    color: var(--muted);
    font-family: var(--mono);
  }

  /* ── address bar ── */
  .addr-bar {
    border: 1px solid var(--border);
    background: var(--surface);
    padding: 10px 18px;
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 2px;
  }
  .addr-label {
    font-family: var(--mono); font-size: 9px;
    letter-spacing: 0.18em; color: var(--muted); text-transform: uppercase;
    white-space: nowrap;
  }
  .addr-value {
    font-family: var(--mono); font-size: 12px; color: var(--text);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  /* ── input row ── */
  .input-row {
    border: 1px solid var(--border);
    background: var(--surface);
    display: flex; align-items: stretch;
    margin-bottom: 2px;
  }
  .input-label-block {
    padding: 0 16px;
    display: flex; align-items: center;
    border-right: 1px solid var(--border);
    background: rgba(245,166,35,0.04);
    font-family: var(--mono); font-size: 9px;
    letter-spacing: 0.18em; color: var(--amber); text-transform: uppercase;
    white-space: nowrap;
  }
  .amount-input {
    flex: 1;
    background: transparent;
    border: none; outline: none;
    font-family: var(--mono); font-size: 18px;
    color: var(--text);
    padding: 14px 16px;
    caret-color: var(--amber);
  }
  .amount-input::placeholder { color: var(--muted); }
  .input-suffix {
    padding: 0 16px;
    display: flex; align-items: center;
    font-family: var(--mono); font-size: 11px; color: var(--muted);
  }

  /* ── buttons ── */
  .btn-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px;
    margin-bottom: 2px;
  }
  .btn-row.full { grid-template-columns: 1fr; }
  .btn-row.three { grid-template-columns: 1fr 1fr 1fr; }

  .btn {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    border: 1px solid var(--amber-dim);
    background: transparent;
    color: var(--amber);
    padding: 14px 20px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    position: relative;
    overflow: hidden;
  }
  .btn::before {
    content: '';
    position: absolute; inset: 0;
    background: var(--amber);
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    z-index: 0;
  }
  .btn:hover:not(:disabled)::before { transform: translateX(0); }
  .btn:hover:not(:disabled) { color: var(--bg); border-color: var(--amber); }
  .btn span { position: relative; z-index: 1; }
  .btn:disabled {
    opacity: 0.35; cursor: not-allowed; border-color: var(--border); color: var(--muted);
  }
  .btn.danger {
    border-color: #3a1a1a; color: var(--muted);
  }
  .btn.danger::before { background: var(--red); }
  .btn.danger:hover:not(:disabled) { color: #fff; border-color: var(--red); }

  /* ── connect panel ── */
  .connect-panel {
    border: 1px solid var(--border);
    background: var(--surface);
    padding: 40px 32px;
    text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 20px;
  }
  .connect-icon {
    font-family: var(--mono); font-size: 36px; color: var(--amber-dim);
    letter-spacing: 0.1em;
  }
  .connect-title {
    font-family: var(--mono); font-size: 13px;
    letter-spacing: 0.2em; color: var(--text); text-transform: uppercase;
  }
  .connect-sub {
    font-size: 12px; color: var(--muted); line-height: 1.6;
    max-width: 320px; font-family: var(--mono);
  }
  .connect-btn {
    font-family: var(--mono); font-size: 11px;
    letter-spacing: 0.2em; text-transform: uppercase;
    border: 1px solid var(--amber);
    background: transparent; color: var(--amber);
    padding: 14px 40px; cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .connect-btn:hover:not(:disabled) { background: var(--amber); color: var(--bg); }
  .connect-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ── notices ── */
  .notice {
    border: 1px solid;
    padding: 10px 16px;
    font-family: var(--mono); font-size: 11px;
    letter-spacing: 0.08em;
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 2px;
  }
  .notice.err  { border-color: #3a1212; background: rgba(255,59,59,0.06); color: var(--red); }
  .notice.ok   { border-color: #0f3020; background: rgba(57,255,112,0.06); color: var(--green); }
  .notice.warn { border-color: #3a2800; background: rgba(245,166,35,0.06); color: var(--amber); }
  .notice-icon { font-size: 14px; flex-shrink: 0; }

  /* ── diagnostics ── */
  .diag {
    border: 1px solid var(--border);
    background: #080806;
    padding: 16px 18px;
    margin-bottom: 2px;
  }
  .diag-row {
    display: flex; gap: 12px;
    font-family: var(--mono); font-size: 11px;
    padding: 3px 0;
    border-bottom: 1px solid rgba(42,42,32,0.5);
  }
  .diag-row:last-child { border-bottom: none; }
  .diag-key { color: var(--muted); min-width: 160px; }
  .diag-val { color: var(--text); word-break: break-all; }

  .toggle-diag {
    font-family: var(--mono); font-size: 9px;
    letter-spacing: 0.15em; text-transform: uppercase;
    background: transparent; border: 1px solid var(--border);
    color: var(--muted); padding: 5px 10px; cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .toggle-diag:hover { border-color: var(--amber-dim); color: var(--amber); }

  /* ── footer ── */
  .footer {
    margin-top: 40px;
    font-family: var(--mono); font-size: 9px;
    letter-spacing: 0.18em; color: var(--muted);
    text-transform: uppercase;
    text-align: center;
  }

  /* ── responsive ── */
  @media (max-width: 560px) {
    .metrics { grid-template-columns: 1fr; }
    .btn-row.three { grid-template-columns: 1fr 1fr; }
    .hdr-title { font-size: 16px; }
    .metric-value { font-size: 16px; }
  }
`;

const vaultAddress = (import.meta.env.VITE_VAULT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;
const chainId = 11155111;
const rpcUrl = "https://ethereum-sepolia-rpc.publicnode.com";
const selectedChain = sepolia;

const { chains, publicClient, webSocketPublicClient } = configureChains([selectedChain], [
  jsonRpcProvider({ rpc: () => ({ http: rpcUrl }) })
]);

const wagmiConfig = createConfig({
  autoConnect: false,
  connectors: [new InjectedConnector({ chains })],
  publicClient,
  webSocketPublicClient
});

const queryClient = new QueryClient();

function Dashboard() {
  const withdrawWrite = useContractWrite({ address: vaultAddress, abi: vaultAbi, functionName: "withdraw" });
  const claimWrite    = useContractWrite({ address: vaultAddress, abi: vaultAbi, functionName: "claimRewards" });

  const [showDiag, setShowDiag] = React.useState(false);
  const [amount, setAmount]     = React.useState("0.005");
  const [isOnline, setIsOnline] = React.useState<boolean>(navigator.onLine);
  const [hasWallet, setHasWallet] = React.useState(false);

  const { address, isConnected } = useAccount();
  const { chain }                = useNetwork();
  const { connectAsync, connectors, isLoading: isConnecting, pendingConnector, error: connectError } = useConnect();
  const { disconnect }           = useDisconnect();

  React.useEffect(() => {
    setHasWallet(typeof (window as any).ethereum !== "undefined");
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const hasVaultAddress  = vaultAddress !== "0x0000000000000000000000000000000000000000";
  const canQuery         = isOnline && hasVaultAddress;
  const isCorrectNetwork = !isConnected || chain?.id === selectedChain.id;

  const walletBalance = useBalance({ address, watch: false, enabled: Boolean(address) && canQuery });
  const principalRead = useContractRead({ address: vaultAddress, abi: vaultAbi, functionName: "principalOf",     args: address ? [address] : undefined, enabled: Boolean(address) && canQuery, watch: false });
  const rewardRead    = useContractRead({ address: vaultAddress, abi: vaultAbi, functionName: "accruedRewardOf", args: address ? [address] : undefined, enabled: Boolean(address) && canQuery, watch: false });

  const depositWrite = useContractWrite({ address: vaultAddress, abi: vaultAbi, functionName: "deposit", value: amount ? parseEther(amount) : undefined });
  const txReceipt    = useWaitForTransaction({
    hash: depositWrite.data?.hash,
    pollInterval: 2000,
    retry: (n, e) => e?.name === "TransactionNotFoundError" && n < 10,
    retryDelay: (n) => Math.min(1000 * 2 ** n, 10000)
  });

  const isPending = depositWrite.isLoading || txReceipt.isLoading;
  const success   = txReceipt.isSuccess;
  const hasError  = depositWrite.isError || txReceipt.isError;

  const principalRaw = principalRead.data ? BigInt(principalRead.data as bigint) : 0n;
  const rewardsRaw   = rewardRead.data    ? BigInt(rewardRead.data as bigint)    : 0n;
  const principal    = Number(formatEther(principalRaw)).toFixed(6);
  const rewards      = Number(formatEther(rewardsRaw)).toFixed(6);
  const walletEth    = walletBalance.data ? Number(walletBalance.data.formatted).toFixed(4) : "—";

  const amountVal = Number(amount);
  let disabledReason = "";
  if (!isOnline)                                          disabledReason = "Offline";
  else if (!hasVaultAddress)                              disabledReason = "Vault address not configured";
  else if (!isCorrectNetwork)                             disabledReason = `Switch to ${selectedChain.name}`;
  else if (!Number.isFinite(amountVal) || amountVal <= 0) disabledReason = "Invalid amount";
  else if (isPending)                                     disabledReason = "Pending";
  const isDepositDisabled = disabledReason.length > 0;

  const fmt = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

  return (
    <div className="shell">
      {/* header */}
      <div className="hdr">
        <div className="hdr-left">
          <span className="hdr-tag">// VAULT TERMINAL</span>
          <span className="hdr-title">ETH_DEPOSIT_VAULT</span>
          <span className="hdr-sub">UUPS · SEPOLIA · {chainId}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className={`status-dot ${isOnline ? "" : "off"}`} />
          {isConnected && (
            <button className="toggle-diag" onClick={() => setShowDiag(v => !v)}>
              {showDiag ? "HIDE DIAG" : "DIAG"}
            </button>
          )}
        </div>
      </div>

      {/* diagnostics */}
      {showDiag && (
        <div className="diag" style={{ width: "100%", maxWidth: 680 }}>
          {[
            ["NETWORK",        "Sepolia (11155111)"],
            ["VAULT_ADDR",     vaultAddress],
            ["RPC",            rpcUrl],
            ["DEPOSIT_TX",     depositWrite.data?.hash || "—"],
            ["TX_STATUS",      txReceipt.status || "—"],
            ["TX_ERROR",       txReceipt.error?.name || "—"],
            ["TX_ERROR_MSG",   txReceipt.error?.message || "—"],
          ].map(([k, v]) => (
            <div className="diag-row" key={k}>
              <span className="diag-key">{k}</span>
              <span className="diag-val">{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* system notices */}
      {!isOnline      && <div className="notice err"  style={{ width: "100%", maxWidth: 680 }}><span className="notice-icon">!</span> OFFLINE — reconnect to query Sepolia RPC</div>}
      {!hasVaultAddress && <div className="notice warn" style={{ width: "100%", maxWidth: 680 }}><span className="notice-icon">△</span> Set VITE_VAULT_ADDRESS in .env</div>}

      {/* not connected */}
      {!isConnected && (
        <div className="connect-panel" style={{ width: "100%", maxWidth: 680 }}>
          <div className="connect-icon">[ ⬡ ]</div>
          <div className="connect-title">wallet not connected</div>
          <div className="connect-sub">
            {!hasWallet
              ? "No injected wallet detected. Install MetaMask or a compatible browser extension."
              : "Connect your wallet to interact with the vault on Sepolia testnet."}
          </div>
          {hasWallet && connectors.map(c => (
            <button key={c.id} className="connect-btn"
              disabled={!c.ready || isConnecting}
              onClick={async () => { try { await connectAsync({ connector: c }); } catch {} }}
            >
              {isConnecting && pendingConnector?.id === c.id ? "CONNECTING…" : `CONNECT ${c.name.toUpperCase()}`}
            </button>
          ))}
          {connectError && <div className="notice err"><span className="notice-icon">!</span> Connection failed. Enable MetaMask and retry.</div>}
        </div>
      )}

      {/* connected view */}
      {isConnected && (
        <>
          {/* address */}
          <div className="addr-bar" style={{ width: "100%", maxWidth: 680 }}>
            <span className="addr-label">CONNECTED</span>
            <span className="addr-value">{address}</span>
          </div>

          {/* metrics */}
          <div className="metrics" style={{ width: "100%", maxWidth: 680 }}>
            <div className="metric">
              <span className="metric-label">Wallet</span>
              <span className="metric-value">{walletEth}</span>
              <span className="metric-unit">ETH</span>
            </div>
            <div className="metric">
              <span className="metric-label">Vault Balance</span>
              <span className="metric-value">{principal}</span>
              <span className="metric-unit">ETH</span>
            </div>
            <div className="metric">
              <span className="metric-label">Accrued Rewards</span>
              <span className="metric-value">{rewards}</span>
              <span className="metric-unit">ETH</span>
            </div>
          </div>

          {/* wrong network */}
          {!isCorrectNetwork && (
            <div className="notice err" style={{ width: "100%", maxWidth: 680 }}>
              <span className="notice-icon">!</span> Switch wallet to {selectedChain.name}
            </div>
          )}

          {/* deposit input */}
          <div className="input-row" style={{ width: "100%", maxWidth: 680 }}>
            <div className="input-label-block">AMOUNT</div>
            <input
              className="amount-input"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.000"
            />
            <div className="input-suffix">ETH</div>
          </div>

          {/* action buttons */}
          <div className={`btn-row ${principalRaw > 0n && rewardsRaw > 0n ? "three" : principalRaw > 0n || rewardsRaw > 0n ? "" : "full"}`}
               style={{ width: "100%", maxWidth: 680 }}>
            <button className="btn" disabled={isDepositDisabled} onClick={() => depositWrite.write?.()}>
              <span>{isPending ? "PENDING…" : "DEPOSIT"}</span>
            </button>
            {principalRaw > 0n && (
              <button className="btn" disabled={withdrawWrite.isLoading}
                onClick={() => {
                  const amt = prompt("Withdraw how much ETH?", principal);
                  if (!amt) return;
                  try { withdrawWrite.write?.({ args: [parseEther(amt)] }); }
                  catch { alert("Invalid amount"); }
                }}>
                <span>{withdrawWrite.isLoading ? "PENDING…" : "WITHDRAW"}</span>
              </button>
            )}
            {rewardsRaw > 0n && (
              <button className="btn" disabled={claimWrite.isLoading} onClick={() => claimWrite.write?.()}>
                <span>{claimWrite.isLoading ? "PENDING…" : "CLAIM"}</span>
              </button>
            )}
          </div>

          {/* disconnect */}
          <div className="btn-row full" style={{ width: "100%", maxWidth: 680 }}>
            <button className="btn danger" onClick={() => disconnect()}>
              <span>DISCONNECT</span>
            </button>
          </div>

          {/* status messages */}
          {isDepositDisabled && disabledReason !== "Offline" && (
            <div className="notice warn" style={{ width: "100%", maxWidth: 680 }}>
              <span className="notice-icon">△</span> Deposit disabled — {disabledReason}
            </div>
          )}
          {success && (
            <div className="notice ok" style={{ width: "100%", maxWidth: 680 }}>
              <span className="notice-icon">✓</span> Deposit confirmed on-chain
            </div>
          )}
          {hasError && (
            <div className="notice err" style={{ width: "100%", maxWidth: 680 }}>
              <span className="notice-icon">!</span>
              Transaction failed.{txReceipt.error?.name === "TransactionNotFoundError" ? " Not found — verify network and RPC." : " Check wallet and retry."}
            </div>
          )}
        </>
      )}

      <div className="footer">VAULT_TERMINAL v1.0 · CYFRIN ADERYN AUDITED · SEPOLIA</div>
    </div>
  );
}

// inject styles
const styleEl = document.createElement("style");
styleEl.textContent = css;
document.head.appendChild(styleEl);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    </WagmiConfig>
  </React.StrictMode>
);
