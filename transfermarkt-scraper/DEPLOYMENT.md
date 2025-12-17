# Transfermarkt Scraper - GCP Deployment Guide

## Overview

This scraper fetches transfer history, injury history, and market values from Transfermarkt for your Turkish Stars Tracker players. It runs on Google Cloud Run (free tier) and is triggered daily by Cloud Scheduler.

## Prerequisites

1. Google Cloud account (free tier is fine)
2. `gcloud` CLI installed ([Install Guide](https://cloud.google.com/sdk/docs/install))
3. Your Supabase credentials

## Step 1: Set Up Google Cloud Project

```bash
# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create turkish-stars-scraper --name="Turkish Stars Scraper"

# Set as active project
gcloud config set project turkish-stars-scraper

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
```

## Step 2: Configure Environment Variables

Create a `.env` file locally (don't commit this!):

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SCRAPER_SECRET=generate-a-random-secret-here
```

Generate a random secret:
```bash
openssl rand -hex 32
```

## Step 3: Deploy to Cloud Run

```bash
# Navigate to scraper directory
cd transfermarkt-scraper

# Build and deploy in one command
gcloud run deploy transfermarkt-scraper \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 600 \
  --max-instances 1 \
  --set-env-vars "SUPABASE_URL=https://your-project.supabase.co" \
  --set-env-vars "SUPABASE_SERVICE_KEY=your-service-role-key" \
  --set-env-vars "SCRAPER_SECRET=your-random-secret"
```

**Important**: Replace the environment variable values with your actual credentials.

After deployment, you'll get a URL like:
```
https://transfermarkt-scraper-xxxxx-uc.a.run.app
```

## Step 4: Test the Deployment

```bash
# Health check
curl https://transfermarkt-scraper-xxxxx-uc.a.run.app/

# Manual scrape test (replace with your URL and secret)
curl "https://transfermarkt-scraper-xxxxx-uc.a.run.app/scrape?secret=your-random-secret"
```

## Step 5: Set Up Cloud Scheduler (Daily Trigger)

```bash
# Create a service account for the scheduler
gcloud iam service-accounts create scheduler-sa \
  --display-name="Cloud Scheduler Service Account"

# Get your project ID
PROJECT_ID=$(gcloud config get-value project)

# Grant Cloud Run invoker permission
gcloud run services add-iam-policy-binding transfermarkt-scraper \
  --member="serviceAccount:scheduler-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.invoker" \
  --region=us-central1

# Create the scheduled job (runs daily at 6 AM UTC)
gcloud scheduler jobs create http transfermarkt-daily-scrape \
  --location=us-central1 \
  --schedule="0 6 * * *" \
  --uri="https://transfermarkt-scraper-xxxxx-uc.a.run.app/scrape" \
  --http-method=POST \
  --headers="Authorization=Bearer your-random-secret" \
  --oidc-service-account-email="scheduler-sa@${PROJECT_ID}.iam.gserviceaccount.com"
```

## Step 6: Verify Scheduler

```bash
# List scheduled jobs
gcloud scheduler jobs list --location=us-central1

# Manually trigger a run
gcloud scheduler jobs run transfermarkt-daily-scrape --location=us-central1

# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=transfermarkt-scraper" --limit=50
```

## Cost Estimate

| Service | Free Tier | Your Usage | Cost |
|---------|-----------|------------|------|
| Cloud Run | 2M requests, 360K GB-sec | ~30 requests/mo, ~30 GB-sec | $0 |
| Cloud Scheduler | 3 jobs | 1 job | $0 |
| Cloud Build | 120 build-min/day | ~5 min/deployment | $0 |

**Total: $0/month** (within free tier)

## Troubleshooting

### Scraper Getting Blocked?

If Transfermarkt blocks requests, try:

1. **Increase delays** in `index.js`:
   ```javascript
   const humanDelay = () => delay(5000 + Math.random() * 10000); // 5-15 seconds
   ```

2. **Reduce frequency** - change scheduler to weekly:
   ```bash
   gcloud scheduler jobs update http transfermarkt-daily-scrape \
     --location=us-central1 \
     --schedule="0 6 * * 0"  # Sundays only
   ```

3. **Add proxy support** (requires paid proxy service)

### Memory Issues?

Increase Cloud Run memory:
```bash
gcloud run services update transfermarkt-scraper \
  --memory 2Gi \
  --region us-central1
```

### Check Logs

```bash
# Real-time logs
gcloud run logs tail transfermarkt-scraper --region=us-central1

# Recent logs
gcloud logging read "resource.type=cloud_run_revision" --limit=100
```

## Database Requirements

Make sure these columns exist in your Supabase tables:

### `athlete_transfer_history`
- Add unique constraint: `(athlete_id, transfer_date, from_club, to_club)`

### `athlete_injury_history`  
- Add unique constraint: `(athlete_id, injury_type, start_date)`

### `athlete_market_values`
- Add unique constraint: `(athlete_id, value_date)`

Run this SQL in Supabase:

```sql
-- Add unique constraints for upsert operations
ALTER TABLE athlete_transfer_history 
ADD CONSTRAINT unique_transfer 
UNIQUE (athlete_id, transfer_date, from_club, to_club);

ALTER TABLE athlete_injury_history 
ADD CONSTRAINT unique_injury 
UNIQUE (athlete_id, injury_type, start_date);

ALTER TABLE athlete_market_values 
ADD CONSTRAINT unique_market_value 
UNIQUE (athlete_id, value_date);
```

## Updating the Scraper

After making changes:

```bash
# Redeploy
gcloud run deploy transfermarkt-scraper \
  --source . \
  --region us-central1
```

## Adding New Players

Edit the `PLAYERS` array in `index.js`:

```javascript
const PLAYERS = [
  { name: 'New Player', tmId: 123456, slug: 'new-player' },
  // ... existing players
];
```

Then redeploy.
