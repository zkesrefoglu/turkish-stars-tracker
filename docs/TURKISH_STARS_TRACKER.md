# Turkish Stars Tracker - Technical Documentation

## Overview

The Turkish Stars Tracker is a standalone web application that tracks Turkish athletes playing abroad in top international leagues. It provides real-time performance data, injury status, transfer history, market values, news aggregation, and upcoming match schedules. The application features a hero landing page and comprehensive athlete profiles with rich data visualizations.

**Tagline**: "Bringing Turkish Stars Home — Digitally"

---

## Athletes Tracked

| Athlete | Sport | Team | League | Transfermarkt ID | FotMob ID |
|---------|-------|------|--------|------------------|-----------|
| Alperen Şengün | Basketball | Houston Rockets | NBA | - | - |
| Arda Güler | Football | Real Madrid | La Liga | 797954 | 1174498 |
| Kenan Yıldız | Football | Juventus | Serie A | 686379 | 1181812 |
| Ferdi Kadıoğlu | Football | Brighton | Premier League | 378032 | 678073 |
| Can Uzun | Football | Eintracht Frankfurt | Bundesliga | 757498 | 1175597 |
| Berke Özer | Football | Lille | Ligue 1 | 586628 | 1028855 |
| Hakan Çalhanoğlu | Football | Inter Milan | Serie A | 35251 | 175889 |

---

## File Structure

### Frontend Pages

#### `src/pages/TurkishStarsIndex.tsx`
**Purpose**: Main landing page / homepage with hero video and featured content.

**Features**:
- Full-screen hero video section with customizable settings
- CTA button linking to athlete listing
- Dynamic content loaded from hero_settings database table

**Route**: `/`

---

#### `src/pages/TurkishStars.tsx`
**Purpose**: Athlete listing/dashboard page displaying all tracked athletes.

**Features**:
- Displays athlete cards with profile photos and team logos
- Shows injury alerts and transfer rumors in alert sections
- Lists last match stats (PTS/REB/AST for basketball, G/A for football)
- Displays match results and upcoming fixtures
- Responsive grid layout (1 column mobile, 2 tablet, 3 desktop)
- Clickable cards linking to individual athlete profiles

**Route**: `/athletes`

---

#### `src/pages/AthleteProfile.tsx`
**Purpose**: Individual athlete profile page with detailed statistics and history.

**Features**:
- Hero banner with action photo and gradient overlay
- Profile photo circle with team photo
- Bio section with social media links (Instagram, official website)
- Athlete news carousel (up to 5 recent articles)
- Athlete video carousel (up to 10 short videos)
- Tabbed navigation for stats and history

**Tabs**:
- **Season Stats**: Season statistics by competition
- **Matches**: Match history with detailed performance data
- **Transfers**: Transfer rumors with reliability badges
- **Market Value**: Interactive chart showing historical market value trends (football only)
- **Transfer History**: Timeline visualization of transfer history (football only)
- **Injuries**: Chronological list of injury records (football only)

**Basketball-Specific Features**:
- **Season Averages**: PPG, RPG, APG, BPG with NBA rankings
- **Career Highs**: Max points, rebounds, assists, blocks
- **Milestones**: Double-doubles, triple-doubles, 20+ point games, 30+ point games
- **Game Stats Chart**: Interactive line chart showing last 12-20 games performance
- **Efficiency Rankings Table**: PER, TS%, Win Shares comparison with league leaders

**Route**: `/athletes/:slug`

---

#### `src/pages/AdminTST.tsx`
**Purpose**: Admin dashboard for managing Turkish Stars Tracker data.

**Features**:
- Tabbed interface for managing all data types
- CRUD operations for athletes, daily updates, live matches, transfer rumors, upcoming matches, season stats
- Manual sync triggers for all API data fetching functions
- Sync status display with "Last synced" timestamps
- Hero settings panel for video/content management
- Efficiency rankings panel for NBA player comparisons
- Athlete videos panel for managing video content
- Instagram video downloader/uploader

**Route**: `/admin/tst`

---

### Routing Configuration

#### `src/App.tsx`
Contains route definitions:
```tsx
<Route path="/" element={<TurkishStarsIndex />} />
<Route path="/athletes" element={<TurkishStars />} />
<Route path="/athletes/:slug" element={<AthleteProfile />} />
<Route path="/admin/tst" element={<AdminTST />} />
```

---

## Key Components

### Data Visualization

| Component | Purpose |
|-----------|---------|
| `MarketValueChart.tsx` | Interactive Recharts line chart for market value history |
| `TransferHistoryTimeline.tsx` | Timeline visualization of transfer records |
| `InjuryHistoryList.tsx` | Chronological injury history display |
| `NBAGameStatsChart.tsx` | Per-game performance chart (PTS/REB/AST) with double-double markers |
| `EfficiencyRankingsTable.tsx` | NBA efficiency metrics comparison table |
| `RatingTrendChart.tsx` | Football match rating trends |

### Media

| Component | Purpose |
|-----------|---------|
| `HeroVideo.tsx` | Full-screen hero video with overlay and CTA |
| `AthleteVideoCarousel.tsx` | Horizontal carousel of athlete short videos (max 10) |
| `AthleteNewsCarousel.tsx` | Horizontal carousel of recent news articles (max 5) |
| `LiveMatchTracker.tsx` | Real-time live match score display |

### Admin Panels

| Component | Purpose |
|-----------|---------|
| `HeroSettingsPanel.tsx` | Manage hero video, content, and visual settings |
| `EfficiencyRankingsPanel.tsx` | CRUD for NBA efficiency rankings |
| `AthleteVideosPanel.tsx` | Manage athlete video content (max 10 per athlete) |
| `InstagramDownloaderPanel.tsx` | Upload Instagram videos manually |

---

## Database Schema (Lovable Cloud)

### Table: `athlete_profiles`
**Purpose**: Core athlete information and metadata.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Athlete's full name |
| slug | TEXT | URL-friendly identifier |
| sport | TEXT | "basketball" or "football" |
| team | TEXT | Current team name |
| league | TEXT | League name |
| position | TEXT | Playing position |
| jersey_number | INTEGER | Jersey number |
| photo_url | TEXT | Team headshot URL |
| national_photo_url | TEXT | National team photo URL |
| action_photo_url | TEXT | Action shot URL |
| team_logo_url | TEXT | Team logo URL |
| bio | TEXT | Athlete biography |
| instagram | TEXT | Instagram handle |
| official_link | TEXT | Official website URL |
| transfermarkt_id | INTEGER | Transfermarkt player ID |
| transfermarkt_slug | TEXT | Transfermarkt URL slug |
| fotmob_id | INTEGER | FotMob player ID |
| api_football_id | INTEGER | API-Football player ID |
| balldontlie_id | INTEGER | Balldontlie API player ID |
| current_market_value | DECIMAL | Current market value |
| market_value_currency | TEXT | Currency (default: EUR) |
| contract_until | DATE | Contract expiry date |
| date_of_birth | DATE | Birth date |
| nationality | TEXT | Nationality (default: Turkey) |
| height_cm | INTEGER | Height in centimeters |
| preferred_foot | TEXT | Preferred foot |

**RLS Policies**: Public read, admin-only write.

---

### Table: `athlete_daily_updates`
**Purpose**: Per-match performance tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| athlete_id | UUID | Foreign key to athlete_profiles |
| date | DATE | Match date |
| played | BOOLEAN | Whether athlete played |
| opponent | TEXT | Opposing team |
| competition | TEXT | Competition name |
| home_away | TEXT | "home" or "away" |
| match_result | TEXT | Score result |
| stats | JSONB | Sport-specific statistics |
| rating | DECIMAL | Match rating (if available) |
| minutes_played | INTEGER | Minutes on field/court |
| injury_status | TEXT | "healthy", "minor", "moderate", "major" |
| injury_details | TEXT | Injury description |

**Stats JSONB Structure**:
- Basketball: `{ "points": 28, "rebounds": 10, "assists": 5, "steals": 2, "blocks": 1, "fg_made": 11, "fg_attempted": 20, "fg_pct": 0.55, ... }`
- Football: `{ "goals": 1, "assists": 0, "rating": 7.5 }`
- Goalkeeper: `{ "saves": 5, "goals_conceded": 1, "clean_sheet": false }`

---

### Table: `athlete_transfer_history`
**Purpose**: Historical transfer records.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| athlete_id | UUID | Foreign key to athlete_profiles |
| transfer_date | DATE | Date of transfer |
| from_club | TEXT | Previous club |
| from_club_logo_url | TEXT | Previous club logo |
| to_club | TEXT | New club |
| to_club_logo_url | TEXT | New club logo |
| transfer_fee | DECIMAL | Transfer fee amount |
| fee_currency | TEXT | Currency of fee |
| transfer_type | TEXT | "transfer", "loan", "free", "youth" |
| market_value_at_transfer | DECIMAL | Market value at time of transfer |
| contract_years | INTEGER | Contract length |
| notes | TEXT | Additional notes |
| source_url | TEXT | Source article URL |

---

### Table: `athlete_injury_history`
**Purpose**: Injury records tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| athlete_id | UUID | Foreign key to athlete_profiles |
| injury_type | TEXT | Type of injury |
| injury_zone | TEXT | Body part affected |
| start_date | DATE | Injury start date |
| end_date | DATE | Recovery date (null if ongoing) |
| days_missed | INTEGER | Days missed |
| games_missed | INTEGER | Games missed |
| severity | TEXT | Severity level |
| is_current | BOOLEAN | Currently injured |
| description | TEXT | Injury description |
| source_url | TEXT | Source article URL |

---

### Table: `athlete_market_values`
**Purpose**: Time-series market value tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| athlete_id | UUID | Foreign key to athlete_profiles |
| recorded_date | DATE | Date of valuation |
| market_value | DECIMAL | Market value |
| currency | TEXT | Currency (default: EUR) |
| value_change | DECIMAL | Change from previous |
| value_change_percentage | DECIMAL | Percentage change |
| source | TEXT | Data source |

---

### Table: `athlete_transfer_rumors`
**Purpose**: Transfer news and speculation tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| athlete_id | UUID | Foreign key to athlete_profiles |
| rumor_date | DATE | Date of rumor |
| headline | TEXT | Rumor headline |
| summary | TEXT | Detailed summary |
| source | TEXT | News source name |
| source_url | TEXT | Link to original article |
| reliability | TEXT | "tier1", "tier2", "tier3", "tier4" |
| status | TEXT | "active", "confirmed", "denied" |
| interested_club | TEXT | Club showing interest |
| interested_club_logo_url | TEXT | Club logo URL |
| rumored_fee | DECIMAL | Rumored transfer fee |
| fee_currency | TEXT | Currency of fee |
| contract_offer_years | INTEGER | Contract offer length |
| probability_percentage | INTEGER | Transfer probability |

---

### Table: `athlete_upcoming_matches`
**Purpose**: Scheduled fixture tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| athlete_id | UUID | Foreign key to athlete_profiles |
| match_date | TIMESTAMP | Date and time of match |
| opponent | TEXT | Opposing team |
| competition | TEXT | Competition name |
| home_away | TEXT | "home" or "away" |

---

### Table: `athlete_season_stats`
**Purpose**: Aggregated season-level statistics.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| athlete_id | UUID | Foreign key to athlete_profiles |
| season | TEXT | Season identifier (e.g., "2024-25") |
| competition | TEXT | Competition name |
| games_played | INTEGER | Total games |
| games_started | INTEGER | Games started |
| stats | JSONB | Aggregated statistics |
| rankings | JSONB | League rankings for stats |

---

### Table: `athlete_live_matches`
**Purpose**: Real-time match tracking with live score updates.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| athlete_id | UUID | Foreign key to athlete_profiles |
| opponent | TEXT | Opposing team |
| competition | TEXT | Competition name |
| home_away | TEXT | "home" or "away" |
| match_status | TEXT | "scheduled", "live", "halftime", "finished" |
| kickoff_time | TIMESTAMP | Match start time |
| current_minute | INTEGER | Current match minute |
| home_score | INTEGER | Home team score |
| away_score | INTEGER | Away team score |
| athlete_stats | JSONB | Live athlete performance stats |
| last_event | TEXT | Most recent match event |

**Realtime**: Enabled via `supabase_realtime` publication.

---

### Table: `athlete_efficiency_rankings`
**Purpose**: NBA efficiency metrics comparison.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| athlete_id | UUID | Foreign key to athlete_profiles |
| player_name | TEXT | Player name |
| team | TEXT | Team name |
| month | TEXT | Month of rankings |
| per | DECIMAL | Player Efficiency Rating |
| ts_pct | DECIMAL | True Shooting Percentage |
| ws | DECIMAL | Win Shares |
| efficiency_index | DECIMAL | Composite efficiency index |
| is_featured_athlete | BOOLEAN | Is tracked athlete |

---

### Table: `athlete_news`
**Purpose**: Aggregated news articles for athletes.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| athlete_id | UUID | Foreign key to athlete_profiles |
| title | TEXT | Article title |
| summary | TEXT | Article summary |
| source_name | TEXT | News source name |
| source_url | TEXT | Link to article |
| image_url | TEXT | Article thumbnail |
| published_at | TIMESTAMP | Publication date |
| is_auto_crawled | BOOLEAN | Fetched automatically |

---

### Table: `athlete_videos`
**Purpose**: Short video content for athletes.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| athlete_id | UUID | Foreign key to athlete_profiles |
| title | TEXT | Video title |
| video_url | TEXT | Video URL |
| thumbnail_url | TEXT | Video thumbnail |
| storage_path | TEXT | Supabase storage path |
| display_order | INTEGER | Display order (descending) |
| is_active | BOOLEAN | Active status |

**Limit**: Maximum 10 videos per athlete.

---

### Table: `hero_settings`
**Purpose**: Hero section configuration.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| video_url | TEXT | Hero video URL |
| poster_url | TEXT | Video poster image |
| title | TEXT | Hero title |
| subtitle | TEXT | Hero subtitle |
| cta_text | TEXT | CTA button text |
| cta_href | TEXT | CTA button link |
| overlay_opacity | DECIMAL | Gradient overlay opacity |
| video_scale | DECIMAL | Video scale factor |
| video_position_x | INTEGER | Video X position offset |
| video_position_y | INTEGER | Video Y position offset |
| min_height_vh | INTEGER | Minimum height in vh |

---

### Table: `sync_logs`
**Purpose**: Track data synchronization status.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| sync_type | TEXT | "football", "nba", "hollinger", "transfermarkt", "news" |
| synced_at | TIMESTAMP | Sync timestamp |
| status | TEXT | "success" or "error" |
| details | JSONB | Additional sync details |

---

## Edge Functions

### `fetch-football-stats`
**Purpose**: Fetches football player statistics from API-Football.

**Trigger**: Hourly cron job + manual sync

**Data Updated**:
- `athlete_daily_updates` - per-match performance
- `athlete_season_stats` - season aggregates
- `athlete_upcoming_matches` - scheduled fixtures
- `sync_logs` - sync status

**Teams Tracked**: Real Madrid, Juventus, Brighton, Lille, Frankfurt, Inter Milan

---

### `fetch-nba-stats`
**Purpose**: Fetches Alperen Şengün's basketball statistics from Balldontlie API.

**Trigger**: Hourly cron job + manual sync

**Data Updated**:
- `athlete_daily_updates` - per-game performance
- `athlete_season_stats` - season averages
- `athlete_upcoming_matches` - upcoming Rockets games
- `sync_logs` - sync status

---

### `fetch-hollinger-stats`
**Purpose**: Scrapes ESPN Hollinger statistics for NBA efficiency rankings comparison.

**Trigger**: Weekly cron job (Monday 6:00 AM UTC) + manual sync

**How It Works**:
1. Uses Firecrawl API to scrape ESPN's Hollinger statistics page
2. Parses the top 5 NBA players by PER (Player Efficiency Rating)
3. Always includes Alperen Şengün (marked as `is_featured_athlete: true`)
4. Calculates `efficiency_index` = (PER × TS%) / 100
5. Upserts 5-6 players per month with current rankings

**Stats Fetched**:
| Stat | Description |
|------|-------------|
| PER | Player Efficiency Rating |
| TS% | True Shooting Percentage |
| Efficiency Index | Calculated: (PER × TS%) / 100 |

**Data Updated**:
- `athlete_efficiency_rankings` - Top 5 + Şengün rankings per month
- `sync_logs` - sync status with players_synced count

**Cron Schedule**: `0 6 * * 1` (Monday 6:00 AM UTC via pg_cron)

**Required Secret**: `FIRECRAWL_API_KEY`

---

### `fetch-transfermarkt-data`
**Purpose**: Fetches transfer history, injury history, and market values.

**Status**: Limited functionality due to Transfermarkt anti-scraping measures. Data is manually populated.

**Data Updated**:
- `athlete_transfer_history`
- `athlete_injury_history`
- `athlete_market_values`
- `sync_logs` - sync status

---

### `fetch-athlete-news`
**Purpose**: Aggregates news articles via Google Custom Search Engine API.

**Trigger**: Manual sync

**Data Updated**:
- `athlete_news` - news articles with auto_crawled flag
- `sync_logs` - sync status

**Requires**: `GOOGLE_CSE_API_KEY` and `GOOGLE_CSE_ID` secrets

---

### `sync-live-matches`
**Purpose**: Polls live match data during active match windows.

**Trigger**: Every minute via pg_cron (only makes API calls during match windows ± 3 hours)

**Data Updated**:
- `athlete_live_matches` - live scores, stats, events

**API**: API-Football Ultra account (`/fixtures?live=all`, `/fixtures/players`)

---

### `download-instagram`
**Purpose**: Handles Instagram video metadata storage.

**Note**: Due to API limitations, videos are manually downloaded and uploaded via admin panel.

---

## Authorization

Edge functions support dual authorization:
1. **Webhook Secret**: `x-webhook-secret` header with `STATS_WEBHOOK_SECRET` (for cron jobs)
2. **JWT Authorization**: Automatic via `supabase.functions.invoke()` from authenticated admin users

---

## Cron Job Schedule

| Function | Schedule | Description |
|----------|----------|-------------|
| `fetch-football-stats` | `0 * * * *` (Hourly at :00) | Football stats from API-Football |
| `fetch-nba-stats` | `30 * * * *` (Hourly at :30) | NBA stats from Balldontlie |
| `fetch-hollinger-stats` | `0 6 * * 1` (Monday 6:00 AM UTC) | Top 5 PER + Şengün from ESPN |
| `sync-live-matches` | `* * * * *` (Every minute) | Live match polling (conditional) |

Cron jobs configured via Supabase `pg_cron` extension.

### Hollinger Stats Sync Details

The `fetch-hollinger-stats` function runs weekly because NBA efficiency rankings don't change dramatically day-to-day. The sync:

1. **Scrapes** ESPN Hollinger page via Firecrawl
2. **Parses** top 5 players + Şengün from the leaderboard
3. **Calculates** efficiency_index for comparison
4. **Stores** in `athlete_efficiency_rankings` table with monthly partitioning
5. **Logs** sync status to `sync_logs` table

**Sample Output**:
```json
{
  "success": true,
  "data": {
    "players_synced": 6,
    "month": "2024-12-01",
    "players": [
      { "name": "Nikola Jokic", "rank": 1, "per": 31.2 },
      { "name": "Shai Gilgeous-Alexander", "rank": 2, "per": 28.5 },
      { "name": "Alperen Sengun", "rank": 8, "per": 25.1 }
    ]
  }
}
```

---

## Assets

### Athlete Images
Located in `public/athletes/`:

| File Pattern | Description |
|--------------|-------------|
| `{slug}-team.{ext}` | Team/club photo |
| `{slug}-national.{ext}` | National team photo |
| `{slug}-action.{ext}` | Action shot for banner |
| `{slug}-logo.jpg` | Team logo |

### Branding
- `public/images/turkish-stars-logo.png` - Turkish Stars logo
- `public/images/turkish-flag.jpg` - Turkish flag

### Storage Buckets
- `hero-videos` - Hero section video files
- `instagram-videos` - Downloaded Instagram videos
- `athlete-videos` - Athlete video content

---

## UI/UX Features

### Homepage Hero
- Full-screen video background
- Customizable overlay opacity
- Animated title and CTA
- Video scale and position controls

### Dashboard Cards
- 200x200px profile photo on left
- 200x200px team logo on right (white background)
- Jersey number and sport emoji overlay
- Hover animations (scale-105, shadow)
- Color-coded injury status badges
- Last match stats display

### Profile Page
- Hero banner with action photo
- 50% gradient overlay (left side)
- Circular team photo with hover zoom
- News carousel (5 articles, auto-scroll)
- Video carousel (10 videos, inline playback)
- Tabbed content navigation

### Color Coding
- **Injury Status**: Healthy (Green), Minor (Yellow), Moderate (Orange), Major (Red)
- **Transfer Reliability**: Tier 1 (Green), Tier 2 (Blue), Tier 3 (Yellow), Tier 4 (Gray)

---

## Security

- **Row Level Security (RLS)**: All tables have RLS enabled
- **Public Read**: Anyone can view athlete data
- **Admin Write**: Only users with admin role can insert/update/delete
- **Admin Check**: `has_role(auth.uid(), 'admin')` function validates permissions
- **Edge Function Auth**: Webhook secret + JWT authorization

---

## Known Limitations

1. **Transfermarkt Scraping**: Blocked by anti-bot measures. Transfer/injury/market value data requires manual entry.
2. **Instagram API**: Prohibitive costs ($50/month). Videos uploaded manually via admin panel.
3. **Newsletter Spam**: Newsletter subscriptions vulnerable to spam without rate limiting.
4. **Query Limits**: Supabase default 1000 row limit per query.

---

## Environment Variables / Secrets

| Secret | Purpose |
|--------|---------|
| `API_FOOTBALL_KEY` | API-Football Ultra account key |
| `STATS_WEBHOOK_SECRET` | Edge function webhook authorization |
| `GOOGLE_CSE_API_KEY` | Google Custom Search API key |
| `GOOGLE_CSE_ID` | Google Custom Search Engine ID |
| `FIRECRAWL_API_KEY` | Firecrawl web scraping API |
