declare module '@mstblockchain/mst-sdk' {
  export class Provider {
    constructor(rpcUrl: string);
    getBlockNumber(): Promise<number>;
    getBalance(address: string): Promise<any>;
    getTransactionReceipt(hash: string): Promise<any>;
    waitForTransaction(hash: string): Promise<any>;
    estimateGas(transaction: any): Promise<number>;
  }

  export class Signer {
    constructor(privateKey: string, provider: Provider);
    static createRandom(provider: Provider): Signer;
    getPrivateKey(): string;
    sendTransaction(tx: any): Promise<string>;
    sendToken(tokenAddress: string, to: string, amount: any): Promise<string>;
    deploy(abi: any, bytecode: string, args?: any[]): Promise<string>;
    sendNative(to: string, amount: any): Promise<string>;
    getAddress(): Promise<string>;
    estimateGas(method: string, args: any[]): Promise<number>;
  }

  export class Client {
    constructor(rpcUrl: string, privateKey?: string | null);
    static createRandom(rpcUrl: string): Client;
    provider: Provider;
    signer?: Signer;
  }

  export const Constants: {
    CHAINS: {
      MAINNET: number;
      TESTNET: number;
    };
    DEFAULT_RPC_URL: string;
    GAS_LIMIT: number;
  };

  export const Errors: any;
}
