'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trophy, Loader2, Filter, X, Award, Gift, Medal, Star } from 'lucide-react'
import { 
  getAllProgramWinnersByStudent,
  sectionsService,
  prizeCategoriesService,
  type StudentWinnersSummary,
  type Section,
  type PrizeCategory
} from '@/lib/database'
import { toast } from 'sonner'

export default function AllProgramWinnersPage() {
  const [studentWinners, setStudentWinners] = useState<StudentWinnersSummary[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [prizeCategories, setPrizeCategories] = useState<PrizeCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Filtering state
  const [selectedSection, setSelectedSection] = useState<string>('all')
  const [selectedPrizeCategory, setSelectedPrizeCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredStudents, setFilteredStudents] = useState<StudentWinnersSummary[]>([])

  // Filter students function
  const filterStudents = useCallback(() => {
    let filtered = studentWinners

    // Filter by section
    if (selectedSection !== 'all') {
      filtered = filtered.filter(student => {
        return student.programs_won.some(program => {
          // Check if any of the student's programs belong to the selected section
          return student.section_code === sections.find(s => s.id === selectedSection)?.code
        })
      })
    }

    // Filter by prize category
    if (selectedPrizeCategory !== 'all') {
      const selectedCategoryCode = prizeCategories.find(c => c.id === selectedPrizeCategory)?.code
      filtered = filtered.filter(student => 
        student.programs_won.some(program => 
          program.prize_category === selectedCategoryCode
        )
      )
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(student => 
        student.student_name.toLowerCase().includes(query) ||
        student.student_chest_no.toLowerCase().includes(query) ||
        student.section_name.toLowerCase().includes(query) ||
        student.programs_won.some(program => 
          program.program_name.toLowerCase().includes(query) ||
          program.placement.toLowerCase().includes(query) ||
          (program.prize_name && program.prize_name.toLowerCase().includes(query)) ||
          (program.prize_category_name && program.prize_category_name.toLowerCase().includes(query))
        )
      )
    }

    setFilteredStudents(filtered)
  }, [studentWinners, sections, prizeCategories, selectedSection, selectedPrizeCategory, searchQuery])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [studentsData, sectionsData, prizeCategoriesData] = await Promise.all([
        getAllProgramWinnersByStudent(),
        sectionsService.getAll(),
        prizeCategoriesService.getAll()
      ])
      setStudentWinners(studentsData)
      setSections(sectionsData)
      setPrizeCategories(prizeCategoriesData)
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
    filterStudents()
  }, [studentWinners, sections, prizeCategories, selectedSection, selectedPrizeCategory, searchQuery, filterStudents])

  const clearFilters = () => {
    setSelectedSection('all')
    setSelectedPrizeCategory('all')
    setSearchQuery('')
  }

  const hasActiveFilters = selectedSection !== 'all' || selectedPrizeCategory !== 'all' || searchQuery.trim() !== ''

  const getPlacementIcon = (placement: string, placementOrder: number) => {
    if (placementOrder === 1) return <Medal className="h-4 w-4 text-yellow-500" />
    if (placementOrder === 2) return <Medal className="h-4 w-4 text-gray-400" />
    if (placementOrder === 3) return <Medal className="h-4 w-4 text-amber-600" />
    return <Star className="h-4 w-4 text-blue-500" />
  }

  const getPlacementColor = (placementOrder: number) => {
    if (placementOrder === 1) return "bg-yellow-50 border-yellow-200 text-yellow-800"
    if (placementOrder === 2) return "bg-gray-50 border-gray-200 text-gray-800"
    if (placementOrder === 3) return "bg-amber-50 border-amber-200 text-amber-800"
    return "bg-blue-50 border-blue-200 text-blue-800"
  }

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
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">All Program Winners</h2>
          <p className="text-sm text-muted-foreground">
            Students who won prizes across different programs with their prize categories
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Badge variant="secondary">
            {filteredStudents.length} Winners
          </Badge>
          <Badge variant="outline">
            {filteredStudents.reduce((total, student) => total + student.total_prizes, 0)} Total Prizes
          </Badge>
        </div>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  {hasActiveFilters ? 'Filtered Winners' : 'All Program Winners'}
                </CardTitle>
                <CardDescription className="text-sm">
                  {hasActiveFilters ? (
                    <>
                      Showing {filteredStudents.length} of {studentWinners.length} students with prizes
                    </>
                  ) : (
                    <>{studentWinners.length} students have won prizes across programs</>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
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
              <div className="space-y-6">
                {filteredStudents.map((student) => (
                  <Card key={student.student_id} className="border border-gray-200 hover:border-gray-300 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-50 border-2 border-blue-200 rounded-full p-2">
                            <Trophy className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Link 
                                href={`/dashboard/students/${student.student_id}`}
                                className="text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {student.student_name}
                              </Link>
                              <Badge variant="secondary" className="text-xs">
                                {student.student_chest_no}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {student.section_code}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {student.section_name}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="text-sm">
                              {student.total_prizes} Prize{student.total_prizes !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {student.programs_won.length} Program{student.programs_won.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                          Programs & Prizes Won
                        </h4>
                        <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                          {student.programs_won.map((program, index) => (
                            <div 
                              key={`${program.program_id}-${index}`}
                              className="border rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="font-medium text-sm text-gray-900 mb-1">
                                    {program.program_name}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {getPlacementIcon(program.placement, program.placement_order)}
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${getPlacementColor(program.placement_order)}`}
                                    >
                                      {program.placement}
                                    </Badge>
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
                                      <div>Value: <span className="font-medium">${program.prize_average_value}</span></div>
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
    </div>
  )
}