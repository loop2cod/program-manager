'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Plus, Loader2, Download, Filter, X } from 'lucide-react'
import { programsService, sectionsService, type ProgramWithSection, type Section } from '@/lib/database'
import { exportProgramsToExcel, type ProgramExportData } from '@/lib/excel-utils'
import { toast } from 'sonner'

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<ProgramWithSection[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  
  // Filtering state
  const [selectedSection, setSelectedSection] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredPrograms, setFilteredPrograms] = useState<ProgramWithSection[]>([])

  // Filter programs function - defined before useEffect
  const filterPrograms = useCallback(() => {
    let filtered = programs

    // Filter by section
    if (selectedSection !== 'all') {
      filtered = filtered.filter(program => program.section_id === selectedSection)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(program => 
        program.name.toLowerCase().includes(query) ||
        program.section?.name.toLowerCase().includes(query) ||
        program.section?.code.toLowerCase().includes(query) ||
        program.description?.toLowerCase().includes(query)
      )
    }

    setFilteredPrograms(filtered)
  }, [programs, selectedSection, searchQuery])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [programsData, sectionsData] = await Promise.all([
        programsService.getAll(),
        sectionsService.getAll()
      ])
      setPrograms(programsData)
      setSections(sectionsData)
    } catch (error) {
      console.error('Error loading programs:', error)
      toast.error('Failed to load programs from database')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterPrograms()
  }, [programs, selectedSection, searchQuery, filterPrograms])

  const handleExportAll = async () => {
    try {
      setIsExporting(true)
      
      if (programs.length === 0) {
        toast.error('No programs to export')
        return
      }

      const exportData: ProgramExportData[] = programs.map(program => ({
        programName: program.name,
        sectionCode: program.section?.code || 'Unknown',
        sectionName: program.section?.name || 'Unknown',
        description: program.description,
        createdAt: program.created_at
      }))

      exportProgramsToExcel(exportData, 'all-programs-export.xlsx')
      toast.success('Programs exported successfully!')
    } catch (error) {
      console.error('Error exporting programs:', error)
      toast.error('Failed to export programs')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportFiltered = async () => {
    try {
      setIsExporting(true)
      
      if (filteredPrograms.length === 0) {
        toast.error('No programs to export with current filters')
        return
      }

      const exportData: ProgramExportData[] = filteredPrograms.map(program => ({
        programName: program.name,
        sectionCode: program.section?.code || 'Unknown',
        sectionName: program.section?.name || 'Unknown',
        description: program.description,
        createdAt: program.created_at
      }))

      const filename = selectedSection !== 'all' 
        ? `${sections.find(s => s.id === selectedSection)?.code || 'filtered'}-programs-export.xlsx`
        : 'filtered-programs-export.xlsx'

      exportProgramsToExcel(exportData, filename)
      toast.success(`${filteredPrograms.length} programs exported successfully!`)
    } catch (error) {
      console.error('Error exporting filtered programs:', error)
      toast.error('Failed to export programs')
    } finally {
      setIsExporting(false)
    }
  }

  const clearFilters = () => {
    setSelectedSection('all')
    setSearchQuery('')
  }

  const hasActiveFilters = selectedSection !== 'all' || searchQuery.trim() !== ''

  // Group filtered programs by section
  const programsBySection = filteredPrograms.reduce((acc, program) => {
    const sectionCode = program.section?.code || 'Unknown'
    if (!acc[sectionCode]) {
      acc[sectionCode] = []
    }
    acc[sectionCode].push(program)
    return acc
  }, {} as Record<string, ProgramWithSection[]>)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Programs</h2>
            <p className="text-sm text-muted-foreground">
              Manage all your programs here
            </p>
          </div>
        </div>
        
        <Card className="shadow-sm">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading programs...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Programs</h2>
          <p className="text-sm text-muted-foreground">
            Manage all your programs here
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleExportAll}
            variant="outline" 
            size="sm" 
            className="h-9"
            disabled={isExporting || programs.length === 0}
          >
            <Download className="mr-1.5 h-3 w-3" />
            {isExporting ? 'Exporting...' : 'Export All'}
          </Button>
          <Button asChild size="sm" className="h-9">
            <Link href="/dashboard/add-programs">
              <Plus className="mr-1.5 h-3 w-3" />
              New Program
            </Link>
          </Button>
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
                placeholder="Search programs..."
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
            <div className="space-y-2 sm:col-span-2 lg:col-span-2">
              <label className="text-sm font-medium">Actions</label>
              <div className="flex gap-2">
                <Button
                  onClick={handleExportFiltered}
                  variant="outline"
                  size="sm"
                  className="h-9"
                  disabled={isExporting || filteredPrograms.length === 0}
                >
                  <Download className="mr-1.5 h-3 w-3" />
                  Export Filtered ({filteredPrograms.length})
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {hasActiveFilters ? 'Filtered Programs' : 'All Programs'}
                </CardTitle>
                <CardDescription className="text-sm">
                  {hasActiveFilters ? (
                    <>
                      Showing {filteredPrograms.length} of {programs.length} programs
                      {selectedSection !== 'all' && (
                        <> from {sections.find(s => s.id === selectedSection)?.name}</>
                      )}
                    </>
                  ) : (
                    <>{programs.length} programs across {sections.length} sections</>
                  )}
                </CardDescription>
              </div>
              <div className="flex gap-2 text-sm">
                <Badge variant="secondary">
                  {sections.length} Sections
                </Badge>
                <Badge variant="default">
                  {filteredPrograms.length} Programs
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredPrograms.length === 0 ? (
              <div className="text-center py-12">
                {hasActiveFilters ? (
                  <>
                    <p className="text-muted-foreground">No programs match your filters</p>
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
                    <p className="text-muted-foreground">No programs found</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">
                      Get started by creating your first program
                    </p>
                    <Button asChild size="sm">
                      <Link href="/dashboard/add-programs">
                        <Plus className="mr-1.5 h-3 w-3" />
                        Create Program
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(programsBySection).map(([sectionCode, sectionPrograms]) => {
                  const section = sections.find(s => s.code === sectionCode)
                  return (
                    <div key={sectionCode} className="space-y-3">
                      <div className="flex items-center gap-2 border-b pb-2">
                        <h3 className="font-medium text-base">
                          {section?.name || 'Unknown Section'}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {sectionCode}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ({sectionPrograms.length} program{sectionPrograms.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                      
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {sectionPrograms.map((program) => (
                          <div 
                            key={program.id} 
                            className="p-3 bg-gray-50 rounded-md border border-gray-100 hover:border-gray-200 transition-colors"
                          >
                            <div className="space-y-1">
                              <h4 className="font-medium text-sm">{program.name}</h4>
                              {program.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {program.description}
                                </p>
                              )}
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-xs text-muted-foreground">
                                  {program.created_at && new Date(program.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}