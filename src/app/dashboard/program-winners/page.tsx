'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Loader2, Filter, X, Trophy, Edit, Trash2, Award, Gift, Upload, Download } from 'lucide-react'
import { 
  programWinnersService,
  programsService,
  sectionsService,
  studentsService,
  assignmentUtils,
  type ProgramWinnerWithDetails,
  type ProgramWithSection,
  type Section,
  type StudentWithDetails
} from '@/lib/database'
import { toast } from 'sonner'
import { FileUpload } from '@/components/ui/file-upload'
import { 
  downloadProgramWinnerTemplate, 
  parseProgramWinnerExcelFile, 
  validateProgramWinnerData,
  type ProgramWinnerUploadData 
} from '@/lib/excel-utils'

export default function ProgramWinnersPage() {
  const [winners, setWinners] = useState<ProgramWinnerWithDetails[]>([])
  const [programs, setPrograms] = useState<ProgramWithSection[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [students, setStudents] = useState<StudentWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Filtering state
  const [selectedSection, setSelectedSection] = useState<string>('all')
  const [selectedProgram, setSelectedProgram] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredWinners, setFilteredWinners] = useState<ProgramWinnerWithDetails[]>([])

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingWinner, setEditingWinner] = useState<ProgramWinnerWithDetails | null>(null)
  
  // Bulk upload states
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{
    total: number
    processed: number
    success: number
    failed: number
    errors: string[]
  } | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    program_id: '',
    student_id: '',
    placement: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filter winners function
  const filterWinners = useCallback(() => {
    let filtered = winners

    // Filter by section
    if (selectedSection !== 'all') {
      filtered = filtered.filter(winner => {
        const program = programs.find(p => p.id === winner.program_id)
        return program?.section_id === selectedSection
      })
    }

    // Filter by program
    if (selectedProgram !== 'all') {
      filtered = filtered.filter(winner => winner.program_id === selectedProgram)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(winner => 
        winner.student_name.toLowerCase().includes(query) ||
        winner.student_chest_no.toLowerCase().includes(query) ||
        winner.program_name.toLowerCase().includes(query) ||
        winner.section_name.toLowerCase().includes(query) ||
        winner.placement.toLowerCase().includes(query)
      )
    }

    setFilteredWinners(filtered)
  }, [winners, programs, selectedSection, selectedProgram, searchQuery])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [winnersData, programsData, sectionsData, studentsData] = await Promise.all([
        programWinnersService.getAll(),
        programsService.getAll(),
        sectionsService.getAll(),
        studentsService.getAll()
      ])
      setWinners(winnersData)
      setPrograms(programsData)
      setSections(sectionsData)
      setStudents(studentsData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load program winners')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterWinners()
  }, [winners, programs, selectedSection, selectedProgram, searchQuery, filterWinners])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.program_id || !formData.student_id || !formData.placement) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setIsSubmitting(true)
      
      if (editingWinner) {
        await programWinnersService.update(editingWinner.id, {
          student_id: formData.student_id,
          placement: formData.placement,
          notes: formData.notes || undefined
        })
        toast.success('Program winner updated successfully!')
      } else {
        await programWinnersService.create({
          program_id: formData.program_id,
          student_id: formData.student_id,
          placement: formData.placement,
          notes: formData.notes || undefined
        })
        toast.success('Program winner added successfully!')
      }

      await loadData()
      resetForm()
      setIsAddDialogOpen(false)
      setIsEditDialogOpen(false)
    } catch (error) {
      console.error('Error saving winner:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save program winner')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (winner: ProgramWinnerWithDetails) => {
    setEditingWinner(winner)
    setFormData({
      program_id: winner.program_id,
      student_id: winner.student_id,
      placement: winner.placement,
      notes: winner.notes || ''
    })
    setIsEditDialogOpen(true)
  }

  const handleDelete = async (winner: ProgramWinnerWithDetails) => {
    if (!confirm(`Are you sure you want to delete ${winner.student_name}&apos;s ${winner.placement} position for ${winner.program_name}?`)) {
      return
    }

    try {
      await programWinnersService.delete(winner.id)
      toast.success('Program winner deleted successfully!')
      await loadData()
    } catch (error) {
      console.error('Error deleting winner:', error)
      toast.error('Failed to delete program winner')
    }
  }

  const resetForm = () => {
    setFormData({
      program_id: '',
      student_id: '',
      placement: '',
      notes: ''
    })
    setEditingWinner(null)
  }

  const clearFilters = () => {
    setSelectedSection('all')
    setSelectedProgram('all')
    setSearchQuery('')
  }

  const handleBulkUpload = async () => {
    if (!uploadFile) {
      toast.error('Please select a file to upload')
      return
    }

    try {
      setIsUploading(true)
      setUploadProgress({
        total: 0,
        processed: 0,
        success: 0,
        failed: 0,
        errors: []
      })

      // Parse Excel file
      const parsedWinners = await parseProgramWinnerExcelFile(uploadFile)
      
      setUploadProgress(prev => prev ? { ...prev, total: parsedWinners.length } : null)

      // Validate data
      const validation = validateProgramWinnerData(
        parsedWinners,
        students,
        programs,
        sections
      )

      if (!validation.isValid) {
        setUploadProgress(prev => prev ? {
          ...prev,
          failed: parsedWinners.length,
          errors: validation.errors
        } : null)
        toast.error(`Validation failed with ${validation.errors.length} errors. Please check the file and try again.`)
        return
      }

      // Upload winners in batches
      const batchSize = 10
      let successCount = 0
      let failCount = 0
      const allErrors: string[] = []

      for (let i = 0; i < validation.validWinners.length; i += batchSize) {
        const batch = validation.validWinners.slice(i, i + batchSize)
        
        await Promise.allSettled(
          batch.map(async (winner, batchIndex) => {
            const globalIndex = i + batchIndex
            try {
              await programWinnersService.create({
                program_id: winner.program_id,
                student_id: winner.student_id,
                placement: winner.placement,
                notes: winner.notes || undefined
              })
              successCount++
            } catch (error) {
              failCount++
              const errorMsg = error instanceof Error ? error.message : 'Unknown error'
              allErrors.push(`Row ${globalIndex + 1}: ${errorMsg}`)
            }
            
            setUploadProgress(prev => prev ? {
              ...prev,
              processed: globalIndex + 1,
              success: successCount,
              failed: failCount,
              errors: [...allErrors]
            } : null)
          })
        )
        
        // Small delay between batches to avoid overwhelming the system
        if (i + batchSize < validation.validWinners.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} winners${failCount > 0 ? ` (${failCount} failed)` : ''}`)
        await loadData()
      }

      if (failCount > 0) {
        toast.error(`${failCount} winners failed to upload. Check the error details.`)
      }

    } catch (error) {
      console.error('Error during bulk upload:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload winners')
      setUploadProgress(prev => prev ? {
        ...prev,
        failed: prev.total,
        errors: [error instanceof Error ? error.message : 'Upload failed']
      } : null)
    } finally {
      setIsUploading(false)
    }
  }

  const resetBulkUpload = () => {
    setUploadFile(null)
    setUploadProgress(null)
    setIsBulkUploadOpen(false)
  }

  const handleDownloadTemplate = () => {
    try {
      downloadProgramWinnerTemplate()
      toast.success('Template downloaded successfully')
    } catch (error) {
      console.error('Error downloading template:', error)
      toast.error('Failed to download template')
    }
  }

  const hasActiveFilters = selectedSection !== 'all' || selectedProgram !== 'all' || searchQuery.trim() !== ''

  const availablePrograms = selectedSection === 'all' 
    ? programs 
    : programs.filter(p => p.section_id === selectedSection)

  const availableStudents = formData.program_id 
    ? students.filter(s => s.program_id === formData.program_id)
    : students

  const standardPlacements = assignmentUtils.getStandardPlacements()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Program Winners</h2>
            <p className="text-sm text-muted-foreground">
              Assign students to program placements and track winners
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
          <h2 className="text-xl font-semibold">Program Winners</h2>
          <p className="text-sm text-muted-foreground">
            Assign students to program placements and track winners
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleDownloadTemplate}
            variant="outline"
            size="sm"
            className="h-9"
          >
            <Download className="mr-1.5 h-3 w-3" />
            Template
          </Button>
          
          <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-9" onClick={() => setUploadFile(null)}>
                <Upload className="mr-1.5 h-3 w-3" />
                Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Bulk Upload Winners</DialogTitle>
                <DialogDescription>
                  Upload multiple program winners from an Excel file
                </DialogDescription>
              </DialogHeader>
              
              {!uploadProgress ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Upload Excel File</label>
                    <FileUpload
                      onFileSelect={setUploadFile}
                      maxFileSize={10 * 1024 * 1024} // 10MB
                    />
                    {uploadFile && (
                      <p className="text-sm text-green-600">
                        Ready to upload: {uploadFile.name}
                      </p>
                    )}
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Template Instructions</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Download the template using the &quot;Template&quot; button</li>
                      <li>• Students must already be registered in the programs</li>
                      <li>• Each student can only win one placement per program</li>
                      <li>• All data must match existing records exactly</li>
                    </ul>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleBulkUpload}
                      disabled={!uploadFile || isUploading}
                      className="flex-1"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Winners
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetBulkUpload}
                      disabled={isUploading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{uploadProgress.processed}/{uploadProgress.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${uploadProgress.total > 0 ? (uploadProgress.processed / uploadProgress.total) * 100 : 0}%`
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="text-lg font-semibold text-green-600">
                        {uploadProgress.success}
                      </div>
                      <div className="text-xs text-green-600">Success</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="text-lg font-semibold text-red-600">
                        {uploadProgress.failed}
                      </div>
                      <div className="text-xs text-red-600">Failed</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="text-lg font-semibold text-gray-600">
                        {uploadProgress.total - uploadProgress.processed}
                      </div>
                      <div className="text-xs text-gray-600">Remaining</div>
                    </div>
                  </div>
                  
                  {uploadProgress.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-900">Errors ({uploadProgress.errors.length})</h4>
                      <div className="max-h-40 overflow-y-auto bg-red-50 border border-red-200 rounded p-3">
                        {uploadProgress.errors.map((error, index) => (
                          <div key={index} className="text-sm text-red-700">
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={resetBulkUpload}
                      disabled={isUploading}
                      className="flex-1"
                    >
                      {isUploading ? 'Processing...' : 'Done'}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9" onClick={resetForm}>
                <Plus className="mr-1.5 h-3 w-3" />
                Add Winner
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Program Winner</DialogTitle>
              <DialogDescription>
                Assign a student to a program placement position
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Program *</label>
                <Select
                  value={formData.program_id}
                  onValueChange={(value) => setFormData({ ...formData, program_id: value, student_id: '' })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {program.section?.code}
                          </Badge>
                          <span>{program.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Student *</label>
                <Select
                  value={formData.student_id}
                  onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                  disabled={!formData.program_id}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {student.chest_no}
                          </Badge>
                          <span>{student.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Placement *</label>
                <Select
                  value={formData.placement}
                  onValueChange={(value) => setFormData({ ...formData, placement: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select placement" />
                  </SelectTrigger>
                  <SelectContent>
                    {standardPlacements.map((placement) => (
                      <SelectItem key={placement.placement} value={placement.placement}>
                        {placement.placement}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Input
                  placeholder="Optional notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Winner'
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
            </DialogContent>
          </Dialog>
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
                placeholder="Search winners..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Section</label>
              <Select
                value={selectedSection}
                onValueChange={(value) => {
                  setSelectedSection(value)
                  if (value === 'all') setSelectedProgram('all')
                }}
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
              <label className="text-sm font-medium">Program</label>
              <Select
                value={selectedProgram}
                onValueChange={setSelectedProgram}
                disabled={selectedSection === 'all'}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {availablePrograms.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
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
                      Showing {filteredWinners.length} of {winners.length} winners
                      {selectedSection !== 'all' && (
                        <> from {sections.find(s => s.id === selectedSection)?.name}</>
                      )}
                    </>
                  ) : (
                    <>{winners.length} winners across {programs.length} programs</>
                  )}
                </CardDescription>
              </div>
              <div className="flex gap-2 text-sm">
                <Badge variant="secondary">
                  {filteredWinners.length} Winners
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredWinners.length === 0 ? (
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
                      Start by adding winners to your programs
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
                        <TableHead className="w-[100px]">Chest No.</TableHead>
                        <TableHead className="w-[160px]">Program</TableHead>
                        <TableHead className="w-[100px]">Section</TableHead>
                        <TableHead className="w-[100px]">Placement</TableHead>
                        <TableHead className="w-[200px]">Prize</TableHead>
                        <TableHead className="min-w-[120px]">Notes</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWinners.map((winner) => (
                        <TableRow key={winner.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            <Link 
                              href={`/dashboard/students/${winner.student_id}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {winner.student_name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {winner.student_chest_no}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {winner.program_name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant="outline" className="text-xs">
                                {winner.section_code}
                              </Badge>
                              <div className="text-xs text-muted-foreground">
                                {winner.section_name}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={winner.placement_order <= 3 ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {winner.placement}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {winner.prize_name ? (
                              <div className="space-y-1 bg-green-50 border border-green-200 rounded-md p-2">
                                <div className="flex items-center gap-1">
                                  <Gift className="h-3 w-3 text-green-600" />
                                  <span className="text-sm font-medium text-green-700">
                                    {winner.prize_name}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  <div>Category: {winner.prize_category_name || winner.prize_category}</div>
                                  {winner.prize_average_value && (
                                    <div>Value: ${winner.prize_average_value}</div>
                                  )}
                                  {winner.prize_description && (
                                    <div className="italic mt-1" title={winner.prize_description}>
                                      {winner.prize_description.length > 40 
                                        ? `${winner.prize_description.substring(0, 40)}...` 
                                        : winner.prize_description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-2 px-3 bg-gray-50 border border-gray-200 rounded-md">
                                <span className="text-xs text-muted-foreground">No prize assigned</span>
                                <div className="text-xs text-red-500 mt-1">
                                  Configure in Program Assignments
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {winner.notes ? (
                              <div className="text-sm text-muted-foreground max-w-[150px] truncate" title={winner.notes}>
                                {winner.notes}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleEdit(winner)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(winner)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Program Winner</DialogTitle>
            <DialogDescription>
              Update the student&apos;s program placement assignment
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Program</label>
              <div className="p-2 bg-muted rounded-md text-sm">
                {programs.find(p => p.id === formData.program_id)?.name || 'Unknown Program'}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Student *</label>
              <Select
                value={formData.student_id}
                onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {availableStudents.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {student.chest_no}
                        </Badge>
                        <span>{student.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Placement *</label>
              <Select
                value={formData.placement}
                onValueChange={(value) => setFormData({ ...formData, placement: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select placement" />
                </SelectTrigger>
                <SelectContent>
                  {standardPlacements.map((placement) => (
                    <SelectItem key={placement.placement} value={placement.placement}>
                      {placement.placement}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input
                placeholder="Optional notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Winner'
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}