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
          const programName = row['Program Name']?.toString()?.trim()
          const sectionCode = row['Section Code']?.toString()?.trim()
          
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

// Export programs to Excel
export interface ProgramExportData {
  programName: string
  sectionCode: string
  sectionName: string
  description?: string
  createdAt?: string
}

export function exportProgramsToExcel(programs: ProgramExportData[], filename?: string) {
  if (programs.length === 0) {
    throw new Error('No programs to export')
  }

  // Prepare data for export
  const exportData = programs.map(program => ({
    'Program Name': program.programName,
    'Section Code': program.sectionCode,
    'Section Name': program.sectionName,
    'Description': program.description || '',
    'Created Date': program.createdAt ? new Date(program.createdAt).toLocaleDateString() : ''
  }))

  // Create workbook
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(exportData)

  // Set column widths
  const colWidths = [
    { wch: 30 }, // Program Name
    { wch: 15 }, // Section Code
    { wch: 25 }, // Section Name
    { wch: 40 }, // Description
    { wch: 15 }  // Created Date
  ]
  ws['!cols'] = colWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Programs Export')

  // Create summary sheet
  const sections = [...new Set(programs.map(p => p.sectionCode))]
  const summary = sections.map(sectionCode => {
    const sectionPrograms = programs.filter(p => p.sectionCode === sectionCode)
    const sectionName = sectionPrograms[0]?.sectionName || 'Unknown'
    return {
      'Section Code': sectionCode,
      'Section Name': sectionName,
      'Program Count': sectionPrograms.length,
      'Programs': sectionPrograms.map(p => p.programName).join(', ')
    }
  })

  const summaryWs = XLSX.utils.json_to_sheet(summary)
  summaryWs['!cols'] = [
    { wch: 15 }, // Section Code
    { wch: 25 }, // Section Name
    { wch: 15 }, // Program Count
    { wch: 60 }  // Programs
  ]
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

  // Generate and download file
  const exportFilename = filename || `programs-export-${new Date().toISOString().split('T')[0]}.xlsx`
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })
  saveAs(blob, exportFilename)
}

// Prize-related interfaces and functions
export interface PrizeUploadData {
  prizeName: string
  imageUrl?: string
  category: string
  description?: string
  averageValue?: number
}

export interface PrizeExportData {
  prizeName: string
  imageUrl?: string
  category: string
  description?: string
  averageValue?: number
  createdAt?: string
}

// Download prize template
export function downloadPrizeTemplate() {
  const sampleData = [
    {
      'Prize Name': 'FIRST PRIZE TROPHY',
      'Image URL': 'https://example.com/images/trophy1.jpg',
      'Category': 'A',
      'Average Value': 150.00,
      'Description': 'Gold trophy for first place winners'
    },
    {
      'Prize Name': 'SECOND PRIZE MEDAL',
      'Image URL': 'https://example.com/images/medal2.jpg',
      'Category': 'A',
      'Average Value': 100.00,
      'Description': 'Silver medal for second place winners'
    },
    {
      'Prize Name': 'THIRD PRIZE CERTIFICATE',
      'Image URL': 'https://example.com/images/certificate3.jpg',
      'Category': 'A',
      'Average Value': 50.00,
      'Description': 'Certificate for third place winners'
    },
    {
      'Prize Name': 'PARTICIPATION MEDAL',
      'Image URL': 'https://example.com/images/participation.jpg',
      'Category': 'B',
      'Average Value': 25.00,
      'Description': 'Medal for all participants'
    },
    {
      'Prize Name': 'BEST PERFORMER TROPHY',
      'Image URL': 'https://example.com/images/best-performer.jpg',
      'Category': 'B',
      'Average Value': 200.00,
      'Description': 'Special trophy for outstanding performance'
    },
    {
      'Prize Name': 'ACHIEVEMENT CERTIFICATE',
      'Image URL': '',
      'Category': 'C',
      'Average Value': '',
      'Description': 'Certificate of achievement'
    }
  ]

  // Create workbook
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(sampleData)

  // Set column widths
  const colWidths = [
    { wch: 30 }, // Prize Name
    { wch: 50 }, // Image URL
    { wch: 10 }, // Category
    { wch: 15 }, // Average Value
    { wch: 40 }  // Description
  ]
  ws['!cols'] = colWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Prizes Template')

  // Create instructions sheet
  const instructions = [
    { 'Instructions': 'How to use this prize template:' },
    { 'Instructions': '' },
    { 'Instructions': '1. Fill in the Prize Name (e.g., FIRST PRIZE TROPHY, MEDAL, CERTIFICATE)' },
    { 'Instructions': '2. Add Image URL - web link to the prize image (optional)' },
    { 'Instructions': '3. Set Category - any text code (e.g., A, TROPHY, MEDAL, CERTIFICATE)' },
    { 'Instructions': '4. Add Average Value - estimated monetary value (optional, numbers only)' },
    { 'Instructions': '5. Add Description - brief description of the prize (optional)' },
    { 'Instructions': '' },
    { 'Instructions': 'Category Guidelines:' },
    { 'Instructions': 'A or TROPHY = Top tier prizes (1st, 2nd, 3rd place)' },
    { 'Instructions': 'B or MEDAL = Performance-based prizes (Best performer, Special awards)' },
    { 'Instructions': 'C or CERTIFICATE = Participation prizes (Certificates, Medals for all)' },
    { 'Instructions': 'Any custom text = Create your own categories as needed' },
    { 'Instructions': '' },
    { 'Instructions': 'Notes:' },
    { 'Instructions': '- Prize names must be unique within each category' },
    { 'Instructions': '- Image URL is optional but recommended for visual prizes' },
    { 'Instructions': '- Category can be any text (A, TROPHY, MEDAL, etc.)' },
    { 'Instructions': '- Keep prize names in UPPERCASE for consistency' },
    { 'Instructions': '' },
    { 'Instructions': 'Examples:' },
    { 'Instructions': 'FIRST PRIZE TROPHY → Category TROPHY (Top prize)' },
    { 'Instructions': 'PARTICIPATION MEDAL → Category MEDAL (Everyone gets)' },
    { 'Instructions': 'BEST PERFORMER → Category SPECIAL (Special recognition)' }
  ]

  const instructionWs = XLSX.utils.json_to_sheet(instructions)
  instructionWs['!cols'] = [{ wch: 60 }]
  XLSX.utils.book_append_sheet(wb, instructionWs, 'Instructions')

  // Generate buffer and save
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })
  saveAs(blob, 'prizes-template.xlsx')
}

// Parse prize Excel file
export function parsePrizeExcelFile(file: File): Promise<PrizeUploadData[]> {
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
        
        // Parse prizes
        const prizes: PrizeUploadData[] = []
        
        jsonData.forEach((row) => {
          const prizeName = row['Prize Name']?.toString()?.trim()
          const imageUrl = row['Image URL']?.toString()?.trim()
          const category = row['Category']?.toString()?.trim()?.toUpperCase()
          const averageValue = row['Average Value'] ? parseFloat(row['Average Value'].toString()) : undefined
          const description = row['Description']?.toString()?.trim()
          
          if (!prizeName || !category) {
            return // Skip invalid rows
          }
          
          prizes.push({
            prizeName,
            imageUrl: imageUrl || undefined,
            category,
            averageValue: averageValue && !isNaN(averageValue) ? averageValue : undefined,
            description: description || undefined
          })
        })
        
        resolve(prizes)
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

// Validate prize data
export function validatePrizeData(prizes: PrizeUploadData[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (prizes.length === 0) {
    errors.push('No valid prizes found in the file')
    return { isValid: false, errors }
  }
  
  // Check for required fields and duplicates
  const seenPrizes = new Map<string, number>()
  
  prizes.forEach((prize, index) => {
    if (!prize.prizeName.trim()) {
      errors.push(`Row ${index + 1}: Prize name is required`)
    }
    
    if (!prize.category.trim()) {
      errors.push(`Row ${index + 1}: Category is required`)
    }
    
    // Validate Image URL format if provided
    if (prize.imageUrl && prize.imageUrl.trim()) {
      const urlPattern = /^https?:\/\/.+/i
      if (!urlPattern.test(prize.imageUrl.trim())) {
        errors.push(`Row ${index + 1}: Image URL must be a valid HTTP/HTTPS URL`)
      }
    }
    
    // Validate Average Value if provided
    if (prize.averageValue !== undefined && (isNaN(prize.averageValue) || prize.averageValue < 0)) {
      errors.push(`Row ${index + 1}: Average Value must be a positive number`)
    }
    
    // Check for duplicates within the file
    if (prize.prizeName.trim() && prize.category.trim()) {
      const key = `${prize.prizeName.trim().toLowerCase()}_${prize.category.trim().toUpperCase()}`
      const previousRow = seenPrizes.get(key)
      
      if (previousRow !== undefined) {
        errors.push(`Row ${index + 1}: Duplicate prize "${prize.prizeName}" in category "${prize.category}" (first seen in row ${previousRow + 1})`)
      } else {
        seenPrizes.set(key, index)
      }
    }
  })
  
  return { isValid: errors.length === 0, errors }
}

// Export prizes to Excel
export function exportPrizesToExcel(prizes: PrizeExportData[], filename?: string) {
  if (prizes.length === 0) {
    throw new Error('No prizes to export')
  }

  // Prepare data for export
  const exportData = prizes.map(prize => ({
    'Prize Name': prize.prizeName,
    'Image URL': prize.imageUrl || '',
    'Category': prize.category,
    'Average Value': prize.averageValue || '',
    'Description': prize.description || '',
    'Created Date': prize.createdAt ? new Date(prize.createdAt).toLocaleDateString() : ''
  }))

  // Create workbook
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(exportData)

  // Set column widths
  const colWidths = [
    { wch: 30 }, // Prize Name
    { wch: 50 }, // Image URL
    { wch: 10 }, // Category
    { wch: 15 }, // Average Value
    { wch: 40 }, // Description
    { wch: 15 }  // Created Date
  ]
  ws['!cols'] = colWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Prizes Export')

  // Create summary sheet
  const categories = [...new Set(prizes.map(p => p.category))].sort()
  const summary = categories.map(category => {
    const categoryPrizes = prizes.filter(p => p.category === category)
    return {
      'Category': category,
      'Prize Count': categoryPrizes.length,
      'Prizes': categoryPrizes.map(p => p.prizeName).join(', ')
    }
  })

  const summaryWs = XLSX.utils.json_to_sheet(summary)
  summaryWs['!cols'] = [
    { wch: 10 }, // Category
    { wch: 15 }, // Prize Count
    { wch: 80 }  // Prizes
  ]
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

  // Generate and download file
  const exportFilename = filename || `prizes-export-${new Date().toISOString().split('T')[0]}.xlsx`
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })
  saveAs(blob, exportFilename)
}

// Student Upload/Export interfaces and functions
export interface StudentUploadData {
  chestNo: string
  studentName: string
  sectionCode: string
  programName: string
}

export interface StudentExportData {
  chestNo: string
  studentName: string
  sectionCode: string
  sectionName: string
  programName: string
  registeredDate: string
}

// Download student sample template
export function downloadStudentSampleTemplate() {
  const sampleData = [
    {
      'Chest No.': '413',
      'Student Name': 'Ahmed Ali',
      'Section Code': 'JB',
      'Program': 'BURDA'
    },
    {
      'Chest No.': '413',
      'Student Name': 'Ahmed Ali',
      'Section Code': 'JB',
      'Program': 'HAND CRAFT'
    },
    {
      'Chest No.': '414',
      'Student Name': 'Fatima Hassan',
      'Section Code': 'K1B',
      'Program': 'HAND WRITING ARABIMALAYALAM'
    },
    {
      'Chest No.': '414',
      'Student Name': 'Fatima Hassan',
      'Section Code': 'K1G',
      'Program': 'PAINTING'
    },
    {
      'Chest No.': '415',
      'Student Name': 'Mohammed Yusuf',
      'Section Code': 'K1B',
      'Program': 'HIFZ'
    }
  ]

  const ws = XLSX.utils.json_to_sheet(sampleData)
  
  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // Chest No.
    { wch: 20 }, // Student Name
    { wch: 15 }, // Section Code
    { wch: 25 }  // Program
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Students')

  // Add instructions sheet
  const instructions = [
    { 'Field': 'Chest No.', 'Description': 'Student chest number (e.g., 413, 414). Same student can appear multiple times for different programs.', 'Required': 'Yes' },
    { 'Field': 'Student Name', 'Description': 'Full name of the student', 'Required': 'Yes' },
    { 'Field': 'Section Code', 'Description': 'Section code that exists in your system (e.g., JB, K1B, K1G)', 'Required': 'Yes' },
    { 'Field': 'Program', 'Description': 'Program name that exists in the selected section', 'Required': 'Yes' },
    { 'Field': '', 'Description': '', 'Required': '' },
    { 'Field': 'IMPORTANT', 'Description': 'Same student can participate in multiple programs. Exact duplicate rows are automatically skipped.', 'Required': '' },
    { 'Field': 'Example', 'Description': 'Student 413 can be in both BURDA and HAND CRAFT programs', 'Required': '' },
    { 'Field': 'Note', 'Description': 'If same student, section, and program appear multiple times, only first entry is kept', 'Required': '' }
  ]

  const instructionsWs = XLSX.utils.json_to_sheet(instructions)
  instructionsWs['!cols'] = [
    { wch: 15 }, // Field
    { wch: 60 }, // Description
    { wch: 10 }  // Required
  ]
  XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions')

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })
  saveAs(blob, 'student-upload-sample.xlsx')
}

// Parse student upload file
export function parseStudentUploadFile(file: File): Promise<StudentUploadData[]> {
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
        
        // Parse students
        const allStudents: StudentUploadData[] = []
        
        jsonData.forEach((row) => {
          const chestNo = row['Chest No.']?.toString()?.trim()
          const studentName = row['Student Name']?.toString()?.trim()
          const sectionCode = row['Section Code']?.toString()?.trim()
          const programName = row['Program']?.toString()?.trim()
          
          if (!chestNo || !studentName || !sectionCode || !programName) {
            return // Skip invalid rows
          }
          
          allStudents.push({
            chestNo,
            studentName,
            sectionCode,
            programName
          })
        })
        
        // Filter out exact duplicates
        const uniqueStudents = filterExactDuplicateStudents(allStudents)
        
        resolve(uniqueStudents)
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

// Helper function to filter out exact duplicate student entries
export function filterExactDuplicateStudents(students: StudentUploadData[]): StudentUploadData[] {
  const seen = new Set<string>()
  const uniqueStudents: StudentUploadData[] = []
  let duplicateCount = 0
  
  students.forEach((student, index) => {
    const key = `${student.chestNo.trim().toUpperCase()}_${student.studentName.trim().toLowerCase()}_${student.sectionCode.trim().toUpperCase()}_${student.programName.trim().toLowerCase()}`
    
    if (!seen.has(key)) {
      seen.add(key)
      uniqueStudents.push(student)
    } else {
      duplicateCount++
      console.log(`Skipping exact duplicate at row ${index + 1}: ${student.chestNo} - ${student.studentName} - ${student.sectionCode} - ${student.programName}`)
    }
  })
  
  if (duplicateCount > 0) {
    console.log(`Filtered out ${duplicateCount} exact duplicate entries. Processing ${uniqueStudents.length} unique entries.`)
  }
  
  return uniqueStudents
}

// Validate student data
export function validateStudentData(
  students: StudentUploadData[], 
  availableSections: Array<{ code: string; name: string; id: string }>,
  availablePrograms: Array<{ name: string; section_id: string; id: string }>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (students.length === 0) {
    errors.push('No valid students found in the file')
    return { isValid: false, errors }
  }

  students.forEach((student, index) => {
    // Validate chest number
    if (!student.chestNo.trim()) {
      errors.push(`Row ${index + 1}: Chest number is required`)
    }
    
    // Validate student name
    if (!student.studentName.trim()) {
      errors.push(`Row ${index + 1}: Student name is required`)
    }
    
    // Validate section code exists
    const section = availableSections.find(s => s.code.toUpperCase() === student.sectionCode.toUpperCase())
    if (!section) {
      errors.push(`Row ${index + 1}: Section code "${student.sectionCode}" does not exist`)
    } else {
      // Validate program exists in the section
      const program = availablePrograms.find(p => 
        p.name.toLowerCase() === student.programName.toLowerCase() && 
        p.section_id === section.id
      )
      if (!program) {
        errors.push(`Row ${index + 1}: Program "${student.programName}" does not exist in section "${student.sectionCode}"`)
      }
    }
    
    // Note: Exact duplicates are already filtered out during parsing
    // No need to validate for duplicates here since they're handled at the parsing stage
  })

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Export students to Excel
export function exportStudentsToExcel(students: StudentExportData[], filename?: string) {
  const ws = XLSX.utils.json_to_sheet(students.map(student => ({
    'Chest No.': student.chestNo,
    'Student Name': student.studentName,
    'Section Code': student.sectionCode,
    'Section Name': student.sectionName,
    'Program': student.programName,
    'Registered Date': student.registeredDate
  })))

  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // Chest No.
    { wch: 25 }, // Student Name
    { wch: 15 }, // Section Code
    { wch: 25 }, // Section Name
    { wch: 30 }, // Program
    { wch: 15 }  // Registered Date
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Students')

  // Add summary sheet
  const sections = [...new Set(students.map(s => s.sectionCode))]
  const summary = sections.map(sectionCode => {
    const sectionStudents = students.filter(s => s.sectionCode === sectionCode)
    return {
      'Section Code': sectionCode,
      'Section Name': sectionStudents[0]?.sectionName || 'N/A',
      'Student Count': sectionStudents.length,
      'Programs': [...new Set(sectionStudents.map(s => s.programName))].join(', ')
    }
  })

  const summaryWs = XLSX.utils.json_to_sheet(summary)
  summaryWs['!cols'] = [
    { wch: 15 }, // Section Code
    { wch: 25 }, // Section Name
    { wch: 15 }, // Student Count
    { wch: 60 }  // Programs
  ]
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

  // Generate and download file
  const exportFilename = filename || `students-export-${new Date().toISOString().split('T')[0]}.xlsx`
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })
  saveAs(blob, exportFilename)
}

// Program with participants export interfaces
export interface ProgramWithParticipantsExportData {
  programName: string
  sectionCode: string
  sectionName: string
  participantCount: number
  description?: string
  createdAt: string
}

// Export programs with participant counts to Excel
export function exportProgramsWithParticipantsToExcel(
  programs: ProgramWithParticipantsExportData[], 
  filename?: string
) {
  // Main programs data
  const ws = XLSX.utils.json_to_sheet(programs.map(program => ({
    'Program Name': program.programName,
    'Section Code': program.sectionCode,
    'Section Name': program.sectionName,
    'Participants': program.participantCount,
    'Description': program.description || '',
    'Created Date': program.createdAt
  })))

  // Set column widths
  ws['!cols'] = [
    { wch: 30 }, // Program Name
    { wch: 15 }, // Section Code
    { wch: 25 }, // Section Name
    { wch: 12 }, // Participants
    { wch: 40 }, // Description
    { wch: 15 }  // Created Date
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Programs')

  // Add summary sheet by section
  const sections = [...new Set(programs.map(p => p.sectionCode))]
  const sectionSummary = sections.map(sectionCode => {
    const sectionPrograms = programs.filter(p => p.sectionCode === sectionCode)
    const totalParticipants = sectionPrograms.reduce((sum, p) => sum + p.participantCount, 0)
    
    return {
      'Section Code': sectionCode,
      'Section Name': sectionPrograms[0]?.sectionName || 'N/A',
      'Total Programs': sectionPrograms.length,
      'Total Participants': totalParticipants,
      'Avg Participants': sectionPrograms.length > 0 ? Math.round(totalParticipants / sectionPrograms.length * 100) / 100 : 0,
      'Programs': sectionPrograms.map(p => p.programName).join(', ')
    }
  })

  const summaryWs = XLSX.utils.json_to_sheet(sectionSummary)
  summaryWs['!cols'] = [
    { wch: 15 }, // Section Code
    { wch: 25 }, // Section Name
    { wch: 15 }, // Total Programs
    { wch: 18 }, // Total Participants
    { wch: 18 }, // Avg Participants
    { wch: 60 }  // Programs
  ]
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Section Summary')

  // Add overall statistics sheet
  const totalPrograms = programs.length
  const totalParticipants = programs.reduce((sum, p) => sum + p.participantCount, 0)
  const programsWithParticipants = programs.filter(p => p.participantCount > 0).length
  const programsWithoutParticipants = programs.filter(p => p.participantCount === 0).length
  
  const statistics = [
    { 'Metric': 'Total Programs', 'Value': totalPrograms },
    { 'Metric': 'Total Participants', 'Value': totalParticipants },
    { 'Metric': 'Programs with Participants', 'Value': programsWithParticipants },
    { 'Metric': 'Programs without Participants', 'Value': programsWithoutParticipants },
    { 'Metric': 'Average Participants per Program', 'Value': totalPrograms > 0 ? Math.round(totalParticipants / totalPrograms * 100) / 100 : 0 },
    { 'Metric': 'Total Sections', 'Value': sections.length }
  ]

  const statsWs = XLSX.utils.json_to_sheet(statistics)
  statsWs['!cols'] = [
    { wch: 30 }, // Metric
    { wch: 20 }  // Value
  ]
  XLSX.utils.book_append_sheet(wb, statsWs, 'Statistics')

  // Generate and download file
  const exportFilename = filename || `programs-with-participants-${new Date().toISOString().split('T')[0]}.xlsx`
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })
  saveAs(blob, exportFilename)
}

// Student Prize Export interfaces and functions
export interface StudentPrizeExportData {
  studentName: string
  chestNo: string
  sectionCode: string
  sectionName: string
  programName: string
  placement: string
  prizeName: string
  prizeCategory: string
  prizeValue?: number
  dateAwarded: string
  notes?: string
}

export function exportStudentPrizesToExcel(
  prizes: StudentPrizeExportData[],
  studentName: string,
  filename?: string
) {
  const wb = XLSX.utils.book_new()

  // Student Information Sheet
  if (prizes.length > 0) {
    const studentInfo = [
      { 'Field': 'Student Name', 'Value': prizes[0].studentName },
      { 'Field': 'Chest Number', 'Value': prizes[0].chestNo },
      { 'Field': 'Section', 'Value': `${prizes[0].sectionName} (${prizes[0].sectionCode})` },
      { 'Field': 'Total Prizes Won', 'Value': prizes.length },
      { 'Field': 'Report Generated', 'Value': new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      }) }
    ]

    const infoWs = XLSX.utils.json_to_sheet(studentInfo)
    infoWs['!cols'] = [
      { wch: 25 }, // Field
      { wch: 40 }  // Value
    ]
    XLSX.utils.book_append_sheet(wb, infoWs, 'Student Info')
  }

  // Prizes Won Sheet
  const prizesWs = XLSX.utils.json_to_sheet(prizes.map(prize => ({
    'Program': prize.programName,
    'Placement': prize.placement,
    'Prize Name': prize.prizeName,
    'Category': prize.prizeCategory,
    'Value': prize.prizeValue ? `$${prize.prizeValue}` : 'N/A',
    'Date Awarded': prize.dateAwarded,
    'Notes': prize.notes || ''
  })))

  // Set column widths
  prizesWs['!cols'] = [
    { wch: 25 }, // Program
    { wch: 15 }, // Placement
    { wch: 25 }, // Prize Name
    { wch: 15 }, // Category
    { wch: 12 }, // Value
    { wch: 15 }, // Date Awarded
    { wch: 30 }  // Notes
  ]

  XLSX.utils.book_append_sheet(wb, prizesWs, 'Prizes Won')

  // Prize Summary by Category
  const categoryMap = new Map<string, { count: number, totalValue: number, prizes: string[] }>()
  
  prizes.forEach(prize => {
    const category = prize.prizeCategory || 'Unknown'
    const existing = categoryMap.get(category) || { count: 0, totalValue: 0, prizes: [] }
    existing.count += 1
    existing.totalValue += prize.prizeValue || 0
    existing.prizes.push(prize.prizeName)
    categoryMap.set(category, existing)
  })

  const categorySummary = Array.from(categoryMap.entries()).map(([category, data]) => ({
    'Prize Category': category,
    'Number of Prizes': data.count,
    'Total Value': data.totalValue > 0 ? `$${data.totalValue}` : 'N/A',
    'Prize Names': data.prizes.join(', ')
  }))

  const summaryWs = XLSX.utils.json_to_sheet(categorySummary)
  summaryWs['!cols'] = [
    { wch: 20 }, // Prize Category
    { wch: 18 }, // Number of Prizes
    { wch: 15 }, // Total Value
    { wch: 50 }  // Prize Names
  ]
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Prize Summary')

  // Generate certificate-style data
  const certificateData = prizes.map(prize => ({
    'CERTIFICATE OF ACHIEVEMENT': '',
    'This is to certify that': '',
    'Student Name': prize.studentName.toUpperCase(),
    'Chest Number': prize.chestNo,
    'Has been awarded': '',
    'Prize': prize.prizeName,
    'For achieving': prize.placement,
    'In the program': prize.programName,
    'Section': `${prize.sectionName} (${prize.sectionCode})`,
    'Date': prize.dateAwarded,
    'Congratulations on this achievement!': ''
  }))

  const certificateWs = XLSX.utils.json_to_sheet(certificateData)
  certificateWs['!cols'] = Array(12).fill({ wch: 20 })
  XLSX.utils.book_append_sheet(wb, certificateWs, 'Certificates')

  // Generate and download file
  const exportFilename = filename || `${studentName.replace(/\s+/g, '-')}-prizes-${new Date().toISOString().split('T')[0]}.xlsx`
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })
  saveAs(blob, exportFilename)
}

// Generate printable prize certificate HTML
export function generatePrizeCertificateHTML(prize: StudentPrizeExportData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Prize Certificate - ${prize.studentName}</title>
      <style>
        @page { 
          size: A4; 
          margin: 20mm; 
        }
        body {
          font-family: 'Times New Roman', serif;
          line-height: 1.6;
          color: #333;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          min-height: 100vh;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .certificate {
          background: white;
          padding: 60px;
          border: 8px solid #2c5282;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          text-align: center;
          max-width: 800px;
          width: 100%;
          position: relative;
        }
        .certificate::before {
          content: '';
          position: absolute;
          top: 20px;
          left: 20px;
          right: 20px;
          bottom: 20px;
          border: 2px solid #4a90e2;
          border-radius: 10px;
        }
        .header {
          font-size: 36px;
          font-weight: bold;
          color: #2c5282;
          margin-bottom: 20px;
          text-transform: uppercase;
          letter-spacing: 3px;
        }
        .subheader {
          font-size: 18px;
          color: #4a90e2;
          margin-bottom: 40px;
          font-style: italic;
        }
        .student-name {
          font-size: 32px;
          font-weight: bold;
          color: #1a365d;
          margin: 30px 0;
          text-transform: uppercase;
          letter-spacing: 2px;
          border-bottom: 3px solid #4a90e2;
          padding-bottom: 10px;
        }
        .achievement {
          font-size: 20px;
          color: #2d3748;
          margin: 20px 0;
          line-height: 1.8;
        }
        .prize-name {
          font-size: 24px;
          font-weight: bold;
          color: #c53030;
          margin: 20px 0;
        }
        .program-details {
          font-size: 16px;
          color: #4a5568;
          margin: 15px 0;
        }
        .date {
          font-size: 14px;
          color: #718096;
          margin-top: 40px;
        }
        .congratulations {
          font-size: 18px;
          color: #2c5282;
          font-weight: bold;
          margin-top: 30px;
          font-style: italic;
        }
        @media print {
          body {
            background: white;
          }
          .certificate {
            box-shadow: none;
            border: 4px solid #2c5282;
          }
        }
      </style>
    </head>
    <body>
      <div class="certificate">
        <div class="header">Certificate of Achievement</div>
        <div class="subheader">This is to certify that</div>
        
        <div class="student-name">${prize.studentName}</div>
        
        <div class="achievement">
          Chest Number: <strong>${prize.chestNo}</strong><br>
          Section: <strong>${prize.sectionName} (${prize.sectionCode})</strong>
        </div>
        
        <div class="achievement">
          Has been awarded
        </div>
        
        <div class="prize-name">${prize.prizeName}</div>
        
        <div class="achievement">
          For achieving <strong>${prize.placement}</strong><br>
          in the program
        </div>
        
        <div class="program-details">
          <strong>${prize.programName}</strong><br>
          Prize Category: ${prize.prizeCategory}
          ${prize.prizeValue ? `<br>Prize Value: $${prize.prizeValue}` : ''}
        </div>
        
        ${prize.notes ? `<div class="program-details">Notes: ${prize.notes}</div>` : ''}
        
        <div class="date">Date Awarded: ${prize.dateAwarded}</div>
        
        <div class="congratulations">
          🎉 Congratulations on this outstanding achievement! 🎉
        </div>
      </div>
    </body>
    </html>
  `
}

// Print prize certificate
export function printPrizeCertificate(prize: StudentPrizeExportData) {
  const certificateHTML = generatePrizeCertificateHTML(prize)
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(certificateHTML)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }
}

// Program Prize Assignment Upload/Export interfaces and functions
export interface ProgramPrizeAssignmentUploadData {
  programName: string
  sectionCode: string
  placement: string
  prizeCategory: string
}

export interface ProgramPrizeAssignmentExportData {
  programName: string
  sectionName: string
  sectionCode: string
  placement: string
  prizeName: string
  prizeCategory: string
  quantity: number
  notes?: string
  createdAt: string
}

// Download program prize assignment template
export function downloadProgramPrizeAssignmentTemplate() {
  const sampleData = [
    {
      'Program Name': 'BURDA',
      'Section Code': 'JB',
      'Placement': '1st',
      'Prize Category': 'TROPHY'
    },
    {
      'Program Name': 'BURDA',
      'Section Code': 'JB',
      'Placement': '2nd',
      'Prize Category': 'MEDAL'
    },
    {
      'Program Name': 'HAND CRAFT',
      'Section Code': 'JB',
      'Placement': '1st',
      'Prize Category': 'TROPHY'
    },
    {
      'Program Name': 'PAINTING',
      'Section Code': 'K1G',
      'Placement': 'Participation',
      'Prize Category': 'CERTIFICATE'
    },
    {
      'Program Name': 'STORY TELLING',
      'Section Code': 'SG',
      'Placement': 'Best Performance',
      'Prize Category': 'SPECIAL'
    }
  ]

  // Create workbook
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(sampleData)

  // Set column widths
  const colWidths = [
    { wch: 25 }, // Program Name
    { wch: 15 }, // Section Code
    { wch: 18 }, // Placement
    { wch: 15 }  // Prize Category
  ]
  ws['!cols'] = colWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Prize Assignments')

  // Create instructions sheet
  const instructions = [
    { 'Instructions': 'How to use this Program Prize Assignment template:' },
    { 'Instructions': '' },
    { 'Instructions': '1. Program Name: Must match existing programs in your system' },
    { 'Instructions': '2. Section Code: Must match existing sections (e.g., JB, K1G, SG)' },
    { 'Instructions': '3. Placement: Position/rank (1st, 2nd, 3rd, Participation, Best Performance, etc.)' },
    { 'Instructions': '4. Prize Category: Any category code (A, TROPHY, MEDAL, etc.) - system will auto-assign prizes' },
    { 'Instructions': '' },
    { 'Instructions': 'Standard Placements:' },
    { 'Instructions': '- 1st, 2nd, 3rd (for ranking positions)' },
    { 'Instructions': '- Participation (for all participants)' },
    { 'Instructions': '- Best Performance (for special recognition)' },
    { 'Instructions': '- Special Award (for unique achievements)' },
    { 'Instructions': '- You can also use custom placements' },
    { 'Instructions': '' },
    { 'Instructions': 'Important Notes:' },
    { 'Instructions': '- Each program can have only one assignment per placement' },
    { 'Instructions': '- Programs and sections must exist before importing' },
    { 'Instructions': '- Prize category can be any text - determines which prizes are available' },
    { 'Instructions': '- Quantity defaults to 1 for all assignments' },
    { 'Instructions': '- System will auto-select appropriate prizes from the category' },
    { 'Instructions': '' },
    { 'Instructions': 'Examples:' },
    { 'Instructions': 'BURDA (JB section) → 1st place → Category TROPHY (system picks prize)' },
    { 'Instructions': 'PAINTING (K1G section) → Participation → Category CERTIFICATE (system picks prize)' }
  ]

  const instructionWs = XLSX.utils.json_to_sheet(instructions)
  instructionWs['!cols'] = [{ wch: 70 }]
  XLSX.utils.book_append_sheet(wb, instructionWs, 'Instructions')

  // Generate buffer and save
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })
  saveAs(blob, 'program-prize-assignments-template.xlsx')
}

// Parse program prize assignment Excel file
export function parseProgramPrizeAssignmentExcelFile(file: File): Promise<ProgramPrizeAssignmentUploadData[]> {
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
        
        // Parse assignments
        const assignments: ProgramPrizeAssignmentUploadData[] = []
        
        jsonData.forEach((row) => {
          const programName = row['Program Name']?.toString()?.trim()
          const sectionCode = row['Section Code']?.toString()?.trim()
          const placement = row['Placement']?.toString()?.trim()
          const prizeCategory = row['Prize Category']?.toString()?.trim()?.toUpperCase()
          
          if (!programName || !sectionCode || !placement || !prizeCategory) {
            return // Skip invalid rows
          }
          
          assignments.push({
            programName,
            sectionCode,
            placement,
            prizeCategory
          })
        })
        
        resolve(assignments)
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

// Validate program prize assignment data
export function validateProgramPrizeAssignmentData(
  assignments: ProgramPrizeAssignmentUploadData[],
  availablePrograms: Array<{ name: string; section_id: string; id: string }>,
  availableSections: Array<{ code: string; name: string; id: string }>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (assignments.length === 0) {
    errors.push('No valid assignments found in the file')
    return { isValid: false, errors }
  }

  const seenAssignments = new Map<string, number>()
  
  assignments.forEach((assignment, index) => {
    // Validate required fields
    if (!assignment.programName.trim()) {
      errors.push(`Row ${index + 1}: Program name is required`)
    }
    
    if (!assignment.sectionCode.trim()) {
      errors.push(`Row ${index + 1}: Section code is required`)
    }
    
    if (!assignment.placement.trim()) {
      errors.push(`Row ${index + 1}: Placement is required`)
    }
    
    if (!assignment.prizeCategory.trim()) {
      errors.push(`Row ${index + 1}: Prize category is required`)
    }
    
    // Validate section exists
    const section = availableSections.find(s => s.code.toUpperCase() === assignment.sectionCode.toUpperCase())
    if (!section && assignment.sectionCode.trim()) {
      errors.push(`Row ${index + 1}: Section code "${assignment.sectionCode}" does not exist`)
    }
    
    // Validate program exists in the section
    if (section && assignment.programName.trim()) {
      const program = availablePrograms.find(p => 
        p.name.toLowerCase() === assignment.programName.toLowerCase() && 
        p.section_id === section.id
      )
      if (!program) {
        errors.push(`Row ${index + 1}: Program "${assignment.programName}" does not exist in section "${assignment.sectionCode}"`)
      }
    }
    
    // Check for duplicate assignments (same program + placement)
    if (assignment.programName.trim() && assignment.placement.trim() && section) {
      const key = `${assignment.programName.trim().toLowerCase()}_${section.id}_${assignment.placement.trim().toLowerCase()}`
      const previousRow = seenAssignments.get(key)
      
      if (previousRow !== undefined) {
        errors.push(`Row ${index + 1}: Duplicate assignment for program "${assignment.programName}" placement "${assignment.placement}" (first seen in row ${previousRow + 1})`)
      } else {
        seenAssignments.set(key, index)
      }
    }
  })

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Export program prize assignments to Excel
export function exportProgramPrizeAssignmentsToExcel(
  assignments: ProgramPrizeAssignmentExportData[], 
  filename?: string
) {
  if (assignments.length === 0) {
    throw new Error('No assignments to export')
  }

  // Prepare data for export
  const exportData = assignments.map(assignment => ({
    'Program Name': assignment.programName,
    'Section Code': assignment.sectionCode,
    'Section Name': assignment.sectionName,
    'Placement': assignment.placement,
    'Prize Name': assignment.prizeName,
    'Prize Category': assignment.prizeCategory,
    'Quantity': assignment.quantity,
    'Notes': assignment.notes || '',
    'Created Date': assignment.createdAt ? new Date(assignment.createdAt).toLocaleDateString() : ''
  }))

  // Create workbook
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(exportData)

  // Set column widths
  const colWidths = [
    { wch: 25 }, // Program Name
    { wch: 15 }, // Section Code
    { wch: 25 }, // Section Name
    { wch: 18 }, // Placement
    { wch: 30 }, // Prize Name
    { wch: 15 }, // Prize Category
    { wch: 10 }, // Quantity
    { wch: 30 }, // Notes
    { wch: 15 }  // Created Date
  ]
  ws['!cols'] = colWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Prize Assignments')

  // Create summary by section
  const sections = [...new Set(assignments.map(a => a.sectionCode))]
  const sectionSummary = sections.map(sectionCode => {
    const sectionAssignments = assignments.filter(a => a.sectionCode === sectionCode)
    const uniquePrograms = [...new Set(sectionAssignments.map(a => a.programName))]
    const totalPrizes = sectionAssignments.reduce((sum, a) => sum + a.quantity, 0)
    
    return {
      'Section Code': sectionCode,
      'Section Name': sectionAssignments[0]?.sectionName || 'Unknown',
      'Programs': uniquePrograms.length,
      'Assignments': sectionAssignments.length,
      'Total Prizes': totalPrizes,
      'Program Names': uniquePrograms.join(', ')
    }
  })

  const summaryWs = XLSX.utils.json_to_sheet(sectionSummary)
  summaryWs['!cols'] = [
    { wch: 15 }, // Section Code
    { wch: 25 }, // Section Name
    { wch: 12 }, // Programs
    { wch: 15 }, // Assignments
    { wch: 15 }, // Total Prizes
    { wch: 50 }  // Program Names
  ]
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Section Summary')

  // Create summary by placement
  const placements = [...new Set(assignments.map(a => a.placement))]
  const placementSummary = placements.map(placement => {
    const placementAssignments = assignments.filter(a => a.placement === placement)
    const totalQuantity = placementAssignments.reduce((sum, a) => sum + a.quantity, 0)
    
    return {
      'Placement': placement,
      'Programs': placementAssignments.length,
      'Total Quantity': totalQuantity,
      'Prize Categories': [...new Set(placementAssignments.map(a => a.prizeCategory))].join(', ')
    }
  })

  const placementWs = XLSX.utils.json_to_sheet(placementSummary)
  placementWs['!cols'] = [
    { wch: 20 }, // Placement
    { wch: 15 }, // Programs
    { wch: 15 }, // Total Quantity
    { wch: 30 }  // Prize Categories
  ]
  XLSX.utils.book_append_sheet(wb, placementWs, 'Placement Summary')

  // Generate and download file
  const exportFilename = filename || `program-prize-assignments-export-${new Date().toISOString().split('T')[0]}.xlsx`
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })
  saveAs(blob, exportFilename)
}

// Program Winners Bulk Upload interfaces and functions
export interface ProgramWinnerUploadData {
  chestNo: string
  studentName: string
  sectionCode: string
  programName: string
  placement: string
  notes?: string
}

export interface ProgramWinnerExportData {
  chestNo: string
  studentName: string
  sectionCode: string
  sectionName: string
  programName: string
  placement: string
  prizeName?: string
  prizeCategory?: string
  notes?: string
  createdAt: string
}

// Download program winner bulk upload template
export function downloadProgramWinnerTemplate() {
  const sampleData = [
    {
      'Chest No': '413',
      'Student Name': 'Ahmed Ali',
      'Section Code': 'JB',
      'Program Name': 'BURDA',
      'Placement': '1st',
      'Notes': 'Excellent performance'
    },
    {
      'Chest No': '414',
      'Student Name': 'Fatima Hassan',
      'Section Code': 'K1B',
      'Program Name': 'HAND WRITING ARABIMALAYALAM',
      'Placement': '2nd',
      'Notes': ''
    },
    {
      'Chest No': '415',
      'Student Name': 'Mohammed Yusuf',
      'Section Code': 'K1G',
      'Program Name': 'PAINTING',
      'Placement': 'Participation',
      'Notes': 'Great effort'
    },
    {
      'Chest No': '416',
      'Student Name': 'Aisha Rahman',
      'Section Code': 'SG',
      'Program Name': 'STORY TELLING',
      'Placement': '1st',
      'Notes': ''
    },
    {
      'Chest No': '417',
      'Student Name': 'Omar Khan',
      'Section Code': 'SB',
      'Program Name': 'QURAN RECITATION',
      'Placement': '3rd',
      'Notes': 'Very good recitation'
    }
  ]

  // Create workbook
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(sampleData)

  // Set column widths
  const colWidths = [
    { wch: 12 }, // Chest No
    { wch: 20 }, // Student Name
    { wch: 15 }, // Section Code
    { wch: 30 }, // Program Name
    { wch: 15 }, // Placement
    { wch: 25 }  // Notes
  ]
  ws['!cols'] = colWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Program Winners')

  // Create instructions sheet
  const instructions = [
    { 'Instructions': 'How to use this Program Winners bulk upload template:' },
    { 'Instructions': '' },
    { 'Instructions': '1. Chest No: Student chest number (must exist in system)' },
    { 'Instructions': '2. Student Name: Full name of the student (must match existing student)' },
    { 'Instructions': '3. Section Code: Section code (JB, K1B, K1G, SG, SB, etc.)' },
    { 'Instructions': '4. Program Name: Exact program name (must exist in the specified section)' },
    { 'Instructions': '5. Placement: Position achieved (1st, 2nd, 3rd, Participation, etc.)' },
    { 'Instructions': '6. Notes: Optional notes about the winner (leave blank if none)' },
    { 'Instructions': '' },
    { 'Instructions': 'Standard Placements:' },
    { 'Instructions': '- 1st, 2nd, 3rd (for ranking positions)' },
    { 'Instructions': '- Participation (for all participants)' },
    { 'Instructions': '- Best Performance (for special recognition)' },
    { 'Instructions': '- Special Award (for unique achievements)' },
    { 'Instructions': '- You can also use custom placements' },
    { 'Instructions': '' },
    { 'Instructions': 'Important Rules:' },
    { 'Instructions': '- Students must already be registered in the program to be added as winners' },
    { 'Instructions': '- Each student can only win one placement per program' },
    { 'Instructions': '- Student name and chest number must match exactly' },
    { 'Instructions': '- Program must exist in the specified section' },
    { 'Instructions': '- Duplicate entries (same student + program) will be skipped' },
    { 'Instructions': '' },
    { 'Instructions': 'Validation Notes:' },
    { 'Instructions': '- System will check if student is registered for the program' },
    { 'Instructions': '- Section code must exist in your system' },
    { 'Instructions': '- Program name must exist in the specified section' },
    { 'Instructions': '- Student chest number and name must match existing records' },
    { 'Instructions': '' },
    { 'Instructions': 'Examples:' },
    { 'Instructions': 'Ahmed Ali (413) → JB section → BURDA program → 1st place' },
    { 'Instructions': 'Fatima Hassan (414) → K1B section → HAND WRITING → 2nd place' },
    { 'Instructions': 'Mohammed Yusuf (415) → K1G section → PAINTING → Participation' }
  ]

  const instructionWs = XLSX.utils.json_to_sheet(instructions)
  instructionWs['!cols'] = [{ wch: 70 }]
  XLSX.utils.book_append_sheet(wb, instructionWs, 'Instructions')

  // Generate buffer and save
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })
  saveAs(blob, 'program-winners-template.xlsx')
}

// Parse program winner Excel file
export function parseProgramWinnerExcelFile(file: File): Promise<ProgramWinnerUploadData[]> {
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
        
        // Parse program winners
        const winners: ProgramWinnerUploadData[] = []
        
        jsonData.forEach((row) => {
          const chestNo = row['Chest No']?.toString()?.trim()
          const studentName = row['Student Name']?.toString()?.trim()
          const sectionCode = row['Section Code']?.toString()?.trim()
          const programName = row['Program Name']?.toString()?.trim()
          const placement = row['Placement']?.toString()?.trim()
          const notes = row['Notes']?.toString()?.trim()
          
          if (!chestNo || !studentName || !sectionCode || !programName || !placement) {
            return // Skip invalid rows
          }
          
          winners.push({
            chestNo,
            studentName,
            sectionCode,
            programName,
            placement,
            notes: notes || undefined
          })
        })
        
        resolve(winners)
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

// Validate program winner data
export function validateProgramWinnerData(
  winners: ProgramWinnerUploadData[],
  availableStudents: Array<{ id: string; chest_no: string; name: string; program_id: string }>,
  availablePrograms: Array<{ id: string; name: string; section_id: string }>,
  availableSections: Array<{ id: string; code: string; name: string }>
): { isValid: boolean; errors: string[]; validWinners: Array<ProgramWinnerUploadData & { program_id: string; student_id: string }> } {
  const errors: string[] = []
  const validWinners: Array<ProgramWinnerUploadData & { program_id: string; student_id: string }> = []
  
  if (winners.length === 0) {
    errors.push('No valid winners found in the file')
    return { isValid: false, errors, validWinners: [] }
  }

  const seenWinners = new Map<string, number>()
  
  winners.forEach((winner, index) => {
    let hasError = false
    
    // Validate required fields
    if (!winner.chestNo.trim()) {
      errors.push(`Row ${index + 1}: Chest number is required`)
      hasError = true
    }
    
    if (!winner.studentName.trim()) {
      errors.push(`Row ${index + 1}: Student name is required`)
      hasError = true
    }
    
    if (!winner.sectionCode.trim()) {
      errors.push(`Row ${index + 1}: Section code is required`)
      hasError = true
    }
    
    if (!winner.programName.trim()) {
      errors.push(`Row ${index + 1}: Program name is required`)
      hasError = true
    }
    
    if (!winner.placement.trim()) {
      errors.push(`Row ${index + 1}: Placement is required`)
      hasError = true
    }
    
    if (hasError) return
    
    // Validate section exists
    const section = availableSections.find(s => s.code.toUpperCase() === winner.sectionCode.toUpperCase())
    if (!section) {
      errors.push(`Row ${index + 1}: Section code "${winner.sectionCode}" does not exist`)
      return
    }
    
    // Validate program exists in the section
    const program = availablePrograms.find(p => 
      p.name.toLowerCase() === winner.programName.toLowerCase() && 
      p.section_id === section.id
    )
    if (!program) {
      errors.push(`Row ${index + 1}: Program "${winner.programName}" does not exist in section "${winner.sectionCode}"`)
      return
    }
    
    // Validate student exists and is registered for the program
    const student = availableStudents.find(s => 
      s.chest_no.toUpperCase() === winner.chestNo.toUpperCase() &&
      s.name.toLowerCase() === winner.studentName.toLowerCase() &&
      s.program_id === program.id
    )
    if (!student) {
      // Try to find the student by chest number to give more specific error
      const studentByChest = availableStudents.find(s => s.chest_no.toUpperCase() === winner.chestNo.toUpperCase())
      if (!studentByChest) {
        errors.push(`Row ${index + 1}: Student with chest number "${winner.chestNo}" does not exist`)
      } else if (studentByChest.name.toLowerCase() !== winner.studentName.toLowerCase()) {
        errors.push(`Row ${index + 1}: Student name "${winner.studentName}" does not match chest number "${winner.chestNo}" (expected "${studentByChest.name}")`)
      } else {
        errors.push(`Row ${index + 1}: Student "${winner.studentName}" (${winner.chestNo}) is not registered for program "${winner.programName}" in section "${winner.sectionCode}"`)
      }
      return
    }
    
    // Check for duplicate winners (same student + program)
    const key = `${student.id}_${program.id}`
    const previousRow = seenWinners.get(key)
    
    if (previousRow !== undefined) {
      errors.push(`Row ${index + 1}: Duplicate winner for student "${winner.studentName}" in program "${winner.programName}" (first seen in row ${previousRow + 1})`)
      return
    } else {
      seenWinners.set(key, index)
    }
    
    // If all validations pass, add to valid winners
    validWinners.push({
      ...winner,
      program_id: program.id,
      student_id: student.id
    })
  })

  return {
    isValid: errors.length === 0,
    errors,
    validWinners
  }
}

// Export program winners to Excel
export function exportProgramWinnersToExcel(winners: ProgramWinnerExportData[], filename?: string) {
  if (winners.length === 0) {
    throw new Error('No winners to export')
  }

  // Prepare data for export
  const exportData = winners.map(winner => ({
    'Chest No': winner.chestNo,
    'Student Name': winner.studentName,
    'Section Code': winner.sectionCode,
    'Section Name': winner.sectionName,
    'Program Name': winner.programName,
    'Placement': winner.placement,
    'Prize Name': winner.prizeName || 'No prize assigned',
    'Prize Category': winner.prizeCategory || 'N/A',
    'Notes': winner.notes || '',
    'Date Added': winner.createdAt ? new Date(winner.createdAt).toLocaleDateString() : ''
  }))

  // Create workbook
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(exportData)

  // Set column widths
  const colWidths = [
    { wch: 12 }, // Chest No
    { wch: 20 }, // Student Name
    { wch: 15 }, // Section Code
    { wch: 25 }, // Section Name
    { wch: 30 }, // Program Name
    { wch: 15 }, // Placement
    { wch: 25 }, // Prize Name
    { wch: 15 }, // Prize Category
    { wch: 30 }, // Notes
    { wch: 15 }  // Date Added
  ]
  ws['!cols'] = colWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Program Winners')

  // Create summary by section
  const sections = [...new Set(winners.map(w => w.sectionCode))]
  const sectionSummary = sections.map(sectionCode => {
    const sectionWinners = winners.filter(w => w.sectionCode === sectionCode)
    const uniquePrograms = [...new Set(sectionWinners.map(w => w.programName))]
    const winnersWithPrizes = sectionWinners.filter(w => w.prizeName && w.prizeName !== 'No prize assigned').length
    
    return {
      'Section Code': sectionCode,
      'Section Name': sectionWinners[0]?.sectionName || 'Unknown',
      'Total Winners': sectionWinners.length,
      'Programs': uniquePrograms.length,
      'Winners with Prizes': winnersWithPrizes,
      'Winners without Prizes': sectionWinners.length - winnersWithPrizes,
      'Program Names': uniquePrograms.join(', ')
    }
  })

  const summaryWs = XLSX.utils.json_to_sheet(sectionSummary)
  summaryWs['!cols'] = [
    { wch: 15 }, // Section Code
    { wch: 25 }, // Section Name
    { wch: 15 }, // Total Winners
    { wch: 15 }, // Programs
    { wch: 18 }, // Winners with Prizes
    { wch: 20 }, // Winners without Prizes
    { wch: 50 }  // Program Names
  ]
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Section Summary')

  // Create summary by placement
  const placements = [...new Set(winners.map(w => w.placement))]
  const placementSummary = placements.map(placement => {
    const placementWinners = winners.filter(w => w.placement === placement)
    const winnersWithPrizes = placementWinners.filter(w => w.prizeName && w.prizeName !== 'No prize assigned').length
    
    return {
      'Placement': placement,
      'Total Winners': placementWinners.length,
      'Winners with Prizes': winnersWithPrizes,
      'Winners without Prizes': placementWinners.length - winnersWithPrizes,
      'Sections': [...new Set(placementWinners.map(w => w.sectionCode))].join(', ')
    }
  })

  const placementWs = XLSX.utils.json_to_sheet(placementSummary)
  placementWs['!cols'] = [
    { wch: 20 }, // Placement
    { wch: 15 }, // Total Winners
    { wch: 18 }, // Winners with Prizes
    { wch: 20 }, // Winners without Prizes
    { wch: 30 }  // Sections
  ]
  XLSX.utils.book_append_sheet(wb, placementWs, 'Placement Summary')

  // Generate and download file
  const exportFilename = filename || `program-winners-export-${new Date().toISOString().split('T')[0]}.xlsx`
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })
  saveAs(blob, exportFilename)
}