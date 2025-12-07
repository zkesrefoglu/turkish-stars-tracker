import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HeroSettings {
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

const defaultSettings: HeroSettings = {
  video_url: '/videos/eff56f640ac04ddd80dd79eba9c2818a.mp4',
  poster_url: '/images/turkish-flag.jpg',
  title: 'Turkish Stars Tracker',
  subtitle: 'Follow your favorite Turkish athletes around the world',
  cta_text: 'Explore Athletes',
  cta_href: '/',
  overlay_opacity: 0.4,
  video_scale: 1.0,
  video_position_x: 50,
  video_position_y: 50,
  min_height_vh: 80,
};

export function useHeroSettings() {
  const [settings, setSettings] = useState<HeroSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('hero_settings')
          .select('*')
          .limit(1)
          .single();

        if (data && !error) {
          setSettings({
            video_url: data.video_url,
            poster_url: data.poster_url,
            title: data.title || defaultSettings.title,
            subtitle: data.subtitle || defaultSettings.subtitle,
            cta_text: data.cta_text || defaultSettings.cta_text,
            cta_href: data.cta_href || defaultSettings.cta_href,
            overlay_opacity: Number(data.overlay_opacity) || defaultSettings.overlay_opacity,
            video_scale: Number(data.video_scale) || defaultSettings.video_scale,
            video_position_x: data.video_position_x || defaultSettings.video_position_x,
            video_position_y: data.video_position_y || defaultSettings.video_position_y,
            min_height_vh: data.min_height_vh || defaultSettings.min_height_vh,
          });
        }
      } catch (error) {
        console.error('Failed to load hero settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  return { settings, loading };
}
