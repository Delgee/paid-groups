'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/components/providers/auth-provider';
import { Settings, Shield, Bell, Database, AlertCircle } from 'lucide-react';

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Placeholder settings - these would be fetched from backend in production
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    allowNewRegistrations: true,
    emailNotifications: true,
    backupEnabled: true,
    maxTenantsPerPage: 50,
  });

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSuccessMessage(null);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSuccessMessage('Settings saved successfully');
    setIsSaving(false);

    // Clear success message after 3 seconds
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
        <p className="mt-2 text-lg text-gray-600">
          Configure platform-wide settings and preferences
        </p>
      </div>

      {/* Current User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Administrator Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-600">Name:</span>
              <p className="font-medium">{user?.name}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Email:</span>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Role:</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Super Admin
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-600">User ID:</span>
              <p className="font-mono text-xs text-gray-700">{user?.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Platform Configuration
          </CardTitle>
          <CardDescription>
            Control platform-wide features and behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Maintenance Mode */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
              <p className="text-sm text-gray-500">
                Temporarily disable access for all users except super admins
              </p>
            </div>
            <Switch
              id="maintenance-mode"
              checked={settings.maintenanceMode}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, maintenanceMode: checked })
              }
            />
          </div>

          <Separator />

          {/* Allow Registrations */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow-registrations">Allow New Registrations</Label>
              <p className="text-sm text-gray-500">
                Enable or disable new tenant registrations
              </p>
            </div>
            <Switch
              id="allow-registrations"
              checked={settings.allowNewRegistrations}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, allowNewRegistrations: checked })
              }
            />
          </div>

          <Separator />

          {/* Max Tenants Per Page */}
          <div className="space-y-2">
            <Label htmlFor="max-tenants">Default Tenants Per Page</Label>
            <Input
              id="max-tenants"
              type="number"
              min="10"
              max="100"
              value={settings.maxTenantsPerPage}
              onChange={(e) =>
                setSettings({ ...settings, maxTenantsPerPage: Number(e.target.value) })
              }
              className="max-w-xs"
            />
            <p className="text-sm text-gray-500">
              Number of tenants to display per page (10-100)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-gray-500">
                Receive email alerts for critical platform events
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={settings.emailNotifications}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, emailNotifications: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Database & Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Database & Backup
          </CardTitle>
          <CardDescription>
            Manage database backups and maintenance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="backup-enabled">Automatic Backups</Label>
              <p className="text-sm text-gray-500">
                Enable daily automated database backups
              </p>
            </div>
            <Switch
              id="backup-enabled"
              checked={settings.backupEnabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, backupEnabled: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Manual Backup</h4>
              <p className="text-sm text-gray-500">
                Create an immediate backup of the database
              </p>
            </div>
            <Button variant="outline" disabled>
              Create Backup
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-6 border-t">
        <div>
          {successMessage && (
            <div className="flex items-center text-green-600 text-sm font-medium">
              <AlertCircle className="h-4 w-4 mr-2" />
              {successMessage}
            </div>
          )}
        </div>
        <div className="flex space-x-4">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            disabled={isSaving}
          >
            Reset
          </Button>
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>

      {/* Info Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">Development Notice</h4>
              <p className="text-sm text-blue-700 mt-1">
                This settings page is currently in development. Some features may be placeholders
                and will be connected to the backend API in future updates.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
