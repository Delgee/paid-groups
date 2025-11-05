'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, RefreshCw, Clock, Activity, CheckCheck, AlertTriangle, Pause } from 'lucide-react';
import { healthApi, type QueueStatus as QueueStatusType } from '@/lib/api/analytics';

export function QueueStatus() {
  const [queueStatus, setQueueStatus] = useState<QueueStatusType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const fetchQueueStatus = async () => {
    try {
      setIsLoading(true);
      const status = await healthApi.getQueueStatus();
      setQueueStatus(status);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Failed to fetch queue status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueStatus();
    // Refresh every 10 seconds
    const interval = setInterval(fetchQueueStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (isHealthy: boolean) => {
    return isHealthy ? (
      <Badge className="bg-green-500">Healthy</Badge>
    ) : (
      <Badge className="bg-red-500">Issues Detected</Badge>
    );
  };

  const getStatColor = (type: string, value: number): string => {
    if (type === 'failed' && value > 0) return 'text-red-500';
    if (type === 'waiting' && value > 50) return 'text-yellow-500';
    if (type === 'active' && value > 0) return 'text-blue-500';
    return 'text-muted-foreground';
  };

  if (isLoading && !queueStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Worker Queue</CardTitle>
          <CardDescription>Loading queue status...</CardDescription>
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
            <CardTitle>Worker Queue</CardTitle>
            <CardDescription>
              {queueStatus?.name || 'Payment Processing'} • Last checked: {lastChecked.toLocaleTimeString()}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {queueStatus && getStatusBadge(queueStatus.is_healthy)}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchQueueStatus}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {queueStatus && (
          <div className="space-y-4">
            {/* Status Message */}
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              {queueStatus.is_healthy ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <p className="text-sm">{queueStatus.message}</p>
            </div>

            {/* Queue Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Waiting */}
              <div className="flex flex-col gap-1 p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className={`h-4 w-4 ${getStatColor('waiting', queueStatus.stats.waiting)}`} />
                  <span className="text-sm text-muted-foreground">Waiting</span>
                </div>
                <p className={`text-2xl font-bold ${getStatColor('waiting', queueStatus.stats.waiting)}`}>
                  {queueStatus.stats.waiting}
                </p>
              </div>

              {/* Active */}
              <div className="flex flex-col gap-1 p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Activity className={`h-4 w-4 ${getStatColor('active', queueStatus.stats.active)}`} />
                  <span className="text-sm text-muted-foreground">Active</span>
                </div>
                <p className={`text-2xl font-bold ${getStatColor('active', queueStatus.stats.active)}`}>
                  {queueStatus.stats.active}
                </p>
              </div>

              {/* Completed */}
              <div className="flex flex-col gap-1 p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCheck className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Completed</span>
                </div>
                <p className="text-2xl font-bold text-green-500">
                  {queueStatus.stats.completed}
                </p>
              </div>

              {/* Failed */}
              <div className="flex flex-col gap-1 p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 ${getStatColor('failed', queueStatus.stats.failed)}`} />
                  <span className="text-sm text-muted-foreground">Failed</span>
                </div>
                <p className={`text-2xl font-bold ${getStatColor('failed', queueStatus.stats.failed)}`}>
                  {queueStatus.stats.failed}
                </p>
              </div>

              {/* Delayed */}
              <div className="flex flex-col gap-1 p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Pause className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Delayed</span>
                </div>
                <p className="text-2xl font-bold text-muted-foreground">
                  {queueStatus.stats.delayed}
                </p>
              </div>

              {/* Success Rate */}
              <div className="flex flex-col gap-1 p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Success Rate</span>
                </div>
                <p className="text-2xl font-bold text-blue-500">
                  {queueStatus.stats.completed + queueStatus.stats.failed > 0
                    ? (
                        (queueStatus.stats.completed /
                          (queueStatus.stats.completed + queueStatus.stats.failed)) *
                        100
                      ).toFixed(1)
                    : '100.0'}
                  %
                </p>
              </div>
            </div>
          </div>
        )}

        {!queueStatus && !isLoading && (
          <div className="text-center py-8">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-muted-foreground">Failed to load queue status</p>
            <Button onClick={fetchQueueStatus} className="mt-4">
              Retry
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
