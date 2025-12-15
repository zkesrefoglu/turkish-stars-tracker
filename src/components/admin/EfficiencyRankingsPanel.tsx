import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface Athlete {
  id: string;
  name: string;
  sport: string;
}

interface EfficiencyRanking {
  id: string;
  athlete_id: string;
  month: string;
  player_name: string;
  team: string;
  per: number | null;
  ts_pct: number | null;
  ws: number | null;
  efficiency_index: number | null;
  is_featured_athlete: boolean;
}

interface EfficiencyRankingsPanelProps {
  athletes: Athlete[];
}

export default function EfficiencyRankingsPanel({ athletes }: EfficiencyRankingsPanelProps) {
  const [rankings, setRankings] = useState<EfficiencyRanking[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRanking, setEditingRanking] = useState<EfficiencyRanking | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    month: format(new Date(), 'yyyy-MM-01'),
    player_name: '',
    team: '',
    per: '',
    ts_pct: '',
    ws: '',
    efficiency_index: '',
    is_featured_athlete: false,
  });

  // Filter to only basketball athletes
  const basketballAthletes = athletes.filter(a => a.sport === 'basketball');

  useEffect(() => {
    if (basketballAthletes.length > 0 && !selectedAthleteId) {
      setSelectedAthleteId(basketballAthletes[0].id);
    }
  }, [basketballAthletes, selectedAthleteId]);

  useEffect(() => {
    if (selectedAthleteId) {
      loadRankings();
    }
  }, [selectedAthleteId]);

  const loadRankings = async () => {
    if (!selectedAthleteId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('athlete_efficiency_rankings')
      .select('*')
      .eq('athlete_id', selectedAthleteId)
      .order('month', { ascending: false })
      .order('efficiency_index', { ascending: false });
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setRankings(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      month: format(new Date(), 'yyyy-MM-01'),
      player_name: '',
      team: '',
      per: '',
      ts_pct: '',
      ws: '',
      efficiency_index: '',
      is_featured_athlete: false,
    });
    setEditingRanking(null);
  };

  const handleOpenDialog = (ranking?: EfficiencyRanking) => {
    if (ranking) {
      setEditingRanking(ranking);
      setFormData({
        month: ranking.month,
        player_name: ranking.player_name,
        team: ranking.team,
        per: ranking.per?.toString() || '',
        ts_pct: ranking.ts_pct?.toString() || '',
        ws: ranking.ws?.toString() || '',
        efficiency_index: ranking.efficiency_index?.toString() || '',
        is_featured_athlete: ranking.is_featured_athlete,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedAthleteId || !formData.player_name || !formData.team) {
      toast({ title: 'Error', description: 'Player name and team are required', variant: 'destructive' });
      return;
    }

    const rankingData = {
      athlete_id: selectedAthleteId,
      month: formData.month,
      player_name: formData.player_name,
      team: formData.team,
      per: formData.per ? parseFloat(formData.per) : null,
      ts_pct: formData.ts_pct ? parseFloat(formData.ts_pct) : null,
      ws: formData.ws ? parseFloat(formData.ws) : null,
      efficiency_index: formData.efficiency_index ? parseFloat(formData.efficiency_index) : null,
      is_featured_athlete: formData.is_featured_athlete,
    };

    let error;
    if (editingRanking) {
      const result = await supabase
        .from('athlete_efficiency_rankings')
        .update(rankingData)
        .eq('id', editingRanking.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('athlete_efficiency_rankings')
        .insert(rankingData);
      error = result.error;
    }

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `Ranking ${editingRanking ? 'updated' : 'added'}` });
      setDialogOpen(false);
      resetForm();
      loadRankings();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('athlete_efficiency_rankings')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Ranking removed' });
      loadRankings();
    }
  };

  const handleBulkAdd = async () => {
    if (!selectedAthleteId) return;

    // Get the selected athlete's name
    const selectedAthlete = basketballAthletes.find(a => a.id === selectedAthleteId);
    if (!selectedAthlete) return;

    // Pre-populate with the provided data
    const defaultRankings = [
      { player_name: 'Nikola Jokic', team: 'Denver Nuggets', per: 36.0, ts_pct: 0.727, ws: null, efficiency_index: 43.79, is_featured_athlete: false },
      { player_name: 'Shai Gilgeous-Alexander', team: 'Oklahoma City Thunder', per: 32.9, ts_pct: 0.687, ws: 16.7, efficiency_index: 34.50, is_featured_athlete: false },
      { player_name: 'Luka Doncic', team: 'Los Angeles Lakers', per: 28.6, ts_pct: 0.617, ws: null, efficiency_index: 36.28, is_featured_athlete: false },
      { player_name: 'Tyrese Maxey', team: 'Philadelphia 76ers', per: null, ts_pct: 0.611, ws: null, efficiency_index: 30.26, is_featured_athlete: false },
      { player_name: selectedAthlete.name, team: 'Houston Rockets', per: 24.5, ts_pct: 0.610, ws: null, efficiency_index: 28.10, is_featured_athlete: true },
    ];

    const month = format(new Date(), 'yyyy-MM-01');
    
    const insertData = defaultRankings.map(r => ({
      athlete_id: selectedAthleteId,
      month,
      ...r,
    }));

    const { error } = await supabase
      .from('athlete_efficiency_rankings')
      .upsert(insertData, { onConflict: 'athlete_id,month,player_name' });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Bulk rankings added for current month' });
      loadRankings();
    }
  };

  // Group rankings by month
  const groupedRankings = rankings.reduce((acc, ranking) => {
    const month = ranking.month;
    if (!acc[month]) acc[month] = [];
    acc[month].push(ranking);
    return acc;
  }, {} as Record<string, EfficiencyRanking[]>);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Efficiency Rankings</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select athlete" />
              </SelectTrigger>
              <SelectContent>
                {basketballAthletes.map(athlete => (
                  <SelectItem key={athlete.id} value={athlete.id}>
                    {athlete.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <CardDescription>
          Manage monthly efficiency index comparisons for basketball players
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Player
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingRanking ? 'Edit' : 'Add'} Efficiency Ranking</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Month</Label>
                    <Input
                      type="month"
                      value={formData.month.substring(0, 7)}
                      onChange={(e) => setFormData({ ...formData, month: e.target.value + '-01' })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Team</Label>
                    <Input
                      value={formData.team}
                      onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                      placeholder="e.g., Houston Rockets"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Player Name</Label>
                  <Input
                    value={formData.player_name}
                    onChange={(e) => setFormData({ ...formData, player_name: e.target.value })}
                    placeholder="e.g., Nikola Jokic"
                  />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>PER</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.per}
                      onChange={(e) => setFormData({ ...formData, per: e.target.value })}
                      placeholder="24.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>TS%</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={formData.ts_pct}
                      onChange={(e) => setFormData({ ...formData, ts_pct: e.target.value })}
                      placeholder="0.610"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>WS</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.ws}
                      onChange={(e) => setFormData({ ...formData, ws: e.target.value })}
                      placeholder="16.7"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Eff. Index</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.efficiency_index}
                      onChange={(e) => setFormData({ ...formData, efficiency_index: e.target.value })}
                      placeholder="28.10"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_featured"
                    checked={formData.is_featured_athlete}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_featured_athlete: !!checked })}
                  />
                  <Label htmlFor="is_featured">This is the featured athlete (highlight in table)</Label>
                </div>
                <Button onClick={handleSave} className="w-full">
                  {editingRanking ? 'Update' : 'Add'} Ranking
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" onClick={handleBulkAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Bulk Add (Jokic, SGA, Luka, Maxey, Şengün)
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : Object.keys(groupedRankings).length === 0 ? (
          <p className="text-muted-foreground py-4">No efficiency rankings yet. Add some players to compare.</p>
        ) : (
          Object.entries(groupedRankings).map(([month, monthRankings]) => (
            <div key={month} className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">
                {format(new Date(month), 'MMMM yyyy')}
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-center">PER</TableHead>
                    <TableHead className="text-center">TS%</TableHead>
                    <TableHead className="text-center">WS</TableHead>
                    <TableHead className="text-center">Eff. Index</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthRankings
                    .sort((a, b) => (b.efficiency_index || 0) - (a.efficiency_index || 0))
                    .map(ranking => (
                      <TableRow key={ranking.id} className={ranking.is_featured_athlete ? 'bg-accent/10' : ''}>
                        <TableCell className="font-medium">
                          {ranking.is_featured_athlete ? '⭐ ' : ''}{ranking.player_name}
                        </TableCell>
                        <TableCell>{ranking.team}</TableCell>
                        <TableCell className="text-center">{ranking.per?.toFixed(1) || '—'}</TableCell>
                        <TableCell className="text-center">{ranking.ts_pct ? `${(ranking.ts_pct * 100).toFixed(1)}%` : '—'}</TableCell>
                        <TableCell className="text-center">{ranking.ws?.toFixed(1) || '—'}</TableCell>
                        <TableCell className="text-center font-semibold">{ranking.efficiency_index?.toFixed(2) || '—'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(ranking)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(ranking.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
