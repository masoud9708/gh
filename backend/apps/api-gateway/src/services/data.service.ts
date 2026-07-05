import { Injectable } from '@nestjs/common';

export interface User {
  walletAddress: string;
  role: string | null;
  roles: string[];
  reputationScore: number;
  reputationLevel: string;
  driverLevel: number;
}

@Injectable()
export class DataService {
  private users = new Map<string, User>();
  private nonces = new Map<string, string>();

  getNonce(walletAddress: string): string {
    return this.nonces.get(walletAddress.toLowerCase()) || '';
  }

  setNonce(walletAddress: string, nonce: string) {
    this.nonces.set(walletAddress.toLowerCase(), nonce);
  }

  removeNonce(walletAddress: string) {
    this.nonces.delete(walletAddress.toLowerCase());
  }

  getUser(walletAddress: string): User | undefined {
    return this.users.get(walletAddress.toLowerCase());
  }

  createUser(walletAddress: string, role: string): User {
    const normalizedWallet = walletAddress.toLowerCase();
    const newUser: User = {
      walletAddress: normalizedWallet,
      role: role,
      roles: [role],
      reputationScore: 50,
      reputationLevel: 'TRUSTED',
      driverLevel: 1,
    };
    this.users.set(normalizedWallet, newUser);
    return newUser;
  }
}
