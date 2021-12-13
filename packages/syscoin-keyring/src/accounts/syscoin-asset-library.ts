import { AssetLibrary, AssetMap } from './asset-library';

const DEFAULTS: AssetMap = {}

class SyscoinAssetLibrary extends AssetLibrary {
  protected defaultAssetsMap = DEFAULTS;
  protected defaultAssets = [];
}

export const syscoinAssetLibrary = new SyscoinAssetLibrary();
