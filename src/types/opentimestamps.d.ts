declare module 'opentimestamps' {
  export class DetachedTimestampFile {
    static fromHash(hash: Uint8Array | Buffer): DetachedTimestampFile;
    static deserialize(bytes: Uint8Array): DetachedTimestampFile;
    stamp(): Promise<void>;
    verify(): Promise<number | null>;
    upgrade(): Promise<boolean>;
    serializeToBytes(): Uint8Array;
  }
  export class Ops {
    static OpSHA256: any;
  }
  export function stamp(file: DetachedTimestampFile): Promise<void>;
  export function verify(file: DetachedTimestampFile): Promise<Record<string, number>>;
}
