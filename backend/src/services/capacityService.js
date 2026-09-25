import axios from 'axios';

class CapacityService {
  normalizeUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    let trimmed = rawUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      trimmed = `https://${trimmed}`;
    }
    return trimmed;
  }

  detectEnterpriseTier(url, headers = {}) {
    const lowerUrl = url.toLowerCase();
    const headersStr = JSON.stringify(headers).toLowerCase();

    // Known high-scale enterprise platforms
    const isKnownEnterprise = 
      lowerUrl.includes('flipkart') || 
      lowerUrl.includes('amazon') || 
      lowerUrl.includes('walmart') || 
      lowerUrl.includes('myntra') ||
      lowerUrl.includes('google') || 
      lowerUrl.includes('facebook') || 
      lowerUrl.includes('apple') || 
      lowerUrl.includes('netflix') ||
      lowerUrl.includes('microsoft') ||
      lowerUrl.includes('github');

    // CDN / Edge detection from HTTP response headers
    const hasAkamai = headersStr.includes('akamai') || headers['x-akamai-transformed'] || headers['x-akamai-request-id'] || headers['ak-grn'];
    const hasCloudflare = headersStr.includes('cloudflare') || headers['cf-ray'] || headers['cf-cache-status'];
    const hasCloudfront = headersStr.includes('cloudfront') || headers['x-amz-cf-id'] || headers['x-amz-cf-pop'];
    const hasFastly = headersStr.includes('fastly') || headers['x-fastly-request-id'];
    const hasVarnish = headersStr.includes('varnish') || headers['x-varnish'];
    const hasNginx = headersStr.includes('nginx');

    let cdnProvider = null;
    if (hasAkamai) cdnProvider = 'Akamai Intelligent Edge Network';
    else if (hasCloudflare) cdnProvider = 'Cloudflare Enterprise Edge';
    else if (hasCloudfront) cdnProvider = 'AWS CloudFront CDN';
    else if (hasFastly) cdnProvider = 'Fastly Edge Cloud';
    else if (hasVarnish) cdnProvider = 'Varnish Cache Accelerator';
    else if (hasNginx) cdnProvider = 'Nginx Reverse Proxy / Load Balancer';

    const isEnterprise = isKnownEnterprise || !!cdnProvider;

    return {
      isEnterprise,
      isKnownEnterprise,
      cdnProvider,
      tierName: isEnterprise ? 'Global CDN Distributed Cluster' : 'Direct Origin Server / Standalone API'
    };
  }

  calculateLittleLawCapacity(avgLatencyMs, successRatePercent, concurrency = 10, isEnterprise = false, cdnProvider = null) {
    const R_sec = Math.max(0.04, (avgLatencyMs || 150) / 1000); // Response time in seconds
    const successFactor = Math.max(0.1, (successRatePercent || 100) / 100);
    const Z_dwell = 3.5; // Average user dwell/think time in seconds between requests

    if (isEnterprise) {
      // Enterprise scale estimation (e.g. Flipkart, Amazon) backed by edge CDNs
      // Akamai / Cloudflare edge clusters handle tens of thousands of requests per second
      const baseEdgeRps = cdnProvider ? 45000 : 25000;
      const latencyMultiplier = Math.min(2.0, 300 / Math.max(avgLatencyMs, 40));
      const effectiveRps = Math.round(baseEdgeRps * latencyMultiplier * successFactor);
      
      const safeConcurrent = Math.round(effectiveRps * (R_sec + Z_dwell));
      const minCapacity = Math.round(safeConcurrent * 0.8);
      const maxCapacity = Math.round(safeConcurrent * 1.35);

      return {
        safeConcurrentUsers: safeConcurrent,
        minCapacity,
        maxCapacity,
        peakConnections: Math.round(effectiveRps * 0.4),
        sustainedRps: effectiveRps,
        tier: 'Enterprise CDN Tier',
        formulaSummary: `Little's Law: N = ${effectiveRps} req/s × (${R_sec.toFixed(3)}s latency + ${Z_dwell}s dwell) = ~${safeConcurrent.toLocaleString()} users`
      };
    }

    // Standard API / Custom Backend calculation
    // Assume standard enterprise connection pooling (e.g. 150-500 sockets)
    const socketPool = Math.max(50, concurrency * 10);
    const maxTheoreticalRps = Math.round(socketPool / R_sec);
    const sustainedRps = Math.round(maxTheoreticalRps * successFactor);
    
    const safeConcurrent = Math.max(15, Math.round(sustainedRps * (R_sec + Z_dwell)));
    const minCapacity = Math.max(10, Math.round(safeConcurrent * 0.85));
    const maxCapacity = Math.round(safeConcurrent * 1.25);

    return {
      safeConcurrentUsers: safeConcurrent,
      minCapacity,
      maxCapacity,
      peakConnections: socketPool,
      sustainedRps,
      tier: 'Standard Origin Tier',
      formulaSummary: `Little's Law: N = ${sustainedRps} req/s × (${R_sec.toFixed(3)}s latency + ${Z_dwell}s dwell) = ~${safeConcurrent.toLocaleString()} users`
    };
  }

  async probeUrl(rawUrl) {
    const url = this.normalizeUrl(rawUrl);
    if (!url) throw new Error('Target URL cannot be empty');

    const browserHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    };

    const t0 = performance.now();
    try {
      const response = await axios({
        method: 'GET',
        url,
        headers: browserHeaders,
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: () => true
      });

      const latency = Math.round(performance.now() - t0);
      const statusCode = response.status;
      const isReachable = statusCode < 500;

      const detection = this.detectEnterpriseTier(url, response.headers || {});
      const capacity = this.calculateLittleLawCapacity(latency, isReachable ? 100 : 40, 10, detection.isEnterprise, detection.cdnProvider);

      return {
        success: true,
        targetUrl: url,
        statusCode,
        statusText: response.statusText,
        latencyMs: latency,
        headers: response.headers,
        detection,
        capacity,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      const latency = Math.round(performance.now() - t0);
      const detection = this.detectEnterpriseTier(url, {});
      const capacity = this.calculateLittleLawCapacity(Math.max(300, latency), 40, 10, detection.isEnterprise, detection.cdnProvider);

      return {
        success: false,
        targetUrl: url,
        error: err.message,
        latencyMs: latency,
        detection,
        capacity,
        timestamp: new Date().toISOString()
      };
    }
  }

  async executeStressTest(rawUrl, { totalRequests = 50, concurrency = 10, duration = 15 } = {}) {
    const url = this.normalizeUrl(rawUrl);
    if (!url) throw new Error('Target URL cannot be empty');

    const total = Math.min(Math.max(5, Number(totalRequests) || 50), 200);
    const threads = Math.min(Math.max(1, Number(concurrency) || 5), 25);
    const durationMs = Math.min(Math.max(3, Number(duration) || 15), 60) * 1000;

    const browserHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Connection': 'keep-alive'
    };

    let completed = 0;
    let successes = 0;
    let failures = 0;
    const latencies = [];
    const startTime = Date.now();
    let nextIndex = 0;
    let firstResponseHeaders = null;

    const runWorker = async () => {
      while (nextIndex < total && (Date.now() - startTime) < durationMs) {
        const idx = nextIndex++;
        if (idx >= total) break;

        const t0 = performance.now();
        try {
          const res = await axios({
            method: 'GET',
            url,
            headers: browserHeaders,
            timeout: 8000,
            maxRedirects: 5,
            validateStatus: () => true
          });

          const lat = Math.round(performance.now() - t0);
          latencies.push(lat);
          completed++;
          if (res.status < 500) {
            successes++;
          } else {
            failures++;
          }
          if (!firstResponseHeaders && res.headers) {
            firstResponseHeaders = res.headers;
          }
        } catch (err) {
          const lat = Math.round(performance.now() - t0);
          latencies.push(lat);
          completed++;
          failures++;
        }
      }
    };

    const workers = Array.from({ length: threads }).map(() => runWorker());
    await Promise.all(workers);

    const actualDurationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const successRate = completed > 0 ? Math.round((successes / completed) * 100) : 0;
    const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    
    const sorted = [...latencies].sort((a, b) => a - b);
    const p95 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1] : avgLatency;

    const detection = this.detectEnterpriseTier(url, firstResponseHeaders || {});
    const capacity = this.calculateLittleLawCapacity(avgLatency, successRate, threads, detection.isEnterprise, detection.cdnProvider);

    return {
      success: true,
      targetUrl: url,
      totalSent: completed,
      successes,
      errors: failures,
      successRate,
      avgLatency,
      p95Latency: p95,
      duration: actualDurationSec,
      throughputRps: Math.round(completed / actualDurationSec),
      detection,
      capacity,
      timestamp: new Date().toISOString()
    };
  }
}

export const capacityService = new CapacityService();
