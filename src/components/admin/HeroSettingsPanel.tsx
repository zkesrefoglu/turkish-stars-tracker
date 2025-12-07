import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/hooks/use-toast';
import { Upload, Loader2, Save, Video } from 'lucide-react';

interface HeroSettings {
  id: string;
  video_url: string | null;
  poster_url: string | null;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_href: string;
  overlay_opacity: number;
  video_scale: number;
  video_position_x: number;
  video_position_y: number;
  min_height_vh: number;
}

export default function HeroSettingsPanel() {
  const [settings, setSettings] = useState<HeroSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('hero_settings')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading hero settings:', error);
      toast({ title: 'Error', description: 'Failed to load hero settings', variant: 'destructive' });
    }
    
    if (data) {
      setSettings(data as HeroSettings);
    }
    setLoading(false);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast({ title: 'Invalid file', description: 'Please upload a video file', variant: 'destructive' });
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Video must be under 100MB', variant: 'destructive' });
      return;
    }

    setUploading(true);

    try {
      const fileName = `hero-${Date.now()}.${file.name.split('.').pop()}`;
      
      const { data, error } = await supabase.storage
        .from('hero-videos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('hero-videos')
        .getPublicUrl(data.path);

      setSettings(prev => prev ? { ...prev, video_url: urlData.publicUrl } : null);
      toast({ title: 'Video uploaded', description: 'Video uploaded successfully' });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    const { error } = await supabase
      .from('hero_settings')
      .update({
        video_url: settings.video_url,
        poster_url: settings.poster_url,
        title: settings.title,
        subtitle: settings.subtitle,
        cta_text: settings.cta_text,
        cta_href: settings.cta_href,
        overlay_opacity: settings.overlay_opacity,
        video_scale: settings.video_scale,
        video_position_x: settings.video_position_x,
        video_position_y: settings.video_position_y,
        min_height_vh: settings.min_height_vh,
      })
      .eq('id', settings.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'Hero settings updated successfully' });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No hero settings found. Please check database migration.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Video Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Current Video URL</Label>
            <Input
              value={settings.video_url || ''}
              onChange={(e) => setSettings({ ...settings, video_url: e.target.value })}
              placeholder="Video URL"
            />
          </div>

          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              variant="outline"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {uploading ? 'Uploading...' : 'Upload New Video'}
            </Button>
            <span className="text-sm text-muted-foreground">Max 100MB</span>
          </div>

          {settings.video_url && (
            <div className="mt-4">
              <Label>Preview</Label>
              <video
                src={settings.video_url}
                className="w-full max-w-md h-auto rounded-md mt-2"
                controls
                muted
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Hero Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Title</Label>
              <Input
                value={settings.title}
                onChange={(e) => setSettings({ ...settings, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input
                value={settings.subtitle}
                onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
              />
            </div>
            <div>
              <Label>CTA Button Text</Label>
              <Input
                value={settings.cta_text}
                onChange={(e) => setSettings({ ...settings, cta_text: e.target.value })}
              />
            </div>
            <div>
              <Label>CTA Button Link</Label>
              <Input
                value={settings.cta_href}
                onChange={(e) => setSettings({ ...settings, cta_href: e.target.value })}
              />
            </div>
            <div>
              <Label>Poster Image URL</Label>
              <Input
                value={settings.poster_url || ''}
                onChange={(e) => setSettings({ ...settings, poster_url: e.target.value })}
                placeholder="Fallback image URL"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Visual Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Overlay Opacity</Label>
              <span className="text-sm text-muted-foreground">{(settings.overlay_opacity * 100).toFixed(0)}%</span>
            </div>
            <Slider
              value={[settings.overlay_opacity * 100]}
              onValueChange={([val]) => setSettings({ ...settings, overlay_opacity: val / 100 })}
              min={0}
              max={100}
              step={5}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Video Scale</Label>
              <span className="text-sm text-muted-foreground">{(settings.video_scale * 100).toFixed(0)}%</span>
            </div>
            <Slider
              value={[settings.video_scale * 100]}
              onValueChange={([val]) => setSettings({ ...settings, video_scale: val / 100 })}
              min={100}
              max={200}
              step={5}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Video Position X (Center)</Label>
              <span className="text-sm text-muted-foreground">{settings.video_position_x}%</span>
            </div>
            <Slider
              value={[settings.video_position_x]}
              onValueChange={([val]) => setSettings({ ...settings, video_position_x: val })}
              min={0}
              max={100}
              step={5}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Video Position Y (Center)</Label>
              <span className="text-sm text-muted-foreground">{settings.video_position_y}%</span>
            </div>
            <Slider
              value={[settings.video_position_y]}
              onValueChange={([val]) => setSettings({ ...settings, video_position_y: val })}
              min={0}
              max={100}
              step={5}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Minimum Height</Label>
              <span className="text-sm text-muted-foreground">{settings.min_height_vh}vh</span>
            </div>
            <Slider
              value={[settings.min_height_vh]}
              onValueChange={([val]) => setSettings({ ...settings, min_height_vh: val })}
              min={50}
              max={100}
              step={5}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
