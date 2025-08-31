-- Prize Management Database Schema

-- Create prizes table
CREATE TABLE IF NOT EXISTS prizes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  image_url TEXT,
  category VARCHAR(10) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Ensure unique prize names within each category for the same user
  UNIQUE(name, category, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prizes_user_id ON prizes(user_id);
CREATE INDEX IF NOT EXISTS idx_prizes_category ON prizes(category);
CREATE INDEX IF NOT EXISTS idx_prizes_name ON prizes(name);

-- Enable Row Level Security
ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for prizes
CREATE POLICY "Users can view their own prizes" ON prizes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prizes" ON prizes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prizes" ON prizes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prizes" ON prizes
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_prizes_updated_at BEFORE UPDATE ON prizes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();