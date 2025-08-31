-- Program-Prize Assignment Database Schema

-- Create program_prize_assignments table
CREATE TABLE IF NOT EXISTS program_prize_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  prize_id UUID REFERENCES prizes(id) ON DELETE CASCADE,
  placement VARCHAR(20) NOT NULL, -- '1st', '2nd', '3rd', 'Participation', 'Special', etc.
  placement_order INTEGER NOT NULL DEFAULT 1, -- For sorting: 1=1st, 2=2nd, 3=3rd, etc.
  quantity INTEGER DEFAULT 1, -- How many of this prize for this placement
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Ensure unique placement per program (one prize per placement per program)
  UNIQUE(program_id, placement, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_program_prize_assignments_program_id ON program_prize_assignments(program_id);
CREATE INDEX IF NOT EXISTS idx_program_prize_assignments_prize_id ON program_prize_assignments(prize_id);
CREATE INDEX IF NOT EXISTS idx_program_prize_assignments_user_id ON program_prize_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_program_prize_assignments_placement_order ON program_prize_assignments(placement_order);

-- Enable Row Level Security
ALTER TABLE program_prize_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for program_prize_assignments
CREATE POLICY "Users can view their own program prize assignments" ON program_prize_assignments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own program prize assignments" ON program_prize_assignments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own program prize assignments" ON program_prize_assignments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own program prize assignments" ON program_prize_assignments
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_program_prize_assignments_updated_at BEFORE UPDATE ON program_prize_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for easier querying with program and prize details
CREATE OR REPLACE VIEW program_prize_assignments_view AS
SELECT 
  ppa.id,
  ppa.program_id,
  ppa.prize_id,
  ppa.placement,
  ppa.placement_order,
  ppa.quantity,
  ppa.notes,
  ppa.created_at,
  ppa.updated_at,
  ppa.user_id,
  p.name as program_name,
  s.name as section_name,
  s.code as section_code,
  pr.name as prize_name,
  pr.image_url as prize_image_url,
  pr.category as prize_category,
  pr.average_value as prize_average_value,
  pr.description as prize_description,
  pc.name as prize_category_name,
  pc.description as prize_category_description
FROM program_prize_assignments ppa
JOIN programs p ON ppa.program_id = p.id
JOIN sections s ON p.section_id = s.id
JOIN prizes pr ON ppa.prize_id = pr.id
LEFT JOIN prize_categories pc ON pr.category = pc.code AND pr.user_id = pc.user_id
WHERE ppa.user_id = auth.uid();

-- Grant access to the view
GRANT SELECT ON program_prize_assignments_view TO authenticated;