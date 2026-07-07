export class AssetClass {
  constructor(
    public readonly assetClassId: string,
    public readonly code: string,
    public readonly name: string,
    public readonly defaultUsefulLifeMonths: number,
    public readonly defaultDepreciationMethod: 'STRAIGHT_LINE'
  ) {}
}
