export const getXpubWithDescriptor = (
  xpub: string,
  path: string,
  fingerprint: string
) => {
  return `wpkh([${path.replace('m', fingerprint)}]${xpub})`;
};
