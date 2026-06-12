interface AgentMetrics {
  totalRuns: number;
  totalLatencyMs: number;
  totalTokenCost: number;
  lastRun?: Date;
}

interface CampaignMetrics {
  count: number;
  lastCreated?: Date;
}

class MetricsStore {
  private agentMetrics: Record<string, AgentMetrics> = {};
  private campaignMetrics: Record<string, CampaignMetrics> = {};
  private dailyAgentRuns: Record<string, number> = {};

  trackAgentRun(agentName: string, latencyMs: number, tokenCost: number = 0): void {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Track agent-specific metrics
    if (!this.agentMetrics[agentName]) {
      this.agentMetrics[agentName] = {
        totalRuns: 0,
        totalLatencyMs: 0,
        totalTokenCost: 0,
      };
    }

    const metrics = this.agentMetrics[agentName];
    metrics.totalRuns += 1;
    metrics.totalLatencyMs += latencyMs;
    metrics.totalTokenCost += tokenCost;
    metrics.lastRun = now;

    // Track daily runs
    if (!this.dailyAgentRuns[today]) {
      this.dailyAgentRuns[today] = 0;
    }
    this.dailyAgentRuns[today] += 1;
  }

  trackCampaignCreated(channel: string, city: string): void {
    const now = new Date();
    const key = `${channel}_${city}`;

    if (!this.campaignMetrics[key]) {
      this.campaignMetrics[key] = {
        count: 0,
      };
    }

    this.campaignMetrics[key].count += 1;
    this.campaignMetrics[key].lastCreated = now;

    // Also track by channel only
    if (!this.campaignMetrics[channel]) {
      this.campaignMetrics[channel] = {
        count: 0,
      };
    }
    this.campaignMetrics[channel].count += 1;
    this.campaignMetrics[channel].lastCreated = now;
  }

  getMetricsSummary(): {
    totalAgentRuns: number;
    avgLatencyMs: number;
    totalTokenCost: number;
    campaignsByChannel: Record<string, number>;
    runsToday: number;
    agentBreakdown: Record<string, {
      runs: number;
      avgLatency: number;
      totalTokens: number;
      lastRun?: string;
    }>;
  } {
    const totalAgentRuns = Object.values(this.agentMetrics).reduce(
      (sum, metrics) => sum + metrics.totalRuns,
      0
    );

    const totalLatencyMs = Object.values(this.agentMetrics).reduce(
      (sum, metrics) => sum + metrics.totalLatencyMs,
      0
    );

    const totalTokenCost = Object.values(this.agentMetrics).reduce(
      (sum, metrics) => sum + metrics.totalTokenCost,
      0
    );

    const avgLatencyMs = totalAgentRuns > 0 ? totalLatencyMs / totalAgentRuns : 0;

    // Get campaigns by channel
    const campaignsByChannel: Record<string, number> = {};
    const channels = ['email', 'push', 'sms'];
    
    channels.forEach(channel => {
      campaignsByChannel[channel] = this.campaignMetrics[channel]?.count || 0;
    });

    // Get today's runs
    const today = new Date().toISOString().split('T')[0];
    const runsToday = this.dailyAgentRuns[today] || 0;

    // Agent breakdown
    const agentBreakdown: Record<string, {
      runs: number;
      avgLatency: number;
      totalTokens: number;
      lastRun?: string;
    }> = {};

    Object.entries(this.agentMetrics).forEach(([agentName, metrics]) => {
      agentBreakdown[agentName] = {
        runs: metrics.totalRuns,
        avgLatency: metrics.totalRuns > 0 ? metrics.totalLatencyMs / metrics.totalRuns : 0,
        totalTokens: metrics.totalTokenCost,
        lastRun: metrics.lastRun?.toISOString(),
      };
    });

    return {
      totalAgentRuns: Math.round(totalAgentRuns),
      avgLatencyMs: Math.round(avgLatencyMs),
      totalTokenCost: Math.round(totalTokenCost),
      campaignsByChannel,
      runsToday,
      agentBreakdown,
    };
  }

  // Helper method to reset daily metrics (called by cron job)
  resetDailyMetrics(): void {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    
    // Keep only last 2 days of daily metrics
    Object.keys(this.dailyAgentRuns).forEach(date => {
      if (date < twoDaysAgo) {
        delete this.dailyAgentRuns[date];
      }
    });
  }
}

// Export singleton instance
export const metricsStore = new MetricsStore();

// Export tracking functions
export const trackAgentRun = (agentName: string, latencyMs: number, tokenCost?: number) =>
  metricsStore.trackAgentRun(agentName, latencyMs, tokenCost || 0);

export const trackCampaignCreated = (channel: string, city: string) =>
  metricsStore.trackCampaignCreated(channel, city);

export const getMetricsSummary = () =>
  metricsStore.getMetricsSummary();