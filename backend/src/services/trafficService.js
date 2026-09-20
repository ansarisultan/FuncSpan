import { storageService } from './storageService.js';

class TrafficService {
  constructor() {
    this.traffic = [];
    this.trafficByProxy = new Map();
    this.maxLogs = 1000;
    this.loadTraffic();
  }

  async loadTraffic() {
    try {
      const data = await storageService.read('traffic');
      if (data && data.traffic) {
        this.traffic = data.traffic;
        // Group by proxy
        this.traffic.forEach(log => {
          if (!this.trafficByProxy.has(log.proxyId)) {
            this.trafficByProxy.set(log.proxyId, []);
          }
          this.trafficByProxy.get(log.proxyId).push(log);
        });
      }
    } catch (error) {
      console.error('Error loading traffic:', error);
    }
  }

  async saveTraffic() {
    try {
      const data = {
        traffic: this.traffic.slice(-this.maxLogs),
        updatedAt: new Date().toISOString(),
      };
      await storageService.write('traffic', data);
    } catch (error) {
      console.error('Error saving traffic:', error);
    }
  }

  async logTraffic(log) {
    const entry = {
      ...log,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: log.timestamp || new Date().toISOString(),
    };

    this.traffic.push(entry);
    
    if (!this.trafficByProxy.has(log.proxyId)) {
      this.trafficByProxy.set(log.proxyId, []);
    }
    this.trafficByProxy.get(log.proxyId).push(entry);

    // Keep only last maxLogs entries
    if (this.traffic.length > this.maxLogs) {
      this.traffic = this.traffic.slice(-this.maxLogs);
    }

    await this.saveTraffic();
    return entry;
  }

  async getTraffic(proxyId, limit = 100, offset = 0) {
    let logs = proxyId 
      ? this.trafficByProxy.get(proxyId) || []
      : this.traffic;

    return logs.slice(-limit - offset, -offset || undefined);
  }

  async getTrafficStats(proxyId) {
    const logs = proxyId 
      ? this.trafficByProxy.get(proxyId) || []
      : this.traffic;

    if (logs.length === 0) {
      return {
        total: 0,
        success: 0,
        errors: 0,
        avgResponseTime: 0,
        requestsPerSecond: 0,
        statusCodes: {},
      };
    }

    const stats = {
      total: logs.length,
      success: 0,
      errors: 0,
      avgResponseTime: 0,
      requestsPerSecond: 0,
      statusCodes: {},
    };

    let totalResponseTime = 0;

    logs.forEach(log => {
      if (log.status < 400) {
        stats.success++;
      } else {
        stats.errors++;
      }
      
      totalResponseTime += log.responseTime || 0;
      
      const statusKey = log.status || 'unknown';
      stats.statusCodes[statusKey] = (stats.statusCodes[statusKey] || 0) + 1;
    });

    stats.avgResponseTime = Math.round(totalResponseTime / logs.length);
    
    // Calculate active real RPS over a responsive 15-second rolling window
    const recentWindowMs = 15000;
    const windowStart = Date.now() - recentWindowMs;
    const recentLogs = logs.filter(log => 
      new Date(log.timestamp).getTime() >= windowStart
    );
    stats.requestsPerSecond = recentLogs.length > 0 
      ? parseFloat((recentLogs.length / (recentWindowMs / 1000)).toFixed(1))
      : 0;

    return stats;
  }

  async clearTraffic(proxyId) {
    if (proxyId) {
      this.trafficByProxy.set(proxyId, []);
      this.traffic = this.traffic.filter(log => log.proxyId !== proxyId);
    } else {
      this.traffic = [];
      this.trafficByProxy.clear();
    }
    await this.saveTraffic();
  }
}

export const trafficService = new TrafficService();
