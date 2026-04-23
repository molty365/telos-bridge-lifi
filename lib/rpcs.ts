import { arbitrum, aurora, avalanche, base, bsc, gnosis, kava, linea, mainnet, mantle, metis, optimism, polygon, scroll, sei, telos } from 'wagmi/chains'

export const CHAIN_RPC_URLS: Record<number, string> = {
  [telos.id]: 'https://rpc.telos.net/evm',
  [mainnet.id]: 'https://ethereum-rpc.publicnode.com',
  [base.id]: 'https://base-rpc.publicnode.com',
  [bsc.id]: 'https://bsc-rpc.publicnode.com',
  [arbitrum.id]: 'https://arbitrum-one-rpc.publicnode.com',
  [polygon.id]: 'https://polygon-bor-rpc.publicnode.com',
  [avalanche.id]: avalanche.rpcUrls.default.http[0],
  [optimism.id]: 'https://optimism-rpc.publicnode.com',
  [scroll.id]: scroll.rpcUrls.default.http[0],
  [mantle.id]: mantle.rpcUrls.default.http[0],
  [linea.id]: linea.rpcUrls.default.http[0],
  [sei.id]: sei.rpcUrls.default.http[0],
  [kava.id]: kava.rpcUrls.default.http[0],
  8217: 'https://public-en.node.kaia.io',
  [metis.id]: 'https://andromeda.metis.io/?owner=1088',
  [aurora.id]: aurora.rpcUrls.default.http[0],
  [gnosis.id]: gnosis.rpcUrls.default.http[0],
  1116: 'https://rpc.coredao.org',
  167000: 'https://rpc.mainnet.taiko.xyz',
  169: 'https://pacific-rpc.manta.network/http',
  30: 'https://public-node.rsk.co',
  8822: 'https://json-rpc.evm.iotaledger.net',
  14: 'https://flare-api.flare.network/ext/bc/C/rpc',
  80084: 'https://rpc.berachain.com',
  666666666: 'https://rpc.degen.tips',
  1514: 'https://mainnet.storyrpc.io',
  1890: 'https://replicator.phoenix.lightlink.io/rpc/v1',
  33139: 'https://apechain.calderachain.xyz/http',
  146: 'https://rpc.soniclabs.com',
  1625: 'https://rpc.gravity.xyz',
  747: 'https://mainnet.evm.nodes.onflow.org',
  50: 'https://rpc.xdc.org',
  1480: 'https://rpc.vana.org',
}

export function getChainRpcUrl(chainId: number): string | undefined {
  return CHAIN_RPC_URLS[chainId]
}
