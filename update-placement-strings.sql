-- Migration to standardize placement strings to match Excel format
-- This updates any existing program winners that might be using the old "1st Place" format

-- Update program winners to use standardized placement strings
UPDATE program_winners 
SET placement = '1st', updated_at = NOW()
WHERE placement IN ('1st Place', 'First Place', 'First');

UPDATE program_winners 
SET placement = '2nd', updated_at = NOW()
WHERE placement IN ('2nd Place', 'Second Place', 'Second');

UPDATE program_winners 
SET placement = '3rd', updated_at = NOW()
WHERE placement IN ('3rd Place', 'Third Place', 'Third');

UPDATE program_winners 
SET placement = 'Participation', updated_at = NOW()
WHERE placement IN ('Participation Award', 'Participant');

UPDATE program_winners 
SET placement = 'Best Performance', updated_at = NOW()
WHERE placement IN ('Best Performance Award', 'Special Award', 'Best');

UPDATE program_winners 
SET placement = 'Consolation', updated_at = NOW()
WHERE placement IN ('Consolation Prize', 'Consolation Award');

-- Update program prize assignments to use standardized placement strings (if any exist with old format)
UPDATE program_prize_assignments 
SET placement = '1st', updated_at = NOW()
WHERE placement IN ('1st Place', 'First Place', 'First');

UPDATE program_prize_assignments 
SET placement = '2nd', updated_at = NOW()
WHERE placement IN ('2nd Place', 'Second Place', 'Second');

UPDATE program_prize_assignments 
SET placement = '3rd', updated_at = NOW()
WHERE placement IN ('3rd Place', 'Third Place', 'Third');

UPDATE program_prize_assignments 
SET placement = 'Participation', updated_at = NOW()
WHERE placement IN ('Participation Award', 'Participant');

UPDATE program_prize_assignments 
SET placement = 'Best Performance', updated_at = NOW()
WHERE placement IN ('Best Performance Award', 'Special Award', 'Best');

UPDATE program_prize_assignments 
SET placement = 'Consolation', updated_at = NOW()
WHERE placement IN ('Consolation Prize', 'Consolation Award');

-- Show the results
SELECT 'program_winners' as table_name, placement, COUNT(*) as count 
FROM program_winners 
GROUP BY placement
UNION ALL
SELECT 'program_prize_assignments' as table_name, placement, COUNT(*) as count 
FROM program_prize_assignments 
GROUP BY placement
ORDER BY table_name, placement;