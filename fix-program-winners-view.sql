-- Fix for Program Winners view to properly show prize assignments
-- This migration updates the program_winners_view to correctly join prize assignments

-- The issue: Program Winners shows "No prize assigned" even when prizes are 
-- properly configured in Program Prize Assignments.

-- Root cause: The JOIN condition between program_winners and program_prize_assignments
-- requires exact string matching of placement names, and the base JOINs were missing
-- proper user_id filtering for RLS (Row Level Security).

-- Drop the existing view first
DROP VIEW IF EXISTS program_winners_view;

-- Recreate the view with improved JOIN logic and proper RLS filtering
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
JOIN students s ON pw.student_id = s.id AND s.user_id = pw.user_id
JOIN programs p ON pw.program_id = p.id AND p.user_id = pw.user_id
JOIN sections sec ON p.section_id = sec.id AND sec.user_id = pw.user_id
LEFT JOIN program_prize_assignments ppa ON (
    pw.program_id = ppa.program_id 
    AND pw.placement = ppa.placement
    AND ppa.user_id = pw.user_id
)
LEFT JOIN prizes pr ON ppa.prize_id = pr.id AND pr.user_id = pw.user_id
LEFT JOIN prize_categories pc ON pr.category = pc.code AND pc.user_id = pw.user_id
WHERE pw.user_id = auth.uid();

-- Grant access to the updated view
GRANT SELECT ON program_winners_view TO authenticated;