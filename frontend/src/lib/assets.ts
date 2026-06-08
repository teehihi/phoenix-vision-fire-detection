const assetBaseUrl = import.meta.env.BASE_URL;

export function publicAsset(path: string) {
  return `${assetBaseUrl}${path.replace(/^\/+/, '')}`;
}
