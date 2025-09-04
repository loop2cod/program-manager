'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { UserX, Loader2, Filter, X, Download, FileText, Users, GraduationCap } from 'lucide-react'
import { 
  getStudentsWithoutPrizes,
  sectionsService,
  type StudentWithoutPrizes,
  type Section
} from '@/lib/database'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

// Grouped student interface - group by student chest number
interface GroupedStudentRecord {
  student_name: string
  student_chest_no: string
  sections: string[] // Unique sections this student participates in
  total_programs: number
  programs: {
    student_id: string
    section_name: string
    section_code: string
    program_name: string
    program_id: string
  }[]
}

export default function StudentsWithoutPrizesPage() {
  const [sections, setSections] = useState<Section[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Filtering state
  const [selectedSection, setSelectedSection] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredRecords, setFilteredRecords] = useState<GroupedStudentRecord[]>([])
  const [groupedRecords, setGroupedRecords] = useState<GroupedStudentRecord[]>([])

  // Group data by student chest number
  const groupData = useCallback((students: StudentWithoutPrizes[]): GroupedStudentRecord[] => {
    const grouped = new Map<string, GroupedStudentRecord>()
    
    students.forEach(student => {
      const key = student.student_chest_no
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          student_name: student.student_name,
          student_chest_no: student.student_chest_no,
          sections: [],
          total_programs: 0,
          programs: []
        })
      }
      
      const group = grouped.get(key)!
      
      // Add program for this student
      group.programs.push({
        student_id: student.student_id,
        section_name: student.section_name,
        section_code: student.section_code,
        program_name: student.program_name,
        program_id: student.program_id
      })
      
      // Update unique sections
      if (!group.sections.includes(student.section_code)) {
        group.sections.push(student.section_code)
      }
      
      group.total_programs = group.programs.length
    })
    
    // Sort programs within each group by section code then program name
    Array.from(grouped.values()).forEach(group => {
      group.programs.sort((a, b) => 
        a.section_code.localeCompare(b.section_code) || a.program_name.localeCompare(b.program_name)
      )
    })
    
    // Convert to array and sort by name
    return Array.from(grouped.values()).sort((a, b) => 
      a.student_name.localeCompare(b.student_name)
    )
  }, [])

  // Filter records function
  const filterRecords = useCallback(() => {
    let filtered = groupedRecords

    // Filter by section
    if (selectedSection !== 'all') {
      const selectedSectionCode = sections.find(s => s.id === selectedSection)?.code
      filtered = filtered.filter(record => record.sections.includes(selectedSectionCode || ''))
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(record => 
        record.student_name.toLowerCase().includes(query) ||
        record.student_chest_no.toLowerCase().includes(query) ||
        record.programs.some(program => 
          program.program_name.toLowerCase().includes(query) ||
          program.section_name.toLowerCase().includes(query)
        )
      )
    }

    // Sort filtered results by name
    const sortedFiltered = filtered.sort((a, b) => 
      a.student_name.localeCompare(b.student_name)
    )

    setFilteredRecords(sortedFiltered)
  }, [groupedRecords, sections, selectedSection, searchQuery])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [studentsData, sectionsData] = await Promise.all([
        getStudentsWithoutPrizes(),
        sectionsService.getAll()
      ])
      setSections(sectionsData)
      
      // Group the data by chest number for display
      const grouped = groupData(studentsData)
      setGroupedRecords(grouped)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load students without prizes data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterRecords()
  }, [filterRecords])

  const clearFilters = () => {
    setSelectedSection('all')
    setSearchQuery('')
  }

  const hasActiveFilters = selectedSection !== 'all' || searchQuery.trim() !== ''

  // Excel download function
  const downloadExcel = () => {
    try {
      // Create grouped data for Excel export
      const excelData = filteredRecords.map((record, index) => ({
        'Rank': index + 1,
        'Student Name': record.student_name,
        'Chest No': record.student_chest_no,
        'Total Programs': record.total_programs,
        'Sections': record.sections.join(', '),
        'Programs': record.programs.map(p => p.program_name).join(', '),
        'Section Details': record.programs.map(p => `${p.section_code}: ${p.program_name}`).join('; '),
        'Status': 'No prizes won',
        'Note': `Participated in ${record.total_programs} programs across ${record.sections.length} sections but did not win any prizes`
      }))

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(excelData)

      // Set column widths
      const colWidths = [
        { wch: 8 },  // Rank
        { wch: 20 }, // Student Name
        { wch: 12 }, // Chest No
        { wch: 12 }, // Total Programs
        { wch: 15 }, // Sections
        { wch: 40 }, // Programs
        { wch: 50 }, // Section Details
        { wch: 15 }, // Status
        { wch: 60 }  // Note
      ]
      ws['!cols'] = colWidths

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Students Without Prizes')

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `students-without-prizes-${timestamp}.xlsx`

      // Download file
      XLSX.writeFile(wb, filename)
      
      toast.success(`Excel file downloaded: ${filename}`)
    } catch (error) {
      console.error('Error downloading Excel:', error)
      toast.error('Failed to download Excel file')
    }
  }

  // Calculate summary stats
  const totalStudents = filteredRecords.length // This is now unique students (grouped by chest number)
  const totalPrograms = filteredRecords.reduce((sum, r) => sum + r.total_programs, 0)
  const uniqueSections = new Set(filteredRecords.flatMap(r => r.sections)).size

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Students Without Prizes</h2>
            <p className="text-sm text-muted-foreground">
              Students who participated in programs but haven&apos;t won any prizes
            </p>
          </div>
        </div>
        
        <Card className="shadow-sm">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading students...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Students Without Prizes</h2>
          <p className="text-sm text-muted-foreground">
            Students who participated in programs but haven&apos;t won any prizes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={downloadExcel}
            variant="outline" 
            size="sm"
            disabled={filteredRecords.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Excel
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Students</p>
                <p className="text-2xl font-bold">{totalStudents}</p>
              </div>
              <UserX className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Programs</p>
                <p className="text-2xl font-bold">{totalPrograms}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unique Sections</p>
                <p className="text-2xl font-bold">{uniqueSections}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Programs/Student</p>
                <p className="text-2xl font-bold">{totalStudents > 0 ? (totalPrograms / totalStudents).toFixed(1) : '0'}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filters</span>
              {hasActiveFilters && (
                <Badge variant="secondary" className="text-xs">
                  Active
                </Badge>
              )}
            </div>
            {hasActiveFilters && (
              <Button
                onClick={clearFilters}
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
              >
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search students, programs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Section</label>
              <Select
                value={selectedSection}
                onValueChange={setSelectedSection}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      <span className="flex items-center gap-2">
                        <span>{section.name}</span>
                        <span className="text-xs text-muted-foreground">({section.code})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserX className="h-5 w-5" />
            {hasActiveFilters ? 'Filtered Students' : 'All Students Without Prizes'}
          </CardTitle>
          <CardDescription className="text-sm">
            Showing {filteredRecords.length} students
            {hasActiveFilters && ` (filtered from ${groupedRecords.length} total)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              {hasActiveFilters ? (
                <>
                  <p className="text-muted-foreground">No students match your filters</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    Try adjusting your search criteria or clear the filters
                  </p>
                  <Button onClick={clearFilters} variant="outline" size="sm">
                    <X className="mr-1.5 h-3 w-3" />
                    Clear Filters
                  </Button>
                </>
              ) : (
                <>
                  <UserX className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">All students have won prizes!</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    Every participating student has received at least one prize
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((student) => (
                <Card key={student.student_chest_no} className="border border-gray-200 hover:border-gray-300 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-red-50 border-2 border-red-200 rounded-full p-2">
                          <UserX className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link 
                              href={`/dashboard/students/${student.programs[0]?.student_id}`}
                              className="text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {student.student_name}
                            </Link>
                            <Badge variant="secondary" className="text-xs">
                              {student.student_chest_no}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex flex-wrap gap-1">
                              {student.sections.map((section) => (
                                <Badge key={section} variant="outline" className="text-xs">
                                  {section}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="destructive" className="text-sm">
                            No Prizes
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {student.total_programs} Program{student.total_programs !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Programs Participated
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                        {student.programs.map((program, programIndex) => (
                          <div 
                            key={`${program.student_id}-${programIndex}`}
                            className="border rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="font-medium text-sm text-gray-900 mb-1">
                                  {program.program_name}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {program.section_code}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {program.section_name}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-red-50 border border-red-200 rounded-md p-2 mt-2 text-center">
                              <span className="text-xs text-red-700 font-medium">No prize won</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}