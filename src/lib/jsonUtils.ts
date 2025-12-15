import type { Json } from '@/integrations/supabase/types';

/**
 * Safely parse JSON string with validation.
 * Returns an object with data (if successful) or error (if failed).
 */
export function safeParseJSON(
  jsonString: string | null | undefined,
  defaultValue: Record<string, Json> = {}
): { data: Record<string, Json>; error: string | null } {
  if (!jsonString || jsonString.trim() === '') {
    return { data: defaultValue, error: null };
  }

  try {
    const parsed = JSON.parse(jsonString);
    
    // Ensure it's an object (not an array, string, number, etc.)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { data: defaultValue, error: 'JSON must be an object (not array, string, or null)' };
    }
    
    return { data: parsed as Record<string, Json>, error: null };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Invalid JSON format';
    return { data: defaultValue, error: errorMessage };
  }
}
