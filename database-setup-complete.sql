-- Complete Program Manager Database Setup
-- Run this script in your Supabase SQL editor to set up all tables and views

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ language 'plpgsql';

-- =====================================================
-- SECTIONS TABLE
-- =====================================================

-- Create sections table
CREATE TABLE IF NOT EXISTS sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for sections
CREATE INDEX IF NOT EXISTS idx_sections_user_id ON sections(user_id);
CREATE INDEX IF NOT EXISTS idx_sections_code ON sections(code);

-- Enable Row Level Security for sections
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sections
CREATE POLICY "Users can view their own sections" ON sections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sections" ON sections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sections" ON sections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sections" ON sections
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for sections updated_at
CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PROGRAMS TABLE
-- =====================================================

-- Create programs table
CREATE TABLE IF NOT EXISTS programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Ensure unique program names within each section
  UNIQUE(name, section_id)
);

-- Create indexes for programs
CREATE INDEX IF NOT EXISTS idx_programs_user_id ON programs(user_id);
CREATE INDEX IF NOT EXISTS idx_programs_section_id ON programs(section_id);

-- Enable Row Level Security for programs
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for programs
CREATE POLICY "Users can view their own programs" ON programs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own programs" ON programs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own programs" ON programs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own programs" ON programs
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for programs updated_at
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PRIZE CATEGORIES TABLE
-- =====================================================

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

-- Create indexes for prize categories
CREATE INDEX IF NOT EXISTS idx_prize_categories_user_id ON prize_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_prize_categories_code ON prize_categories(code);

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

-- =====================================================
-- PRIZES TABLE
-- =====================================================

-- Create prizes table
CREATE TABLE IF NOT EXISTS prizes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  image_url TEXT,
  category VARCHAR(10) NOT NULL,
  description TEXT,
  average_value DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Ensure unique prize names within each category for the same user
  UNIQUE(name, category, user_id)
);

-- Create indexes for prizes
CREATE INDEX IF NOT EXISTS idx_prizes_user_id ON prizes(user_id);
CREATE INDEX IF NOT EXISTS idx_prizes_category ON prizes(category);
CREATE INDEX IF NOT EXISTS idx_prizes_name ON prizes(name);
CREATE INDEX IF NOT EXISTS idx_prizes_average_value ON prizes(average_value);

-- Enable Row Level Security for prizes
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

-- Create trigger for prizes updated_at
CREATE TRIGGER update_prizes_updated_at BEFORE UPDATE ON prizes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STUDENTS TABLE
-- =====================================================

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

-- Create indexes for students
CREATE INDEX IF NOT EXISTS idx_students_chest_no ON students(chest_no);
CREATE INDEX IF NOT EXISTS idx_students_section_id ON students(section_id);
CREATE INDEX IF NOT EXISTS idx_students_program_id ON students(program_id);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);

-- Enable Row Level Security for students
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

-- Create trigger for students updated_at
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PROGRAM PRIZE ASSIGNMENTS TABLE
-- =====================================================

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

-- Create indexes for program prize assignments
CREATE INDEX IF NOT EXISTS idx_program_prize_assignments_program_id ON program_prize_assignments(program_id);
CREATE INDEX IF NOT EXISTS idx_program_prize_assignments_prize_id ON program_prize_assignments(prize_id);
CREATE INDEX IF NOT EXISTS idx_program_prize_assignments_user_id ON program_prize_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_program_prize_assignments_placement_order ON program_prize_assignments(placement_order);

-- Enable Row Level Security for program prize assignments
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

-- Create trigger for program prize assignments updated_at
CREATE TRIGGER update_program_prize_assignments_updated_at BEFORE UPDATE ON program_prize_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PROGRAM WINNERS TABLE
-- =====================================================

-- Create program_winners table
CREATE TABLE IF NOT EXISTS program_winners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    placement VARCHAR(100) NOT NULL,
    placement_order INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Ensure unique placement per program
    UNIQUE(program_id, placement, student_id),
    -- Ensure unique placement order per program  
    UNIQUE(program_id, placement_order, student_id)
);

-- Create indexes for program winners
CREATE INDEX IF NOT EXISTS idx_program_winners_program_id ON program_winners(program_id);
CREATE INDEX IF NOT EXISTS idx_program_winners_student_id ON program_winners(student_id);
CREATE INDEX IF NOT EXISTS idx_program_winners_placement_order ON program_winners(placement_order);
CREATE INDEX IF NOT EXISTS idx_program_winners_user_id ON program_winners(user_id);

-- Enable Row Level Security for program winners
ALTER TABLE program_winners ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for program_winners table
CREATE POLICY "Users can view their own program winners" ON program_winners
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own program winners" ON program_winners
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own program winners" ON program_winners
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own program winners" ON program_winners
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for program winners updated_at
CREATE TRIGGER update_program_winners_updated_at BEFORE UPDATE ON program_winners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS
-- =====================================================

-- Create a view for easier querying students with section and program details
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

-- Create a view for program prize assignments with program and prize details
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

-- Create a view for program winners with details including prize information
CREATE OR REPLACE VIEW program_winners_view AS
SELECT 
    pw.*,
    s.name as student_name,
    s.chest_no as student_chest_no,
    p.name as program_name,
    sec.name as section_name,
    sec.code as section_code,
    -- Prize information from program prize assignments
    ppa.id as prize_assignment_id,
    ppa.prize_id,
    ppa.quantity as prize_quantity,
    pr.name as prize_name,
    pr.image_url as prize_image_url,
    pr.category as prize_category,
    pr.description as prize_description,
    pr.average_value as prize_average_value,
    pc.name as prize_category_name,
    pc.description as prize_category_description
FROM program_winners pw
JOIN students s ON pw.student_id = s.id
JOIN programs p ON pw.program_id = p.id
JOIN sections sec ON p.section_id = sec.id
LEFT JOIN program_prize_assignments ppa ON (
    pw.program_id = ppa.program_id 
    AND pw.placement = ppa.placement
    AND ppa.user_id = pw.user_id
)
LEFT JOIN prizes pr ON ppa.prize_id = pr.id
LEFT JOIN prize_categories pc ON pr.category = pc.code AND pr.user_id = pc.user_id
WHERE pw.user_id = auth.uid();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant access to the views
GRANT SELECT ON students_view TO authenticated;
GRANT SELECT ON program_prize_assignments_view TO authenticated;
GRANT SELECT ON program_winners_view TO authenticated;

-- Grant necessary permissions for tables
GRANT SELECT, INSERT, UPDATE, DELETE ON sections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON programs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON prize_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON prizes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON program_prize_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON program_winners TO authenticated;

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Note: Default categories will be created by the application when users first log in
-- This ensures each user gets their own set of default categories with proper user_id

-- Setup complete!
-- You can now use the Program Manager application.