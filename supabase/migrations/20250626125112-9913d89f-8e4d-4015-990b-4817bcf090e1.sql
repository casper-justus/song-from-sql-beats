
-- Create RLS policies for the songs table to allow access for the specific user
CREATE POLICY "Allow user to view their own songs" 
ON public.songs 
FOR SELECT 
USING (user_id = '85f340cb-f30f-4b03-84f4-36699f0edcc3'::uuid);

CREATE POLICY "Allow user to insert their own songs" 
ON public.songs 
FOR INSERT 
WITH CHECK (user_id = '85f340cb-f30f-4b03-84f4-36699f0edcc3'::uuid);

CREATE POLICY "Allow user to update their own songs" 
ON public.songs 
FOR UPDATE 
USING (user_id = '85f340cb-f30f-4b03-84f4-36699f0edcc3'::uuid);

CREATE POLICY "Allow user to delete their own songs" 
ON public.songs 
FOR DELETE 
USING (user_id = '85f340cb-f30f-4b03-84f4-36699f0edcc3'::uuid);
