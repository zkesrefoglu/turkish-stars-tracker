CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  RETURN new;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: article_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    article_slug text NOT NULL,
    user_id uuid NOT NULL,
    reaction text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: article_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    article_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: athlete_daily_updates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.athlete_daily_updates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    athlete_id uuid NOT NULL,
    date date NOT NULL,
    played boolean DEFAULT false NOT NULL,
    match_result text,
    opponent text,
    competition text,
    home_away text,
    stats jsonb DEFAULT '{}'::jsonb,
    rating numeric(3,1),
    minutes_played integer,
    injury_status text DEFAULT 'healthy'::text,
    injury_details text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT athlete_daily_updates_home_away_check CHECK ((home_away = ANY (ARRAY['home'::text, 'away'::text, 'neutral'::text]))),
    CONSTRAINT athlete_daily_updates_injury_status_check CHECK ((injury_status = ANY (ARRAY['healthy'::text, 'questionable'::text, 'doubtful'::text, 'out'::text])))
);


--
-- Name: athlete_live_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.athlete_live_matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    athlete_id uuid NOT NULL,
    opponent text NOT NULL,
    competition text NOT NULL,
    home_away text,
    match_status text DEFAULT 'scheduled'::text NOT NULL,
    kickoff_time timestamp with time zone NOT NULL,
    current_minute integer DEFAULT 0,
    home_score integer DEFAULT 0,
    away_score integer DEFAULT 0,
    athlete_stats jsonb DEFAULT '{}'::jsonb,
    last_event text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT athlete_live_matches_home_away_check CHECK ((home_away = ANY (ARRAY['home'::text, 'away'::text]))),
    CONSTRAINT athlete_live_matches_match_status_check CHECK ((match_status = ANY (ARRAY['scheduled'::text, 'live'::text, 'halftime'::text, 'finished'::text])))
);


--
-- Name: athlete_news; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.athlete_news (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    athlete_id uuid NOT NULL,
    title text NOT NULL,
    summary text,
    source_url text NOT NULL,
    source_name text,
    image_url text,
    published_at timestamp with time zone,
    is_auto_crawled boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: athlete_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.athlete_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    sport text NOT NULL,
    team text NOT NULL,
    league text NOT NULL,
    photo_url text,
    "position" text NOT NULL,
    jersey_number integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    national_photo_url text,
    action_photo_url text,
    team_logo_url text,
    fotmob_id integer,
    balldontlie_id integer,
    api_football_id integer,
    bio text,
    instagram text,
    official_link text,
    CONSTRAINT athlete_profiles_sport_check CHECK ((sport = ANY (ARRAY['basketball'::text, 'football'::text])))
);


--
-- Name: athlete_season_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.athlete_season_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    athlete_id uuid NOT NULL,
    season text NOT NULL,
    competition text NOT NULL,
    stats jsonb DEFAULT '{}'::jsonb,
    games_played integer DEFAULT 0,
    games_started integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    rankings jsonb DEFAULT '{}'::jsonb
);


--
-- Name: athlete_transfer_rumors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.athlete_transfer_rumors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    athlete_id uuid NOT NULL,
    rumor_date date DEFAULT CURRENT_DATE NOT NULL,
    headline text NOT NULL,
    summary text,
    source text,
    source_url text,
    reliability text DEFAULT 'speculation'::text,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT athlete_transfer_rumors_reliability_check CHECK ((reliability = ANY (ARRAY['tier_1'::text, 'tier_2'::text, 'tier_3'::text, 'speculation'::text]))),
    CONSTRAINT athlete_transfer_rumors_status_check CHECK ((status = ANY (ARRAY['active'::text, 'confirmed'::text, 'denied'::text, 'expired'::text])))
);


--
-- Name: athlete_upcoming_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.athlete_upcoming_matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    athlete_id uuid NOT NULL,
    match_date timestamp with time zone NOT NULL,
    opponent text NOT NULL,
    competition text NOT NULL,
    home_away text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT athlete_upcoming_matches_home_away_check CHECK ((home_away = ANY (ARRAY['home'::text, 'away'::text, 'neutral'::text])))
);


--
-- Name: daily_topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_topics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    excerpt text NOT NULL,
    content text NOT NULL,
    author text NOT NULL,
    slug text NOT NULL,
    published boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: news_articles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.news_articles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    excerpt text NOT NULL,
    content text NOT NULL,
    author text NOT NULL,
    slug text NOT NULL,
    category text NOT NULL,
    image_url text,
    published boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_carousel_featured boolean DEFAULT false,
    is_mid_featured boolean DEFAULT false,
    display_order integer,
    is_carousel_pinned boolean DEFAULT false,
    category_pin_order integer,
    photo_credit text,
    breaking_news boolean DEFAULT false,
    extra_image_url text,
    extra_image_credit text,
    short_url text
);


--
-- Name: newsletter_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.newsletter_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: share_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.share_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    article_slug text NOT NULL,
    platform text NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: article_reactions article_reactions_article_slug_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_reactions
    ADD CONSTRAINT article_reactions_article_slug_user_id_key UNIQUE (article_slug, user_id);


--
-- Name: article_reactions article_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_reactions
    ADD CONSTRAINT article_reactions_pkey PRIMARY KEY (id);


--
-- Name: article_tags article_tags_article_id_tag_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_tags
    ADD CONSTRAINT article_tags_article_id_tag_id_key UNIQUE (article_id, tag_id);


--
-- Name: article_tags article_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_tags
    ADD CONSTRAINT article_tags_pkey PRIMARY KEY (id);


--
-- Name: athlete_daily_updates athlete_daily_updates_athlete_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_daily_updates
    ADD CONSTRAINT athlete_daily_updates_athlete_id_date_key UNIQUE (athlete_id, date);


--
-- Name: athlete_daily_updates athlete_daily_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_daily_updates
    ADD CONSTRAINT athlete_daily_updates_pkey PRIMARY KEY (id);


--
-- Name: athlete_live_matches athlete_live_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_live_matches
    ADD CONSTRAINT athlete_live_matches_pkey PRIMARY KEY (id);


--
-- Name: athlete_news athlete_news_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_news
    ADD CONSTRAINT athlete_news_pkey PRIMARY KEY (id);


--
-- Name: athlete_profiles athlete_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_profiles
    ADD CONSTRAINT athlete_profiles_pkey PRIMARY KEY (id);


--
-- Name: athlete_profiles athlete_profiles_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_profiles
    ADD CONSTRAINT athlete_profiles_slug_key UNIQUE (slug);


--
-- Name: athlete_season_stats athlete_season_stats_athlete_id_season_competition_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_season_stats
    ADD CONSTRAINT athlete_season_stats_athlete_id_season_competition_key UNIQUE (athlete_id, season, competition);


--
-- Name: athlete_season_stats athlete_season_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_season_stats
    ADD CONSTRAINT athlete_season_stats_pkey PRIMARY KEY (id);


--
-- Name: athlete_transfer_rumors athlete_transfer_rumors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_transfer_rumors
    ADD CONSTRAINT athlete_transfer_rumors_pkey PRIMARY KEY (id);


--
-- Name: athlete_upcoming_matches athlete_upcoming_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_upcoming_matches
    ADD CONSTRAINT athlete_upcoming_matches_pkey PRIMARY KEY (id);


--
-- Name: daily_topics daily_topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_topics
    ADD CONSTRAINT daily_topics_pkey PRIMARY KEY (id);


--
-- Name: daily_topics daily_topics_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_topics
    ADD CONSTRAINT daily_topics_slug_key UNIQUE (slug);


--
-- Name: news_articles news_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news_articles
    ADD CONSTRAINT news_articles_pkey PRIMARY KEY (id);


--
-- Name: news_articles news_articles_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news_articles
    ADD CONSTRAINT news_articles_slug_key UNIQUE (slug);


--
-- Name: newsletter_subscriptions newsletter_subscriptions_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscriptions
    ADD CONSTRAINT newsletter_subscriptions_email_key UNIQUE (email);


--
-- Name: newsletter_subscriptions newsletter_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscriptions
    ADD CONSTRAINT newsletter_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: share_analytics share_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.share_analytics
    ADD CONSTRAINT share_analytics_pkey PRIMARY KEY (id);


--
-- Name: tags tags_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_name_key UNIQUE (name);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: tags tags_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_slug_key UNIQUE (slug);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_article_tags_article_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_tags_article_id ON public.article_tags USING btree (article_id);


--
-- Name: idx_article_tags_tag_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_tags_tag_id ON public.article_tags USING btree (tag_id);


--
-- Name: idx_athlete_daily_updates_athlete_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_athlete_daily_updates_athlete_date ON public.athlete_daily_updates USING btree (athlete_id, date DESC);


--
-- Name: idx_athlete_news_athlete_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_athlete_news_athlete_id ON public.athlete_news USING btree (athlete_id);


--
-- Name: idx_athlete_news_published_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_athlete_news_published_at ON public.athlete_news USING btree (published_at DESC);


--
-- Name: idx_athlete_profiles_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_athlete_profiles_slug ON public.athlete_profiles USING btree (slug);


--
-- Name: idx_athlete_profiles_sport; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_athlete_profiles_sport ON public.athlete_profiles USING btree (sport);


--
-- Name: idx_athlete_season_stats_athlete_season; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_athlete_season_stats_athlete_season ON public.athlete_season_stats USING btree (athlete_id, season);


--
-- Name: idx_athlete_transfer_rumors_athlete; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_athlete_transfer_rumors_athlete ON public.athlete_transfer_rumors USING btree (athlete_id);


--
-- Name: idx_athlete_transfer_rumors_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_athlete_transfer_rumors_status ON public.athlete_transfer_rumors USING btree (status);


--
-- Name: idx_athlete_upcoming_matches_athlete; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_athlete_upcoming_matches_athlete ON public.athlete_upcoming_matches USING btree (athlete_id);


--
-- Name: idx_athlete_upcoming_matches_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_athlete_upcoming_matches_date ON public.athlete_upcoming_matches USING btree (match_date);


--
-- Name: idx_carousel_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_carousel_featured ON public.news_articles USING btree (is_carousel_featured, display_order, created_at) WHERE (published = true);


--
-- Name: idx_live_matches_athlete_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_live_matches_athlete_id ON public.athlete_live_matches USING btree (athlete_id);


--
-- Name: idx_live_matches_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_live_matches_status ON public.athlete_live_matches USING btree (match_status);


--
-- Name: idx_mid_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mid_featured ON public.news_articles USING btree (is_mid_featured, created_at) WHERE (published = true);


--
-- Name: idx_reactions_article; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reactions_article ON public.article_reactions USING btree (article_slug);


--
-- Name: idx_reactions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reactions_user ON public.article_reactions USING btree (user_id);


--
-- Name: idx_share_analytics_article; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_share_analytics_article ON public.share_analytics USING btree (article_slug);


--
-- Name: idx_share_analytics_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_share_analytics_created_at ON public.share_analytics USING btree (created_at);


--
-- Name: idx_share_analytics_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_share_analytics_platform ON public.share_analytics USING btree (platform);


--
-- Name: idx_tags_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tags_slug ON public.tags USING btree (slug);


--
-- Name: article_reactions update_article_reactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_article_reactions_updated_at BEFORE UPDATE ON public.article_reactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: athlete_live_matches update_athlete_live_matches_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_athlete_live_matches_updated_at BEFORE UPDATE ON public.athlete_live_matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: athlete_profiles update_athlete_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_athlete_profiles_updated_at BEFORE UPDATE ON public.athlete_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: athlete_season_stats update_athlete_season_stats_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_athlete_season_stats_updated_at BEFORE UPDATE ON public.athlete_season_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: athlete_transfer_rumors update_athlete_transfer_rumors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_athlete_transfer_rumors_updated_at BEFORE UPDATE ON public.athlete_transfer_rumors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: daily_topics update_daily_topics_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_daily_topics_updated_at BEFORE UPDATE ON public.daily_topics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: news_articles update_news_articles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_news_articles_updated_at BEFORE UPDATE ON public.news_articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: article_reactions article_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_reactions
    ADD CONSTRAINT article_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: article_tags article_tags_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_tags
    ADD CONSTRAINT article_tags_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.news_articles(id) ON DELETE CASCADE;


--
-- Name: article_tags article_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_tags
    ADD CONSTRAINT article_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: athlete_daily_updates athlete_daily_updates_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_daily_updates
    ADD CONSTRAINT athlete_daily_updates_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.athlete_profiles(id) ON DELETE CASCADE;


--
-- Name: athlete_live_matches athlete_live_matches_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_live_matches
    ADD CONSTRAINT athlete_live_matches_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.athlete_profiles(id) ON DELETE CASCADE;


--
-- Name: athlete_news athlete_news_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_news
    ADD CONSTRAINT athlete_news_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.athlete_profiles(id) ON DELETE CASCADE;


--
-- Name: athlete_season_stats athlete_season_stats_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_season_stats
    ADD CONSTRAINT athlete_season_stats_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.athlete_profiles(id) ON DELETE CASCADE;


--
-- Name: athlete_transfer_rumors athlete_transfer_rumors_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_transfer_rumors
    ADD CONSTRAINT athlete_transfer_rumors_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.athlete_profiles(id) ON DELETE CASCADE;


--
-- Name: athlete_upcoming_matches athlete_upcoming_matches_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_upcoming_matches
    ADD CONSTRAINT athlete_upcoming_matches_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.athlete_profiles(id) ON DELETE CASCADE;


--
-- Name: share_analytics share_analytics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.share_analytics
    ADD CONSTRAINT share_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: article_tags Admins can delete article tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete article tags" ON public.article_tags FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: news_articles Admins can delete articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete articles" ON public.news_articles FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: athlete_daily_updates Admins can delete athlete daily updates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete athlete daily updates" ON public.athlete_daily_updates FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: athlete_news Admins can delete athlete news; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete athlete news" ON public.athlete_news FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: athlete_profiles Admins can delete athlete profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete athlete profiles" ON public.athlete_profiles FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: athlete_season_stats Admins can delete athlete season stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete athlete season stats" ON public.athlete_season_stats FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: athlete_transfer_rumors Admins can delete athlete transfer rumors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete athlete transfer rumors" ON public.athlete_transfer_rumors FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: athlete_upcoming_matches Admins can delete athlete upcoming matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete athlete upcoming matches" ON public.athlete_upcoming_matches FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: athlete_live_matches Admins can delete live matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete live matches" ON public.athlete_live_matches FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tags Admins can delete tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete tags" ON public.tags FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: daily_topics Admins can delete topics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete topics" ON public.daily_topics FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: article_tags Admins can insert article tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert article tags" ON public.article_tags FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: news_articles Admins can insert articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert articles" ON public.news_articles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: athlete_daily_updates Admins can insert athlete daily updates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert athlete daily updates" ON public.athlete_daily_updates FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: athlete_news Admins can insert athlete news; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert athlete news" ON public.athlete_news FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: athlete_profiles Admins can insert athlete profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert athlete profiles" ON public.athlete_profiles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: athlete_season_stats Admins can insert athlete season stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert athlete season stats" ON public.athlete_season_stats FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: athlete_transfer_rumors Admins can insert athlete transfer rumors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert athlete transfer rumors" ON public.athlete_transfer_rumors FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: athlete_upcoming_matches Admins can insert athlete upcoming matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert athlete upcoming matches" ON public.athlete_upcoming_matches FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: athlete_live_matches Admins can insert live matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert live matches" ON public.athlete_live_matches FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tags Admins can insert tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert tags" ON public.tags FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: daily_topics Admins can insert topics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert topics" ON public.daily_topics FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: article_tags Admins can update article tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update article tags" ON public.article_tags FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: news_articles Admins can update articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update articles" ON public.news_articles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: athlete_daily_updates Admins can update athlete daily updates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update athlete daily updates" ON public.athlete_daily_updates FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: athlete_news Admins can update athlete news; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update athlete news" ON public.athlete_news FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: athlete_profiles Admins can update athlete profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update athlete profiles" ON public.athlete_profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: athlete_season_stats Admins can update athlete season stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update athlete season stats" ON public.athlete_season_stats FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: athlete_transfer_rumors Admins can update athlete transfer rumors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update athlete transfer rumors" ON public.athlete_transfer_rumors FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: athlete_upcoming_matches Admins can update athlete upcoming matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update athlete upcoming matches" ON public.athlete_upcoming_matches FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: athlete_live_matches Admins can update live matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update live matches" ON public.athlete_live_matches FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tags Admins can update tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update tags" ON public.tags FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: daily_topics Admins can update topics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update topics" ON public.daily_topics FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: news_articles Admins can view all articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all articles" ON public.news_articles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: daily_topics Admins can view all topics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all topics" ON public.daily_topics FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: newsletter_subscriptions Admins can view newsletter subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view newsletter subscriptions" ON public.newsletter_subscriptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: share_analytics Admins can view share analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view share analytics" ON public.share_analytics FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: newsletter_subscriptions Anyone can subscribe to newsletter; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscriptions FOR INSERT WITH CHECK (true);


--
-- Name: share_analytics Anyone can track shares; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can track shares" ON public.share_analytics FOR INSERT WITH CHECK (true);


--
-- Name: article_tags Anyone can view article tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view article tags" ON public.article_tags FOR SELECT USING (true);


--
-- Name: athlete_daily_updates Anyone can view athlete daily updates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view athlete daily updates" ON public.athlete_daily_updates FOR SELECT USING (true);


--
-- Name: athlete_news Anyone can view athlete news; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view athlete news" ON public.athlete_news FOR SELECT USING (true);


--
-- Name: athlete_profiles Anyone can view athlete profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view athlete profiles" ON public.athlete_profiles FOR SELECT USING (true);


--
-- Name: athlete_season_stats Anyone can view athlete season stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view athlete season stats" ON public.athlete_season_stats FOR SELECT USING (true);


--
-- Name: athlete_transfer_rumors Anyone can view athlete transfer rumors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view athlete transfer rumors" ON public.athlete_transfer_rumors FOR SELECT USING (true);


--
-- Name: athlete_upcoming_matches Anyone can view athlete upcoming matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view athlete upcoming matches" ON public.athlete_upcoming_matches FOR SELECT USING (true);


--
-- Name: athlete_live_matches Anyone can view live matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view live matches" ON public.athlete_live_matches FOR SELECT USING (true);


--
-- Name: news_articles Anyone can view published articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view published articles" ON public.news_articles FOR SELECT USING ((published = true));


--
-- Name: daily_topics Anyone can view published topics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view published topics" ON public.daily_topics FOR SELECT USING ((published = true));


--
-- Name: article_reactions Anyone can view reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view reactions" ON public.article_reactions FOR SELECT USING (true);


--
-- Name: tags Anyone can view tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view tags" ON public.tags FOR SELECT USING (true);


--
-- Name: article_reactions Users can add reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add reactions" ON public.article_reactions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: article_reactions Users can delete their reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their reactions" ON public.article_reactions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: article_reactions Users can update their reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their reactions" ON public.article_reactions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: article_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.article_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: article_tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.article_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: athlete_daily_updates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.athlete_daily_updates ENABLE ROW LEVEL SECURITY;

--
-- Name: athlete_live_matches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.athlete_live_matches ENABLE ROW LEVEL SECURITY;

--
-- Name: athlete_news; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.athlete_news ENABLE ROW LEVEL SECURITY;

--
-- Name: athlete_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: athlete_season_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.athlete_season_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: athlete_transfer_rumors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.athlete_transfer_rumors ENABLE ROW LEVEL SECURITY;

--
-- Name: athlete_upcoming_matches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.athlete_upcoming_matches ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_topics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_topics ENABLE ROW LEVEL SECURITY;

--
-- Name: news_articles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

--
-- Name: newsletter_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: share_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.share_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


