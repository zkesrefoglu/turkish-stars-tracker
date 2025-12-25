import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { z } from 'zod';

interface Athlete {
  id: string;
  name: string;
  team: string;
  sport: string;
}

// Validation schemas
const transferSchema = z.object({
  athlete_id: z.string().uuid('Select an athlete'),
  from_club: z.string().min(1, 'From club is required'),
  to_club: z.string().min(1, 'To club is required'),
  transfer_date: z.string().min(1, 'Transfer date is required'),
  transfer_fee: z.number().nullable(),
  transfer_type: z.string().min(1, 'Transfer type is required'),
  season: z.string().optional(),
});

const injurySchema = z.object({
  athlete_id: z.string().uuid('Select an athlete'),
  injury_type: z.string().min(1, 'Injury type is required'),
  injury_zone: z.string().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  severity: z.string().optional(),
  games_missed: z.number().nullable(),
  days_missed: z.number().nullable(),
  is_current: z.boolean(),
});

const marketValueSchema = z.object({
  athlete_id: z.string().uuid('Select an athlete'),
  market_value: z.number().min(0, 'Market value must be positive'),
  recorded_date: z.string().min(1, 'Recorded date is required'),
  currency: z.string().default('EUR'),
  club_at_time: z.string().optional(),
});

export default function TransfermarktDataPanel() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [injuries, setInjuries] = useState<any[]>([]);
  const [marketValues, setMarketValues] = useState<any[]>([]);

  // Transfer form state
  const [transferForm, setTransferForm] = useState({
    athlete_id: '',
    from_club: '',
    to_club: '',
    transfer_date: '',
    transfer_fee: '',
    transfer_type: 'transfer',
    season: '',
  });

  // Injury form state
  const [injuryForm, setInjuryForm] = useState({
    athlete_id: '',
    injury_type: '',
    injury_zone: '',
    start_date: '',
    end_date: '',
    severity: 'minor',
    games_missed: '',
    days_missed: '',
    is_current: false,
  });

  // Market value form state
  const [marketValueForm, setMarketValueForm] = useState({
    athlete_id: '',
    market_value: '',
    recorded_date: '',
    currency: 'EUR',
    club_at_time: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadAthletes(),
      loadTransfers(),
      loadInjuries(),
      loadMarketValues(),
    ]);
    setLoading(false);
  };

  const loadAthletes = async () => {
    const { data, error } = await supabase
      .from('athlete_profiles')
      .select('id, name, team, sport')
      // sport values in DB are lowercase (e.g. "football")
      .ilike('sport', 'football')
      .order('name');

    if (error) {
      toast({ title: 'Error', description: `Failed to load athletes: ${error.message}`, variant: 'destructive' });
      return;
    }

    if (data) setAthletes(data);
  };

  const loadTransfers = async () => {
    const { data } = await supabase
      .from('athlete_transfer_history')
      .select('*')
      .order('transfer_date', { ascending: false })
      .limit(50);
    if (data) setTransfers(data);
  };

  const loadInjuries = async () => {
    const { data } = await supabase
      .from('athlete_injury_history')
      .select('*')
      .order('start_date', { ascending: false })
      .limit(50);
    if (data) setInjuries(data);
  };

  const loadMarketValues = async () => {
    const { data } = await supabase
      .from('athlete_market_values')
      .select('*')
      .order('recorded_date', { ascending: false })
      .limit(50);
    if (data) setMarketValues(data);
  };

  const getAthleteName = (athleteId: string) => {
    return athletes.find(a => a.id === athleteId)?.name || 'Unknown';
  };

  // Add Transfer
  const handleAddTransfer = async () => {
    try {
      const validated = transferSchema.parse({
        ...transferForm,
        transfer_fee: transferForm.transfer_fee ? parseFloat(transferForm.transfer_fee) : null,
      });

      const { error } = await supabase.from('athlete_transfer_history').insert({
        athlete_id: validated.athlete_id,
        from_club: validated.from_club,
        to_club: validated.to_club,
        transfer_date: validated.transfer_date,
        transfer_fee: validated.transfer_fee,
        transfer_type: validated.transfer_type,
        season: validated.season || null,
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Transfer record added' });
      setTransferForm({
        athlete_id: '',
        from_club: '',
        to_club: '',
        transfer_date: '',
        transfer_fee: '',
        transfer_type: 'transfer',
        season: '',
      });
      loadTransfers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Add Injury
  const handleAddInjury = async () => {
    try {
      const validated = injurySchema.parse({
        ...injuryForm,
        games_missed: injuryForm.games_missed ? parseInt(injuryForm.games_missed) : null,
        days_missed: injuryForm.days_missed ? parseInt(injuryForm.days_missed) : null,
      });

      const { error } = await supabase.from('athlete_injury_history').insert({
        athlete_id: validated.athlete_id,
        injury_type: validated.injury_type,
        injury_zone: validated.injury_zone || null,
        start_date: validated.start_date,
        end_date: validated.end_date || null,
        severity: validated.severity || 'minor',
        games_missed: validated.games_missed,
        days_missed: validated.days_missed,
        is_current: validated.is_current,
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Injury record added' });
      setInjuryForm({
        athlete_id: '',
        injury_type: '',
        injury_zone: '',
        start_date: '',
        end_date: '',
        severity: 'minor',
        games_missed: '',
        days_missed: '',
        is_current: false,
      });
      loadInjuries();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Add Market Value
  const handleAddMarketValue = async () => {
    try {
      const validated = marketValueSchema.parse({
        ...marketValueForm,
        market_value: parseFloat(marketValueForm.market_value),
      });

      // Insert into athlete_market_values history table
      const { error } = await supabase.from('athlete_market_values').insert({
        athlete_id: validated.athlete_id,
        market_value: validated.market_value,
        recorded_date: validated.recorded_date,
        currency: validated.currency,
        club_at_time: validated.club_at_time || null,
      });

      if (error) throw error;

      // Also update the current_market_value in athlete_profiles so /athletes page shows correct value
      const { error: updateError } = await supabase
        .from('athlete_profiles')
        .update({ 
          current_market_value: validated.market_value,
          market_value_currency: validated.currency 
        })
        .eq('id', validated.athlete_id);

      if (updateError) {
        console.error('Failed to update athlete profile market value:', updateError);
        toast({ title: 'Warning', description: 'Value saved to history but failed to update profile', variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Market value updated' });
      }

      setMarketValueForm({
        athlete_id: '',
        market_value: '',
        recorded_date: '',
        currency: 'EUR',
        club_at_time: '',
      });
      loadMarketValues();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Delete handlers
  const handleDeleteTransfer = async (id: string) => {
    const { error } = await supabase.from('athlete_transfer_history').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Transfer record removed' });
      loadTransfers();
    }
  };

  const handleDeleteInjury = async (id: string) => {
    const { error } = await supabase.from('athlete_injury_history').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Injury record removed' });
      loadInjuries();
    }
  };

  const handleDeleteMarketValue = async (id: string) => {
    const { error } = await supabase.from('athlete_market_values').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Market value record removed' });
      loadMarketValues();
    }
  };

  const formatCurrency = (value: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfermarkt Data Entry</CardTitle>
        <CardDescription>Manually enter transfer history, injuries, and market values for football players</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="transfers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="transfers">Transfers</TabsTrigger>
            <TabsTrigger value="injuries">Injuries</TabsTrigger>
            <TabsTrigger value="market-values">Market Values</TabsTrigger>
          </TabsList>

          {/* Transfers Tab */}
          <TabsContent value="transfers" className="space-y-4">
            <Card className="bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Add Transfer Record</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Athlete *</Label>
                    <Select value={transferForm.athlete_id} onValueChange={v => setTransferForm({...transferForm, athlete_id: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select athlete" />
                      </SelectTrigger>
                      <SelectContent>
                        {athletes.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>From Club *</Label>
                    <Input 
                      value={transferForm.from_club} 
                      onChange={e => setTransferForm({...transferForm, from_club: e.target.value})} 
                      placeholder="Previous club"
                    />
                  </div>
                  <div>
                    <Label>To Club *</Label>
                    <Input 
                      value={transferForm.to_club} 
                      onChange={e => setTransferForm({...transferForm, to_club: e.target.value})} 
                      placeholder="New club"
                    />
                  </div>
                  <div>
                    <Label>Transfer Date *</Label>
                    <Input 
                      type="date" 
                      value={transferForm.transfer_date} 
                      onChange={e => setTransferForm({...transferForm, transfer_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Transfer Fee (€)</Label>
                    <Input 
                      type="number" 
                      value={transferForm.transfer_fee} 
                      onChange={e => setTransferForm({...transferForm, transfer_fee: e.target.value})} 
                      placeholder="0 for free"
                    />
                  </div>
                  <div>
                    <Label>Type *</Label>
                    <Select value={transferForm.transfer_type} onValueChange={v => setTransferForm({...transferForm, transfer_type: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transfer">Transfer</SelectItem>
                        <SelectItem value="loan">Loan</SelectItem>
                        <SelectItem value="loan_return">Loan Return</SelectItem>
                        <SelectItem value="free">Free Transfer</SelectItem>
                        <SelectItem value="youth">Youth Promotion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Season</Label>
                    <Input 
                      value={transferForm.season} 
                      onChange={e => setTransferForm({...transferForm, season: e.target.value})} 
                      placeholder="e.g., 24/25"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddTransfer} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Transfer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Athlete</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{getAthleteName(t.athlete_id)}</TableCell>
                    <TableCell>{t.from_club}</TableCell>
                    <TableCell>{t.to_club}</TableCell>
                    <TableCell>{new Date(t.transfer_date).toLocaleDateString()}</TableCell>
                    <TableCell>{t.transfer_fee ? formatCurrency(t.transfer_fee) : 'Free'}</TableCell>
                    <TableCell className="capitalize">{t.transfer_type?.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTransfer(t.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Injuries Tab */}
          <TabsContent value="injuries" className="space-y-4">
            <Card className="bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Add Injury Record</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Athlete *</Label>
                    <Select value={injuryForm.athlete_id} onValueChange={v => setInjuryForm({...injuryForm, athlete_id: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select athlete" />
                      </SelectTrigger>
                      <SelectContent>
                        {athletes.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Injury Type *</Label>
                    <Input 
                      value={injuryForm.injury_type} 
                      onChange={e => setInjuryForm({...injuryForm, injury_type: e.target.value})} 
                      placeholder="e.g., Hamstring strain"
                    />
                  </div>
                  <div>
                    <Label>Body Zone</Label>
                    <Select value={injuryForm.injury_zone} onValueChange={v => setInjuryForm({...injuryForm, injury_zone: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select zone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="head">Head</SelectItem>
                        <SelectItem value="shoulder">Shoulder</SelectItem>
                        <SelectItem value="arm">Arm</SelectItem>
                        <SelectItem value="back">Back</SelectItem>
                        <SelectItem value="hip">Hip/Groin</SelectItem>
                        <SelectItem value="thigh">Thigh</SelectItem>
                        <SelectItem value="knee">Knee</SelectItem>
                        <SelectItem value="calf">Calf</SelectItem>
                        <SelectItem value="ankle">Ankle</SelectItem>
                        <SelectItem value="foot">Foot</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Severity</Label>
                    <Select value={injuryForm.severity} onValueChange={v => setInjuryForm({...injuryForm, severity: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minor">Minor</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="severe">Severe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Start Date *</Label>
                    <Input 
                      type="date" 
                      value={injuryForm.start_date} 
                      onChange={e => setInjuryForm({...injuryForm, start_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input 
                      type="date" 
                      value={injuryForm.end_date} 
                      onChange={e => setInjuryForm({...injuryForm, end_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Games Missed</Label>
                    <Input 
                      type="number" 
                      value={injuryForm.games_missed} 
                      onChange={e => setInjuryForm({...injuryForm, games_missed: e.target.value})} 
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Days Missed</Label>
                    <Input 
                      type="number" 
                      value={injuryForm.days_missed} 
                      onChange={e => setInjuryForm({...injuryForm, days_missed: e.target.value})} 
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="is_current" 
                      checked={injuryForm.is_current}
                      onChange={e => setInjuryForm({...injuryForm, is_current: e.target.checked})}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="is_current">Currently Injured</Label>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddInjury} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Injury
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Athlete</TableHead>
                  <TableHead>Injury</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Games</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {injuries.map(i => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{getAthleteName(i.athlete_id)}</TableCell>
                    <TableCell>{i.injury_type}</TableCell>
                    <TableCell className="capitalize">{i.injury_zone || '-'}</TableCell>
                    <TableCell className="capitalize">{i.severity}</TableCell>
                    <TableCell>{new Date(i.start_date).toLocaleDateString()}</TableCell>
                    <TableCell>{i.end_date ? new Date(i.end_date).toLocaleDateString() : i.is_current ? 'Current' : '-'}</TableCell>
                    <TableCell>{i.games_missed ?? '-'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteInjury(i.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Market Values Tab */}
          <TabsContent value="market-values" className="space-y-4">
            <Card className="bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Add Market Value Record</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <Label>Athlete *</Label>
                    <Select value={marketValueForm.athlete_id} onValueChange={v => setMarketValueForm({...marketValueForm, athlete_id: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select athlete" />
                      </SelectTrigger>
                      <SelectContent>
                        {athletes.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Market Value (€) *</Label>
                    <Input 
                      type="number" 
                      value={marketValueForm.market_value} 
                      onChange={e => setMarketValueForm({...marketValueForm, market_value: e.target.value})} 
                      placeholder="e.g., 80000000"
                    />
                  </div>
                  <div>
                    <Label>Date *</Label>
                    <Input 
                      type="date" 
                      value={marketValueForm.recorded_date} 
                      onChange={e => setMarketValueForm({...marketValueForm, recorded_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Club at Time</Label>
                    <Input 
                      value={marketValueForm.club_at_time} 
                      onChange={e => setMarketValueForm({...marketValueForm, club_at_time: e.target.value})} 
                      placeholder="Club name"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddMarketValue} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Value
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Athlete</TableHead>
                  <TableHead>Market Value</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Club</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marketValues.map(mv => (
                  <TableRow key={mv.id}>
                    <TableCell className="font-medium">{getAthleteName(mv.athlete_id)}</TableCell>
                    <TableCell>{formatCurrency(mv.market_value, mv.currency)}</TableCell>
                    <TableCell>{new Date(mv.recorded_date).toLocaleDateString()}</TableCell>
                    <TableCell>{mv.club_at_time || '-'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteMarketValue(mv.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
