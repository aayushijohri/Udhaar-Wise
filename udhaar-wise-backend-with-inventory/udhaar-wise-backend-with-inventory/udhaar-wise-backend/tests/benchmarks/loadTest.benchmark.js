import app from "../../src/index.js";
import http from "http";

function runSingleRequest(serverPort, path, method = "GET", body = null) {
  return new Promise((resolve) => {
    const start = performance.now();
    const dataString = body ? JSON.stringify(body) : null;

    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: serverPort,
        path: path,
        method: method,
        headers: {
          "Content-Type": "application/json",
          ...(dataString ? { "Content-Length": Buffer.byteLength(dataString) } : {}),
        },
      },
      (res) => {
        let respData = "";
        res.on("data", (chunk) => (respData += chunk));
        res.on("end", () => {
          const latency = performance.now() - start;
          resolve({ status: res.statusCode, latency });
        });
      }
    );

    req.on("error", () => resolve({ status: 500, latency: performance.now() - start }));
    if (dataString) req.write(dataString);
    req.end();
  });
}

export async function runLoadTestBenchmark() {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", async () => {
      const port = server.address().port;

      const endpoints = [
        { name: "Health Check (GET /)", path: "/", method: "GET" },
        { name: "Diagnostics (GET /api/diagnostics)", path: "/api/diagnostics", method: "GET" },
        { name: "Public Auth Diagnostics (GET /)", path: "/", method: "GET" },
      ];

      // 1. Endpoint Latency Profiling (250 samples per endpoint)
      const latencyResults = {};

      for (const ep of endpoints) {
        const latencies = [];
        let errors = 0;
        // Warm up 10 requests
        for (let i = 0; i < 10; i++) await runSingleRequest(port, ep.path, ep.method, ep.body);

        const samples = 250;
        for (let i = 0; i < samples; i++) {
          const res = await runSingleRequest(port, ep.path, ep.method, ep.body);
          if (res.status >= 400) errors++;
          latencies.push(res.latency);
        }

        latencies.sort((a, b) => a - b);
        const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        const median = latencies[Math.floor(latencies.length * 0.5)];
        const p95 = latencies[Math.floor(latencies.length * 0.95)];
        const p99 = latencies[Math.floor(latencies.length * 0.99)];

        latencyResults[ep.name] = {
          samples,
          avgMs: Number(avg.toFixed(2)),
          medianMs: Number(median.toFixed(2)),
          p95Ms: Number(p95.toFixed(2)),
          p99Ms: Number(p99.toFixed(2)),
          errorRatePct: Number(((errors / samples) * 100).toFixed(2)),
        };
      }

      // 2. Synthetic Concurrent Load Test (5,000 requests total across concurrency 1, 10, 50, 100)
      const initialMem = process.memoryUsage().heapUsed / 1024 / 1024;
      const concurrencyLevels = [1, 10, 50, 100];
      const concurrencyResults = {};

      let grandTotalSuccessful = 0;
      let grandTotalErrors = 0;

      for (const concurrency of concurrencyLevels) {
        const targetReqs = 1250; // 1250 * 4 = 5000 requests
        const requestsPerWorker = Math.floor(targetReqs / concurrency);
        const startTime = performance.now();
        let successful = 0;
        let failed = 0;

        const worker = async () => {
          for (let i = 0; i < requestsPerWorker; i++) {
            const ep = endpoints[i % endpoints.length];
            const res = await runSingleRequest(port, ep.path, ep.method);
            if (res.status < 400) successful++;
            else failed++;
          }
        };

        const workers = Array.from({ length: concurrency }, () => worker());
        await Promise.all(workers);

        const durationSec = (performance.now() - startTime) / 1000;
        const rps = (successful + failed) / durationSec;

        grandTotalSuccessful += successful;
        grandTotalErrors += failed;

        concurrencyResults[`Concurrency_${concurrency}`] = {
          concurrency,
          requestsCompleted: successful + failed,
          durationSec: Number(durationSec.toFixed(2)),
          throughputRps: Number(rps.toFixed(2)),
          errorRatePct: Number(((failed / (successful + failed)) * 100).toFixed(2)),
        };
      }

      const finalMem = process.memoryUsage().heapUsed / 1024 / 1024;

      server.close();

      resolve({
        latencyProfiling: latencyResults,
        loadTesting: {
          totalRequestsTested: grandTotalSuccessful + grandTotalErrors,
          totalErrors: grandTotalErrors,
          overallErrorRatePct: Number(((grandTotalErrors / (grandTotalSuccessful + grandTotalErrors)) * 100).toFixed(2)),
          peakThroughputRps: Math.max(...Object.values(concurrencyResults).map((c) => c.throughputRps)),
          concurrencyScaling: concurrencyResults,
          heapMemoryOverheadMB: Number((finalMem - initialMem).toFixed(2)),
        },
      });
    });
  });
}

if (process.argv[1] && process.argv[1].endsWith("loadTest.benchmark.js")) {
  runLoadTestBenchmark().then((res) => console.log(JSON.stringify(res, null, 2)));
}
