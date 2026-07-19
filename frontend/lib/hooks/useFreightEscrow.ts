import { encodeFunctionData } from 'viem';
import { useRelayTx } from './useRelayTx';
import { freightEscrowABI } from '../contracts/freightEscrow-abi';

const FREIGHT_ESCROW_ADDRESS = process.env.NEXT_PUBLIC_FREIGHT_ESCROW_ADDRESS as `0x${string}`;

export function useFreightEscrow() {
  const { relayTx } = useRelayTx();

  const createFreight = async (id: string, pickupHash: `0x${string}`, deliveryHash: `0x${string}`, cargoValue: bigint) => {
    const data = encodeFunctionData({
      abi: freightEscrowABI,
      functionName: 'createFreight',
      args: [id, pickupHash, deliveryHash, cargoValue],
    });
    return relayTx(FREIGHT_ESCROW_ADDRESS, data);
  };

  const fund = async (id: string, amount: bigint) => {
    const data = encodeFunctionData({
      abi: freightEscrowABI,
      functionName: 'fund',
      args: [id, amount],
    });
    return relayTx(FREIGHT_ESCROW_ADDRESS, data);
  };

  const acceptJob = async (id: string, collateral: bigint) => {
    const data = encodeFunctionData({
      abi: freightEscrowABI,
      functionName: 'acceptJob',
      args: [id, collateral],
    });
    return relayTx(FREIGHT_ESCROW_ADDRESS, data);
  };

  const pickUp = async (id: string, pickupCode: string, photoHash: `0x${string}`, photoUrl: string) => {
    const data = encodeFunctionData({
      abi: freightEscrowABI,
      functionName: 'pickUp',
      args: [id, pickupCode, photoHash, photoUrl],
    });
    return relayTx(FREIGHT_ESCROW_ADDRESS, data);
  };

  return {
    createFreight,
    fund,
    acceptJob,
    pickUp,
  };
}
