import { supabase } from './supabase'

export interface Section {
  id: string
  name: string
  code: string
  description?: string
  created_at?: string
  updated_at?: string
  user_id?: string
}

export interface Program {
  id: string
  name: string
  section_id: string
  description?: string
  created_at?: string
  updated_at?: string
  user_id?: string
}

export interface ProgramWithSection extends Program {
  section: {
    code: string
    name: string
  }
}

// Section operations
export const sectionsService = {
  async getAll(): Promise<Section[]> {
    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching sections:', error)
      throw new Error(`Failed to fetch sections: ${error.message}`)
    }

    return data || []
  },

  async create(section: { name: string; code: string; description?: string }): Promise<Section> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('sections')
      .insert({
        ...section,
        user_id: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating section:', error)
      throw new Error(`Failed to create section: ${error.message}`)
    }

    return data
  },

  async update(id: string, updates: { name?: string; code?: string; description?: string }): Promise<Section> {
    const { data, error } = await supabase
      .from('sections')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating section:', error)
      throw new Error(`Failed to update section: ${error.message}`)
    }

    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('sections')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting section:', error)
      throw new Error(`Failed to delete section: ${error.message}`)
    }
  }
}

// Program operations
export const programsService = {
  async getAll(): Promise<ProgramWithSection[]> {
    const { data, error } = await supabase
      .from('programs')
      .select(`
        *,
        section:sections(code, name)
      `)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching programs:', error)
      throw new Error(`Failed to fetch programs: ${error.message}`)
    }

    return data || []
  },

  async create(program: { name: string; section_id: string; description?: string }): Promise<Program> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('programs')
      .insert({
        ...program,
        user_id: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating program:', error)
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('A program with this name already exists in this section')
      }
      throw new Error(`Failed to create program: ${error.message}`)
    }

    return data
  },

  async createBulk(programs: { name: string; section_id: string; description?: string }[]): Promise<Program[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const programsWithUserId = programs.map(program => ({
      ...program,
      user_id: user.id
    }))

    const { data, error } = await supabase
      .from('programs')
      .insert(programsWithUserId)
      .select()

    if (error) {
      console.error('Error creating programs:', error)
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('One or more programs already exist in their respective sections')
      }
      throw new Error(`Failed to create programs: ${error.message}`)
    }

    return data || []
  },

  async update(id: string, updates: { name?: string; section_id?: string; description?: string }): Promise<Program> {
    const { data, error } = await supabase
      .from('programs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating program:', error)
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('A program with this name already exists in this section')
      }
      throw new Error(`Failed to update program: ${error.message}`)
    }

    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('programs')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting program:', error)
      throw new Error(`Failed to delete program: ${error.message}`)
    }
  }
}

// Utility functions
export const databaseUtils = {
  async checkSectionCodeExists(code: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('sections')
      .select('id')
      .eq('code', code)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking section code:', error)
      return false
    }

    return !!data
  },

  async getSectionByCode(code: string): Promise<Section | null> {
    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .eq('code', code)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching section by code:', error)
      return null
    }

    return data
  },

  async checkProgramExists(name: string, sectionId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('programs')
      .select('id')
      .eq('name', name)
      .eq('section_id', sectionId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking program existence:', error)
      return false
    }

    return !!data
  }
}

// Prize Category interface
export interface PrizeCategory {
  id: string
  name: string
  code: string
  description?: string
  created_at?: string
  updated_at?: string
  user_id?: string
}

// Prize interface
export interface Prize {
  id: string
  name: string
  image_url?: string
  category: string
  description?: string
  average_value?: number
  created_at?: string
  updated_at?: string
  user_id?: string
}

// Prize operations
export const prizesService = {
  async getAll(): Promise<Prize[]> {
    const { data, error } = await supabase
      .from('prizes')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching prizes:', error)
      throw new Error(`Failed to fetch prizes: ${error.message}`)
    }

    return data || []
  },

  async getByCategory(category: string): Promise<Prize[]> {
    const { data, error } = await supabase
      .from('prizes')
      .select('*')
      .eq('category', category)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching prizes by category:', error)
      throw new Error(`Failed to fetch prizes: ${error.message}`)
    }

    return data || []
  },

  async create(prize: { name: string; image_url?: string; category: string; description?: string; average_value?: number }): Promise<Prize> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('prizes')
      .insert({
        ...prize,
        user_id: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating prize:', error)
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('A prize with this name already exists in this category')
      }
      throw new Error(`Failed to create prize: ${error.message}`)
    }

    return data
  },

  async createBulk(prizes: { name: string; image_url?: string; category: string; description?: string; average_value?: number }[]): Promise<Prize[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const prizesWithUserId = prizes.map(prize => ({
      ...prize,
      user_id: user.id
    }))

    const { data, error } = await supabase
      .from('prizes')
      .insert(prizesWithUserId)
      .select()

    if (error) {
      console.error('Error creating prizes:', error)
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('One or more prizes already exist in their respective categories')
      }
      throw new Error(`Failed to create prizes: ${error.message}`)
    }

    return data || []
  },

  async update(id: string, updates: { name?: string; image_url?: string; category?: string; description?: string; average_value?: number }): Promise<Prize> {
    const { data, error } = await supabase
      .from('prizes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating prize:', error)
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('A prize with this name already exists in this category')
      }
      throw new Error(`Failed to update prize: ${error.message}`)
    }

    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('prizes')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting prize:', error)
      throw new Error(`Failed to delete prize: ${error.message}`)
    }
  }
}

// Prize Categories operations
export const prizeCategoriesService = {
  async getAll(): Promise<PrizeCategory[]> {
    const { data, error } = await supabase
      .from('prize_categories')
      .select('*')
      .order('code', { ascending: true })

    if (error) {
      console.error('Error fetching prize categories:', error)
      throw new Error(`Failed to fetch prize categories: ${error.message}`)
    }

    return data || []
  },

  async create(category: { name: string; code: string; description?: string }): Promise<PrizeCategory> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('prize_categories')
      .insert({
        ...category,
        code: category.code.toUpperCase(),
        user_id: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating prize category:', error)
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('A category with this code already exists')
      }
      throw new Error(`Failed to create category: ${error.message}`)
    }

    return data
  },

  async update(id: string, updates: { name?: string; code?: string; description?: string }): Promise<PrizeCategory> {
    const updateData = { ...updates }
    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase()
    }

    const { data, error } = await supabase
      .from('prize_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating prize category:', error)
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('A category with this code already exists')
      }
      throw new Error(`Failed to update category: ${error.message}`)
    }

    return data
  },

  async delete(id: string): Promise<void> {
    // Check if category has associated prizes
    const { data: prizes, error: prizesError } = await supabase
      .from('prizes')
      .select('id')
      .eq('category', (await supabase.from('prize_categories').select('code').eq('id', id).single()).data?.code)

    if (prizesError && prizesError.code !== 'PGRST116') {
      throw new Error('Failed to check for associated prizes')
    }

    if (prizes && prizes.length > 0) {
      throw new Error('Cannot delete category that has associated prizes')
    }

    const { error } = await supabase
      .from('prize_categories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting prize category:', error)
      throw new Error(`Failed to delete category: ${error.message}`)
    }
  }
}

// Prize utility functions
export const prizeUtils = {
  async checkPrizeExists(name: string, category: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('prizes')
      .select('id')
      .eq('name', name)
      .eq('category', category)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking prize existence:', error)
      return false
    }

    return !!data
  },

  async getAvailableCategories(): Promise<PrizeCategory[]> {
    return await prizeCategoriesService.getAll()
  },

  async isValidCategory(categoryCode: string): Promise<boolean> {
    const categories = await this.getAvailableCategories()
    return categories.some(cat => cat.code === categoryCode.toUpperCase())
  },

  getDefaultCategories(): { name: string; code: string; description: string }[] {
    return [
      { name: 'Top Tier Prizes', code: 'A', description: 'First, second, and third place prizes' },
      { name: 'Performance Awards', code: 'B', description: 'Special recognition and performance-based awards' },
      { name: 'Participation Prizes', code: 'C', description: 'Certificates and medals for all participants' }
    ]
  },

  generateCategoryCode(name: string, existingCodes: string[]): string {
    // Try first letter first
    const firstLetter = name.trim().charAt(0).toUpperCase()
    if (!existingCodes.includes(firstLetter)) {
      return firstLetter
    }

    // Try other letters from the name
    for (const char of name.toUpperCase()) {
      if (char.match(/[A-Z]/) && !existingCodes.includes(char)) {
        return char
      }
    }

    // Find first available letter A-Z
    for (let i = 65; i <= 90; i++) { // A-Z ASCII codes
      const letter = String.fromCharCode(i)
      if (!existingCodes.includes(letter)) {
        return letter
      }
    }

    throw new Error('No available category codes')
  }
}

// Program Prize Assignment interface
export interface ProgramPrizeAssignment {
  id: string
  program_id: string
  prize_id: string
  placement: string
  placement_order: number
  quantity: number
  notes?: string
  created_at?: string
  updated_at?: string
  user_id?: string
}

export interface ProgramPrizeAssignmentWithDetails extends ProgramPrizeAssignment {
  program_name: string
  section_name: string
  section_code: string
  prize_name: string
  prize_image_url?: string
  prize_category: string
  prize_average_value?: number
  prize_description?: string
  prize_category_name?: string
  prize_category_description?: string
}

// Program Prize Assignment operations
export const programPrizeAssignmentsService = {
  async getAll(): Promise<ProgramPrizeAssignmentWithDetails[]> {
    const { data, error } = await supabase
      .from('program_prize_assignments_view')
      .select('*')
      .order('program_name', { ascending: true })
      .order('placement_order', { ascending: true })

    if (error) {
      console.error('Error fetching program prize assignments:', error)
      throw new Error(`Failed to fetch assignments: ${error.message}`)
    }

    return data || []
  },

  async getByProgram(programId: string): Promise<ProgramPrizeAssignmentWithDetails[]> {
    const { data, error } = await supabase
      .from('program_prize_assignments_view')
      .select('*')
      .eq('program_id', programId)
      .order('placement_order', { ascending: true })

    if (error) {
      console.error('Error fetching program assignments:', error)
      throw new Error(`Failed to fetch program assignments: ${error.message}`)
    }

    return data || []
  },

  async create(assignment: {
    program_id: string
    prize_id: string
    placement: string
    placement_order: number
    quantity?: number
    notes?: string
  }): Promise<ProgramPrizeAssignment> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('program_prize_assignments')
      .insert({
        ...assignment,
        quantity: assignment.quantity || 1,
        user_id: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating assignment:', error)
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('This placement already has a prize assigned for this program')
      }
      throw new Error(`Failed to create assignment: ${error.message}`)
    }

    return data
  },

  async update(id: string, updates: {
    prize_id?: string
    placement?: string
    placement_order?: number
    quantity?: number
    notes?: string
  }): Promise<ProgramPrizeAssignment> {
    const { data, error } = await supabase
      .from('program_prize_assignments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating assignment:', error)
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('This placement already has a prize assigned for this program')
      }
      throw new Error(`Failed to update assignment: ${error.message}`)
    }

    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('program_prize_assignments')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting assignment:', error)
      throw new Error(`Failed to delete assignment: ${error.message}`)
    }
  },

  async deleteByProgram(programId: string): Promise<void> {
    const { error } = await supabase
      .from('program_prize_assignments')
      .delete()
      .eq('program_id', programId)

    if (error) {
      console.error('Error deleting program assignments:', error)
      throw new Error(`Failed to delete program assignments: ${error.message}`)
    }
  }
}

// Assignment utility functions
export const assignmentUtils = {
  getStandardPlacements(): { placement: string; placement_order: number }[] {
    return [
      { placement: '1st Place', placement_order: 1 },
      { placement: '2nd Place', placement_order: 2 },
      { placement: '3rd Place', placement_order: 3 },
      { placement: 'Participation', placement_order: 10 },
      { placement: 'Special Award', placement_order: 15 },
      { placement: 'Consolation', placement_order: 20 }
    ]
  },

  generatePlacementOrder(placement: string): number {
    const standardPlacements = this.getStandardPlacements()
    const found = standardPlacements.find(p => p.placement === placement)
    if (found) return found.placement_order

    // Extract number from placement if it contains ordinal numbers
    const match = placement.match(/(\d+)(st|nd|rd|th)/i)
    if (match) {
      return parseInt(match[1])
    }

    // Default to high number for custom placements
    return 100
  },

  async checkPlacementExists(programId: string, placement: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('program_prize_assignments')
      .select('id')
      .eq('program_id', programId)
      .eq('placement', placement)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking placement existence:', error)
      return false
    }

    return !!data
  }
}

// Student interfaces
export interface Student {
  id: string
  chest_no: string
  name: string
  section_id: string
  program_id: string
  created_at?: string
  updated_at?: string
  user_id?: string
}

export interface StudentWithDetails extends Student {
  section_name: string
  section_code: string
  program_name: string
  program_description?: string
}

// Student operations
export const studentsService = {
  async getAll(): Promise<StudentWithDetails[]> {
    const { data, error } = await supabase
      .from('students_view')
      .select('*')
      .order('section_code', { ascending: true })
      .order('program_name', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching students:', error)
      throw new Error(`Failed to fetch students: ${error.message}`)
    }

    return data || []
  },

  async getBySection(sectionId: string): Promise<StudentWithDetails[]> {
    const { data, error } = await supabase
      .from('students_view')
      .select('*')
      .eq('section_id', sectionId)
      .order('program_name', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching students by section:', error)
      throw new Error(`Failed to fetch students: ${error.message}`)
    }

    return data || []
  },

  async create(student: {
    chest_no: string
    name: string
    section_id: string
    program_id: string
  }): Promise<Student> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('students')
      .insert({
        ...student,
        user_id: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating student:', error)
      if (error.code === '23505') {
        throw new Error('A student with this chest number already exists')
      }
      throw new Error(`Failed to create student: ${error.message}`)
    }

    return data
  },

  async update(id: string, updates: Partial<{
    chest_no: string
    name: string
    section_id: string
    program_id: string
  }>): Promise<Student> {
    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating student:', error)
      if (error.code === '23505') {
        throw new Error('A student with this chest number already exists')
      }
      throw new Error(`Failed to update student: ${error.message}`)
    }

    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting student:', error)
      throw new Error(`Failed to delete student: ${error.message}`)
    }
  },

  async checkChestNoExists(chestNo: string, excludeId?: string): Promise<boolean> {
    let query = supabase
      .from('students')
      .select('id')
      .eq('chest_no', chestNo)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query.single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking chest number existence:', error)
      return false
    }

    return !!data
  }
}

// Program with participant count interface
export interface ProgramWithParticipants extends ProgramWithSection {
  participant_count: number
}

// Get programs with participant counts
export const getProgramsWithParticipants = async (): Promise<ProgramWithParticipants[]> => {
  try {
    // Get all programs with sections
    const { data: programs, error: programsError } = await supabase
      .from('programs')
      .select(`
        *,
        section:sections(code, name)
      `)
      .order('name', { ascending: true })

    if (programsError) {
      throw programsError
    }

    // Get student counts for each program
    const programsWithCounts = await Promise.all(
      (programs || []).map(async (program) => {
        const { data: students, error: countError } = await supabase
          .from('students')
          .select('id')
          .eq('program_id', program.id)

        if (countError) {
          console.error('Error counting students for program:', program.id, countError)
        }

        return {
          ...program,
          section: program.section ? {
            code: program.section.code,
            name: program.section.name
          } : null,
          participant_count: students ? students.length : 0
        }
      })
    )

    return programsWithCounts as ProgramWithParticipants[]
  } catch (error) {
    console.error('Error fetching programs with participants:', error)
    throw new Error(`Failed to fetch programs: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}