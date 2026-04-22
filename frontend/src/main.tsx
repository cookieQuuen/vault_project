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
import "./styles.css";

const vaultAddress = (import.meta.env.VITE_VAULT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;
const chainId = Number(import.meta.env.VITE_CHAIN_ID || "11155111");
const defaultRpcUrl = chainId === 31337 ? "http://localhost:8545" : "https://ethereum-sepolia-rpc.publicnode.com";
const rpcUrl = import.meta.env.VITE_RPC_URL || defaultRpcUrl;

const anvilChain = {
  id: 31337,
  name: "Anvil",
  network: "anvil",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: [rpcUrl]
    },
    public: {
      http: [rpcUrl]
    }
  }
};

const selectedChain = chainId === 31337 ? anvilChain : sepolia;

const { chains, publicClient, webSocketPublicClient } = configureChains([selectedChain], [
  jsonRpcProvider({
    rpc: () => ({
      http: rpcUrl
    })
  })
]);

const wagmiConfig = createConfig({
  autoConnect: false,
  connectors: [new InjectedConnector({ chains })],
  publicClient,
  webSocketPublicClient
});

const queryClient = new QueryClient();

function Dashboard() {
  const [amount, setAmount] = React.useState("0.05");
  const [isOnline, setIsOnline] = React.useState<boolean>(navigator.onLine);
  const [hasInjectedWallet, setHasInjectedWallet] = React.useState<boolean>(false);
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { connectAsync, connectors, isLoading: isConnecting, pendingConnector, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();

  React.useEffect(() => {
    setHasInjectedWallet(typeof (window as any).ethereum !== "undefined");

    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const hasVaultAddress = vaultAddress !== "0x0000000000000000000000000000000000000000";
  const canQueryChain = isOnline && hasVaultAddress;
  const isCorrectNetwork = !isConnected || chain?.id === selectedChain.id;

  const walletBalance = useBalance({
    address,
    watch: false,
    enabled: Boolean(address) && canQueryChain
  });

  const principalRead = useContractRead({
    address: vaultAddress,
    abi: vaultAbi,
    functionName: "principalOf",
    args: address ? [address] : undefined,
    enabled: Boolean(address) && canQueryChain,
    watch: false
  });

  const rewardRead = useContractRead({
    address: vaultAddress,
    abi: vaultAbi,
    functionName: "accruedRewardOf",
    args: address ? [address] : undefined,
    enabled: Boolean(address) && canQueryChain,
    watch: false
  });

  const depositWrite = useContractWrite({
    address: vaultAddress,
    abi: vaultAbi,
    functionName: "deposit",
    value: amount ? parseEther(amount) : undefined
  });

  const txReceipt = useWaitForTransaction({
    hash: depositWrite.data?.hash
  });

  const isPending = depositWrite.isLoading || txReceipt.isLoading;
  const success = txReceipt.isSuccess;
  const hasError = depositWrite.isError || txReceipt.isError;

  const principal = principalRead.data ? Number(formatEther(principalRead.data as bigint)).toFixed(6) : "0.000000";
  const rewards = rewardRead.data ? Number(formatEther(rewardRead.data as bigint)).toFixed(6) : "0.000000";

  const amountValue = Number(amount);
  let depositDisabledReason = "";
  if (!isOnline) {
    depositDisabledReason = "You are offline.";
  } else if (!hasVaultAddress) {
    depositDisabledReason = "Vault address is not configured.";
  } else if (!isCorrectNetwork) {
    depositDisabledReason = `Switch wallet to ${selectedChain.name}.`;
  } else if (!Number.isFinite(amountValue) || amountValue <= 0) {
    depositDisabledReason = "Enter an amount greater than 0.";
  } else if (isPending) {
    depositDisabledReason = "Transaction is pending.";
  }
  const isDepositDisabled = depositDisabledReason.length > 0;

  return (
    <div className="page">
      <div className="glow" />
      <div className="card">
        <h1>ETH Deposit Vault</h1>
        <p className="subtitle">UUPS upgradeable vault dashboard with live on-chain reads.</p>

        {!isOnline && <p className="err">You are offline. Reconnect internet to query Sepolia RPC.</p>}
        {!hasVaultAddress && <p className="err">Set VITE_VAULT_ADDRESS in your frontend .env file.</p>}

        {!isConnected && !hasInjectedWallet && (
          <p className="err">MetaMask (or another injected wallet) is not detected in this browser.</p>
        )}

        {!isConnected && hasInjectedWallet && (
          <div className="stack">
            {connectors.map((connector) => (
              <button
                key={connector.id}
                onClick={async () => {
                  try {
                    await connectAsync({ connector });
                  } catch {
                    // Connection errors are surfaced through wagmi state below.
                  }
                }}
                disabled={!connector.ready || isConnecting}
              >
                {isConnecting && pendingConnector?.id === connector.id ? "Connecting..." : `Connect ${connector.name}`}
              </button>
            ))}
          </div>
        )}

        {!isConnected && connectError && <p className="err">Wallet connect failed. Install/enable MetaMask and try again.</p>}
        {isConnected && !isCorrectNetwork && <p className="err">Switch wallet network to {selectedChain.name}.</p>}

        {isConnected && (
          <>
            <div className="metrics">
              <div>
                <span>Wallet</span>
                <strong>{walletBalance.data ? `${Number(walletBalance.data.formatted).toFixed(4)} ETH` : "-"}</strong>
              </div>
              <div>
                <span>Vault Balance</span>
                <strong>{principal} ETH</strong>
              </div>
              <div>
                <span>Potential Rewards</span>
                <strong>{rewards} ETH</strong>
              </div>
            </div>

            <label htmlFor="amount">Deposit Amount (ETH)</label>
            <input id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.10" />

            <div className="stack">
              <button
                onClick={() => depositWrite.write?.()}
                disabled={isDepositDisabled}
              >
                {isPending ? "Pending..." : "Deposit"}
              </button>
              <button className="secondary" onClick={() => disconnect()}>
                Disconnect
              </button>
            </div>

            {isDepositDisabled && <p className="err">Deposit disabled: {depositDisabledReason}</p>}

            {success && <p className="ok">Deposit confirmed on-chain.</p>}
            {hasError && <p className="err">Transaction failed. Check wallet/network and retry.</p>}
          </>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    </WagmiConfig>
  </React.StrictMode>
);
