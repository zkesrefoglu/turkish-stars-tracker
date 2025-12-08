import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Loader2, Download, Trash2, ExternalLink, Search, Save, Instagram } from 'lucide-react';

interface VideoData {
  videoUrl: string;
  thumbnail: string | null;
  shortcode: string | null;
  caption: string;
  username: string;
  likes: number;
  views: number;
}

interface SavedVideo {
  id: string;
  instagram_url: string;
  shortcode: string | null;
  video_url: string;
  thumbnail_url: string | null;
  storage_path: string | null;
  username: string | null;
  caption: string | null;
  likes: number;
  views: number;
  downloaded_at: string;
}

export default function InstagramDownloaderPanel() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [savedVideos, setSavedVideos] = useState<SavedVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);

  useEffect(() => {
    loadSavedVideos();
  }, []);

  const loadSavedVideos = async () => {
    setLoadingVideos(true);
    const { data, error } = await supabase
      .from('instagram_videos')
      .select('*')
      .order('downloaded_at', { ascending: false });
    
    if (error) {
      console.error('Error loading videos:', error);
    } else {
      setSavedVideos(data as SavedVideo[]);
    }
    setLoadingVideos(false);
  };

  const fetchVideoInfo = async () => {
    if (!url.trim()) return;
    
    setLoading(true);
    setVideoData(null);

    try {
      const { data, error } = await supabase.functions.invoke('download-instagram', {
        body: { action: 'fetch', url }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setVideoData(data.data);
      toast({ title: 'Video Found', description: `@${data.data.username}` });
    } catch (err: any) {
      console.error('Fetch error:', err);
      toast({ 
        title: 'Error', 
        description: err.message || 'Failed to fetch video', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const saveVideo = async () => {
    if (!videoData) return;

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('download-instagram', {
        body: { 
          action: 'save', 
          videoData: {
            ...videoData,
            instagramUrl: url,
          }
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({ title: 'Video Saved', description: 'Video has been saved to storage' });
      setVideoData(null);
      setUrl('');
      loadSavedVideos();
    } catch (err: any) {
      console.error('Save error:', err);
      toast({ 
        title: 'Error', 
        description: err.message || 'Failed to save video', 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteVideo = async (video: SavedVideo) => {
    try {
      // Delete from storage if exists
      if (video.storage_path) {
        await supabase.storage.from('instagram-videos').remove([video.storage_path]);
      }

      // Delete from database
      const { error } = await supabase
        .from('instagram_videos')
        .delete()
        .eq('id', video.id);

      if (error) throw error;

      toast({ title: 'Deleted', description: 'Video removed' });
      loadSavedVideos();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const getPublicUrl = (storagePath: string) => {
    const { data } = supabase.storage.from('instagram-videos').getPublicUrl(storagePath);
    return data.publicUrl;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="space-y-6">
      {/* Downloader Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5" />
            Instagram Video Downloader
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Paste Instagram reel/video URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={fetchVideoInfo} disabled={loading || !url.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2">Fetch</span>
            </Button>
          </div>

          {/* Preview */}
          {videoData && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex gap-4">
                {videoData.thumbnail && (
                  <div className="relative flex-shrink-0">
                    <img 
                      src={videoData.thumbnail} 
                      alt="Thumbnail" 
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                      <span className="text-white text-2xl">▶</span>
                    </div>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">@{videoData.username}</p>
                  {videoData.caption && (
                    <p className="text-sm text-muted-foreground truncate">{videoData.caption}</p>
                  )}
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    {videoData.views > 0 && <span>👁 {formatNumber(videoData.views)}</span>}
                    {videoData.likes > 0 && <span>❤️ {formatNumber(videoData.likes)}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={saveVideo} disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save to Storage
                </Button>
                <Button variant="outline" asChild>
                  <a href={videoData.videoUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Preview
                  </a>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Saved Videos */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Videos ({savedVideos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingVideos ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : savedVideos.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No videos saved yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Stats</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savedVideos.map((video) => (
                  <TableRow key={video.id}>
                    <TableCell>
                      {video.thumbnail_url ? (
                        <img 
                          src={video.thumbnail_url} 
                          alt="Thumbnail" 
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                          🎬
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">@{video.username || 'Unknown'}</p>
                        {video.caption && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {video.caption}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {video.views > 0 && <p>👁 {formatNumber(video.views)}</p>}
                        {video.likes > 0 && <p>❤️ {formatNumber(video.likes)}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(video.downloaded_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {video.storage_path && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={getPublicUrl(video.storage_path)} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => deleteVideo(video)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}