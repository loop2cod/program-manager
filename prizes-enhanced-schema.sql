-- Enhanced Prize Management Database Schema

-- Create categories table for custom categories
CREATE TABLE IF NOT EXISTS prize_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Ensure unique category codes per user
  UNIQUE(code, user_id)
);

-- Update prizes table to add average_value and reference to categories
ALTER TABLE prizes ADD COLUMN IF NOT EXISTS average_value DECIMAL(10,2);
ALTER TABLE prizes DROP CONSTRAINT IF EXISTS prizes_category_check;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prize_categories_user_id ON prize_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_prize_categories_code ON prize_categories(code);
CREATE INDEX IF NOT EXISTS idx_prizes_average_value ON prizes(average_value);

-- Enable Row Level Security for categories
ALTER TABLE prize_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for prize_categories
CREATE POLICY "Users can view their own prize categories" ON prize_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prize categories" ON prize_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prize categories" ON prize_categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prize categories" ON prize_categories
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at on categories
CREATE TRIGGER update_prize_categories_updated_at BEFORE UPDATE ON prize_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories for all existing users
INSERT INTO prize_categories (name, code, description, user_id)
SELECT 
  'Top Tier Prizes' as name,
  'A' as code,
  'First, second, and third place prizes' as description,
  auth.uid() as user_id
WHERE NOT EXISTS (
  SELECT 1 FROM prize_categories 
  WHERE code = 'A' AND user_id = auth.uid()
);

INSERT INTO prize_categories (name, code, description, user_id)
SELECT 
  'Performance Awards' as name,
  'B' as code,
  'Special recognition and performance-based awards' as description,
  auth.uid() as user_id
WHERE NOT EXISTS (
  SELECT 1 FROM prize_categories 
  WHERE code = 'B' AND user_id = auth.uid()
);

INSERT INTO prize_categories (name, code, description, user_id)
SELECT 
  'Participation Prizes' as name,
  'C' as code,
  'Certificates and medals for all participants' as description,
  auth.uid() as user_id
WHERE NOT EXISTS (
  SELECT 1 FROM prize_categories 
  WHERE code = 'C' AND user_id = auth.uid()
);