L2 用户成本（USD）速查表 – MVP

目标：给出常见 L2（Base、Optimism、Arbitrum One、zkSync Era、Linea、Scroll、Polygon zkEVM、Blast）上四类操作的实时美元成本（仅 L2 执行费）。

技术栈：Next.js App Router、React、Tailwind、SWR、ethers v6。服务端缓存 10s。

功能
- 表格：每行一条链。列：Gas Price（gwei）、ETH/USD、四类操作 USD 值。
- 控件：刷新按钮、自动刷新（默认 10s）、高级设置（覆写 ERC20 transfer gasUsed、刷新间隔）。
- 容错：单链 RPC 失败仅影响该行；价格失败使用缓存并提示 Using cached price。

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
# CoinGecko simple price 例：
# https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd
PRICE_API_URL=
```

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
  "ethUsd": 4300.12,
  "updatedAt": 1736456400000,
  "usingCachedPrice": false,
  "chains": [
    {"name":"Base","chainId":8453,"gasPriceWei":"1500000","ok":true,"errors":[]}
  ]
}
```

计算
- 假设 gasUsed：ETH 21,000；ERC20 Transfer 50,000（可覆写）；Mint/Burn 36,500。
- `feeETH = gasUsed × gasPrice`；`feeUSD = feeETH × ethUsd`。

测试

```
npm run test
```

部署
- 推荐 Vercel。将上述环境变量配置在项目环境里。

限制与后续
- 未包含 L1 数据费（后续按链实现）。
- 单一价格源；可加入多源与回退。
