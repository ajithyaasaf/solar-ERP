/**
 * Company Settings Component
 * Admin UI for configuring company-wide OT rules
 * 
 * Features:
 * - Configurable weekend days (NO hardcoded Sat/Sun)
 * - Default OT rates configuration
 * - Daily OT cap settings
 * - Weekend OT rate configuration
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, AlertCircle, Settings, Calendar, CheckCircle, Lock, Unlock, AlertTriangle, Clock, ShieldAlert, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getOTAuthToken } from '@/hooks/use-ot-auth';

interface CompanySettings {
    id: string;
    weekendDays: number[];
    defaultOTRate: number;
    weekendOTRate: number;
    maxOTHoursPerDay: number;
    requireAdminApprovalAbove: number;
    updatedAt: string;
}

const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function CompanySettings() {
    const { toast } = useToast();
    const [settings, setSettings] = useState<CompanySettings | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [weekendDays, setWeekendDays] = useState<number[]>([]);
    const [defaultOTRate, setDefaultOTRate] = useState('');
    const [weekendOTRate, setWeekendOTRate] = useState('');
    const [maxOTHoursPerDay, setMaxOTHoursPerDay] = useState('');
    const [requireAdminApprovalAbove, setRequireAdminApprovalAbove] = useState('');

    // Fetch settings
    const fetchSettings = async () => {
        setIsLoading(true);
        try {
            const token = await getOTAuthToken();
            const response = await fetch('/api/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const { settings: data } = await response.json();
                setSettings(data);

                // Populate form
                setWeekendDays(data.weekendDays || []);
                setDefaultOTRate(data.defaultOTRate?.toString() || '');
                setWeekendOTRate(data.weekendOTRate?.toString() || '');
                setMaxOTHoursPerDay(data.maxOTHoursPerDay?.toString() || '');
                setRequireAdminApprovalAbove(data.requireAdminApprovalAbove?.toString() || '');
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to fetch settings'
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    // Handle save
    const handleSave = async () => {
        // Validation
        const rates = {
            defaultOTRate: parseFloat(defaultOTRate),
            weekendOTRate: parseFloat(weekendOTRate),
            maxOTHoursPerDay: parseFloat(maxOTHoursPerDay),
            requireAdminApprovalAbove: parseFloat(requireAdminApprovalAbove)
        };

        if (Object.values(rates).some(v => isNaN(v) || v <= 0)) {
            toast({
                variant: 'destructive',
                title: 'Invalid Input',
                description: 'All numeric fields must be greater than 0'
            });
            return;
        }

        setIsSaving(true);
        try {
            const token = await getOTAuthToken();
            const response = await fetch('/api/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    weekendDays,
                    ...rates
                })
            });

            const result = await response.json();

            if (result.success) {
                toast({
                    title: 'Settings Updated',
                    description: 'Company OT settings saved successfully'
                });
                await fetchSettings();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: result.message
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to save settings'
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Toggle weekend day
    const toggleWeekendDay = (day: number) => {
        if (weekendDays.includes(day)) {
            setWeekendDays(weekendDays.filter(d => d !== day));
        } else {
            setWeekendDays([...weekendDays, day].sort());
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Company OT Settings</CardTitle>
                    <CardDescription>
                        Configure company-wide overtime rules and rates
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Weekend Days Configuration */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Weekend Days (Configurable)</Label>
                        <p className="text-sm text-gray-600">
                            Select which days are considered weekends for your company. NO days are hardcoded.
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {weekdayNames.map((day, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <Switch
                                        checked={weekendDays.includes(index)}
                                        onCheckedChange={() => toggleWeekendDay(index)}
                                        id={`day-${index}`}
                                    />
                                    <Label htmlFor={`day-${index}`} className="cursor-pointer">
                                        {day}
                                    </Label>
                                </div>
                            ))}
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                            <p className="text-sm text-blue-900">
                                <strong>Selected weekends:</strong>{' '}
                                {weekendDays.length === 0
                                    ? 'No weekends (all days are working days)'
                                    : weekendDays.map(d => weekdayNames[d]).join(', ')}
                            </p>
                        </div>
                    </div>

                    <Separator />

                    {/* OT Rates */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">OT Rate Multipliers</Label>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="defaultOTRate">Default OT Rate *</Label>
                                <Input
                                    id="defaultOTRate"
                                    type="number"
                                    step="0.1"
                                    min="1"
                                    value={defaultOTRate}
                                    onChange={(e) => setDefaultOTRate(e.target.value)}
                                    placeholder="e.g., 1.5"
                                />
                                <p className="text-xs text-gray-500">
                                    For regular weekday OT (e.g., 1.5 = 1.5x base pay)
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="weekendOTRate">Weekend OT Rate *</Label>
                                <Input
                                    id="weekendOTRate"
                                    type="number"
                                    step="0.1"
                                    min="1"
                                    value={weekendOTRate}
                                    onChange={(e) => setWeekendOTRate(e.target.value)}
                                    placeholder="e.g., 2.0"
                                />
                                <p className="text-xs text-gray-500">
                                    For OT on configured weekend days (e.g., 2.0 = 2x base pay)
                                </p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Daily OT Caps */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Daily OT Controls</Label>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="maxOTHoursPerDay">Max OT Hours Per Day *</Label>
                                <Input
                                    id="maxOTHoursPerDay"
                                    type="number"
                                    step="0.5"
                                    min="1"
                                    value={maxOTHoursPerDay}
                                    onChange={(e) => setMaxOTHoursPerDay(e.target.value)}
                                    placeholder="e.g., 5.0"
                                />
                                <p className="text-xs text-gray-500">
                                    System will warn if OT exceeds this limit
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="requireAdminApprovalAbove">Require Admin Approval Above *</Label>
                                <Input
                                    id="requireAdminApprovalAbove"
                                    type="number"
                                    step="0.5"
                                    min="1"
                                    value={requireAdminApprovalAbove}
                                    onChange={(e) => setRequireAdminApprovalAbove(e.target.value)}
                                    placeholder="e.g., 6.0"
                                />
                                <p className="text-xs text-gray-500">
                                    Flag for review if daily OT exceeds this threshold
                                </p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Save Button */}
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || isLoading}
                        className="w-full md:w-auto"
                    >
                        <Save className="mr-2 h-4 w-4" />
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </Button>
                </CardContent>
            </Card>

            {/* Configuration Examples */}
            <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-2">
                            <p className="font-medium text-green-900">Weekend Configuration Examples</p>
                            <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                                <li><strong>Sunday only:</strong> Select only Sunday (most solar companies)</li>
                                <li><strong>Sat + Sun:</strong> Select both Saturday and Sunday (traditional week)</li>
                                <li><strong>Friday only:</strong> Select only Friday (Islamic regions)</li>
                                <li><strong>No weekends:</strong> Deselect all (rotating shifts)</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
