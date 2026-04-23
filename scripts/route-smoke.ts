import { writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { createPublicClient, http, type Address } from 'viem'
import { CHAIN_MAP } from '../lib/chains.ts'
import { TLOS_OFT_ADDRESSES, MST_OFT_ADDRESSES, quoteMstSend, quoteOftSend } from '../lib/oft.ts'
import { getOftV2SourceAddress, OFT_V2_TOKENS, quoteOftV2Send } from '../lib/oft-v2.ts'
import { CHAIN_RPC_URLS } from '../lib/rpcs.ts'

type RouteKind = 'tlos-v1' | 'mst-v1' | 'oft-v2'
type RouteStatus = 'pass' | 'warn' | 'fail'

interface RouteDefinition {
  kind: RouteKind
  token: string
  fromChain: number
  toChain: number
  amount: string
  sourceAddress: Address
  destinationAddress: Address
}

interface RouteResult {
  route: string
  kind: RouteKind
  token: string
  fromChain: number
  toChain: number
  sourceAddress: Address
  destinationAddress: Address
  status: RouteStatus
  durationMs: number
  feeEstimated?: boolean
  nativeFeeFormatted?: string
  amountReceivedFormatted?: string
  warnings: string[]
  error?: string
}

interface CliOptions {
  token?: string
  from?: number
  to?: number
  kind?: RouteKind
  limit?: number
  concurrency: number
  verbose: boolean
  jsonPath?: string
}

const DUMMY_RECIPIENT = '0x000000000000000000000000000000000000dEaD' as Address
const clientCache = new Map<number, ReturnType<typeof createPublicClient>>()
const codeCache = new Map<string, Promise<boolean>>()

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    concurrency: 6,
    verbose: false,
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    const [flag, inlineValue] = arg.includes('=') ? arg.split(/=(.*)/s, 2) : [arg, undefined]
    const value = inlineValue ?? args[i + 1]

    switch (flag) {
      case '--token':
        options.token = value?.toUpperCase()
        if (inlineValue === undefined) i += 1
        break
      case '--from':
        options.from = Number(value)
        if (inlineValue === undefined) i += 1
        break
      case '--to':
        options.to = Number(value)
        if (inlineValue === undefined) i += 1
        break
      case '--kind':
        if (value === 'tlos-v1' || value === 'mst-v1' || value === 'oft-v2') {
          options.kind = value
        } else {
          throw new Error(`Unsupported --kind value: ${value}`)
        }
        if (inlineValue === undefined) i += 1
        break
      case '--limit':
        options.limit = Number(value)
        if (inlineValue === undefined) i += 1
        break
      case '--concurrency':
        options.concurrency = Math.max(1, Number(value))
        if (inlineValue === undefined) i += 1
        break
      case '--json':
        options.jsonPath = value
        if (inlineValue === undefined) i += 1
        break
      case '--verbose':
        options.verbose = true
        break
      case '--help':
        printUsage()
        process.exit(0)
      default:
        throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return options
}

function printUsage() {
  console.log(`Usage:
  npm run route-smoke
  npm run route-smoke -- --token TLOS --from 40 --to 8453 --verbose
  npm run route-smoke -- --kind oft-v2 --token USDC --concurrency 4 --json route-smoke.json

Options:
  --token <symbol>        Filter by token symbol (e.g. TLOS, MST, USDC)
  --from <chainId>        Filter by source chain id
  --to <chainId>          Filter by destination chain id
  --kind <kind>           One of: tlos-v1, mst-v1, oft-v2
  --limit <n>             Only run the first n matching routes
  --concurrency <n>       Parallel route checks (default: 6)
  --json <path>           Write full results as JSON
  --verbose               Print passing routes too
`)
}

function getClient(chainId: number) {
  const existing = clientCache.get(chainId)
  if (existing) return existing

  const rpcUrl = CHAIN_RPC_URLS[chainId]
  if (!rpcUrl) {
    throw new Error(`Missing RPC URL for chain ${chainId}`)
  }

  const client = createPublicClient({
    transport: http(rpcUrl, {
      retryCount: 2,
      retryDelay: 500,
      timeout: 20_000,
    }),
  })
  clientCache.set(chainId, client)
  return client
}

async function hasContractCode(chainId: number, address: Address): Promise<boolean> {
  const cacheKey = `${chainId}:${address.toLowerCase()}`
  const existing = codeCache.get(cacheKey)
  if (existing) return existing

  const promise = getClient(chainId)
    .getBytecode({ address })
    .then((bytecode) => !!bytecode && bytecode !== '0x')

  codeCache.set(cacheKey, promise)
  return promise
}

function chainName(chainId: number): string {
  return CHAIN_MAP.get(chainId)?.name ?? `Chain ${chainId}`
}

function sampleAmount(token: string): string {
  switch (token) {
    case 'USDC':
    case 'USDT':
      return '1'
    case 'WBTC':
      return '0.0001'
    case 'ETH':
      return '0.001'
    default:
      return '0.1'
  }
}

function buildRoutes(): RouteDefinition[] {
  const routes: RouteDefinition[] = []

  const tlosChains = Object.keys(TLOS_OFT_ADDRESSES).map(Number)
  for (const fromChain of tlosChains) {
    for (const toChain of tlosChains) {
      if (fromChain === toChain) continue
      routes.push({
        kind: 'tlos-v1',
        token: 'TLOS',
        fromChain,
        toChain,
        amount: sampleAmount('TLOS'),
        sourceAddress: TLOS_OFT_ADDRESSES[fromChain],
        destinationAddress: TLOS_OFT_ADDRESSES[toChain],
      })
    }
  }

  const mstChains = Object.keys(MST_OFT_ADDRESSES).map(Number)
  for (const fromChain of mstChains) {
    for (const toChain of mstChains) {
      if (fromChain === toChain) continue
      routes.push({
        kind: 'mst-v1',
        token: 'MST',
        fromChain,
        toChain,
        amount: sampleAmount('MST'),
        sourceAddress: MST_OFT_ADDRESSES[fromChain],
        destinationAddress: MST_OFT_ADDRESSES[toChain],
      })
    }
  }

  for (const [token, config] of Object.entries(OFT_V2_TOKENS)) {
    const chainIds = [40, ...Object.keys(config.peers).map(Number)]

    if (config.isStargate) {
      for (const fromChain of chainIds) {
        for (const toChain of chainIds) {
          if (fromChain === toChain) continue
          routes.push({
            kind: 'oft-v2',
            token,
            fromChain,
            toChain,
            amount: sampleAmount(token),
            sourceAddress: getOftV2SourceAddress(token, fromChain),
            destinationAddress: toChain === 40 ? config.address : config.peers[toChain],
          })
        }
      }
      continue
    }

    for (const peerChainId of Object.keys(config.peers).map(Number)) {
      routes.push({
        kind: 'oft-v2',
        token,
        fromChain: 40,
        toChain: peerChainId,
        amount: sampleAmount(token),
        sourceAddress: config.address,
        destinationAddress: config.peers[peerChainId],
      })
      routes.push({
        kind: 'oft-v2',
        token,
        fromChain: peerChainId,
        toChain: 40,
        amount: sampleAmount(token),
        sourceAddress: config.peers[peerChainId],
        destinationAddress: config.address,
      })
    }
  }

  return routes
}

function filterRoutes(routes: RouteDefinition[], options: CliOptions): RouteDefinition[] {
  let filtered = routes

  if (options.token) filtered = filtered.filter((route) => route.token === options.token)
  if (options.kind) filtered = filtered.filter((route) => route.kind === options.kind)
  if (options.from !== undefined) filtered = filtered.filter((route) => route.fromChain === options.from)
  if (options.to !== undefined) filtered = filtered.filter((route) => route.toChain === options.to)
  if (options.limit !== undefined) filtered = filtered.slice(0, options.limit)

  return filtered
}

function routeLabel(route: RouteDefinition): string {
  return `${route.token} ${chainName(route.fromChain)} -> ${chainName(route.toChain)}`
}

async function validateRoute(route: RouteDefinition): Promise<RouteResult> {
  const startedAt = performance.now()
  const warnings: string[] = []

  try {
    const [sourceExists, destinationExists] = await Promise.all([
      hasContractCode(route.fromChain, route.sourceAddress),
      hasContractCode(route.toChain, route.destinationAddress),
    ])

    if (!sourceExists) {
      throw new Error(`No contract code at source ${route.sourceAddress}`)
    }
    if (!destinationExists) {
      throw new Error(`No contract code at destination ${route.destinationAddress}`)
    }

    let nativeFeeFormatted: string | undefined
    let amountReceivedFormatted: string | undefined
    let feeEstimated = false

    if (route.kind === 'tlos-v1') {
      const quote = await quoteOftSend(
        getClient(route.fromChain),
        route.fromChain,
        route.toChain,
        route.amount,
        DUMMY_RECIPIENT,
      )
      nativeFeeFormatted = quote.nativeFeeFormatted
      feeEstimated = quote.feeEstimated
    } else if (route.kind === 'mst-v1') {
      const quote = await quoteMstSend(
        getClient(route.fromChain),
        route.fromChain,
        route.toChain,
        route.amount,
        DUMMY_RECIPIENT,
      )
      nativeFeeFormatted = quote.nativeFeeFormatted
      feeEstimated = quote.feeEstimated
    } else {
      const quote = await quoteOftV2Send(
        getClient(route.fromChain),
        route.token,
        route.fromChain,
        route.toChain,
        route.amount,
        DUMMY_RECIPIENT,
      )
      nativeFeeFormatted = quote.nativeFeeFormatted
      amountReceivedFormatted = quote.amountReceivedFormatted
      feeEstimated = quote.feeEstimated
    }

    if (feeEstimated) {
      warnings.push('Quote required fallback fee estimate')
    }

    return {
      route: routeLabel(route),
      kind: route.kind,
      token: route.token,
      fromChain: route.fromChain,
      toChain: route.toChain,
      sourceAddress: route.sourceAddress,
      destinationAddress: route.destinationAddress,
      status: warnings.length > 0 ? 'warn' : 'pass',
      durationMs: Math.round(performance.now() - startedAt),
      feeEstimated,
      nativeFeeFormatted,
      amountReceivedFormatted,
      warnings,
    }
  } catch (error) {
    return {
      route: routeLabel(route),
      kind: route.kind,
      token: route.token,
      fromChain: route.fromChain,
      toChain: route.toChain,
      sourceAddress: route.sourceAddress,
      destinationAddress: route.destinationAddress,
      status: 'fail',
      durationMs: Math.round(performance.now() - startedAt),
      warnings,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function mapWithConcurrency<T, U>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<U>,
): Promise<U[]> {
  const results = new Array<U>(items.length)
  let index = 0

  async function runWorker() {
    while (true) {
      const currentIndex = index
      index += 1
      if (currentIndex >= items.length) return
      results[currentIndex] = await worker(items[currentIndex], currentIndex)
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker())
  await Promise.all(workers)
  return results
}

function printResult(result: RouteResult, verbose: boolean) {
  if (!verbose && result.status === 'pass') return

  const detailParts = [
    `${result.route}`,
    `status=${result.status.toUpperCase()}`,
  ]

  if (result.nativeFeeFormatted) detailParts.push(`fee=${result.nativeFeeFormatted}`)
  if (result.amountReceivedFormatted) detailParts.push(`received=${result.amountReceivedFormatted}`)
  if (result.error) detailParts.push(`error=${result.error}`)
  if (result.warnings.length > 0) detailParts.push(`warnings=${result.warnings.join('; ')}`)

  console.log(detailParts.join(' | '))
}

function summarize(results: RouteResult[]) {
  const summary = {
    pass: results.filter((result) => result.status === 'pass').length,
    warn: results.filter((result) => result.status === 'warn').length,
    fail: results.filter((result) => result.status === 'fail').length,
  }

  console.log('')
  console.log(`Summary: ${results.length} routes checked`)
  console.log(`  pass: ${summary.pass}`)
  console.log(`  warn: ${summary.warn}`)
  console.log(`  fail: ${summary.fail}`)

  const failureGroups = new Map<string, number>()
  for (const result of results) {
    if (!result.error) continue
    failureGroups.set(result.error, (failureGroups.get(result.error) ?? 0) + 1)
  }

  if (failureGroups.size > 0) {
    console.log('')
    console.log('Failure reasons:')
    for (const [reason, count] of [...failureGroups.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${count}x ${reason}`)
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const routes = filterRoutes(buildRoutes(), options)

  if (routes.length === 0) {
    throw new Error('No routes matched the provided filters.')
  }

  console.log(`Checking ${routes.length} route(s) with concurrency=${options.concurrency}...`)
  console.log('This is a read-only smoke test: it validates contract code and live quote paths, not destination settlement.')

  const startedAt = performance.now()
  const results = await mapWithConcurrency(routes, options.concurrency, async (route, index) => {
    const result = await validateRoute(route)
    printResult(result, options.verbose)

    if ((index + 1) % 25 === 0 || index === routes.length - 1) {
      console.log(`Progress: ${index + 1}/${routes.length}`)
    }

    return result
  })

  const totalDurationMs = Math.round(performance.now() - startedAt)
  summarize(results)
  console.log(`Completed in ${(totalDurationMs / 1000).toFixed(1)}s`)

  if (options.jsonPath) {
    writeFileSync(options.jsonPath, JSON.stringify(results, null, 2))
    console.log(`Wrote JSON results to ${options.jsonPath}`)
  }

  const failed = results.some((result) => result.status === 'fail')
  process.exit(failed ? 1 : 0)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
