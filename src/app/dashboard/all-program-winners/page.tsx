'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trophy, Loader2, Filter, X, Download, FileText, Medal, Award, Star, Gift } from 'lucide-react'
import { 
  getAllProgramWinnersByStudent,
  sectionsService,
  prizeCategoriesService,
  type StudentWinnersSummary,
  type Section,
  type PrizeCategory
} from '@/lib/database'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

// Grouped winner interface - group by student chest number
interface GroupedWinnerRecord {
  student_name: string
  student_chest_no: string
  sections: string[] // Unique sections this student participates in
  total_programs: number
  total_prizes: number
  total_value: number
  programs: {
    student_id: string
    section_name: string
    section_code: string
    program_name: string
    placement: string
    placement_order: number
    prize_name: string | null
    prize_category: string | null
    prize_category_name: string | null
    prize_average_value: number | null
    notes: string | null
  }[]
}

export default function AllProgramWinnersPage() {
  const [sections, setSections] = useState<Section[]>([])
  const [prizeCategories, setPrizeCategories] = useState<PrizeCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Filtering state
  const [selectedSection, setSelectedSection] = useState<string>('all')
  const [selectedPrizeCategory, setSelectedPrizeCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredRecords, setFilteredRecords] = useState<GroupedWinnerRecord[]>([])
  const [groupedRecords, setGroupedRecords] = useState<GroupedWinnerRecord[]>([])

  // Group data by student chest number and sort by prize count
  const groupData = useCallback((students: StudentWinnersSummary[]): GroupedWinnerRecord[] => {
    const grouped = new Map<string, GroupedWinnerRecord>()
    
    students.forEach(student => {
      const key = student.student_chest_no
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          student_name: student.student_name,
          student_chest_no: student.student_chest_no,
          sections: [],
          total_programs: 0,
          total_prizes: 0,
          total_value: 0,
          programs: []
        })
      }
      
      const group = grouped.get(key)!
      
      // Add programs for this student
      student.programs_won.forEach(program => {
        group.programs.push({
          student_id: student.student_id,
          section_name: student.section_name,
          section_code: student.section_code,
          program_name: program.program_name,
          placement: program.placement,
          placement_order: program.placement_order,
          prize_name: program.prize_name || null,
          prize_category: program.prize_category || null,
          prize_category_name: program.prize_category_name || null,
          prize_average_value: program.prize_average_value || null,
          notes: program.notes || null
        })
        
        // Update counters
        if (program.prize_name) {
          group.total_prizes++
          group.total_value += program.prize_average_value || 0
        }
      })
      
      // Update unique sections
      if (!group.sections.includes(student.section_code)) {
        group.sections.push(student.section_code)
      }
      
      group.total_programs = group.programs.length
    })
    
    // Sort programs within each group by placement order
    Array.from(grouped.values()).forEach(group => {
      group.programs.sort((a, b) => a.placement_order - b.placement_order)
    })
    
    // Convert to array and sort by total prizes (descending), then by total value (descending), then by name
    return Array.from(grouped.values()).sort((a, b) => {
      const prizeCompare = b.total_prizes - a.total_prizes
      if (prizeCompare !== 0) return prizeCompare
      
      const valueCompare = b.total_value - a.total_value
      if (valueCompare !== 0) return valueCompare
      
      return a.student_name.localeCompare(b.student_name)
    })
  }, [])

  // Filter records function with prize-based sorting maintained
  const filterRecords = useCallback(() => {
    let filtered = groupedRecords

    // Filter by section
    if (selectedSection !== 'all') {
      const selectedSectionCode = sections.find(s => s.id === selectedSection)?.code
      filtered = filtered.filter(record => record.sections.includes(selectedSectionCode || ''))
    }

    // Filter by prize category
    if (selectedPrizeCategory !== 'all') {
      const selectedCategoryCode = prizeCategories.find(c => c.id === selectedPrizeCategory)?.code
      filtered = filtered.filter(record => 
        record.programs.some(program => program.prize_category === selectedCategoryCode)
      )
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(record => 
        record.student_name.toLowerCase().includes(query) ||
        record.student_chest_no.toLowerCase().includes(query) ||
        record.programs.some(program => 
          program.program_name.toLowerCase().includes(query) ||
          program.placement.toLowerCase().includes(query) ||
          program.section_name.toLowerCase().includes(query) ||
          (program.prize_name && program.prize_name.toLowerCase().includes(query)) ||
          (program.prize_category_name && program.prize_category_name.toLowerCase().includes(query))
        )
      )
    }

    // Re-sort filtered results by prize count (maintaining the priority sorting)
    const sortedFiltered = filtered.sort((a, b) => {
      const prizeCompare = b.total_prizes - a.total_prizes
      if (prizeCompare !== 0) return prizeCompare
      
      const valueCompare = b.total_value - a.total_value
      if (valueCompare !== 0) return valueCompare
      
      return a.student_name.localeCompare(b.student_name)
    })

    setFilteredRecords(sortedFiltered)
  }, [groupedRecords, sections, prizeCategories, selectedSection, selectedPrizeCategory, searchQuery])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [studentsData, sectionsData, prizeCategoriesData] = await Promise.all([
        getAllProgramWinnersByStudent(),
        sectionsService.getAll(),
        prizeCategoriesService.getAll()
      ])
      setSections(sectionsData)
      setPrizeCategories(prizeCategoriesData)
      
      // Group the data by chest number for display
      const grouped = groupData(studentsData)
      setGroupedRecords(grouped)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load program winners data')
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
    setSelectedPrizeCategory('all')
    setSearchQuery('')
  }

  const hasActiveFilters = selectedSection !== 'all' || selectedPrizeCategory !== 'all' || searchQuery.trim() !== ''

  const getPlacementIcon = (placementOrder: number) => {
    if (placementOrder === 1) return <Medal className="h-4 w-4 text-yellow-500" />
    if (placementOrder === 2) return <Medal className="h-4 w-4 text-gray-400" />
    if (placementOrder === 3) return <Medal className="h-4 w-4 text-amber-600" />
    return <Star className="h-4 w-4 text-blue-500" />
  }

  const getPlacementBadgeVariant = (placementOrder: number) => {
    if (placementOrder <= 3) return "default"
    return "secondary"
  }

  // Excel download function - maintain grouping
  const downloadExcel = () => {
    try {
      // Create grouped summary data for Excel export
      const excelData = filteredRecords.map((record, index) => ({
        'Rank': index + 1,
        'Student Name': record.student_name,
        'Chest No': record.student_chest_no,
        'Total Programs': record.total_programs,
        'Total Prizes': record.total_prizes,
        'Total Prize Value': record.total_value > 0 ? `₹${record.total_value}` : '₹0',
        'Sections': record.sections.join(', '),
        'Programs Won': record.programs.map(p => p.program_name).join(', '),
        'Placements': record.programs.map(p => p.placement).join(', '),
        'Prizes Won': record.programs.filter(p => p.prize_name).map(p => p.prize_name).join(', ') || 'No prizes',
        'Prize Categories': [...new Set(record.programs.filter(p => p.prize_category_name).map(p => p.prize_category_name))].join(', ') || '-',
        'Best Placement': record.programs.reduce((best, current) => 
          current.placement_order < best.placement_order ? current : best
        ).placement,
        'Performance Summary': `${record.total_prizes} prizes from ${record.total_programs} programs across ${record.sections.length} sections`
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
        { wch: 12 }, // Total Prizes
        { wch: 15 }, // Total Prize Value
        { wch: 15 }, // Sections
        { wch: 40 }, // Programs Won
        { wch: 25 }, // Placements
        { wch: 40 }, // Prizes Won
        { wch: 25 }, // Prize Categories
        { wch: 15 }, // Best Placement
        { wch: 50 }  // Performance Summary
      ]
      ws['!cols'] = colWidths

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'All Program Winners')

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `all-program-winners-${timestamp}.xlsx`

      // Download file
      XLSX.writeFile(wb, filename)
      
      toast.success(`Excel file downloaded: ${filename}`)
    } catch (error) {
      console.error('Error downloading Excel:', error)
      toast.error('Failed to download Excel file')
    }
  }

  // Calculate summary stats
  const totalStudents = filteredRecords.length
  const totalPrograms = filteredRecords.reduce((sum, r) => sum + r.total_programs, 0)
  const totalPrizes = filteredRecords.reduce((sum, r) => sum + r.total_prizes, 0)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">All Program Winners</h2>
            <p className="text-sm text-muted-foreground">
              Students who won prizes across different programs with their prize categories
            </p>
          </div>
        </div>
        
        <Card className="shadow-sm">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading program winners...</span>
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
          <h2 className="text-xl font-semibold">All Program Winners</h2>
          <p className="text-sm text-muted-foreground">
            Students who won prizes across different programs with their prize categories
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
              <Trophy className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Program Wins</p>
                <p className="text-2xl font-bold">{totalPrograms}</p>
              </div>
              <FileText className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Prizes Won</p>
                <p className="text-2xl font-bold">{totalPrizes}</p>
              </div>
              <Award className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">No Prizes</p>
                <p className="text-2xl font-bold">{totalPrograms - totalPrizes}</p>
              </div>
              <X className="h-8 w-8 text-gray-400" />
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search students, programs, prizes..."
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Prize Category</label>
              <Select
                value={selectedPrizeCategory}
                onValueChange={setSelectedPrizeCategory}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {prizeCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <span className="flex items-center gap-2">
                        <span>{category.name}</span>
                        <span className="text-xs text-muted-foreground">({category.code})</span>
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
            <Trophy className="h-5 w-5" />
            {hasActiveFilters ? 'Filtered Winners' : 'All Program Winners'}
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
                  <p className="text-muted-foreground">No winners match your filters</p>
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
                  <Award className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No program winners found</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    Students will appear here once they win prizes in programs
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
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-full p-2">
                          <Trophy className="h-6 w-6 text-blue-600" />
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
                          <Badge variant="default" className="text-sm">
                            {student.total_prizes} Prize{student.total_prizes !== 1 ? 's' : ''}
                          </Badge>
                          {student.total_value > 0 && (
                            <Badge variant="outline" className="text-xs text-green-700">
                              ₹{student.total_value}
                            </Badge>
                          )}
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
                        Programs & Results
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
                                  <div className="flex items-center gap-1">
                                    {getPlacementIcon(program.placement_order)}
                                    <Badge 
                                      variant={getPlacementBadgeVariant(program.placement_order)}
                                      className="text-xs"
                                    >
                                      {program.placement}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {program.prize_name ? (
                              <div className="bg-green-50 border border-green-200 rounded-md p-2 mt-2">
                                <div className="flex items-center gap-1 mb-1">
                                  <Gift className="h-3 w-3 text-green-600" />
                                  <span className="text-sm font-medium text-green-700">
                                    {program.prize_name}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground space-y-1">
                                  <div>
                                    Category: <span className="font-medium">
                                      {program.prize_category_name || program.prize_category}
                                    </span>
                                  </div>
                                  {program.prize_average_value && (
                                    <div>Value: <span className="font-medium">₹{program.prize_average_value}</span></div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="bg-gray-50 border border-gray-200 rounded-md p-2 mt-2 text-center">
                                <span className="text-xs text-muted-foreground">No prize assigned</span>
                              </div>
                            )}
                            
                            {program.notes && (
                              <div className="mt-2 text-xs text-muted-foreground italic">
                                {program.notes}
                              </div>
                            )}
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