import { CostTable } from "@/components/CostTable";

export default function Home() {
  return (
    <main className="min-h-screen p-6 lg:p-10">
      <h1 className="text-2xl font-semibold mb-6">L2 用户成本（USD）速查表</h1>
      <CostTable />
    </main>
  );
}
