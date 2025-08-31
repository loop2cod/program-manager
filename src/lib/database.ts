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