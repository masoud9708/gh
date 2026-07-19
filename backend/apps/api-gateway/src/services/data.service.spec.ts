import { Test, TestingModule } from '@nestjs/testing';
import { DataService } from './data.service';

describe('DataService', () => {
  let service: DataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataService],
    }).compile();

    service = module.get<DataService>(DataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getNonce', () => {
    it('should return an empty string for an unknown wallet address', () => {
      const result = service.getNonce('0xUnknownWallet');
      expect(result).toBe('');
    });

    it('should return the correct nonce for a known wallet address', () => {
      const walletAddress = '0xTestWallet';
      const nonce = '123456';
      service.setNonce(walletAddress, nonce);

      const result = service.getNonce(walletAddress);
      expect(result).toBe(nonce);
    });

    it('should be case-insensitive when getting a nonce', () => {
      const walletAddress = '0xTestWallet';
      const nonce = '123456';
      service.setNonce(walletAddress, nonce);

      const lowercaseResult = service.getNonce(walletAddress.toLowerCase());
      const uppercaseResult = service.getNonce(walletAddress.toUpperCase());

      expect(lowercaseResult).toBe(nonce);
      expect(uppercaseResult).toBe(nonce);
    });
  });

  describe('setNonce', () => {
    it('should store the nonce in a case-insensitive manner', () => {
      const walletAddressUpperCase = '0xTESTWALLET';
      const nonce = '654321';

      service.setNonce(walletAddressUpperCase, nonce);

      const result = service.getNonce(walletAddressUpperCase.toLowerCase());
      expect(result).toBe(nonce);
    });
  });

  describe('removeNonce', () => {
    it('should correctly remove a nonce', () => {
      const walletAddress = '0xWalletToRemove';
      const nonce = '999999';

      service.setNonce(walletAddress, nonce);
      expect(service.getNonce(walletAddress)).toBe(nonce);

      service.removeNonce(walletAddress);
      expect(service.getNonce(walletAddress)).toBe('');
    });

    it('should remove the nonce in a case-insensitive manner', () => {
      const walletAddress = '0xWalletToRemove';
      const nonce = '999999';

      service.setNonce(walletAddress, nonce);
      expect(service.getNonce(walletAddress)).toBe(nonce);

      service.removeNonce(walletAddress.toUpperCase());
      expect(service.getNonce(walletAddress)).toBe('');
    });
  });
});
