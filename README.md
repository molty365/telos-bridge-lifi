# Telos Bridge

Static Next.js bridge UI for Telos cross-chain transfers powered by LayerZero OFT and Stargate routes.

## Requirements

- Node.js 20+
- npm 10+
- A WalletConnect project ID exposed as `NEXT_PUBLIC_WC_PROJECT_ID`

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_WC_PROJECT_ID` in `.env.local`.
3. Run `npm install`.
4. Run `npm run dev`.

## Checks

- `npm run typecheck`
- `npm run build`
- `npm run check`
- `npm run route-smoke`

## Route smoke tests

`npm run route-smoke` performs a no-spend validation pass across the configured route matrix.

What it checks:
- source and destination contract bytecode exists
- live quote calls succeed for each route
- routes that only work via fallback fee estimates are flagged as warnings

What it does not prove:
- wallet approval/send execution
- LayerZero or Stargate message delivery on the destination chain
- relayer settlement after a real source-chain transaction
