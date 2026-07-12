export interface ResolvedAsset {
  url: string;
  width: number;
  height: number;
}

export type ResolveAsset = (assetId: string) => ResolvedAsset | undefined;
