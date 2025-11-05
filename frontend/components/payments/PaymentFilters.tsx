'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PaymentFilters as PaymentFiltersType, PaymentStatus } from '@/lib/api/payments';
import { Project } from '@/lib/api/projects';
import { RotateCcw } from 'lucide-react';

interface PaymentFiltersProps {
  filters: PaymentFiltersType;
  projects: Project[];
  onFilterChange: (filters: PaymentFiltersType) => void;
  onReset: () => void;
}

export function PaymentFilters({
  filters,
  projects,
  onFilterChange,
  onReset,
}: PaymentFiltersProps) {
  const handleProjectChange = (value: string) => {
    onFilterChange({
      ...filters,
      project_id: value === 'all' ? undefined : value,
    });
  };

  const handleStatusChange = (value: string) => {
    onFilterChange({
      ...filters,
      status: value === 'all' ? undefined : (value as PaymentStatus),
    });
  };

  const hasActiveFilters = filters.project_id || filters.status;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Filters</CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-8 px-2 lg:px-3"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Project Filter */}
          <div className="space-y-2">
            <Label htmlFor="project-filter">Project</Label>
            <Select
              value={filters.project_id || 'all'}
              onValueChange={handleProjectChange}
            >
              <SelectTrigger id="project-filter">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label htmlFor="status-filter">Status</Label>
            <Select
              value={filters.status || 'all'}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value={PaymentStatus.COMPLETED}>Completed</SelectItem>
                <SelectItem value={PaymentStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={PaymentStatus.FAILED}>Failed</SelectItem>
                <SelectItem value={PaymentStatus.REFUNDED}>Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
