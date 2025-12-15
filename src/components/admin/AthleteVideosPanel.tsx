import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, GripVertical, Loader2, Upload, Video } from "lucide-react";

interface Athlete {
  id: string;
  name: string;
}

interface AthleteVideo {
  id: string;
  athlete_id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  storage_path: string | null;
  display_order: number;
  is_active: boolean;
}

interface AthleteVideosPanelProps {
  athletes: Athlete[];
}

export default function AthleteVideosPanel({ athletes }: AthleteVideosPanelProps) {
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
  const [videos, setVideos] = useState<AthleteVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<AthleteVideo | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    video_url: "",
    thumbnail_url: "",
  });

  useEffect(() => {
    if (selectedAthleteId) {
      loadVideos();
    } else {
      setVideos([]);
    }
  }, [selectedAthleteId]);

  const loadVideos = async () => {
    if (!selectedAthleteId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("athlete_videos")
      .select("*")
      .eq("athlete_id", selectedAthleteId)
      .order("display_order", { ascending: true });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setVideos(data || []);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "video" | "thumbnail") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${selectedAthleteId}/${Date.now()}.${fileExt}`;
    const bucket = "athlete-videos";

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    if (type === "video") {
      setFormData(prev => ({ ...prev, video_url: publicUrl }));
    } else {
      setFormData(prev => ({ ...prev, thumbnail_url: publicUrl }));
    }

    setUploading(false);
    toast({ title: "Uploaded", description: `${type === "video" ? "Video" : "Thumbnail"} uploaded successfully` });
  };

  const handleAddVideo = async () => {
    if (!selectedAthleteId || !formData.title || !formData.video_url) {
      toast({ title: "Error", description: "Title and video URL are required", variant: "destructive" });
      return;
    }

    if (videos.length >= 10) {
      toast({ title: "Limit reached", description: "Maximum 10 videos per athlete", variant: "destructive" });
      return;
    }

    const nextOrder = videos.length > 0 ? Math.max(...videos.map(v => v.display_order)) + 1 : 0;

    const { error } = await supabase
      .from("athlete_videos")
      .insert({
        athlete_id: selectedAthleteId,
        title: formData.title,
        video_url: formData.video_url,
        thumbnail_url: formData.thumbnail_url || null,
        display_order: nextOrder,
        is_active: true,
      });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Added", description: "Video added successfully" });
      setFormData({ title: "", video_url: "", thumbnail_url: "" });
      setAddDialogOpen(false);
      loadVideos();
    }
  };

  const handleUpdateVideo = async () => {
    if (!editingVideo) return;

    const { error } = await supabase
      .from("athlete_videos")
      .update({
        title: formData.title,
        video_url: formData.video_url,
        thumbnail_url: formData.thumbnail_url || null,
      })
      .eq("id", editingVideo.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated", description: "Video updated successfully" });
      setEditingVideo(null);
      setFormData({ title: "", video_url: "", thumbnail_url: "" });
      loadVideos();
    }
  };

  const handleDeleteVideo = async (id: string) => {
    const { error } = await supabase
      .from("athlete_videos")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Video removed" });
      loadVideos();
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("athlete_videos")
      .update({ is_active: isActive })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      loadVideos();
    }
  };

  const moveVideo = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= videos.length) return;

    const updatedVideos = [...videos];
    const temp = updatedVideos[index];
    updatedVideos[index] = updatedVideos[newIndex];
    updatedVideos[newIndex] = temp;

    // Update display_order for both
    await Promise.all([
      supabase.from("athlete_videos").update({ display_order: newIndex }).eq("id", videos[index].id),
      supabase.from("athlete_videos").update({ display_order: index }).eq("id", videos[newIndex].id),
    ]);

    loadVideos();
  };

  const openEditDialog = (video: AthleteVideo) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      video_url: video.video_url,
      thumbnail_url: video.thumbnail_url || "",
    });
  };

  const VideoFormContent = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4 py-4">
      <div>
        <Label>Title *</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter video title"
        />
      </div>
      
      <div>
        <Label>Video URL *</Label>
        <Input
          value={formData.video_url}
          onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
          placeholder="https://..."
        />
        <div className="mt-2">
          <Label className="cursor-pointer">
            <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <Upload className="h-4 w-4" />
              Or upload video file
            </div>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, "video")}
              disabled={uploading}
            />
          </Label>
        </div>
      </div>
      
      <div>
        <Label>Thumbnail URL</Label>
        <Input
          value={formData.thumbnail_url}
          onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
          placeholder="https://..."
        />
        <div className="mt-2">
          <Label className="cursor-pointer">
            <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <Upload className="h-4 w-4" />
              Or upload thumbnail
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, "thumbnail")}
              disabled={uploading}
            />
          </Label>
        </div>
      </div>

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Uploading...
        </div>
      )}

      <Button
        onClick={isEdit ? handleUpdateVideo : handleAddVideo}
        className="w-full"
        disabled={uploading}
      >
        {isEdit ? "Update Video" : "Add Video"}
      </Button>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Athlete Highlight Videos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label>Select Athlete</Label>
            <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an athlete" />
              </SelectTrigger>
              <SelectContent>
                {athletes.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedAthleteId && videos.length < 10 && (
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="mt-6">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Video
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Highlight Video</DialogTitle>
                </DialogHeader>
                <VideoFormContent />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {selectedAthleteId && (
          <p className="text-sm text-muted-foreground">
            {videos.length}/10 videos • Drag to reorder
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {videos.map((video, index) => (
              <div
                key={video.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => moveVideo(index, "up")}
                    disabled={index === 0}
                  >
                    ▲
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => moveVideo(index, "down")}
                    disabled={index === videos.length - 1}
                  >
                    ▼
                  </Button>
                </div>

                <div className="w-16 h-24 rounded overflow-hidden bg-muted flex-shrink-0">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{video.title}</p>
                  <p className="text-sm text-muted-foreground truncate">{video.video_url}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={video.is_active}
                    onCheckedChange={(checked) => handleToggleActive(video.id, checked)}
                  />
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(video)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteVideo(video.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingVideo} onOpenChange={(open) => !open && setEditingVideo(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Video</DialogTitle>
            </DialogHeader>
            <VideoFormContent isEdit />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
