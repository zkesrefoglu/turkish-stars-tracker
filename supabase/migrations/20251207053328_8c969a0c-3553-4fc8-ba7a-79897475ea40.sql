-- Fix article_reactions RLS policy to only expose aggregate data, not individual user activity
-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view reactions" ON public.article_reactions;

-- Create a new policy that only allows users to see their own reactions
CREATE POLICY "Users can view their own reactions" 
ON public.article_reactions 
FOR SELECT 
USING (auth.uid() = user_id);