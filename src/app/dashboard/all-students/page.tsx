'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Users, Loader2, Filter, X, Download, User, BookOpen, Trophy } from 'lucide-react'
import { 
  studentsService,
  sectionsService,
  programWinnersService,
  type StudentWithDetails,
  type Section,
  type ProgramWinnerWithDetails
} from '@/lib/database'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

// Grouped student interface
interface GroupedStudent {
  chest_no: string
  student_name: string
  programs: {
    id: string
    program_name: string
    section_name: string
    section_code: string
    program_description?: string
    created_at?: string
    // Winner info if exists
    placement?: string
    placement_order?: number
    prize_name?: string
    prize_category?: string
    prize_average_value?: number
    has_prize: boolean
  }[]
  total_programs: number
  total_prizes: number
  sections: string[] // Unique sections this student is in
}

export default function AllStudentsPage() {
  const [students, setStudents] = useState<StudentWithDetails[]>([])
  const [winners, setWinners] = useState<ProgramWinnerWithDetails[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Filtering state
  const [selectedSection, setSelectedSection] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredStudents, setFilteredStudents] = useState<GroupedStudent[]>([])
  const [groupedStudents, setGroupedStudents] = useState<GroupedStudent[]>([])

  // Group students by chest number
  const groupStudents = useCallback((students: StudentWithDetails[], winners: ProgramWinnerWithDetails[]): GroupedStudent[] => {
    const grouped = new Map<string, GroupedStudent>()

    students.forEach(student => {
      const key = student.chest_no

      if (!grouped.has(key)) {
        grouped.set(key, {
          chest_no: student.chest_no,
          student_name: student.name,
          programs: [],
          total_programs: 0,
          total_prizes: 0,
          sections: []
        })
      }

      const group = grouped.get(key)!
      
      // Find winner info for this student and program
      const winnerInfo = winners.find(w => 
        w.student_id === student.id && 
        w.program_name === student.program_name
      )

      // Add program info
      group.programs.push({
        id: student.id,
        program_name: student.program_name,
        section_name: student.section_name,
        section_code: student.section_code,
        program_description: student.program_description,
        created_at: student.created_at,
        placement: winnerInfo?.placement,
        placement_order: winnerInfo?.placement_order,
        prize_name: winnerInfo?.prize_name || undefined,
        prize_category: winnerInfo?.prize_category || undefined,
        prize_average_value: winnerInfo?.prize_average_value || undefined,
        has_prize: !!winnerInfo?.prize_name
      })

      // Update counters and sections
      group.total_programs = group.programs.length
      group.total_prizes = group.programs.filter(p => p.has_prize).length
      
      // Add unique sections
      if (!group.sections.includes(student.section_code)) {
        group.sections.push(student.section_code)
      }
    })

    // Sort programs within each group by program name
    Array.from(grouped.values()).forEach(group => {
      group.programs.sort((a, b) => a.program_name.localeCompare(b.program_name))
    })

    // Convert to array and sort by student name
    return Array.from(grouped.values()).sort((a, b) => a.student_name.localeCompare(b.student_name))
  }, [])

  // Filter students function
  const filterStudents = useCallback(() => {
    let filtered = groupedStudents

    // Filter by section
    if (selectedSection !== 'all') {
      const selectedSectionCode = sections.find(s => s.id === selectedSection)?.code
      filtered = filtered.filter(student => 
        student.sections.includes(selectedSectionCode || '')
      )
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(student => 
        student.student_name.toLowerCase().includes(query) ||
        student.chest_no.toLowerCase().includes(query) ||
        student.programs.some(program => 
          program.program_name.toLowerCase().includes(query) ||
          program.section_name.toLowerCase().includes(query) ||
          (program.prize_name && program.prize_name.toLowerCase().includes(query))
        )
      )
    }

    setFilteredStudents(filtered)
  }, [groupedStudents, sections, selectedSection, searchQuery])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [studentsData, winnersData, sectionsData] = await Promise.all([
        studentsService.getAll(),
        programWinnersService.getAll(),
        sectionsService.getAll()
      ])
      
      setStudents(studentsData)
      setWinners(winnersData)
      setSections(sectionsData)
      
      // Group the students
      const grouped = groupStudents(studentsData, winnersData)
      setGroupedStudents(grouped)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load students data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterStudents()
  }, [filterStudents])

  const clearFilters = () => {
    setSelectedSection('all')
    setSearchQuery('')
  }

  const hasActiveFilters = selectedSection !== 'all' || searchQuery.trim() !== ''

  // Excel download function
  const downloadExcel = () => {
    try {
      // Flatten data for Excel export
      const excelData = filteredStudents.flatMap(student =>
        student.programs.map(program => ({
          'Student Name': student.student_name,
          'Chest No': student.chest_no,
          'Program': program.program_name,
          'Section': program.section_name,
          'Section Code': program.section_code,
          'Placement': program.placement || 'Not Assigned',
          'Prize Name': program.prize_name || 'No Prize',
          'Prize Category': program.prize_category || '-',
          'Prize Value': program.prize_average_value ? `$${program.prize_average_value}` : '-',
          'Registration Date': program.created_at 
            ? new Date(program.created_at).toLocaleDateString() 
            : '-'
        }))
      )

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(excelData)

      // Set column widths
      const colWidths = [
        { wch: 20 }, // Student Name
        { wch: 12 }, // Chest No
        { wch: 25 }, // Program
        { wch: 15 }, // Section
        { wch: 8 },  // Section Code
        { wch: 15 }, // Placement
        { wch: 20 }, // Prize Name
        { wch: 15 }, // Prize Category
        { wch: 12 }, // Prize Value
        { wch: 15 }  // Registration Date
      ]
      ws['!cols'] = colWidths

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'All Students')

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `all-students-${timestamp}.xlsx`

      // Download file
      XLSX.writeFile(wb, filename)
      
      toast.success(`Excel file downloaded: ${filename}`)
    } catch (error) {
      console.error('Error downloading Excel:', error)
      toast.error('Failed to download Excel file')
    }
  }

  // Calculate summary stats
  const totalUniqueStudents = filteredStudents.length
  const totalProgramRegistrations = filteredStudents.reduce((sum, s) => sum + s.total_programs, 0)
  const totalPrizes = filteredStudents.reduce((sum, s) => sum + s.total_prizes, 0)
  const multiProgramStudents = filteredStudents.filter(s => s.total_programs > 1).length

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">All Students</h2>
            <p className="text-sm text-muted-foreground">
              Manage students grouped by chest number with all their program participations
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
          <h2 className="text-xl font-semibold">All Students</h2>
          <p className="text-sm text-muted-foreground">
            Manage students grouped by chest number with all their program participations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={downloadExcel}
            variant="outline" 
            size="sm"
            disabled={filteredStudents.length === 0}
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
                <p className="text-sm font-medium text-muted-foreground">Unique Students</p>
                <p className="text-2xl font-bold">{totalUniqueStudents}</p>
              </div>
              <User className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Program Registrations</p>
                <p className="text-2xl font-bold">{totalProgramRegistrations}</p>
              </div>
              <BookOpen className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Prizes</p>
                <p className="text-2xl font-bold">{totalPrizes}</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Multi-Program Students</p>
                <p className="text-2xl font-bold">{multiProgramStudents}</p>
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
                placeholder="Search students, programs, chest numbers..."
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

      {/* Students Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            {hasActiveFilters ? 'Filtered Students' : 'All Students'}
          </CardTitle>
          <CardDescription className="text-sm">
            Showing {filteredStudents.length} students
            {hasActiveFilters && ` (filtered from ${groupedStudents.length} total)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
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
                  <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No students found</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    Students will appear here once they are registered
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Student</TableHead>
                      <TableHead className="w-[100px]">Chest No</TableHead>
                      <TableHead className="w-[120px]">Sections</TableHead>
                      <TableHead className="w-[80px]">Programs</TableHead>
                      <TableHead className="w-[80px]">Prizes</TableHead>
                      <TableHead>Program Details</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.chest_no} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <Link 
                            href={`/dashboard/students/${student.programs[0].id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {student.student_name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {student.chest_no}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {student.sections.map((section) => (
                              <Badge key={section} variant="outline" className="text-xs">
                                {section}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="text-xs">
                            {student.total_programs}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={student.total_prizes > 0 ? "default" : "secondary"} 
                            className="text-xs"
                          >
                            {student.total_prizes}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2 max-w-[300px]">
                            {student.programs.map((program, index) => (
                              <div key={`${program.id}-${index}`} className="text-sm border rounded p-2">
                                <div className="font-medium">{program.program_name}</div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Badge variant="outline" className="text-xs">
                                    {program.section_code}
                                  </Badge>
                                  {program.placement && (
                                    <Badge variant="default" className="text-xs">
                                      {program.placement}
                                    </Badge>
                                  )}
                                  {program.has_prize && (
                                    <Badge variant="default" className="text-xs bg-green-600">
                                      Prize
                                    </Badge>
                                  )}
                                </div>
                                {program.prize_name && (
                                  <div className="text-xs text-green-600 mt-1">
                                    🏆 {program.prize_name}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/students/${student.programs[0].id}`}>
                              View Details
                            </Link>
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
  )
}