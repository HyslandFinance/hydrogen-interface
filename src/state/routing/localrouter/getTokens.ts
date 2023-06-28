export function getTokensByAddress(tokenMetadataList:any[]) {
  const tokensByAddress = {} as any
  tokenMetadataList.forEach(token => tokensByAddress[token.address] = token)
  return tokensByAddress
}

export function getTokensBySymbol(tokenMetadataList:any[]) {
  const tokensBySymbol = {} as any
  tokenMetadataList.forEach(token => tokensBySymbol[token.symbol] = token)
  return tokensBySymbol
}
