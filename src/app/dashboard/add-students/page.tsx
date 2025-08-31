'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  studentsService,
  sectionsService,
  programsService,
  type StudentWithDetails,
  type Section,
  type ProgramWithSection
} from '@/lib/database'
import { Plus, Trash2, Users, User, Download, Upload, FileText } from 'lucide-react'
import Link from 'next/link'
import { 
  downloadStudentSampleTemplate, 
  parseStudentUploadFile, 
  validateStudentData, 
  exportStudentsToExcel,
  type StudentUploadData,
  type StudentExportData 
} from '@/lib/excel-utils'
import { useDropzone } from 'react-dropzone'

export default function AddStudentsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [students, setStudents] = useState<StudentWithDetails[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [programs, setPrograms] = useState<ProgramWithSection[]>([])
  const [filteredPrograms, setFilteredPrograms] = useState<ProgramWithSection[]>([])
  const [activeTab, setActiveTab] = useState<'add' | 'bulk-upload' | 'all-students'>('add')

  // Handle URL tab parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tab = urlParams.get('tab')
    if (tab === 'all-students' || tab === 'bulk-upload' || tab === 'add') {
      setActiveTab(tab)
    }
  }, [])
  
  // New student state
  const [newStudent, setNewStudent] = useState({
    chestNo: '',
    name: '',
    sectionId: '',
    programId: ''
  })

  // Bulk upload state
  const [uploadResults, setUploadResults] = useState<{
    total: number
    successful: number
    failed: number
    errors: string[]
  } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Filtering state for All Students tab
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredStudents, setFilteredStudents] = useState<StudentWithDetails[]>([])

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [studentsData, sectionsData, programsData] = await Promise.all([
        studentsService.getAll(),
        sectionsService.getAll(),
        programsService.getAll()
      ])
      setStudents(studentsData)
      setSections(sectionsData)
      setPrograms(programsData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data from database')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  // Filter programs when section changes
  useEffect(() => {
    if (newStudent.sectionId) {
      const sectionPrograms = programs.filter(p => p.section_id === newStudent.sectionId)
      setFilteredPrograms(sectionPrograms)
      
      // Reset program selection if current program is not in the new section
      if (newStudent.programId && !sectionPrograms.find(p => p.id === newStudent.programId)) {
        setNewStudent(prev => ({ ...prev, programId: '' }))
      }
    } else {
      setFilteredPrograms([])
      setNewStudent(prev => ({ ...prev, programId: '' }))
    }
  }, [newStudent.sectionId, programs])

  // Filter students when section filter or search query changes
  useEffect(() => {
    let filtered = students

    // Filter by section
    if (selectedSectionFilter !== 'all') {
      filtered = filtered.filter(student => student.section_id === selectedSectionFilter)
    }

    // Filter by search query (searches in student name, section name, section code, program name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(student => 
        student.name.toLowerCase().includes(query) ||
        student.section_name.toLowerCase().includes(query) ||
        student.section_code.toLowerCase().includes(query) ||
        student.program_name.toLowerCase().includes(query) ||
        student.chest_no.toLowerCase().includes(query)
      )
    }

    setFilteredStudents(filtered)
  }, [students, selectedSectionFilter, searchQuery])

  const addStudent = async () => {
    const chestNo = newStudent.chestNo.trim()
    const name = newStudent.name.trim()
    const sectionId = newStudent.sectionId
    const programId = newStudent.programId
    
    if (!chestNo || !name || !sectionId || !programId) {
      toast.error('Please fill in all required fields')
      return
    }
    
    try {
      // Check if chest number already exists
      const exists = await studentsService.checkChestNoExists(chestNo)
      if (exists) {
        toast.error('A student with this chest number already exists')
        return
      }
      
      await studentsService.create({
        chest_no: chestNo,
        name: name,
        section_id: sectionId,
        program_id: programId
      })
      
      // Reload students
      const updatedStudents = await studentsService.getAll()
      setStudents(updatedStudents)
      
      // Reset form
      setNewStudent({
        chestNo: '',
        name: '',
        sectionId: '',
        programId: ''
      })
      
      toast.success('Student added successfully')
    } catch (error) {
      console.error('Error creating student:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to add student')
    }
  }

  const removeStudent = async (id: string) => {
    try {
      await studentsService.delete(id)
      setStudents(prev => prev.filter(s => s.id !== id))
      toast.success('Student deleted successfully')
    } catch (error) {
      console.error('Error deleting student:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete student')
    }
  }

  // Bulk upload functions
  const handleBulkUpload = async (files: File[]) => {
    if (files.length === 0) return
    
    const file = files[0]
    if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
      toast.error('Please select an Excel file (.xlsx or .xls)')
      return
    }

    try {
      setIsUploading(true)
      setUploadResults(null)
      
      // Parse Excel file
      const studentsData = await parseStudentUploadFile(file)
      
      if (studentsData.length === 0) {
        toast.error('No valid student data found in the file')
        return
      }

      // Validate data against existing sections and programs
      const validation = validateStudentData(studentsData, sections, programs)
      
      if (!validation.isValid) {
        setUploadResults({
          total: studentsData.length,
          successful: 0,
          failed: studentsData.length,
          errors: validation.errors
        })
        toast.error(`Found ${validation.errors.length} validation errors. Please check the results below.`)
        return
      }

      // Process each student
      let successful = 0
      let failed = 0
      const errors: string[] = []

      for (let i = 0; i < studentsData.length; i++) {
        const studentData = studentsData[i]
        try {
          // Find section and program IDs
          const section = sections.find(s => s.code.toUpperCase() === studentData.sectionCode.toUpperCase())
          const program = programs.find(p => 
            p.name.toLowerCase() === studentData.programName.toLowerCase() && 
            p.section_id === section?.id
          )

          if (!section || !program) {
            failed++
            errors.push(`Row ${i + 1}: Could not find section or program`)
            continue
          }

          // Check if chest number already exists
          const exists = await studentsService.checkChestNoExists(studentData.chestNo)
          if (exists) {
            failed++
            errors.push(`Row ${i + 1}: Chest number "${studentData.chestNo}" already exists`)
            continue
          }

          // Create student
          await studentsService.create({
            chest_no: studentData.chestNo,
            name: studentData.studentName,
            section_id: section.id,
            program_id: program.id
          })

          successful++
        } catch (error) {
          failed++
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // Update results
      setUploadResults({
        total: studentsData.length,
        successful,
        failed,
        errors
      })

      if (successful > 0) {
        // Reload students
        const updatedStudents = await studentsService.getAll()
        setStudents(updatedStudents)
        toast.success(`Successfully imported ${successful} students${failed > 0 ? ` (${failed} failed)` : ''}`)
      } else {
        toast.error('No students were imported successfully')
      }

    } catch (error) {
      console.error('Error processing bulk upload:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to process upload')
    } finally {
      setIsUploading(false)
    }
  }

  const handleExportStudents = async () => {
    try {
      setIsExporting(true)
      
      if (filteredStudents.length === 0) {
        toast.error('No students to export')
        return
      }

      const exportData: StudentExportData[] = filteredStudents.map(student => ({
        chestNo: student.chest_no,
        studentName: student.name,
        sectionCode: student.section_code,
        sectionName: student.section_name,
        programName: student.program_name,
        registeredDate: student.created_at 
          ? new Date(student.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })
          : 'N/A'
      }))

      const filename = selectedSectionFilter !== 'all' 
        ? `${sections.find(s => s.id === selectedSectionFilter)?.code || 'filtered'}-students-export.xlsx`
        : 'students-export.xlsx'

      exportStudentsToExcel(exportData, filename)
      toast.success(`${filteredStudents.length} students exported successfully!`)
    } catch (error) {
      console.error('Error exporting students:', error)
      toast.error('Failed to export students')
    } finally {
      setIsExporting(false)
    }
  }

  // Setup dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleBulkUpload,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false,
    disabled: isUploading
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading students...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Student Management</h2>
        <p className="text-sm text-muted-foreground">
          Add and manage students with chest numbers, sections, and programs
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'add', label: 'Add Student', icon: Plus },
            { id: 'bulk-upload', label: 'Bulk Upload', icon: Upload },
            { id: 'all-students', label: 'All Students', icon: Users }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="mr-2 h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'add' && (
        <Card className="max-w-2xl shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Add Student</CardTitle>
          <CardDescription className="text-sm">
            Register a new student with chest number, section, and program
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sections.length === 0 ? (
            <div className="text-center py-6 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="space-y-2">
                <p className="text-sm text-yellow-800 font-medium">
                  No sections available
                </p>
                <p className="text-xs text-yellow-600">
                  Create sections and programs first before adding students
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="chest-no" className="text-sm font-medium">Chest Number</Label>
                  <Input
                    id="chest-no"
                    placeholder="e.g., CH001"
                    className="h-9"
                    value={newStudent.chestNo}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, chestNo: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="student-name" className="text-sm font-medium">Student Name</Label>
                  <Input
                    id="student-name"
                    placeholder="Enter full name"
                    className="h-9"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="section" className="text-sm font-medium">Section</Label>
                  <Select
                    value={newStudent.sectionId}
                    onValueChange={(value) => setNewStudent(prev => ({ ...prev, sectionId: value }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          <div className="flex items-center gap-2">
                            <span>{section.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {section.code}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="program" className="text-sm font-medium">Program</Label>
                  <Select
                    value={newStudent.programId}
                    onValueChange={(value) => setNewStudent(prev => ({ ...prev, programId: value }))}
                    disabled={!newStudent.sectionId}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={
                        !newStudent.sectionId 
                          ? "Select section first" 
                          : filteredPrograms.length === 0 
                          ? "No programs in this section" 
                          : "Select program"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPrograms.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          <span>{program.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="md:col-span-2">
                <Button 
                  onClick={addStudent} 
                  size="sm" 
                  className="h-9"
                  disabled={!newStudent.chestNo || !newStudent.name || !newStudent.sectionId || !newStudent.programId}
                >
                  <Plus className="mr-1.5 h-3 w-3" />
                  Add Student
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {activeTab === 'bulk-upload' && (
        <div className="space-y-6">
          {/* Sample Download */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Download Sample Template</CardTitle>
              <CardDescription className="text-sm">
                Download a sample Excel file to see the correct format for bulk upload
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={downloadStudentSampleTemplate} 
                variant="outline" 
                size="sm"
                className="h-9"
              >
                <Download className="mr-1.5 h-3 w-3" />
                Download Sample Template
              </Button>
            </CardContent>
          </Card>

          {/* Upload Area */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Upload Students</CardTitle>
              <CardDescription className="text-sm">
                Upload an Excel file with student data. Format: Chest No., Student Name, Section Code, Program
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragActive
                    ? 'border-blue-400 bg-blue-50'
                    : isUploading
                    ? 'border-gray-300 bg-gray-50'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                
                {isUploading ? (
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-gray-900">Processing...</p>
                    <p className="text-sm text-gray-600">Please wait while we upload your students</p>
                  </div>
                ) : isDragActive ? (
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-gray-900">Drop the file here</p>
                    <p className="text-sm text-gray-600">Release to upload your Excel file</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-gray-900">Upload Excel File</p>
                    <p className="text-sm text-gray-600">
                      Drag and drop your Excel file here, or{' '}
                      <span className="text-blue-600 hover:text-blue-500 font-medium cursor-pointer">
                        browse
                      </span>{' '}
                      to choose a file
                    </p>
                    <p className="text-xs text-gray-500">Supports .xlsx and .xls files</p>
                  </div>
                )}
              </div>

              {/* Upload Results */}
              {uploadResults && (
                <div className="mt-6">
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm">Upload Results</h4>
                      <div className="flex gap-2 text-xs">
                        <Badge variant="outline">
                          Total: {uploadResults.total}
                        </Badge>
                        <Badge variant="default" className="bg-green-600">
                          Success: {uploadResults.successful}
                        </Badge>
                        <Badge variant="destructive">
                          Failed: {uploadResults.failed}
                        </Badge>
                      </div>
                    </div>
                    
                    {uploadResults.errors.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-red-800 mb-2">Errors:</p>
                        <div className="bg-red-50 border border-red-200 rounded p-3 max-h-48 overflow-y-auto">
                          {uploadResults.errors.map((error, index) => (
                            <p key={index} className="text-xs text-red-700 mb-1">
                              {error}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'all-students' && (
        <div className="space-y-4">
          {/* Export Button */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold">All Students</h3>
                <p className="text-sm text-muted-foreground">
                  {filteredStudents.length} students 
                  {selectedSectionFilter !== 'all' && ` in ${sections.find(s => s.id === selectedSectionFilter)?.name}`}
                  {(searchQuery.trim() || selectedSectionFilter !== 'all') && filteredStudents.length !== students.length && ` (${students.length} total)`}
                </p>
              </div>
              <Button
                onClick={handleExportStudents}
                variant="outline"
                size="sm"
                className="h-9"
                disabled={isExporting || filteredStudents.length === 0}
              >
                <Download className="mr-1.5 h-3 w-3" />
                {isExporting ? 'Exporting...' : `Export (${filteredStudents.length})`}
              </Button>
            </div>
            
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by name, chest no., section, or program..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="flex gap-2 items-center">
              <Select
                value={selectedSectionFilter}
                onValueChange={setSelectedSectionFilter}
              >
                <SelectTrigger className="w-48 h-9">
                  <SelectValue placeholder="Filter by section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      <div className="flex items-center gap-2">
                        <span>{section.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {section.code}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(searchQuery.trim() || selectedSectionFilter !== 'all') && (
                <Button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedSectionFilter('all')
                  }}
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2"
                >
                  Clear
                </Button>
              )}
              </div>
            </div>
          </div>

          {/* Students List */}
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              {filteredStudents.length === 0 ? (
            <div className="text-center py-8">
              <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {selectedSectionFilter !== 'all' 
                  ? `No students found in ${sections.find(s => s.id === selectedSectionFilter)?.name}`
                  : 'No students registered yet'
                }
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedSectionFilter !== 'all'
                  ? 'Try selecting a different section or add students to this section'
                  : 'Add your first student to get started'
                }
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Chest No.</TableHead>
                      <TableHead className="w-[200px]">Student Name</TableHead>
                      <TableHead className="w-[150px]">Section</TableHead>
                      <TableHead className="w-[200px]">Program</TableHead>
                      <TableHead className="w-[120px]">Registered</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <Badge variant="outline">
                            {student.chest_no}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link 
                            href={`/dashboard/students/${student.id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {student.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">{student.section_name}</div>
                            <Badge variant="secondary" className="text-xs">
                              {student.section_code}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-blue-700">
                            {student.program_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground">
                            {student.created_at && new Date(student.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => removeStudent(student.id)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            )}
          </CardContent>
        </Card>
        </div>
      )}
    </div>
  )
}