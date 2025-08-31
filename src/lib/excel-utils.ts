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
    { 'Instructions': '3. Set Category - single letter from A to J (e.g., A, B, C)' },
    { 'Instructions': '4. Add Average Value - estimated monetary value (optional, numbers only)' },
    { 'Instructions': '5. Add Description - brief description of the prize (optional)' },
    { 'Instructions': '' },
    { 'Instructions': 'Category Guidelines:' },
    { 'Instructions': 'A = Top tier prizes (1st, 2nd, 3rd place)' },
    { 'Instructions': 'B = Performance-based prizes (Best performer, Special awards)' },
    { 'Instructions': 'C = Participation prizes (Certificates, Medals for all)' },
    { 'Instructions': 'D-J = Custom categories as needed' },
    { 'Instructions': '' },
    { 'Instructions': 'Notes:' },
    { 'Instructions': '- Prize names must be unique within each category' },
    { 'Instructions': '- Image URL is optional but recommended for visual prizes' },
    { 'Instructions': '- Category must be a single letter (A-J)' },
    { 'Instructions': '- Keep prize names in UPPERCASE for consistency' },
    { 'Instructions': '' },
    { 'Instructions': 'Examples:' },
    { 'Instructions': 'FIRST PRIZE TROPHY → Category A (Top prize)' },
    { 'Instructions': 'PARTICIPATION MEDAL → Category C (Everyone gets)' },
    { 'Instructions': 'BEST PERFORMER → Category B (Special recognition)' }
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
  
  const validCategories = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
  
  // Check for required fields and duplicates
  const seenPrizes = new Map<string, number>()
  
  prizes.forEach((prize, index) => {
    if (!prize.prizeName.trim()) {
      errors.push(`Row ${index + 1}: Prize name is required`)
    }
    
    if (!prize.category.trim()) {
      errors.push(`Row ${index + 1}: Category is required`)
    } else if (!validCategories.includes(prize.category.trim().toUpperCase())) {
      errors.push(`Row ${index + 1}: Category must be a letter from A to J (got "${prize.category}")`)
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
      'Chest No.': 'CH001',
      'Student Name': 'Ahmed Ali',
      'Section Code': 'JB',
      'Program': 'BURDA'
    },
    {
      'Chest No.': 'CH002',
      'Student Name': 'Fatima Hassan',
      'Section Code': 'JB',
      'Program': 'HAND CRAFT'
    },
    {
      'Chest No.': 'CH003',
      'Student Name': 'Mohammed Yusuf',
      'Section Code': 'K1B',
      'Program': 'HAND WRITING ARABIMALAYALAM'
    },
    {
      'Chest No.': 'CH004',
      'Student Name': 'Zainab Ibrahim',
      'Section Code': 'K1G',
      'Program': 'PAINTING'
    },
    {
      'Chest No.': 'CH005',
      'Student Name': 'Omar Abdullah',
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
    { 'Field': 'Chest No.', 'Description': 'Unique chest number for the student (e.g., CH001, ST001)', 'Required': 'Yes' },
    { 'Field': 'Student Name', 'Description': 'Full name of the student', 'Required': 'Yes' },
    { 'Field': 'Section Code', 'Description': 'Section code that exists in your system (e.g., JB, K1B, K1G)', 'Required': 'Yes' },
    { 'Field': 'Program', 'Description': 'Program name that exists in the selected section', 'Required': 'Yes' }
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
        const students: StudentUploadData[] = []
        
        jsonData.forEach((row) => {
          const chestNo = row['Chest No.']?.toString()?.trim()
          const studentName = row['Student Name']?.toString()?.trim()
          const sectionCode = row['Section Code']?.toString()?.trim()
          const programName = row['Program']?.toString()?.trim()
          
          if (!chestNo || !studentName || !sectionCode || !programName) {
            return // Skip invalid rows
          }
          
          students.push({
            chestNo,
            studentName,
            sectionCode,
            programName
          })
        })
        
        resolve(students)
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

  const seenChestNos = new Map<string, number>()
  
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
    
    // Check for duplicate chest numbers within the file
    if (student.chestNo.trim()) {
      const key = student.chestNo.trim().toUpperCase()
      const previousRow = seenChestNos.get(key)
      
      if (previousRow !== undefined) {
        errors.push(`Row ${index + 1}: Duplicate chest number "${student.chestNo}" (first seen in row ${previousRow + 1})`)
      } else {
        seenChestNos.set(key, index)
      }
    }
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