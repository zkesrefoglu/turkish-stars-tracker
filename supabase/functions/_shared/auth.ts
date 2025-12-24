import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Validates authorization for expensive edge functions.
 * Allows ONLY:
 * 1. Cron/scheduler calls via x-webhook-secret === STATS_WEBHOOK_SECRET
 * 2. Authenticated admin users (JWT validated + has admin role)
 * 
 * Returns: { authorized: boolean, reason: string, userId?: string }
 */
export async function validateAuth(req: Request): Promise<{
  authorized: boolean;
  reason: string;
  userId?: string;
}> {
  const webhookSecret = Deno.env.get('STATS_WEBHOOK_SECRET');
  const providedSecret = req.headers.get('x-webhook-secret');
  const authHeader = req.headers.get('authorization');

  // 1. Check webhook secret (for cron/scheduler)
  if (providedSecret) {
    if (!webhookSecret) {
      return { authorized: false, reason: 'STATS_WEBHOOK_SECRET not configured' };
    }
    if (providedSecret === webhookSecret) {
      return { authorized: true, reason: 'webhook_secret' };
    }
    return { authorized: false, reason: 'Invalid webhook secret' };
  }

  // 2. Check JWT for admin user
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    
    // Skip if token looks fake/placeholder
    if (token.length < 100 || token === 'fake' || token === 'test') {
      return { authorized: false, reason: 'Invalid token format' };
    }

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      
      // Create client with the user's token to validate it
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('JWT validation failed:', userError?.message || 'No user');
        return { authorized: false, reason: 'Invalid or expired token' };
      }

      // Check if user has admin role using service role client
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const adminClient = createClient(supabaseUrl, serviceRoleKey);

      const { data: roleData, error: roleError } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError) {
        console.error('Role check failed:', roleError.message);
        return { authorized: false, reason: 'Role check failed' };
      }

      if (!roleData) {
        console.log(`User ${user.id} is not an admin`);
        return { authorized: false, reason: 'User is not an admin', userId: user.id };
      }

      return { authorized: true, reason: 'admin_user', userId: user.id };
    } catch (err) {
      console.error('Auth validation error:', err);
      return { authorized: false, reason: 'Auth validation error' };
    }
  }

  return { authorized: false, reason: 'Missing authentication' };
}

/**
 * Checks if enough time has passed since the last successful sync.
 * Returns { canRun: boolean, lastRun?: Date, waitSeconds?: number }
 */
export async function checkCooldown(
  syncType: string,
  cooldownSeconds: number
): Promise<{ canRun: boolean; lastRun?: Date; waitSeconds?: number }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
    .from('sync_logs')
    .select('synced_at')
    .eq('sync_type', syncType)
    .eq('status', 'success')
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Cooldown check failed:', error.message);
    // Allow run if we can't check
    return { canRun: true };
  }

  if (!data) {
    // No previous run, allow
    return { canRun: true };
  }

  const lastRun = new Date(data.synced_at);
  const now = new Date();
  const elapsedSeconds = (now.getTime() - lastRun.getTime()) / 1000;

  if (elapsedSeconds < cooldownSeconds) {
    const waitSeconds = Math.ceil(cooldownSeconds - elapsedSeconds);
    console.log(`Cooldown active: ${waitSeconds}s remaining for ${syncType}`);
    return { canRun: false, lastRun, waitSeconds };
  }

  return { canRun: true, lastRun };
}
