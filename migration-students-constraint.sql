-- Migration to update students table constraint
-- This allows the same student (chest_no) to participate in multiple programs
-- but prevents duplicate registrations for the same program

-- Drop the old constraint
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_chest_no_user_id_key;

-- Add the new constraint that allows same student in multiple programs
ALTER TABLE students ADD CONSTRAINT students_chest_no_program_user_unique 
  UNIQUE(chest_no, program_id, user_id);

-- Update the comment for clarity
COMMENT ON CONSTRAINT students_chest_no_program_user_unique ON students 
IS 'Ensures same student cannot be registered for the same program twice, but allows multiple program registrations';