import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

export interface ProgramItem {
  sectionName: string
  itemName: string
  description?: string
  maxParticipants?: number
  startDate?: string
  endDate?: string
}

export interface ProgramData {
  programName: string
  description: string
  items: ProgramItem[]
}

export function downloadSampleTemplate() {
  // Corrected sample data - Programs with Section Codes
  const sampleData = [
    {
      'Program Name': 'BURDA',
      'Section Code': 'JB'
    },
    {
      'Program Name': 'HAND CRAFT',
      'Section Code': 'JB'
    },
    {
      'Program Name': 'CHITHRATHUNNAL',
      'Section Code': 'JB'
    },
    {
      'Program Name': 'HAND WRITING ARABIMALAYALAM',
      'Section Code': 'K1B'
    },
    {
      'Program Name': 'HIFZ',
      'Section Code': 'K1B'
    },
    {
      'Program Name': 'PAINTING',
      'Section Code': 'K1G'
    },
    {
      'Program Name': 'ARABIC WRITING',
      'Section Code': 'K1G'
    },
    {
      'Program Name': 'STORY TELLING',
      'Section Code': 'SG'
    },
    {
      'Program Name': 'ENGLISH SPEECH',
      'Section Code': 'SG'
    },
    {
      'Program Name': 'QURAN RECITATION',
      'Section Code': 'SB'
    },
    {
      'Program Name': 'ARABIC POETRY',
      'Section Code': 'SB'
    }
  ]

  // Create workbook
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(sampleData)

  // Set column widths - updated for program name and section code
  const colWidths = [
    { wch: 35 }, // Program Name
    { wch: 15 }  // Section Code
  ]
  ws['!cols'] = colWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Programs Template')

  // Create instructions sheet - updated for the correct flow
  const instructions = [
    { 'Instructions': 'How to use this template:' },
    { 'Instructions': '' },
    { 'Instructions': '1. Fill in the Program Name for each program (e.g., BURDA, HAND CRAFT)' },
    { 'Instructions': '2. Add the Section Code that the program belongs to (e.g., JB, K1G, SB)' },
    { 'Instructions': '' },
    { 'Instructions': 'Section Codes Reference:' },
    { 'Instructions': 'JB = JUNIOR BOYS' },
    { 'Instructions': 'K1B = KIDS 1 BOYS' },
    { 'Instructions': 'K1G = KIDS 1 GIRLS' },
    { 'Instructions': 'SG = SENIOR GIRLS' },
    { 'Instructions': 'SB = SENIOR BOYS' },
    { 'Instructions': '(Create sections first in the app to get their codes)' },
    { 'Instructions': '' },
    { 'Instructions': 'Notes:' },
    { 'Instructions': '- You can add multiple programs for the same section code' },
    { 'Instructions': '- Section codes must exist in the system before importing' },
    { 'Instructions': '- Keep program names uppercase for consistency' },
    { 'Instructions': '' },
    { 'Instructions': 'Example:' },
    { 'Instructions': 'BURDA → JB (Junior Boys section)' },
    { 'Instructions': 'HAND CRAFT → JB (Junior Boys section)' },
    { 'Instructions': 'PAINTING → K1G (Kids 1 Girls section)' }
  ]

  const instructionWs = XLSX.utils.json_to_sheet(instructions)
  instructionWs['!cols'] = [{ wch: 60 }]
  XLSX.utils.book_append_sheet(wb, instructionWs, 'Instructions')

  // Generate buffer and save
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })
  saveAs(blob, 'programs-template.xlsx')
}

// Interface for programs with section codes
export interface ProgramUploadData {
  programName: string
  sectionCode: string
}

export function parseExcelFile(file: File): Promise<ProgramUploadData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        
        // Get the first worksheet
        const worksheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[worksheetName]
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[]
        
        // Parse programs with section codes
        const programs: ProgramUploadData[] = []
        
        jsonData.forEach((row) => {
          const programName = row['Program Name']?.trim()
          const sectionCode = row['Section Code']?.trim()
          
          if (!programName || !sectionCode) {
            return // Skip invalid rows
          }
          
          programs.push({
            programName,
            sectionCode
          })
        })
        
        resolve(programs)
      } catch (error) {
        reject(new Error('Failed to parse Excel file: ' + (error as Error).message))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsArrayBuffer(file)
  })
}

export function validateProgramData(programs: ProgramUploadData[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (programs.length === 0) {
    errors.push('No valid programs found in the file')
    return { isValid: false, errors }
  }
  
  // Check for required fields and duplicates
  const seenPrograms = new Map<string, number>()
  
  programs.forEach((program, index) => {
    if (!program.programName.trim()) {
      errors.push(`Row ${index + 1}: Program name is required`)
    }
    
    if (!program.sectionCode.trim()) {
      errors.push(`Row ${index + 1}: Section code is required`)
    }
    
    // Check for duplicates within the file
    if (program.programName.trim() && program.sectionCode.trim()) {
      const key = `${program.programName.trim().toLowerCase()}_${program.sectionCode.trim()}`
      const previousRow = seenPrograms.get(key)
      
      if (previousRow !== undefined) {
        errors.push(`Row ${index + 1}: Duplicate program "${program.programName}" in section "${program.sectionCode}" (first seen in row ${previousRow + 1})`)
      } else {
        seenPrograms.set(key, index)
      }
    }
  })
  
  return { isValid: errors.length === 0, errors }
}