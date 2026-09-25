import express from 'express';
import { proxyService } from '../services/proxyService.js';
import { trafficService } from '../services/trafficService.js';
import { capacityService } from '../services/capacityService.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Create proxy
router.post('/create', async (req, res) => {
  try {
    let { backendUrl, networkConfig, schemaMutations } = req.body;

    // Validate and auto-normalize URL
    if (!backendUrl) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'backendUrl is required',
      });
    }

    backendUrl = capacityService.normalizeUrl(backendUrl);

    if (!proxyService.validateUrl(backendUrl)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid backend URL format',
      });
    }

    const proxy = await proxyService.createProxy({
      backendUrl,
      ...networkConfig,
      schemaMutations,
    });

    const proxyUrl = await proxyService.generateProxyUrl(proxy.id);

    res.status(201).json({
      success: true,
      proxy: {
        id: proxy.id,
        backendUrl: proxy.backendUrl,
        proxyUrl,
        networkConfig: proxy.networkConfig,
        createdAt: proxy.createdAt,
      },
    });
  } catch (error) {
    console.error('Create proxy error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message,
    });
  }
});

// Real URL Concurrent Capacity Probe Endpoint
router.post('/probe-capacity', async (req, res) => {
  try {
    let { targetUrl } = req.body;
    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        message: 'targetUrl is required'
      });
    }

    targetUrl = capacityService.normalizeUrl(targetUrl);
    const result = await capacityService.probeUrl(targetUrl);
    res.json(result);
  } catch (error) {
    console.error('Capacity probe error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Real Server-Side Stress Test Runner (no browser CORS blocks)
router.post('/stress-test', async (req, res) => {
  try {
    let { targetUrl, totalRequests = 50, concurrency = 10, duration = 15 } = req.body;
    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        message: 'targetUrl is required'
      });
    }

    targetUrl = capacityService.normalizeUrl(targetUrl);
    const result = await capacityService.executeStressTest(targetUrl, {
      totalRequests,
      concurrency,
      duration
    });
    res.json(result);
  } catch (error) {
    console.error('Stress test execution error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Test connection to backend URL
router.post('/check-network', async (req, res) => {
  try {
    let { backendUrl } = req.body;
    if (!backendUrl) {
      return res.status(400).json({
        success: false,
        message: 'backendUrl is required',
      });
    }

    backendUrl = capacityService.normalizeUrl(backendUrl);

    if (!proxyService.validateUrl(backendUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid backend URL format',
      });
    }

    const result = await proxyService.checkNetwork(backendUrl);
    res.json({
      success: true,
      backendUrl,
      ...result
    });
  } catch (error) {
    console.error('Check network error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get proxy config
router.get('/:proxyId', async (req, res) => {
  try {
    const { proxyId } = req.params;
    const proxy = await proxyService.getProxyConfig(proxyId);

    if (!proxy) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Proxy not found',
      });
    }

    const proxyUrl = await proxyService.generateProxyUrl(proxyId);

    res.json({
      success: true,
      proxy: {
        id: proxy.id,
        backendUrl: proxy.backendUrl,
        proxyUrl,
        isActive: proxy.isActive,
        networkConfig: proxy.networkConfig,
        stats: proxy.stats,
        createdAt: proxy.createdAt,
      },
    });
  } catch (error) {
    console.error('Get proxy error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message,
    });
  }
});

// Update proxy
router.put('/:proxyId', async (req, res) => {
  try {
    const { proxyId } = req.params;
    const updates = req.body;

    const proxy = await proxyService.updateProxy(proxyId, updates);

    if (!proxy) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Proxy not found',
      });
    }

    res.json({
      success: true,
      proxy,
    });
  } catch (error) {
    console.error('Update proxy error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message,
    });
  }
});

// Delete proxy
router.delete('/:proxyId', async (req, res) => {
  try {
    const { proxyId } = req.params;
    const deleted = await proxyService.deleteProxy(proxyId);

    if (!deleted) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Proxy not found',
      });
    }

    res.json({
      success: true,
      message: 'Proxy deleted successfully',
    });
  } catch (error) {
    console.error('Delete proxy error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message,
    });
  }
});

// Get proxy traffic
router.get('/:proxyId/traffic', async (req, res) => {
  try {
    const { proxyId } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    const traffic = await trafficService.getTraffic(proxyId, parseInt(limit), parseInt(offset));
    const stats = await trafficService.getTrafficStats(proxyId);

    res.json({
      success: true,
      traffic,
      stats,
      limit: parseInt(limit),
      offset: parseInt(offset),
      total: traffic.length,
    });
  } catch (error) {
    console.error('Get traffic error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message,
    });
  }
});

// Clear proxy traffic
router.delete('/:proxyId/traffic', async (req, res) => {
  try {
    const { proxyId } = req.params;
    await trafficService.clearTraffic(proxyId);

    res.json({
      success: true,
      message: 'Traffic cleared successfully',
    });
  } catch (error) {
    console.error('Clear traffic error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message,
    });
  }
});

export default router;
