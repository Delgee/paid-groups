import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  public readonly registry: Registry;

  // Payment metrics
  public readonly paymentCounter: Counter;
  public readonly paymentAmountHistogram: Histogram;
  public readonly activePaymentsGauge: Gauge;

  // Membership metrics
  public readonly membershipCounter: Counter;
  public readonly activeMembershipsGauge: Gauge;
  public readonly expiringMembershipsGauge: Gauge;

  // Bot metrics
  public readonly botCommandCounter: Counter;
  public readonly activeBotSessionsGauge: Gauge;

  // API metrics
  public readonly httpRequestDuration: Histogram;
  public readonly httpRequestCounter: Counter;

  // Job metrics
  public readonly jobProcessingDuration: Histogram;
  public readonly jobCounter: Counter;

  constructor() {
    this.registry = new Registry();

    // Payment metrics
    this.paymentCounter = new Counter({
      name: 'telegram_saas_payments_total',
      help: 'Total number of payment transactions',
      labelNames: ['status', 'gateway', 'tenant_id'],
      registers: [this.registry],
    });

    this.paymentAmountHistogram = new Histogram({
      name: 'telegram_saas_payment_amount_mnt',
      help: 'Payment amount in MNT',
      labelNames: ['plan_name', 'tenant_id'],
      buckets: [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000],
      registers: [this.registry],
    });

    this.activePaymentsGauge = new Gauge({
      name: 'telegram_saas_active_payments',
      help: 'Number of pending payments',
      labelNames: ['tenant_id'],
      registers: [this.registry],
    });

    // Membership metrics
    this.membershipCounter = new Counter({
      name: 'telegram_saas_memberships_total',
      help: 'Total number of memberships created',
      labelNames: ['status', 'tenant_id', 'bot_id'],
      registers: [this.registry],
    });

    this.activeMembershipsGauge = new Gauge({
      name: 'telegram_saas_active_memberships',
      help: 'Number of active memberships',
      labelNames: ['tenant_id', 'bot_id'],
      registers: [this.registry],
    });

    this.expiringMembershipsGauge = new Gauge({
      name: 'telegram_saas_expiring_memberships_3days',
      help: 'Number of memberships expiring in next 3 days',
      labelNames: ['tenant_id'],
      registers: [this.registry],
    });

    // Bot metrics
    this.botCommandCounter = new Counter({
      name: 'telegram_saas_bot_commands_total',
      help: 'Total number of bot commands processed',
      labelNames: ['command', 'bot_username', 'tenant_id'],
      registers: [this.registry],
    });

    this.activeBotSessionsGauge = new Gauge({
      name: 'telegram_saas_active_bot_sessions',
      help: 'Number of active bot instances',
      labelNames: ['tenant_id'],
      registers: [this.registry],
    });

    // API metrics
    this.httpRequestDuration = new Histogram({
      name: 'telegram_saas_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.httpRequestCounter = new Counter({
      name: 'telegram_saas_http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry],
    });

    // Job metrics
    this.jobProcessingDuration = new Histogram({
      name: 'telegram_saas_job_duration_seconds',
      help: 'Job processing duration in seconds',
      labelNames: ['job_name', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.registry],
    });

    this.jobCounter = new Counter({
      name: 'telegram_saas_jobs_total',
      help: 'Total jobs processed',
      labelNames: ['job_name', 'status'],
      registers: [this.registry],
    });
  }

  // Helper methods
  recordPayment(status: string, gateway: string, tenantId: string, amount?: number, planName?: string) {
    this.paymentCounter.inc({ status, gateway, tenant_id: tenantId });
    if (amount && planName) {
      this.paymentAmountHistogram.observe({ plan_name: planName, tenant_id: tenantId }, amount);
    }
  }

  recordMembership(status: string, tenantId: string, botId: string) {
    this.membershipCounter.inc({ status, tenant_id: tenantId, bot_id: botId });
  }

  recordBotCommand(command: string, botUsername: string, tenantId: string) {
    this.botCommandCounter.inc({ command, bot_username: botUsername, tenant_id: tenantId });
  }

  recordHttpRequest(method: string, path: string, status: number, duration: number) {
    this.httpRequestDuration.observe({ method, path, status: status.toString() }, duration);
    this.httpRequestCounter.inc({ method, path, status: status.toString() });
  }

  recordJob(jobName: string, status: 'success' | 'failure', duration: number) {
    this.jobProcessingDuration.observe({ job_name: jobName, status }, duration);
    this.jobCounter.inc({ job_name: jobName, status });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
