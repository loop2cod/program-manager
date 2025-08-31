-- Create program_winners table
CREATE TABLE program_winners (
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

-- Create indexes for better performance
CREATE INDEX idx_program_winners_program_id ON program_winners(program_id);
CREATE INDEX idx_program_winners_student_id ON program_winners(student_id);
CREATE INDEX idx_program_winners_placement_order ON program_winners(placement_order);
CREATE INDEX idx_program_winners_user_id ON program_winners(user_id);

-- Enable Row Level Security
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

-- Create a view for program winners with details including prize information
CREATE VIEW program_winners_view AS
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
)
LEFT JOIN prizes pr ON ppa.prize_id = pr.id
LEFT JOIN prize_categories pc ON pr.category = pc.code
WHERE pw.user_id = auth.uid();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_program_winners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_program_winners_updated_at
    BEFORE UPDATE ON program_winners
    FOR EACH ROW
    EXECUTE FUNCTION update_program_winners_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON program_winners TO authenticated;
GRANT SELECT ON program_winners_view TO authenticated;