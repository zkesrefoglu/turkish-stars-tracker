export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      article_reactions: {
        Row: {
          article_slug: string
          created_at: string
          id: string
          reaction: string
          updated_at: string
          user_id: string
        }
        Insert: {
          article_slug: string
          created_at?: string
          id?: string
          reaction: string
          updated_at?: string
          user_id: string
        }
        Update: {
          article_slug?: string
          created_at?: string
          id?: string
          reaction?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      article_tags: {
        Row: {
          article_id: string
          created_at: string
          id: string
          tag_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          tag_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_tags_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "news_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_daily_updates: {
        Row: {
          athlete_id: string
          competition: string | null
          created_at: string
          date: string
          home_away: string | null
          id: string
          injury_details: string | null
          injury_status: string | null
          match_result: string | null
          minutes_played: number | null
          opponent: string | null
          played: boolean
          rating: number | null
          stats: Json | null
        }
        Insert: {
          athlete_id: string
          competition?: string | null
          created_at?: string
          date: string
          home_away?: string | null
          id?: string
          injury_details?: string | null
          injury_status?: string | null
          match_result?: string | null
          minutes_played?: number | null
          opponent?: string | null
          played?: boolean
          rating?: number | null
          stats?: Json | null
        }
        Update: {
          athlete_id?: string
          competition?: string | null
          created_at?: string
          date?: string
          home_away?: string | null
          id?: string
          injury_details?: string | null
          injury_status?: string | null
          match_result?: string | null
          minutes_played?: number | null
          opponent?: string | null
          played?: boolean
          rating?: number | null
          stats?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_daily_updates_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_efficiency_rankings: {
        Row: {
          athlete_id: string
          created_at: string
          efficiency_index: number | null
          id: string
          is_featured_athlete: boolean | null
          month: string
          per: number | null
          player_name: string
          team: string
          ts_pct: number | null
          updated_at: string
          ws: number | null
        }
        Insert: {
          athlete_id: string
          created_at?: string
          efficiency_index?: number | null
          id?: string
          is_featured_athlete?: boolean | null
          month: string
          per?: number | null
          player_name: string
          team: string
          ts_pct?: number | null
          updated_at?: string
          ws?: number | null
        }
        Update: {
          athlete_id?: string
          created_at?: string
          efficiency_index?: number | null
          id?: string
          is_featured_athlete?: boolean | null
          month?: string
          per?: number | null
          player_name?: string
          team?: string
          ts_pct?: number | null
          updated_at?: string
          ws?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_efficiency_rankings_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_injury_history: {
        Row: {
          athlete_id: string
          created_at: string
          days_missed: number | null
          description: string | null
          end_date: string | null
          games_missed: number | null
          id: string
          injury_type: string
          injury_zone: string | null
          is_current: boolean | null
          severity: string | null
          source_url: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          days_missed?: number | null
          description?: string | null
          end_date?: string | null
          games_missed?: number | null
          id?: string
          injury_type: string
          injury_zone?: string | null
          is_current?: boolean | null
          severity?: string | null
          source_url?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          days_missed?: number | null
          description?: string | null
          end_date?: string | null
          games_missed?: number | null
          id?: string
          injury_type?: string
          injury_zone?: string | null
          is_current?: boolean | null
          severity?: string | null
          source_url?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_injury_history_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_live_matches: {
        Row: {
          athlete_id: string
          athlete_stats: Json | null
          away_score: number | null
          competition: string
          created_at: string
          current_minute: number | null
          home_away: string | null
          home_score: number | null
          id: string
          kickoff_time: string
          last_event: string | null
          match_status: string
          opponent: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          athlete_stats?: Json | null
          away_score?: number | null
          competition: string
          created_at?: string
          current_minute?: number | null
          home_away?: string | null
          home_score?: number | null
          id?: string
          kickoff_time: string
          last_event?: string | null
          match_status?: string
          opponent: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          athlete_stats?: Json | null
          away_score?: number | null
          competition?: string
          created_at?: string
          current_minute?: number | null
          home_away?: string | null
          home_score?: number | null
          id?: string
          kickoff_time?: string
          last_event?: string | null
          match_status?: string
          opponent?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_live_matches_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_market_values: {
        Row: {
          athlete_id: string
          club_at_time: string | null
          created_at: string
          currency: string | null
          id: string
          market_value: number
          recorded_date: string
          source: string | null
          value_change: number | null
          value_change_percentage: number | null
        }
        Insert: {
          athlete_id: string
          club_at_time?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          market_value: number
          recorded_date: string
          source?: string | null
          value_change?: number | null
          value_change_percentage?: number | null
        }
        Update: {
          athlete_id?: string
          club_at_time?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          market_value?: number
          recorded_date?: string
          source?: string | null
          value_change?: number | null
          value_change_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_market_values_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_news: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          image_url: string | null
          is_auto_crawled: boolean | null
          published_at: string | null
          source_name: string | null
          source_url: string
          summary: string | null
          title: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_auto_crawled?: boolean | null
          published_at?: string | null
          source_name?: string | null
          source_url: string
          summary?: string | null
          title: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_auto_crawled?: boolean | null
          published_at?: string | null
          source_name?: string | null
          source_url?: string
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_news_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_profiles: {
        Row: {
          action_photo_url: string | null
          api_football_id: number | null
          balldontlie_id: number | null
          bio: string | null
          contract_until: string | null
          created_at: string
          current_market_value: number | null
          date_of_birth: string | null
          fotmob_id: number | null
          height_cm: number | null
          id: string
          instagram: string | null
          jersey_number: number | null
          league: string
          market_value_currency: string | null
          name: string
          national_photo_url: string | null
          nationality: string | null
          official_link: string | null
          photo_url: string | null
          position: string
          preferred_foot: string | null
          slug: string
          sport: string
          team: string
          team_logo_url: string | null
          transfermarkt_id: number | null
          transfermarkt_slug: string | null
          updated_at: string
        }
        Insert: {
          action_photo_url?: string | null
          api_football_id?: number | null
          balldontlie_id?: number | null
          bio?: string | null
          contract_until?: string | null
          created_at?: string
          current_market_value?: number | null
          date_of_birth?: string | null
          fotmob_id?: number | null
          height_cm?: number | null
          id?: string
          instagram?: string | null
          jersey_number?: number | null
          league: string
          market_value_currency?: string | null
          name: string
          national_photo_url?: string | null
          nationality?: string | null
          official_link?: string | null
          photo_url?: string | null
          position: string
          preferred_foot?: string | null
          slug: string
          sport: string
          team: string
          team_logo_url?: string | null
          transfermarkt_id?: number | null
          transfermarkt_slug?: string | null
          updated_at?: string
        }
        Update: {
          action_photo_url?: string | null
          api_football_id?: number | null
          balldontlie_id?: number | null
          bio?: string | null
          contract_until?: string | null
          created_at?: string
          current_market_value?: number | null
          date_of_birth?: string | null
          fotmob_id?: number | null
          height_cm?: number | null
          id?: string
          instagram?: string | null
          jersey_number?: number | null
          league?: string
          market_value_currency?: string | null
          name?: string
          national_photo_url?: string | null
          nationality?: string | null
          official_link?: string | null
          photo_url?: string | null
          position?: string
          preferred_foot?: string | null
          slug?: string
          sport?: string
          team?: string
          team_logo_url?: string | null
          transfermarkt_id?: number | null
          transfermarkt_slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      athlete_season_stats: {
        Row: {
          athlete_id: string
          competition: string
          created_at: string
          games_played: number | null
          games_started: number | null
          id: string
          rankings: Json | null
          season: string
          stats: Json | null
          updated_at: string
        }
        Insert: {
          athlete_id: string
          competition: string
          created_at?: string
          games_played?: number | null
          games_started?: number | null
          id?: string
          rankings?: Json | null
          season: string
          stats?: Json | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          competition?: string
          created_at?: string
          games_played?: number | null
          games_started?: number | null
          id?: string
          rankings?: Json | null
          season?: string
          stats?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_season_stats_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_transfer_history: {
        Row: {
          athlete_id: string
          contract_years: number | null
          created_at: string
          fee_currency: string | null
          from_club: string
          from_club_logo_url: string | null
          id: string
          market_value_at_transfer: number | null
          notes: string | null
          season: string | null
          source_url: string | null
          to_club: string
          to_club_logo_url: string | null
          transfer_date: string
          transfer_fee: number | null
          transfer_type: string | null
          updated_at: string
        }
        Insert: {
          athlete_id: string
          contract_years?: number | null
          created_at?: string
          fee_currency?: string | null
          from_club: string
          from_club_logo_url?: string | null
          id?: string
          market_value_at_transfer?: number | null
          notes?: string | null
          season?: string | null
          source_url?: string | null
          to_club: string
          to_club_logo_url?: string | null
          transfer_date: string
          transfer_fee?: number | null
          transfer_type?: string | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          contract_years?: number | null
          created_at?: string
          fee_currency?: string | null
          from_club?: string
          from_club_logo_url?: string | null
          id?: string
          market_value_at_transfer?: number | null
          notes?: string | null
          season?: string | null
          source_url?: string | null
          to_club?: string
          to_club_logo_url?: string | null
          transfer_date?: string
          transfer_fee?: number | null
          transfer_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_transfer_history_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_transfer_rumors: {
        Row: {
          athlete_id: string
          contract_offer_years: number | null
          created_at: string
          fee_currency: string | null
          headline: string
          id: string
          interested_club: string | null
          interested_club_logo_url: string | null
          probability_percentage: number | null
          reliability: string | null
          rumor_date: string
          rumored_fee: number | null
          source: string | null
          source_url: string | null
          status: string | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          athlete_id: string
          contract_offer_years?: number | null
          created_at?: string
          fee_currency?: string | null
          headline: string
          id?: string
          interested_club?: string | null
          interested_club_logo_url?: string | null
          probability_percentage?: number | null
          reliability?: string | null
          rumor_date?: string
          rumored_fee?: number | null
          source?: string | null
          source_url?: string | null
          status?: string | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          contract_offer_years?: number | null
          created_at?: string
          fee_currency?: string | null
          headline?: string
          id?: string
          interested_club?: string | null
          interested_club_logo_url?: string | null
          probability_percentage?: number | null
          reliability?: string | null
          rumor_date?: string
          rumored_fee?: number | null
          source?: string | null
          source_url?: string | null
          status?: string | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_transfer_rumors_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_upcoming_matches: {
        Row: {
          athlete_id: string
          competition: string
          created_at: string
          home_away: string | null
          id: string
          match_date: string
          opponent: string
        }
        Insert: {
          athlete_id: string
          competition: string
          created_at?: string
          home_away?: string | null
          id?: string
          match_date: string
          opponent: string
        }
        Update: {
          athlete_id?: string
          competition?: string
          created_at?: string
          home_away?: string | null
          id?: string
          match_date?: string
          opponent?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_upcoming_matches_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_videos: {
        Row: {
          athlete_id: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean | null
          storage_path: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean | null
          storage_path?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean | null
          storage_path?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_videos_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_topics: {
        Row: {
          author: string
          content: string
          created_at: string
          excerpt: string
          id: string
          published: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author: string
          content: string
          created_at?: string
          excerpt: string
          id?: string
          published?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          content?: string
          created_at?: string
          excerpt?: string
          id?: string
          published?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      hero_settings: {
        Row: {
          created_at: string
          cta_href: string | null
          cta_text: string | null
          id: string
          min_height_vh: number | null
          overlay_opacity: number | null
          poster_url: string | null
          subtitle: string | null
          title: string | null
          updated_at: string
          video_position_x: number | null
          video_position_y: number | null
          video_scale: number | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          cta_href?: string | null
          cta_text?: string | null
          id?: string
          min_height_vh?: number | null
          overlay_opacity?: number | null
          poster_url?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          video_position_x?: number | null
          video_position_y?: number | null
          video_scale?: number | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          cta_href?: string | null
          cta_text?: string | null
          id?: string
          min_height_vh?: number | null
          overlay_opacity?: number | null
          poster_url?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          video_position_x?: number | null
          video_position_y?: number | null
          video_scale?: number | null
          video_url?: string | null
        }
        Relationships: []
      }
      instagram_videos: {
        Row: {
          caption: string | null
          created_by: string | null
          downloaded_at: string
          id: string
          instagram_url: string
          likes: number | null
          shortcode: string | null
          storage_path: string | null
          thumbnail_url: string | null
          username: string | null
          video_url: string
          views: number | null
        }
        Insert: {
          caption?: string | null
          created_by?: string | null
          downloaded_at?: string
          id?: string
          instagram_url: string
          likes?: number | null
          shortcode?: string | null
          storage_path?: string | null
          thumbnail_url?: string | null
          username?: string | null
          video_url: string
          views?: number | null
        }
        Update: {
          caption?: string | null
          created_by?: string | null
          downloaded_at?: string
          id?: string
          instagram_url?: string
          likes?: number | null
          shortcode?: string | null
          storage_path?: string | null
          thumbnail_url?: string | null
          username?: string | null
          video_url?: string
          views?: number | null
        }
        Relationships: []
      }
      news_articles: {
        Row: {
          author: string
          breaking_news: boolean | null
          category: string
          category_pin_order: number | null
          content: string
          created_at: string
          display_order: number | null
          excerpt: string
          extra_image_credit: string | null
          extra_image_url: string | null
          id: string
          image_url: string | null
          is_carousel_featured: boolean | null
          is_carousel_pinned: boolean | null
          is_mid_featured: boolean | null
          photo_credit: string | null
          published: boolean
          short_url: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author: string
          breaking_news?: boolean | null
          category: string
          category_pin_order?: number | null
          content: string
          created_at?: string
          display_order?: number | null
          excerpt: string
          extra_image_credit?: string | null
          extra_image_url?: string | null
          id?: string
          image_url?: string | null
          is_carousel_featured?: boolean | null
          is_carousel_pinned?: boolean | null
          is_mid_featured?: boolean | null
          photo_credit?: string | null
          published?: boolean
          short_url?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          breaking_news?: boolean | null
          category?: string
          category_pin_order?: number | null
          content?: string
          created_at?: string
          display_order?: number | null
          excerpt?: string
          extra_image_credit?: string | null
          extra_image_url?: string | null
          id?: string
          image_url?: string | null
          is_carousel_featured?: boolean | null
          is_carousel_pinned?: boolean | null
          is_mid_featured?: boolean | null
          photo_credit?: string | null
          published?: boolean
          short_url?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscriptions: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      share_analytics: {
        Row: {
          article_slug: string
          created_at: string
          id: string
          platform: string
          user_id: string | null
        }
        Insert: {
          article_slug: string
          created_at?: string
          id?: string
          platform: string
          user_id?: string | null
        }
        Update: {
          article_slug?: string
          created_at?: string
          id?: string
          platform?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          status: string
          sync_type: string
          synced_at: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          status?: string
          sync_type: string
          synced_at?: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          status?: string
          sync_type?: string
          synced_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
