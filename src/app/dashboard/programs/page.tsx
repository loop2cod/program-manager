'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Plus, Loader2, Download, Filter, X } from 'lucide-react'
import { 
  sectionsService, 
  getProgramsWithParticipants,
  type ProgramWithParticipants,
  type Section 
} from '@/lib/database'
import { 
  exportProgramsToExcel, 
  exportProgramsWithParticipantsToExcel,
  type ProgramExportData,
  type ProgramWithParticipantsExportData 
} from '@/lib/excel-utils'
import { toast } from 'sonner'

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<ProgramWithParticipants[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [isExportingWithParticipants, setIsExportingWithParticipants] = useState(false)
  
  // Filtering state
  const [selectedSection, setSelectedSection] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredPrograms, setFilteredPrograms] = useState<ProgramWithParticipants[]>([])

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
        getProgramsWithParticipants(),
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

  const handleExportWithParticipants = async () => {
    try {
      setIsExportingWithParticipants(true)
      
      if (filteredPrograms.length === 0) {
        toast.error('No programs to export with current filters')
        return
      }

      const exportData: ProgramWithParticipantsExportData[] = filteredPrograms.map(program => ({
        programName: program.name,
        sectionCode: program.section?.code || 'Unknown',
        sectionName: program.section?.name || 'Unknown',
        participantCount: program.participant_count,
        description: program.description,
        createdAt: program.created_at 
          ? new Date(program.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })
          : 'N/A'
      }))

      const filename = selectedSection !== 'all' 
        ? `${sections.find(s => s.id === selectedSection)?.code || 'filtered'}-programs-with-participants.xlsx`
        : 'programs-with-participants.xlsx'

      exportProgramsWithParticipantsToExcel(exportData, filename)
      toast.success(`${filteredPrograms.length} programs with participant data exported successfully!`)
    } catch (error) {
      console.error('Error exporting programs with participants:', error)
      toast.error('Failed to export programs with participants')
    } finally {
      setIsExportingWithParticipants(false)
    }
  }

  const clearFilters = () => {
    setSelectedSection('all')
    setSearchQuery('')
  }

  const hasActiveFilters = selectedSection !== 'all' || searchQuery.trim() !== ''


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
            disabled={isExporting || isExportingWithParticipants || programs.length === 0}
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
                  disabled={isExporting || isExportingWithParticipants || filteredPrograms.length === 0}
                >
                  <Download className="mr-1.5 h-3 w-3" />
                  {isExporting ? 'Exporting...' : `Export Filtered (${filteredPrograms.length})`}
                </Button>
                <Button
                  onClick={handleExportWithParticipants}
                  variant="default"
                  size="sm"
                  className="h-9"
                  disabled={isExporting || isExportingWithParticipants || filteredPrograms.length === 0}
                >
                  <Download className="mr-1.5 h-3 w-3" />
                  {isExportingWithParticipants ? 'Exporting...' : `Export with Participants (${filteredPrograms.length})`}
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
              <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">Program Name</TableHead>
                        <TableHead className="w-[120px]">Section</TableHead>
                        <TableHead className="w-[100px]">Code</TableHead>
                        <TableHead className="w-[120px]">Participants</TableHead>
                        <TableHead className="min-w-[200px]">Description</TableHead>
                        <TableHead className="w-[120px]">Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPrograms
                        .sort((a, b) => {
                          // First sort by section name, then by program name
                          const sectionCompare = (a.section?.name || 'ZZZ').localeCompare(b.section?.name || 'ZZZ')
                          if (sectionCompare !== 0) return sectionCompare
                          return a.name.localeCompare(b.name)
                        })
                        .map((program) => (
                        <TableRow key={program.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            {program.name}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm">
                                {program.section?.name || 'Unknown'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {program.section?.code || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center">
                              <Badge 
                                variant={program.participant_count > 0 ? "default" : "secondary"} 
                                className="text-xs"
                              >
                                {program.participant_count}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {program.description ? (
                              <div className="text-sm text-muted-foreground max-w-[300px] truncate" title={program.description}>
                                {program.description}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-muted-foreground">
                              {program.created_at && new Date(program.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
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
    </div>
  )
}