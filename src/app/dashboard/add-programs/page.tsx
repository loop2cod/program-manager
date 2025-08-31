'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileUpload } from '@/components/ui/file-upload'
import { downloadSampleTemplate, parseExcelFile, validateProgramData, ProgramUploadData } from '@/lib/excel-utils'
import { Download, Upload, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { 
  sectionsService, 
  programsService, 
  databaseUtils,
  type Section, 
  type ProgramWithSection 
} from '@/lib/database'

export default function AddProgramsPage() {
  const [activeTab, setActiveTab] = useState('sections')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [uploadResult, setUploadResult] = useState<{ programs: ProgramUploadData[]; errors: string[] } | null>(null)
  
  // Sections management
  const [sections, setSections] = useState<Section[]>([])
  const [newSection, setNewSection] = useState({
    name: '',
    description: ''
  })

  // Programs management  
  const [programs, setPrograms] = useState<ProgramWithSection[]>([])
  const [newProgram, setNewProgram] = useState({
    name: '',
    sectionId: '',
    description: ''
  })

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setIsLoading(true)
      const [sectionsData, programsData] = await Promise.all([
        sectionsService.getAll(),
        programsService.getAll()
      ])
      setSections(sectionsData)
      setPrograms(programsData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data from database')
    } finally {
      setIsLoading(false)
    }
  }

  // Generate section code from name
  const generateSectionCode = (name: string): string => {
    const words = name.trim().split(' ')
    const baseCode = words.map(word => word.charAt(0).toUpperCase()).join('')
    
    // Add numbers if code exists
    let finalCode = baseCode
    let counter = 1
    while (sections.some(section => section.code === finalCode)) {
      finalCode = `${baseCode}${counter}`
      counter++
    }
    
    return finalCode
  }

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true)
    setUploadResult(null)
    
    try {
      const programs = await parseExcelFile(file)
      const validation = validateProgramData(programs)
      
      setUploadResult({
        programs,
        errors: validation.errors
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process file'
      toast.error(errorMessage)
      setUploadResult({
        programs: [],
        errors: [errorMessage]
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const addSection = async () => {
    if (!newSection.name.trim()) return
    
    try {
      const sectionData = await sectionsService.create({
        name: newSection.name.trim(),
        code: generateSectionCode(newSection.name),
        description: newSection.description.trim() || undefined
      })
      
      setSections(prev => [...prev, sectionData])
      setNewSection({ name: '', description: '' })
      toast.success(`Section "${sectionData.name}" created with code ${sectionData.code}`)
    } catch (error) {
      console.error('Error creating section:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create section')
    }
  }

  const removeSection = async (id: string) => {
    const section = sections.find(s => s.id === id)
    
    if (section) {
      const associatedPrograms = programs.filter(program => program.section_id === section.id)
      if (associatedPrograms.length > 0) {
        toast.error(`Cannot delete section "${section.name}". It has ${associatedPrograms.length} associated program(s).`)
        return
      }
    }

    try {
      await sectionsService.delete(id)
      setSections(prev => prev.filter(section => section.id !== id))
      toast.success('Section deleted successfully')
    } catch (error) {
      console.error('Error deleting section:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete section')
    }
  }

  const addProgram = async () => {
    if (!newProgram.name.trim() || !newProgram.sectionId) return
    
    try {
      const programData = await programsService.create({
        name: newProgram.name.trim(),
        section_id: newProgram.sectionId,
        description: newProgram.description.trim() || undefined
      })
      
      // Reload programs to get the full data with section info
      const updatedPrograms = await programsService.getAll()
      setPrograms(updatedPrograms)
      
      setNewProgram({ name: '', sectionId: '', description: '' })
      toast.success(`Program "${programData.name}" added successfully`)
    } catch (error) {
      console.error('Error creating program:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create program')
    }
  }

  const removeProgram = async (id: string) => {
    try {
      await programsService.delete(id)
      setPrograms(prev => prev.filter(program => program.id !== id))
      toast.success('Program deleted successfully')
    } catch (error) {
      console.error('Error deleting program:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete program')
    }
  }

  const handleBulkProgramSubmit = async () => {
    if (!uploadResult?.programs) return
    
    try {
      // Validate that all section codes exist and collect section IDs
      const programsToCreate: { name: string; section_id: string; description?: string }[] = []
      
      for (const uploadedProgram of uploadResult.programs) {
        const section = await databaseUtils.getSectionByCode(uploadedProgram.sectionCode)
        if (!section) {
          toast.error(`Section code "${uploadedProgram.sectionCode}" doesn't exist. Please create this section first.`)
          return
        }
        
        // Check if program already exists
        const programExists = await databaseUtils.checkProgramExists(uploadedProgram.programName, section.id)
        if (programExists) {
          toast.error(`Program "${uploadedProgram.programName}" already exists in section "${uploadedProgram.sectionCode}".`)
          return
        }
        
        programsToCreate.push({
          name: uploadedProgram.programName,
          section_id: section.id,
          description: 'Imported from Excel'
        })
      }
      
      // Create all programs
      await programsService.createBulk(programsToCreate)
      
      // Reload programs to get updated list
      const updatedPrograms = await programsService.getAll()
      setPrograms(updatedPrograms)
      
      // Clear upload result
      setUploadResult(null)
      
      toast.success(`Successfully imported ${programsToCreate.length} programs!`)
      setActiveTab('programs')
      
    } catch (error) {
      console.error('Error importing programs:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to import programs')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Manage Programs</h2>
        <p className="text-sm text-muted-foreground">
          Create sections and add programs to organize your events
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sections">Sections ({sections.length})</TabsTrigger>
          <TabsTrigger value="programs">Programs ({programs.length})</TabsTrigger>
          <TabsTrigger value="bulk-upload">Bulk Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="sections" className="space-y-4">
          <Card className="max-w-lg shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Add Section</CardTitle>
              <CardDescription className="text-sm">
                Create sections like &ldquo;JUNIOR BOYS&rdquo;, &ldquo;KIDS 1 GIRLS&rdquo;, etc. Section codes are auto-generated.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="section-name" className="text-sm font-medium">Section Name</Label>
                    <Input
                      id="section-name"
                      placeholder="e.g., JUNIOR BOYS"
                      className="h-9"
                      value={newSection.name}
                      onChange={(e) => setNewSection(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="section-desc" className="text-sm font-medium">Description (Optional)</Label>
                    <Textarea
                      id="section-desc"
                      placeholder="Brief description..."
                      className="min-h-[60px] text-sm resize-none"
                      value={newSection.description}
                      onChange={(e) => setNewSection(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  {newSection.name.trim() && (
                    <div className="text-xs text-muted-foreground">
                      Generated code: <span className="font-mono font-medium">{generateSectionCode(newSection.name)}</span>
                    </div>
                  )}
                </div>
                <Button onClick={addSection} size="sm" className="h-9" disabled={!newSection.name.trim()}>
                  <Plus className="mr-1.5 h-3 w-3" />
                  Add Section
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sections List */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">All Sections</CardTitle>
              <CardDescription className="text-sm">
                Manage your program sections
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sections.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No sections found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create your first section to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sections.map((section) => (
                    <div key={section.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{section.name}</span>
                          <Badge variant="secondary" className="text-xs">{section.code}</Badge>
                        </div>
                        {section.description && (
                          <p className="text-xs text-muted-foreground">{section.description}</p>
                        )}
                      </div>
                      <Button
                        onClick={() => removeSection(section.id)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="programs" className="space-y-4">
          <Card className="max-w-lg shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Add Program</CardTitle>
              <CardDescription className="text-sm">
                Add programs like &ldquo;BURDA&rdquo;, &ldquo;HAND CRAFT&rdquo;, etc. to existing sections
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sections.length === 0 ? (
                <div className="text-center py-6 bg-yellow-50 border border-yellow-200 rounded-md">
                  <AlertCircle className="mx-auto h-8 w-8 text-yellow-600 mb-2" />
                  <p className="text-sm text-yellow-800 font-medium">No sections available</p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Create sections first before adding programs
                  </p>
                  <Button
                    onClick={() => setActiveTab('sections')}
                    variant="outline"
                    size="sm"
                    className="mt-3 h-8 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                  >
                    Create Sections
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="program-name" className="text-sm font-medium">Program Name</Label>
                      <Input
                        id="program-name"
                        placeholder="e.g., BURDA"
                        className="h-9"
                        value={newProgram.name}
                        onChange={(e) => setNewProgram(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="program-section" className="text-sm font-medium">Section</Label>
                      <Select
                        value={newProgram.sectionId}
                        onValueChange={(value) => setNewProgram(prev => ({ ...prev, sectionId: value }))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent>
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
                    <div>
                      <Label htmlFor="program-desc" className="text-sm font-medium">Description (Optional)</Label>
                      <Textarea
                        id="program-desc"
                        placeholder="Brief description..."
                        className="min-h-[60px] text-sm resize-none"
                        value={newProgram.description}
                        onChange={(e) => setNewProgram(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={addProgram} 
                    size="sm" 
                    className="h-9" 
                    disabled={!newProgram.name.trim() || !newProgram.sectionId}
                  >
                    <Plus className="mr-1.5 h-3 w-3" />
                    Add Program
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Programs List */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">All Programs</CardTitle>
              <CardDescription className="text-sm">
                Manage your programs organized by sections
              </CardDescription>
            </CardHeader>
            <CardContent>
              {programs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No programs found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add programs manually or use bulk upload
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {programs.map((program) => (
                    <div key={program.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{program.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {program.section?.code}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{program.section?.name}</span>
                          {program.description && (
                            <>
                              <span>•</span>
                              <span>{program.description}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => removeProgram(program.id)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk-upload" className="space-y-4">
          <Card className="max-w-2xl shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Bulk Upload Programs</CardTitle>
              <CardDescription className="text-sm">
                Upload multiple programs from Excel file. Section codes must exist in your sections.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button onClick={downloadSampleTemplate} variant="outline" size="sm" className="h-9 flex-shrink-0">
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
                        <ul className="text-xs text-red-700 space-y-1">
                          {uploadResult.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {uploadResult.programs.length > 0 && uploadResult.errors.length === 0 && (
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-green-800 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Upload Results ({uploadResult.programs.length} programs)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        <div className="max-h-32 overflow-y-auto">
                          <div className="grid gap-2">
                            {uploadResult.programs.map((program, index) => {
                              const sectionExists = sections.some(s => s.code === program.sectionCode)
                              return (
                                <div key={index} className="flex items-center justify-between text-xs">
                                  <span className="font-medium">{program.programName}</span>
                                  <Badge 
                                    variant={sectionExists ? "default" : "destructive"} 
                                    className="text-xs"
                                  >
                                    {program.sectionCode} {!sectionExists && "(Invalid)"}
                                  </Badge>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t border-green-200">
                          <Button 
                            onClick={handleBulkProgramSubmit}
                            size="sm" 
                            className="h-9"
                            disabled={isProcessing}
                          >
                            <Upload className="mr-1.5 h-3 w-3" />
                            {isProcessing ? 'Importing...' : 'Import Programs'}
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
      </Tabs>
    </div>
  )
}