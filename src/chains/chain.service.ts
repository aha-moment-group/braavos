export abstract class ChainService {
  public abstract getAddr(clientId: number, path: string): Promise<string>;
  public abstract isValidAddress(addr: string): boolean;
  protected abstract getPrivateKey(clientId: number, path: string): string;
}
