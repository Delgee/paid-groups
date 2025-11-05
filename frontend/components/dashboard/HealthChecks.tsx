'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Database, Server, CreditCard, MessageCircle } from 'lucide-react';
import { healthApi, type HealthStatus } from '@/lib/api/analytics';

export function HealthChecks() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const fetchHealthStatus = async () => {
    try {
      setIsLoading(true);
      const status = await healthApi.getHealthStatus();
      setHealthStatus(status);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Failed to fetch health status:', error);
      // Log more details about the error
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      console.error('Full error:', JSON.stringify(error, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealthStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: 'healthy' | 'unhealthy' | 'degraded') => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-500">Healthy</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500">Degraded</Badge>;
      case 'unhealthy':
        return <Badge className="bg-red-500">Unhealthy</Badge>;
    }
  };

  const getCheckIcon = (status: 'healthy' | 'unhealthy') => {
    return status === 'healthy' ? (
      <CheckCircle2 className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getServiceIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'database':
        return <Database className="h-4 w-4" />;
      case 'redis':
        return <Server className="h-4 w-4" />;
      case 'qpay':
        return <CreditCard className="h-4 w-4" />;
      case 'telegram':
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (isLoading && !healthStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Checking system status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>System Health</CardTitle>
            <CardDescription>
              Last checked: {lastChecked.toLocaleTimeString()}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {healthStatus && getStatusBadge(healthStatus.status)}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchHealthStatus}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {healthStatus && (
          <div className="space-y-4">
            {/* Overall Status */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                <div>
                  <p className="font-medium">System Status</p>
                  <p className="text-sm text-muted-foreground">
                    Uptime: {formatUptime(healthStatus.uptime)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Version {healthStatus.version}</p>
              </div>
            </div>

            {/* Service Checks */}
            <div className="space-y-2">
              {healthStatus.checks?.map((check) => (
                <div
                  key={check.name}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getServiceIcon(check.name)}
                    <div>
                      <p className="font-medium capitalize">{check.name}</p>
                      <p className="text-sm text-muted-foreground">{check.message}</p>
                      {check.duration_ms && (
                        <p className="text-xs text-muted-foreground">
                          Response time: {check.duration_ms}ms
                        </p>
                      )}
                    </div>
                  </div>
                  <div>{getCheckIcon(check.status)}</div>
                </div>
              ))}
            </div>

            {/* No checks available */}
            {(!healthStatus.checks || healthStatus.checks.length === 0) && (
              <div className="text-center py-4 text-muted-foreground">
                No health checks available
              </div>
            )}
          </div>
        )}

        {!healthStatus && !isLoading && (
          <div className="text-center py-8">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-muted-foreground">Failed to load health status</p>
            <Button onClick={fetchHealthStatus} className="mt-4">
              Retry
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
