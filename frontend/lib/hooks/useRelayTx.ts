import { useAccount, useSignTypedData, useWalletClient } from 'wagmi';

const FORWARD_REQUEST_TYPE = {
  ForwardRequest: [
    { name: 'from', type: 'address' },
    { name: 'target', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'data', type: 'bytes' },
    { name: 'deadline', type: 'uint256' },
  ],
};

export function useRelayTx() {
  const { address } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const { data: walletClient } = useWalletClient();

  const relayTx = async (
    contractAddress: string,
    funcData: string,
    value: bigint = 0n
  ) => {
    if (!address) throw new Error("Wallet not connected");

    const forwarderAddress = process.env.NEXT_PUBLIC_FORWARDER_ADDRESS;
    const chainId = process.env.NEXT_PUBLIC_CHAIN_ID || 31337;

    try {
      // 1. Fetch nonce from our backend
      const res = await fetch(`/api/v1/relay/nonce/${address}`);
      const { nonce } = await res.json();

      // 2. Prepare request
      const req = {
        from: address,
        target: contractAddress,
        value: Number(value),
        nonce: Number(nonce),
        data: funcData,
        deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      };

      const domain = {
        name: 'GhachaghForwarder',
        version: '1',
        chainId: Number(chainId),
        verifyingContract: forwarderAddress as `0x${string}`,
      };

      // 3. Sign Typed Data
      const signature = await signTypedDataAsync({
        domain,
        types: FORWARD_REQUEST_TYPE,
        primaryType: 'ForwardRequest',
        message: req,
      });

      // 4. Send to backend relayer
      const relayRes = await fetch('/api/v1/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ req, signature }),
      });

      if (!relayRes.ok) {
        throw new Error("Relay failed");
      }

      const { txHash } = await relayRes.json();
      return txHash;

    } catch (error) {
      console.warn("Relay failed, attempting direct fallback...", error);

      // Fallback: direct transaction
      if (!walletClient) throw new Error("Wallet client not available for fallback");

      const txHash = await walletClient.sendTransaction({
        to: contractAddress as `0x${string}`,
        data: funcData as `0x${string}`,
        value,
      });
      return txHash;
    }
  };

  return { relayTx };
}
