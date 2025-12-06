import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, Save, X, Plus, Hash } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Tag {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  articleCount?: number;
}

export const TagsManagement = () => {
  const { toast } = useToast();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setLoading(true);
    try {
      // Fetch all tags
      const { data: tagsData, error: tagsError } = await supabase
        .from("tags")
        .select("*")
        .order("name", { ascending: true });

      if (tagsError) throw tagsError;

      // Fetch article counts for each tag
      const { data: articleTags, error: countError } = await supabase
        .from("article_tags")
        .select("tag_id");

      if (countError) throw countError;

      // Count articles per tag
      const countMap: Record<string, number> = {};
      articleTags?.forEach((at) => {
        countMap[at.tag_id] = (countMap[at.tag_id] || 0) + 1;
      });

      const tagsWithCounts = (tagsData || []).map((tag) => ({
        ...tag,
        articleCount: countMap[tag.id] || 0,
      }));

      setTags(tagsWithCounts);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load tags",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    setCreating(true);
    try {
      const slug = generateSlug(newTagName);

      // Check if tag already exists
      const { data: existing } = await supabase
        .from("tags")
        .select("id")
        .or(`name.ilike.${newTagName},slug.eq.${slug}`)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Tag exists",
          description: "A tag with this name already exists",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("tags").insert({
        name: newTagName.trim(),
        slug: slug,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tag created successfully",
      });

      setNewTagName("");
      fetchTags();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setEditName(tag.name);
  };

  const handleSaveEdit = async () => {
    if (!editingTag || !editName.trim()) return;

    try {
      const newSlug = generateSlug(editName);

      // Check if another tag has this name/slug
      const { data: existing } = await supabase
        .from("tags")
        .select("id")
        .or(`name.ilike.${editName},slug.eq.${newSlug}`)
        .neq("id", editingTag.id)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Tag exists",
          description: "Another tag with this name already exists",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("tags")
        .update({
          name: editName.trim(),
          slug: newSlug,
        })
        .eq("id", editingTag.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tag updated successfully",
      });

      setEditingTag(null);
      setEditName("");
      fetchTags();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTag = async () => {
    if (!deleteTagId) return;

    try {
      // Delete article_tags associations first
      await supabase.from("article_tags").delete().eq("tag_id", deleteTagId);

      // Delete the tag
      const { error } = await supabase.from("tags").delete().eq("id", deleteTagId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tag deleted successfully",
      });

      setDeleteTagId(null);
      fetchTags();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const cancelEdit = () => {
    setEditingTag(null);
    setEditName("");
  };

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Create New Tag</CardTitle>
          <CardDescription>Add a new tag for categorizing articles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="new-tag-name" className="sr-only">
                Tag Name
              </Label>
              <Input
                id="new-tag-name"
                placeholder="Enter tag name (e.g., Turkey, NATO, Economy)"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateTag();
                  }
                }}
              />
            </div>
            <Button onClick={handleCreateTag} disabled={!newTagName.trim() || creating}>
              <Plus className="w-4 h-4 mr-2" />
              {creating ? "Creating..." : "Create Tag"}
            </Button>
          </div>
          {newTagName && (
            <p className="text-xs text-muted-foreground mt-2">
              Slug: <code className="bg-muted px-1 rounded">{generateSlug(newTagName)}</code>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Tags</CardTitle>
          <CardDescription>View, edit, and delete existing tags ({tags.length} total)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading tags...</p>
          ) : tags.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No tags created yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-center">Articles</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell>
                      {editingTag?.id === tag.id ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          <Hash className="w-4 h-4 text-primary" />
                          <span className="font-medium">{tag.name}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {editingTag?.id === tag.id ? generateSlug(editName) : tag.slug}
                      </code>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                        {tag.articleCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(tag.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingTag?.id === tag.id ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={cancelEdit}>
                            <X className="w-4 h-4" />
                          </Button>
                          <Button size="sm" onClick={handleSaveEdit}>
                            <Save className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEditTag(tag)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteTagId(tag.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTagId} onOpenChange={() => setDeleteTagId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the tag from all articles. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTag}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
