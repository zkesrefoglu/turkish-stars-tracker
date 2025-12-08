import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY');
const RAPIDAPI_HOST = 'instagram120.p.rapidapi.com';

// Helper to find video URL in various response structures
const findVideoUrl = (data: any): string | null => {
  const paths = [
    data?.video_url,
    data?.video_versions?.[0]?.url,
    data?.media?.video_url,
    data?.graphql?.shortcode_media?.video_url,
    data?.items?.[0]?.video_versions?.[0]?.url,
    data?.data?.video_url,
  ];
  
  return paths.find(url => url && typeof url === 'string') || null;
};

// Helper to find thumbnail in various response structures
const findThumbnail = (data: any): string | null => {
  const paths = [
    data?.thumbnail_url,
    data?.display_url,
    data?.image_versions2?.candidates?.[0]?.url,
    data?.graphql?.shortcode_media?.display_url,
    data?.items?.[0]?.image_versions2?.candidates?.[0]?.url,
    data?.data?.thumbnail_url,
  ];
  
  return paths.find(url => url && typeof url === 'string') || null;
};

// Extract shortcode from Instagram URL
const extractShortcode = (instagramUrl: string): string | null => {
  const patterns = [
    /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/reels\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/tv\/([A-Za-z0-9_-]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = instagramUrl.match(pattern);
    if (match) return match[1];
  }
  return null;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user is admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, url, videoData } = await req.json();

    if (action === 'fetch') {
      // Fetch video info from Instagram
      if (!url?.includes('instagram.com')) {
        return new Response(JSON.stringify({ error: 'Invalid Instagram URL' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!RAPIDAPI_KEY) {
        return new Response(JSON.stringify({ error: 'RapidAPI key not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const apiUrl = `https://${RAPIDAPI_HOST}/api/instagram/get?url=${encodeURIComponent(url)}`;
      console.log('Fetching Instagram video:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        return new Response(JSON.stringify({ error: `API error: ${response.status}` }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      console.log('Instagram API response received');

      const videoUrl = findVideoUrl(data);
      const thumbnail = findThumbnail(data);
      const shortcode = extractShortcode(url);

      if (!videoUrl) {
        return new Response(JSON.stringify({ 
          error: 'Could not find video URL. This might be a photo post.',
          debug: data 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: {
          videoUrl,
          thumbnail,
          shortcode,
          caption: data?.caption?.text || data?.caption || '',
          username: data?.user?.username || data?.owner?.username || 'Unknown',
          likes: data?.like_count || data?.edge_media_preview_like?.count || 0,
          views: data?.play_count || data?.video_view_count || 0,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'save') {
      // Download and save video to storage
      if (!videoData?.videoUrl) {
        return new Response(JSON.stringify({ error: 'No video URL provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Downloading video from:', videoData.videoUrl);

      // Download video
      const videoResponse = await fetch(videoData.videoUrl);
      if (!videoResponse.ok) {
        return new Response(JSON.stringify({ error: 'Failed to download video' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const videoBlob = await videoResponse.blob();
      const fileName = `${videoData.shortcode || Date.now()}.mp4`;
      const storagePath = `videos/${fileName}`;

      // Use service role for storage upload
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

      // Upload to storage
      const { data: uploadData, error: uploadError } = await adminSupabase.storage
        .from('instagram-videos')
        .upload(storagePath, videoBlob, {
          contentType: 'video/mp4',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return new Response(JSON.stringify({ error: 'Failed to upload video to storage' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get public URL
      const { data: publicUrlData } = adminSupabase.storage
        .from('instagram-videos')
        .getPublicUrl(storagePath);

      // Save to database
      const { data: dbData, error: dbError } = await adminSupabase
        .from('instagram_videos')
        .insert({
          instagram_url: videoData.instagramUrl,
          shortcode: videoData.shortcode,
          video_url: videoData.videoUrl,
          thumbnail_url: videoData.thumbnail,
          storage_path: storagePath,
          username: videoData.username,
          caption: videoData.caption,
          likes: videoData.likes || 0,
          views: videoData.views || 0,
          created_by: user.id,
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        return new Response(JSON.stringify({ error: 'Failed to save video record' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Video saved successfully:', dbData.id);

      return new Response(JSON.stringify({
        success: true,
        data: {
          id: dbData.id,
          storagePath,
          publicUrl: publicUrlData.publicUrl,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in download-instagram:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});