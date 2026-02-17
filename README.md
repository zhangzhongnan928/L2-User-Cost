L2 用户成本（USD）速查表 – MVP

目标：给出常见 L2（Base、Optimism、Arbitrum One、zkSync Era、Linea、Polygon zkEVM、Plasma、Stable、Redbelly）及 Solana 上四类操作的实时美元成本（仅执行费）。

技术栈：Next.js App Router、React、Tailwind、SWR、ethers v6。服务端缓存 10s。

功能
- 表格：每行一条链。列：Currency、Price/USD、四类操作 USD 值、Custom TX。
- 支持 EVM 链（ETH、RBNT、gUSDT 等原生代币）和 Solana（基于 lamports + priority fee 模型）。
- 控件：刷新按钮、自动刷新（默认 10s）、高级设置（覆写 ERC20 transfer gasUsed、刷新间隔）。
- 容错：单链 RPC 失败仅影响该行；价格失败使用缓存并提示 Using cached price。
- Testnet/Devnet 链显示黄色标签，Price/USD 显示 N/A。

环境变量

在根目录创建 `.env.local`：

```
RPC_ETH=
RPC_BASE=
RPC_BASE_SEPOLIA=
RPC_OP=
RPC_ARB=
RPC_ZKSYNC=
RPC_LINEA=
RPC_PZKEVM=
RPC_PLASMA=https://rpc.plasma.to
RPC_STABLE=https://rpc.stable.xyz
RPC_TEMPO=https://rpc.moderato.tempo.xyz
RPC_SEISMIC=https://node-2.seismicdev.net/rpc
RPC_REDBELLY=https://governors.mainnet.redbelly.network
RPC_SOLANA=https://api.mainnet-beta.solana.com
```

价格自动从 CoinGecko 获取（ethereum、solana、redbelly-network），无需额外配置。

开发与运行

```
npm i
npm run dev
# 打开 http://localhost:3000
```

API

- GET `/api/fees`

```
{
  "prices": {"ethereum": 2700.50, "solana": 150.20, "redbelly-network": 0.05},
  "updatedAt": 1736456400000,
  "usingCachedPrice": false,
  "chains": [
    {"name":"Base","chainId":8453,"gasPriceWei":"1500000","ok":true,"errors":[],"chainType":"evm","coingeckoId":"ethereum","nativeCurrency":"ETH"},
    {"name":"Solana","chainId":900901,"gasPriceWei":"0","ok":true,"errors":[],"chainType":"solana","coingeckoId":"solana","nativeCurrency":"SOL","solanaFees":{"baseFeePerSigLamports":5000,"medianPriorityMicroLamportsPerCu":1000,"estimatedCu":{"transfer":300,"tokenTransfer":5000,"tokenMint":5000,"tokenBurn":5000}}}
  ]
}
```

计算
- EVM：`feeNative = gasUsed × gasPrice`；`feeUSD = feeNative × nativeUsd`。
- Solana：`feeLamports = baseFee + CU × priorityPerCU / 1e6`；`feeUSD = feeLamports / 1e9 × solUsd`。
- 假设 gasUsed：Transfer 21,000；Token Transfer 50,000（可覆写）；Mint/Burn 36,500。

测试

```
npm run test
```

部署
- 推荐 Vercel。将上述环境变量配置在项目环境里。

限制与后续
- 未包含 L1 数据费（后续按链实现）。
- CoinGecko 免费 API 有速率限制；可加入多源与回退。
