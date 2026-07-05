import { encodeFunctionData } from 'viem';
import { useRelayTx } from './useRelayTx';
import { retailEscrowABI } from '../contracts/retailEscrow-abi';

const RETAIL_ESCROW_ADDRESS = process.env.NEXT_PUBLIC_RETAIL_ESCROW_ADDRESS as `0x${string}`;

export function useRetailEscrow() {
  const { relayTx } = useRelayTx();

  const createOrder = async (id: string, seller: `0x${string}`, amount: bigint, shipping: bigint, deliveryHash: `0x${string}`) => {
    const data = encodeFunctionData({
      abi: retailEscrowABI,
      functionName: 'createOrder',
      args: [id, seller, amount, shipping, deliveryHash],
    });
    return relayTx(RETAIL_ESCROW_ADDRESS, data);
  };

  const fund = async (id: string) => {
    const data = encodeFunctionData({
      abi: retailEscrowABI,
      functionName: 'fund',
      args: [id],
    });
    return relayTx(RETAIL_ESCROW_ADDRESS, data);
  };

  const markDelivered = async (id: string) => {
    const data = encodeFunctionData({
      abi: retailEscrowABI,
      functionName: 'markDelivered',
      args: [id],
    });
    return relayTx(RETAIL_ESCROW_ADDRESS, data);
  };

  const confirmDelivery = async (id: string, deliveryCode: string) => {
    const data = encodeFunctionData({
      abi: retailEscrowABI,
      functionName: 'confirmDelivery',
      args: [id, deliveryCode],
    });
    return relayTx(RETAIL_ESCROW_ADDRESS, data);
  };

  return {
    createOrder,
    fund,
    markDelivered,
    confirmDelivery,
  };
}
