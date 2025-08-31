-- Students Database Schema

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chest_no VARCHAR(20) NOT NULL, -- Chest number (unique per user)
  name VARCHAR(255) NOT NULL, -- Student full name
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Ensure unique chest number per user
  UNIQUE(chest_no, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_chest_no ON students(chest_no);
CREATE INDEX IF NOT EXISTS idx_students_section_id ON students(section_id);
CREATE INDEX IF NOT EXISTS idx_students_program_id ON students(program_id);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);

-- Enable Row Level Security
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for students
CREATE POLICY "Users can view their own students" ON students
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own students" ON students
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own students" ON students
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own students" ON students
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for easier querying with section and program details
CREATE OR REPLACE VIEW students_view AS
SELECT 
  s.id,
  s.chest_no,
  s.name,
  s.section_id,
  s.program_id,
  s.created_at,
  s.updated_at,
  s.user_id,
  sec.name as section_name,
  sec.code as section_code,
  p.name as program_name,
  p.description as program_description
FROM students s
LEFT JOIN sections sec ON s.section_id = sec.id
LEFT JOIN programs p ON s.program_id = p.id
WHERE s.user_id = auth.uid();

-- Grant access to the view
GRANT SELECT ON students_view TO authenticated;