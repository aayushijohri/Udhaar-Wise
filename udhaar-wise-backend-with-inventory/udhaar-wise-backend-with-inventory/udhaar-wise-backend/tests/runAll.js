import { runLoadTestBenchmark } from "./benchmarks/loadTest.benchmark.js";
import { runDbPerformanceBenchmark } from "./benchmarks/dbPerformance.benchmark.js";
import { runAiPipelineBenchmark } from "./benchmarks/aiPipeline.benchmark.js";

async function runFullAuditSuite() {
  console.log("==========================================================================");
  console.log(" UDHAAR WISE BACKEND REPRODUCIBLE ENGINEERING BENCHMARK AUDIT");
  console.log("==========================================================================\n");

  console.log("[1/3] Running Synthetic HTTP Load Test & Latency Benchmark...");
  const loadRes = await runLoadTestBenchmark();

  console.log("\n[2/3] Running PostgreSQL Query Latency & Indexing EXPLAIN Benchmark...");
  const dbRes = await runDbPerformanceBenchmark();

  console.log("\n[3/3] Running AI Pipeline Resiliency & Parallelization Benchmark...");
  const aiRes = await runAiPipelineBenchmark();

  const auditReport = {
    timestamp: new Date().toISOString(),
    apiPerformanceAndLoad: loadRes,
    databasePerformance: dbRes,
    aiPipelineAndFailover: aiRes,
  };

  console.log("\n==========================================================================");
  console.log(" AUDIT COMPLETE - FULL REPRODUCIBLE METRICS SUMMARY");
  console.log("==========================================================================\n");
  console.log(JSON.stringify(auditReport, null, 2));

  return auditReport;
}

runFullAuditSuite().catch((err) => console.error("Audit Suite Failed:", err));
