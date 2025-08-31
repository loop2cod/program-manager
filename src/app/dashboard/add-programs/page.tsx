'use client'

import { useState } from 'react'
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

interface Section {
  id: string
  name: string
  code: string
  description?: string
}

interface Program {
  id: string
  name: string
  sectionCode: string
  description?: string
}

export default function AddProgramsPage() {
  const [activeTab, setActiveTab] = useState('sections')
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ programs: ProgramUploadData[]; errors: string[] } | null>(null)
  
  // Sections management
  const [sections, setSections] = useState<Section[]>([])
  const [newSection, setNewSection] = useState({
    name: '',
    description: ''
  })

  // Programs management  
  const [programs, setPrograms] = useState<Program[]>([])
  const [newProgram, setNewProgram] = useState({
    name: '',
    sectionCode: '',
    description: ''
  })

  // Generate section code
  const generateSectionCode = (name: string): string => {
    // Create code from first letters of each word, max 6 characters
    const words = name.trim().split(' ')
    const code = words.map(word => word.charAt(0).toUpperCase()).join('')
    
    // Add numbers if code exists
    let finalCode = code
    let counter = 1
    while (sections.some(section => section.code === finalCode)) {
      finalCode = code + counter
      counter++
    }
    
    return finalCode.substring(0, 6)
  }

  const handleDownloadTemplate = () => {
    downloadSampleTemplate()
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
      setUploadResult({
        programs: [],
        errors: [error instanceof Error ? error.message : 'Failed to process file']
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const addSection = () => {
    if (!newSection.name.trim()) return
    
    const sectionData: Section = {
      id: Date.now().toString(),
      name: newSection.name.trim(),
      code: generateSectionCode(newSection.name),
      description: newSection.description.trim() || undefined
    }
    
    setSections(prev => [...prev, sectionData])
    setNewSection({ name: '', description: '' })
  }

  const removeSection = (id: string) => {
    const section = sections.find(s => s.id === id)
    if (section) {
      // Remove associated programs
      setPrograms(prev => prev.filter(program => program.sectionCode !== section.code))
    }
    setSections(prev => prev.filter(section => section.id !== id))
  }

  const addProgram = () => {
    if (!newProgram.name.trim() || !newProgram.sectionCode) return
    
    // Check for duplicate program name within the same section
    const isDuplicate = programs.some(program => 
      program.name.toLowerCase() === newProgram.name.trim().toLowerCase() && 
      program.sectionCode === newProgram.sectionCode
    )
    
    if (isDuplicate) {
      alert(`Program "${newProgram.name.trim()}" already exists in this section. Please use a different name.`)
      return
    }
    
    const programData: Program = {
      id: Date.now().toString(),
      name: newProgram.name.trim(),
      sectionCode: newProgram.sectionCode,
      description: newProgram.description.trim() || undefined
    }
    
    setPrograms(prev => [...prev, programData])
    setNewProgram({ name: '', sectionCode: '', description: '' })
  }

  const removeProgram = (id: string) => {
    setPrograms(prev => prev.filter(program => program.id !== id))
  }

  const handleSectionsSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Sections submit:', sections)
    // TODO: Implement save to database
  }

  const handleProgramsSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Programs submit:', programs)
    // TODO: Implement save to database
  }

  const handleBulkProgramSubmit = () => {
    if (!uploadResult?.programs) return
    
    // Validate that all section codes exist
    const validSectionCodes = sections.map(s => s.code)
    const invalidPrograms = uploadResult.programs.filter(p => !validSectionCodes.includes(p.sectionCode))
    
    if (invalidPrograms.length > 0) {
      const invalidCodes = [...new Set(invalidPrograms.map(p => p.sectionCode))]
      alert(`Error: The following section codes don't exist: ${invalidCodes.join(', ')}.\n\nPlease create these sections first or update your Excel file.`)
      return
    }
    
    // Check for duplicates - both within uploaded data and against existing programs
    const duplicatesInUpload: string[] = []
    const duplicatesWithExisting: string[] = []
    
    // Check for duplicates within uploaded data
    const uploadedProgramKeys = new Set()
    uploadResult.programs.forEach(program => {
      const key = `${program.programName.toLowerCase()}_${program.sectionCode}`
      if (uploadedProgramKeys.has(key)) {
        duplicatesInUpload.push(`"${program.programName}" in section ${program.sectionCode}`)
      }
      uploadedProgramKeys.add(key)
    })
    
    // Check for duplicates with existing programs
    uploadResult.programs.forEach(uploadedProgram => {
      const isDuplicate = programs.some(existingProgram => 
        existingProgram.name.toLowerCase() === uploadedProgram.programName.toLowerCase() && 
        existingProgram.sectionCode === uploadedProgram.sectionCode
      )
      if (isDuplicate) {
        duplicatesWithExisting.push(`"${uploadedProgram.programName}" in section ${uploadedProgram.sectionCode}`)
      }
    })
    
    // Show duplicate errors
    if (duplicatesInUpload.length > 0) {
      alert(`Error: Found duplicate programs in your Excel file:\n\n${duplicatesInUpload.join('\n')}\n\nPlease remove duplicates and try again.`)
      return
    }
    
    if (duplicatesWithExisting.length > 0) {
      alert(`Error: The following programs already exist:\n\n${duplicatesWithExisting.join('\n')}\n\nPlease remove them from your Excel file or use different names.`)
      return
    }
    
    // Convert uploaded programs to local program format
    const importedPrograms: Program[] = uploadResult.programs.map((uploadedProgram, index) => ({
      id: `imported_${Date.now()}_${index}`,
      name: uploadedProgram.programName,
      sectionCode: uploadedProgram.sectionCode,
      description: `Imported from Excel`
    }))
    
    // Add to existing programs
    setPrograms(prev => [...prev, ...importedPrograms])
    
    // Clear upload result
    setUploadResult(null)
    
    console.log('Bulk programs imported:', importedPrograms)
    
    // Show success message
    alert(`Successfully imported ${importedPrograms.length} programs!`)
    
    // Switch to programs tab to show imported programs
    setActiveTab('programs')
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Manage Programs</h2>
        <p className="text-sm text-muted-foreground">
          First create sections (categories), then add programs to those sections
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="sections" className="text-sm">Sections</TabsTrigger>
          <TabsTrigger value="programs" className="text-sm">Programs</TabsTrigger>
          <TabsTrigger value="bulk" className="text-sm">Bulk Upload</TabsTrigger>
        </TabsList>

        {/* SECTIONS TAB */}
        <TabsContent value="sections" className="space-y-4">
          <Card className="max-w-lg shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Add Section</CardTitle>
              <CardDescription className="text-sm">
                Create sections like &ldquo;JUNIOR BOYS&rdquo;, &ldquo;KIDS 1 GIRLS&rdquo;, etc. Section codes are auto-generated.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSectionsSubmit} className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="section-name" className="text-sm font-medium">Section Name</Label>
                    <Input 
                      id="section-name" 
                      placeholder="e.g., JUNIOR BOYS, KIDS 1 GIRLS" 
                      className="h-9"
                      value={newSection.name}
                      onChange={(e) => setNewSection(prev => ({...prev, name: e.target.value}))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="section-description" className="text-sm font-medium">Description (Optional)</Label>
                    <Textarea 
                      id="section-description" 
                      placeholder="Section description"
                      rows={2}
                      className="resize-none"
                      value={newSection.description}
                      onChange={(e) => setNewSection(prev => ({...prev, description: e.target.value}))}
                    />
                  </div>

                  <Button 
                    type="button" 
                    onClick={addSection} 
                    className="w-full h-9"
                    disabled={!newSection.name.trim()}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Section
                  </Button>
                </div>

                {sections.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Created Sections ({sections.length})</Label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {sections.map((section) => (
                        <Card key={section.id} className="p-3 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{section.name}</p>
                                <Badge variant="secondary" className="text-xs">
                                  {section.code}
                                </Badge>
                              </div>
                              {section.description && (
                                <p className="text-xs text-muted-foreground mt-1">{section.description}</p>
                              )}
                            </div>
                            <Button
                              type="button"
                              onClick={() => removeSection(section.id)}
                              size="sm"
                              variant="outline"
                              className="h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                    
                    <Button type="submit" className="w-full h-9 mt-4">
                      Save {sections.length} Section{sections.length > 1 ? 's' : ''}
                    </Button>
                  </div>
                )}

                {sections.length === 0 && (
                  <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-sm text-muted-foreground">No sections created yet</p>
                    <p className="text-xs text-muted-foreground">Create sections first before adding programs</p>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROGRAMS TAB */}
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
                <div className="text-center py-8 border-2 border-dashed border-orange-300 rounded-lg bg-orange-50">
                  <p className="text-sm font-medium text-orange-800">No sections available</p>
                  <p className="text-xs text-orange-600 mt-1">Please create sections first before adding programs</p>
                  <Button 
                    onClick={() => setActiveTab('sections')} 
                    size="sm" 
                    className="mt-3"
                  >
                    Go to Sections
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleProgramsSubmit} className="space-y-4">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="program-name" className="text-sm font-medium">Program Name</Label>
                      <Input 
                        id="program-name" 
                        placeholder="e.g., BURDA, HAND CRAFT, CHITHRATHUNNAL" 
                        className="h-9"
                        value={newProgram.name}
                        onChange={(e) => setNewProgram(prev => ({...prev, name: e.target.value}))}
                        required
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="section-select" className="text-sm font-medium">Select Section</Label>
                      <Select 
                        value={newProgram.sectionCode} 
                        onValueChange={(value) => setNewProgram(prev => ({...prev, sectionCode: value}))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Choose a section" />
                        </SelectTrigger>
                        <SelectContent>
                          {sections.map((section) => (
                            <SelectItem key={section.code} value={section.code}>
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
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="program-description" className="text-sm font-medium">Description (Optional)</Label>
                      <Textarea 
                        id="program-description" 
                        placeholder="Program description"
                        rows={2}
                        className="resize-none"
                        value={newProgram.description}
                        onChange={(e) => setNewProgram(prev => ({...prev, description: e.target.value}))}
                      />
                    </div>

                    <Button 
                      type="button" 
                      onClick={addProgram} 
                      className="w-full h-9"
                      disabled={!newProgram.name.trim() || !newProgram.sectionCode}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Program
                    </Button>
                  </div>

                  {programs.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Added Programs ({programs.length})</Label>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {programs.map((program) => {
                          const section = sections.find(s => s.code === program.sectionCode)
                          return (
                            <Card key={program.id} className="p-3 bg-gray-50">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium">{program.name}</p>
                                  <div className="flex items-center gap-1 mt-1">
                                    <span className="text-xs text-muted-foreground">
                                      {section?.name}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {program.sectionCode}
                                    </Badge>
                                  </div>
                                  {program.description && (
                                    <p className="text-xs text-muted-foreground mt-1">{program.description}</p>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  onClick={() => removeProgram(program.id)}
                                  size="sm"
                                  variant="outline"
                                  className="h-6 w-6 p-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </Card>
                          )
                        })}
                      </div>
                      
                      <Button type="submit" className="w-full h-9 mt-4">
                        Save {programs.length} Program{programs.length > 1 ? 's' : ''}
                      </Button>
                    </div>
                  )}

                  {programs.length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                      <p className="text-sm text-muted-foreground">No programs added yet</p>
                      <p className="text-xs text-muted-foreground">Add programs to your sections</p>
                    </div>
                  )}
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BULK UPLOAD TAB */}
        <TabsContent value="bulk" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Download Template</CardTitle>
                <CardDescription className="text-sm">
                  Get the Excel template for bulk uploading programs with section codes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleDownloadTemplate} className="w-full h-9">
                  <Download className="h-4 w-4 mr-2" />
                  Download Excel Template
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Upload Programs</CardTitle>
                <CardDescription className="text-sm">
                  Upload your completed Excel file to add multiple programs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload onFileSelect={handleFileUpload} />
              </CardContent>
            </Card>
          </div>

          {isProcessing && (
            <Card className="shadow-sm">
              <CardContent className="py-6">
                <div className="text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 animate-pulse text-blue-500" />
                  <p className="text-sm font-medium">Processing file...</p>
                  <p className="text-xs text-muted-foreground">Please wait while we parse your Excel file</p>
                </div>
              </CardContent>
            </Card>
          )}

          {uploadResult && (
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  {uploadResult.errors.length === 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  Upload Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {uploadResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-red-800">Errors Found:</h4>
                    <div className="bg-red-50 p-3 rounded-lg space-y-1 max-h-40 overflow-y-auto">
                      {uploadResult.errors.map((error, index) => (
                        <p key={index} className="text-xs text-red-700">{error}</p>
                      ))}
                    </div>
                  </div>
                )}

                {uploadResult.programs.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-green-800">
                      Programs Found: {uploadResult.programs.length}
                    </h4>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {uploadResult.programs.map((item, index) => {
                        const validSectionCodes = sections.map(s => s.code)
                        const isValidSection = validSectionCodes.includes(item.sectionCode)
                        const matchingSection = sections.find(s => s.code === item.sectionCode)
                        
                        return (
                          <div key={index} className={`p-3 rounded-lg ${isValidSection ? 'bg-green-50' : 'bg-red-50'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <h5 className="font-medium text-sm">{item.programName}</h5>
                              <Badge variant={isValidSection ? "secondary" : "destructive"} className="text-xs">
                                {item.sectionCode}
                              </Badge>
                            </div>
                            {isValidSection && matchingSection ? (
                              <p className="text-xs text-green-600">→ {matchingSection.name}</p>
                            ) : (
                              <p className="text-xs text-red-600">⚠️ Section code not found</p>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {uploadResult.errors.length === 0 && (
                      <div className="space-y-2">
                        {(() => {
                          const validSectionCodes = sections.map(s => s.code)
                          const invalidPrograms = uploadResult.programs.filter(p => !validSectionCodes.includes(p.sectionCode))
                          
                          if (invalidPrograms.length > 0) {
                            const invalidCodes = [...new Set(invalidPrograms.map(p => p.sectionCode))]
                            return (
                              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                <p className="text-sm font-medium text-red-800">Cannot Import</p>
                                <p className="text-xs text-red-600 mt-1">
                                  Missing section codes: {invalidCodes.join(', ')}
                                </p>
                                <p className="text-xs text-red-600 mt-1">
                                  Create these sections first or update your Excel file.
                                </p>
                              </div>
                            )
                          }
                          
                          return (
                            <Button onClick={handleBulkProgramSubmit} className="w-full h-9">
                              Import {uploadResult.programs.length} Program{uploadResult.programs.length > 1 ? 's' : ''}
                            </Button>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}