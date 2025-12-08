import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Loader2, Download, Trash2, Upload, Video, ExternalLink, Copy } from 'lucide-react';

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
  const [uploading, setUploading] = useState(false);
  const [savedVideos, setSavedVideos] = useState<SavedVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form fields for metadata
  const [instagramUrl, setInstagramUrl] = useState('');
  const [username, setUsername] = useState('');
  const [caption, setCaption] = useState('');

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

  const extractShortcode = (url: string): string | null => {
    const patterns = [
      /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
      /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
      /instagram\.com\/reels\/([A-Za-z0-9_-]+)/,
      /instagram\.com\/tv\/([A-Za-z0-9_-]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast({ title: 'Error', description: 'Please select a video file', variant: 'destructive' });
      return;
    }

    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      toast({ title: 'Error', description: 'Video must be under 100MB', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const shortcode = extractShortcode(instagramUrl) || `upload-${Date.now()}`;
      const fileName = `${shortcode}.mp4`;
      const storagePath = `videos/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('instagram-videos')
        .upload(storagePath, file, {
          contentType: 'video/mp4',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('instagram-videos')
        .getPublicUrl(storagePath);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Save to database
      const { error: dbError } = await supabase
        .from('instagram_videos')
        .insert({
          instagram_url: instagramUrl || `manual-upload-${Date.now()}`,
          shortcode,
          video_url: publicUrlData.publicUrl,
          storage_path: storagePath,
          username: username || 'Unknown',
          caption: caption || null,
          created_by: user?.id,
        });

      if (dbError) throw dbError;

      toast({ title: 'Video Saved', description: 'Video uploaded successfully' });
      
      // Reset form
      setInstagramUrl('');
      setUsername('');
      setCaption('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      loadSavedVideos();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({ 
        title: 'Error', 
        description: err.message || 'Failed to upload video', 
        variant: 'destructive' 
      });
    } finally {
      setUploading(false);
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

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'Copied', description: 'URL copied to clipboard' });
  };

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Upload
          </CardTitle>
          <CardDescription>
            Download videos from Instagram using browser extensions (like "Video DownloadHelper"), then upload them here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="instagram-url">Instagram URL (optional)</Label>
              <Input
                id="instagram-url"
                placeholder="https://instagram.com/reel/..."
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username (optional)</Label>
              <Input
                id="username"
                placeholder="@username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="caption">Caption (optional)</Label>
            <Textarea
              id="caption"
              placeholder="Video caption or description..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              className="hidden"
              id="video-upload"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full md:w-auto"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {uploading ? 'Uploading...' : 'Upload Video'}
            </Button>
            <span className="text-sm text-muted-foreground">Max 100MB</span>
          </div>
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
                  <TableHead>Info</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savedVideos.map((video) => (
                  <TableRow key={video.id}>
                    <TableCell>
                      {video.storage_path ? (
                        <video 
                          src={getPublicUrl(video.storage_path)} 
                          className="w-24 h-16 object-cover rounded"
                          muted
                          preload="metadata"
                        />
                      ) : (
                        <div className="w-24 h-16 bg-muted rounded flex items-center justify-center">
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
                        {video.instagram_url && !video.instagram_url.startsWith('manual') && (
                          <a 
                            href={video.instagram_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" /> View on IG
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(video.downloaded_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {video.storage_path && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => copyUrl(getPublicUrl(video.storage_path!))}
                              title="Copy URL"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <a href={getPublicUrl(video.storage_path)} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </>
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