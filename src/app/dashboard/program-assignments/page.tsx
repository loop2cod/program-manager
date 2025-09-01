'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileUpload } from '@/components/ui/file-upload'
import Link from 'next/link'
import { 
  programsService,
  prizesService, 
  programPrizeAssignmentsService,
  assignmentUtils,
  sectionsService,
  type ProgramWithSection,
  type Prize,
  type ProgramPrizeAssignmentWithDetails,
  type Section
} from '@/lib/database'
import {
  downloadProgramPrizeAssignmentTemplate,
  parseProgramPrizeAssignmentExcelFile,
  validateProgramPrizeAssignmentData,
  type ProgramPrizeAssignmentUploadData
} from '@/lib/excel-utils'
import { 
  Plus, 
  Trash2, 
  Award, 
  Target, 
  Trophy,
  Medal,
  Gift,
  Download,
  Upload,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

export default function ProgramAssignmentsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [programs, setPrograms] = useState<ProgramWithSection[]>([])
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [assignments, setAssignments] = useState<ProgramPrizeAssignmentWithDetails[]>([])
  const [selectedProgram, setSelectedProgram] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('manual')
  
  // Bulk upload states
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ assignments: ProgramPrizeAssignmentUploadData[]; errors: string[] } | null>(null)
  
  // New assignment state
  const [newAssignment, setNewAssignment] = useState({
    programId: '',
    prizeId: '',
    placement: '',
    customPlacement: '',
    quantity: '1',
    notes: ''
  })

  const standardPlacements = assignmentUtils.getStandardPlacements()

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [programsData, prizesData, sectionsData, assignmentsData] = await Promise.all([
        programsService.getAll(),
        prizesService.getAll(),
        sectionsService.getAll(),
        programPrizeAssignmentsService.getAll()
      ])
      setPrograms(programsData)
      setPrizes(prizesData)
      setSections(sectionsData)
      setAssignments(assignmentsData)
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

  const filteredAssignments = selectedProgram && selectedProgram !== 'all'
    ? assignments.filter(a => a.program_id === selectedProgram)
    : assignments

  const addAssignment = async () => {
    const programId = newAssignment.programId
    const prizeId = newAssignment.prizeId
    const placement = newAssignment.placement === 'custom' 
      ? newAssignment.customPlacement.trim() 
      : newAssignment.placement
    
    if (!programId || !prizeId || !placement) {
      toast.error('Please fill in all required fields')
      return
    }
    
    try {
      const quantity = parseInt(newAssignment.quantity) || 1
      const placementOrder = assignmentUtils.generatePlacementOrder(placement)
      
      // Check if placement already exists for this program
      const exists = await assignmentUtils.checkPlacementExists(programId, placement)
      if (exists) {
        toast.error('This placement already has a prize assigned for this program')
        return
      }
      
      await programPrizeAssignmentsService.create({
        program_id: programId,
        prize_id: prizeId,
        placement,
        placement_order: placementOrder,
        quantity,
        notes: newAssignment.notes.trim() || undefined
      })
      
      // Reload assignments
      const updatedAssignments = await programPrizeAssignmentsService.getAll()
      setAssignments(updatedAssignments)
      
      // Reset form
      setNewAssignment({
        programId: '',
        prizeId: '',
        placement: '',
        customPlacement: '',
        quantity: '1',
        notes: ''
      })
      
      toast.success('Prize assignment created successfully')
    } catch (error) {
      console.error('Error creating assignment:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create assignment')
    }
  }

  const removeAssignment = async (id: string) => {
    try {
      await programPrizeAssignmentsService.delete(id)
      setAssignments(prev => prev.filter(a => a.id !== id))
      toast.success('Assignment deleted successfully')
    } catch (error) {
      console.error('Error deleting assignment:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete assignment')
    }
  }


  // Bulk upload functions
  const handleFileUpload = async (file: File) => {
    setIsProcessing(true)
    setUploadResult(null)
    
    try {
      const assignments = await parseProgramPrizeAssignmentExcelFile(file)
      const validation = validateProgramPrizeAssignmentData(assignments, programs, sections)
      
      setUploadResult({
        assignments,
        errors: validation.errors
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process file'
      toast.error(errorMessage)
      setUploadResult({
        assignments: [],
        errors: [errorMessage]
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkSubmit = async () => {
    if (!uploadResult?.assignments) return
    
    try {
      setIsProcessing(true)
      
      // Create assignments in database
      let successCount = 0
      const errors: string[] = []
      
      for (const assignment of uploadResult.assignments) {
        try {
          // Find the program and pick a prize from the category
          const section = sections.find(s => s.code.toUpperCase() === assignment.sectionCode.toUpperCase())
          const program = programs.find(p => 
            p.name.toLowerCase() === assignment.programName.toLowerCase() && 
            p.section_id === section?.id
          )
          // Find any prize from the specified category
          const prize = prizes.find(p => p.category.toUpperCase() === assignment.prizeCategory.toUpperCase())
          
          if (!section) {
            errors.push(`Section "${assignment.sectionCode}" not found`)
            continue
          }
          
          if (!program) {
            errors.push(`Program "${assignment.programName}" not found in section "${assignment.sectionCode}"`)
            continue
          }
          
          if (!prize) {
            errors.push(`No prizes found in category "${assignment.prizeCategory}"`)
            continue
          }
          
          const placementOrder = assignmentUtils.generatePlacementOrder(assignment.placement)
          
          await programPrizeAssignmentsService.create({
            program_id: program.id,
            prize_id: prize.id,
            placement: assignment.placement,
            placement_order: placementOrder,
            quantity: 1, // Default quantity to 1
            notes: `Auto-assigned from category ${assignment.prizeCategory}`
          })
          
          successCount++
        } catch (error) {
          console.error('Error creating assignment:', error)
          errors.push(`Failed to create assignment for ${assignment.programName} - ${assignment.placement}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
      
      if (errors.length > 0) {
        console.warn('Import errors:', errors)
        
        // Group errors by type for better user feedback
        const missingPrizeCategories = new Set<string>()
        const missingPrograms = new Set<string>()
        const missingSections = new Set<string>()
        const otherErrors: string[] = []
        
        errors.forEach(error => {
          if (error.includes('No prizes found in category')) {
            const match = error.match(/category "([^"]+)"/)
            if (match) missingPrizeCategories.add(match[1])
          } else if (error.includes('not found in section')) {
            const match = error.match(/Program "([^"]+)"/)
            if (match) missingPrograms.add(match[1])
          } else if (error.includes('Section') && error.includes('not found')) {
            const match = error.match(/Section "([^"]+)"/)
            if (match) missingSections.add(match[1])
          } else {
            otherErrors.push(error)
          }
        })
        
        // Create user-friendly error message
        let errorMessage = `Imported ${successCount} out of ${uploadResult.assignments.length} assignments. Issues found:\n`
        
        if (missingPrizeCategories.size > 0) {
          errorMessage += `\n• Missing prizes in categories: ${Array.from(missingPrizeCategories).join(', ')}`
          errorMessage += `\n  → Go to "Add Prizes" to create prizes in these categories first`
        }
        
        if (missingSections.size > 0) {
          errorMessage += `\n• Missing sections: ${Array.from(missingSections).join(', ')}`
          errorMessage += `\n  → Create these sections first`
        }
        
        if (missingPrograms.size > 0) {
          errorMessage += `\n• Missing programs: ${Array.from(missingPrograms).join(', ')}`
          errorMessage += `\n  → Create these programs in their respective sections first`
        }
        
        if (otherErrors.length > 0) {
          errorMessage += `\n• Other errors: ${otherErrors.length} additional issues`
        }
        
        toast.error(errorMessage, {
          duration: 8000, // Longer duration for detailed message
        })
      }
      
      // Reload assignments
      const updatedAssignments = await programPrizeAssignmentsService.getAll()
      setAssignments(updatedAssignments)
      
      // Clear upload result
      setUploadResult(null)
      
      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} prize assignments!`)
        setActiveTab('all-assignments')
      } else if (errors.length > 0) {
        toast.error(`Failed to import any assignments. Check console for details.`)
      }
      
    } catch (error) {
      console.error('Error importing assignments:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to import assignments')
    } finally {
      setIsProcessing(false)
    }
  }

  const getPlacementIcon = (placement: string) => {
    const lower = placement.toLowerCase()
    if (lower.includes('1st') || lower.includes('first')) return <Trophy className="h-4 w-4 text-yellow-600" />
    if (lower.includes('2nd') || lower.includes('second')) return <Medal className="h-4 w-4 text-gray-500" />
    if (lower.includes('3rd') || lower.includes('third')) return <Award className="h-4 w-4 text-amber-600" />
    if (lower.includes('participation')) return <Target className="h-4 w-4 text-blue-600" />
    return <Gift className="h-4 w-4 text-green-600" />
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading assignments...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Program Prize Assignments</h2>
        <p className="text-sm text-muted-foreground">
          Assign prizes to programs for different placements (1st, 2nd, 3rd, etc.)
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manual">Manual Assignment</TabsTrigger>
          <TabsTrigger value="bulk-upload">Bulk Upload</TabsTrigger>
          <TabsTrigger value="all-assignments">All Assignments ({assignments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4">

      {/* Assignment Form */}
      <Card className="max-w-2xl shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Create Assignment</CardTitle>
          <CardDescription className="text-sm">
            Assign a specific prize to a program for a particular placement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {programs.length === 0 || prizes.length === 0 ? (
            <div className="text-center py-6 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="space-y-2">
                <p className="text-sm text-yellow-800 font-medium">
                  {programs.length === 0 && prizes.length === 0 
                    ? 'No programs or prizes available'
                    : programs.length === 0 
                    ? 'No programs available' 
                    : 'No prizes available'}
                </p>
                <p className="text-xs text-yellow-600">
                  Create programs and prizes first before making assignments
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="assignment-program" className="text-sm font-medium">Program</Label>
                  <Select
                    value={newAssignment.programId}
                    onValueChange={(value) => setNewAssignment(prev => ({ ...prev, programId: value }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          <div className="flex items-center gap-2">
                            <span>{program.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {program.section?.code}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="assignment-prize" className="text-sm font-medium">Prize</Label>
                  <Select
                    value={newAssignment.prizeId}
                    onValueChange={(value) => setNewAssignment(prev => ({ ...prev, prizeId: value }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select prize" />
                    </SelectTrigger>
                    <SelectContent>
                      {prizes.map((prize) => (
                        <SelectItem key={prize.id} value={prize.id}>
                          <div className="flex items-center gap-2">
                            <span>{prize.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {prize.category}
                            </Badge>
                            {prize.average_value && (
                              <Badge variant="outline" className="text-xs text-green-700">
                                ₹{prize.average_value.toFixed(2)}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="assignment-placement" className="text-sm font-medium">Placement</Label>
                  <Select
                    value={newAssignment.placement}
                    onValueChange={(value) => setNewAssignment(prev => ({ ...prev, placement: value }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select placement" />
                    </SelectTrigger>
                    <SelectContent>
                      {standardPlacements.map((placement) => (
                        <SelectItem key={placement.placement} value={placement.placement}>
                          <div className="flex items-center gap-2">
                            {getPlacementIcon(placement.placement)}
                            <span>{placement.placement}</span>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4" />
                          <span>Custom Placement</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newAssignment.placement === 'custom' && (
                  <div>
                    <Label htmlFor="custom-placement" className="text-sm font-medium">Custom Placement</Label>
                    <Input
                      id="custom-placement"
                      placeholder="e.g., Best Performance"
                      className="h-9"
                      value={newAssignment.customPlacement}
                      onChange={(e) => setNewAssignment(prev => ({ ...prev, customPlacement: e.target.value }))}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="assignment-quantity" className="text-sm font-medium">Quantity</Label>
                    <Input
                      id="assignment-quantity"
                      type="number"
                      min="1"
                      className="h-9"
                      value={newAssignment.quantity}
                      onChange={(e) => setNewAssignment(prev => ({ ...prev, quantity: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="assignment-notes" className="text-sm font-medium">Notes (Optional)</Label>
                <Textarea
                  id="assignment-notes"
                  placeholder="Additional notes about this assignment..."
                  className="min-h-[60px] text-sm resize-none"
                  value={newAssignment.notes}
                  onChange={(e) => setNewAssignment(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="md:col-span-2">
                <Button 
                  onClick={addAssignment} 
                  size="sm" 
                  className="h-9"
                  disabled={!newAssignment.programId || !newAssignment.prizeId || !newAssignment.placement}
                >
                  <Plus className="mr-1.5 h-3 w-3" />
                  Create Assignment
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="bulk-upload" className="space-y-4">
          <Card className="max-w-2xl shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Bulk Upload Prize Assignments</CardTitle>
              <CardDescription className="text-sm">
                Upload multiple prize assignments from Excel file with program-prize mappings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button onClick={downloadProgramPrizeAssignmentTemplate} variant="outline" size="sm" className="h-9 flex-shrink-0">
                  <Download className="mr-1.5 h-3 w-3" />
                  Download Template
                </Button>
              </div>

              <FileUpload 
                onFileSelect={handleFileUpload}
                className="max-w-full"
              />

              {uploadResult && (
                <div className="space-y-4">
                  {uploadResult.errors.length > 0 && (
                    <Card className="border-red-200 bg-red-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-red-800 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Validation Errors
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ul className="text-xs text-red-700 space-y-1 max-h-32 overflow-y-auto">
                          {uploadResult.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {uploadResult.assignments.length > 0 && uploadResult.errors.length === 0 && (
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-green-800 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Upload Results ({uploadResult.assignments.length} assignments)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        <div className="max-h-40 overflow-y-auto">
                          <div className="grid gap-2">
                            {uploadResult.assignments.map((assignment, index) => (
                              <div key={index} className="flex items-center justify-between text-xs p-2 bg-white rounded border">
                                <div className="flex items-center gap-2">
                                  <div className="font-medium">{assignment.programName}</div>
                                  <Badge variant="outline" className="text-xs">{assignment.sectionCode}</Badge>
                                  <div className="flex items-center gap-1">
                                    {getPlacementIcon(assignment.placement)}
                                    <span>{assignment.placement}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-blue-600 font-medium">Category {assignment.prizeCategory}</span>
                                  <Badge variant="outline" className="text-xs">×1</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t border-green-200 space-y-2">
                          {(() => {
                            // Pre-validate to check for missing prizes
                            const requiredCategories = [...new Set(uploadResult.assignments.map(a => a.prizeCategory))]
                            const availableCategories = [...new Set(prizes.map(p => p.category))]
                            const missingCategories = requiredCategories.filter(cat => !availableCategories.includes(cat))
                            
                            if (missingCategories.length > 0) {
                              return (
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                  <div className="flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                                    <div className="text-sm text-yellow-800">
                                      <div className="font-medium">Missing Prize Categories</div>
                                      <div className="mt-1">
                                        No prizes found in categories: <span className="font-medium">{missingCategories.join(', ')}</span>
                                      </div>
                                      <div className="mt-2 flex items-center gap-2">
                                        <Link href="/dashboard/add-prizes">
                                          <Button variant="outline" size="sm" className="h-7 text-xs">
                                            Go to Add Prizes
                                          </Button>
                                        </Link>
                                        <span className="text-xs text-yellow-700">Create prizes in these categories first</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            }
                            return null
                          })()}
                          
                          <Button 
                            onClick={handleBulkSubmit}
                            size="sm" 
                            className="h-9"
                            disabled={isProcessing}
                          >
                            <Upload className="mr-1.5 h-3 w-3" />
                            {isProcessing ? 'Importing...' : 'Import Assignments'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all-assignments" className="space-y-4">
          {/* Filter */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">All Assignments</CardTitle>
              <CardDescription className="text-sm">
                {filteredAssignments.length} assignments 
                {selectedProgram && selectedProgram !== 'all' && ` for ${programs.find(p => p.id === selectedProgram)?.name}`}
              </CardDescription>
            </div>
            <div>
              <Select
                value={selectedProgram}
                onValueChange={setSelectedProgram}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      <div className="flex items-center gap-2">
                        <span>{program.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {program.section?.code}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No assignments found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first program-prize assignment
              </p>
            </div>
          ) : (
          <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Program</TableHead>
                    <TableHead className="w-[120px]">Section</TableHead>
                    <TableHead className="w-[120px]">Placement</TableHead>
                    <TableHead className="w-[180px]">Prize</TableHead>
                    <TableHead className="w-[100px]">Category</TableHead>
                    <TableHead className="w-[100px]">Value</TableHead>
                    <TableHead className="w-[80px]">Qty</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments
                    .sort((a, b) => {
                      // First sort by program name, then by placement order
                      const programCompare = a.program_name.localeCompare(b.program_name)
                      if (programCompare !== 0) return programCompare
                      return a.placement_order - b.placement_order
                    })
                    .map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.program_name}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs">
                            {assignment.section_code}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {assignment.section_name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getPlacementIcon(assignment.placement)}
                          <span className="text-sm">{assignment.placement}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-blue-700">
                          {assignment.prize_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {assignment.prize_category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {assignment.prize_average_value ? (
                          <Badge variant="outline" className="text-xs text-green-700">
                            ₹{assignment.prize_average_value.toFixed(2)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {assignment.quantity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {assignment.notes ? (
                          <div className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {assignment.notes}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => removeAssignment(assignment.id)}
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
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}