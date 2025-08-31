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
import { Badge } from '@/components/ui/badge'
import { 
  downloadPrizeTemplate, 
  parsePrizeExcelFile, 
  validatePrizeData, 
  type PrizeUploadData 
} from '@/lib/excel-utils'
import { 
  prizesService, 
  prizeCategoriesService,
  prizeUtils, 
  type Prize,
  type PrizeCategory
} from '@/lib/database'
import { Download, Upload, Plus, Trash2, AlertCircle, CheckCircle, Image, Tag } from 'lucide-react'

export default function AddPrizesPage() {
  const [activeTab, setActiveTab] = useState('categories')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [uploadResult, setUploadResult] = useState<{ prizes: PrizeUploadData[]; errors: string[] } | null>(null)
  
  // Categories management
  const [categories, setCategories] = useState<PrizeCategory[]>([])
  const [newCategory, setNewCategory] = useState({
    name: '',
    code: '',
    description: ''
  })
  
  // Prizes management
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [newPrize, setNewPrize] = useState({
    name: '',
    imageUrl: '',
    category: '',
    averageValue: '',
    description: ''
  })

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setIsLoading(true)
      const [categoriesData, prizesData] = await Promise.all([
        prizeCategoriesService.getAll(),
        prizesService.getAll()
      ])
      setCategories(categoriesData)
      setPrizes(prizesData)
      
      // Initialize default categories if none exist
      if (categoriesData.length === 0) {
        const defaultCategories = prizeUtils.getDefaultCategories()
        for (const category of defaultCategories) {
          try {
            const created = await prizeCategoriesService.create(category)
            setCategories(prev => [...prev, created])
          } catch (error) {
            console.error('Error creating default category:', error)
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data from database')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true)
    setUploadResult(null)
    
    try {
      const prizes = await parsePrizeExcelFile(file)
      const validation = validatePrizeData(prizes)
      
      setUploadResult({
        prizes,
        errors: validation.errors
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process file'
      toast.error(errorMessage)
      setUploadResult({
        prizes: [],
        errors: [errorMessage]
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const addCategory = async () => {
    if (!newCategory.name.trim()) return
    
    try {
      const existingCodes = categories.map(c => c.code)
      const code = newCategory.code.trim() || prizeUtils.generateCategoryCode(newCategory.name, existingCodes)
      
      const categoryData = await prizeCategoriesService.create({
        name: newCategory.name.trim(),
        code: code.toUpperCase(),
        description: newCategory.description.trim() || undefined
      })
      
      setCategories(prev => [...prev, categoryData])
      setNewCategory({ name: '', code: '', description: '' })
      toast.success(`Category "${categoryData.name}" created with code ${categoryData.code}`)
    } catch (error) {
      console.error('Error creating category:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create category')
    }
  }
  
  const removeCategory = async (id: string) => {
    try {
      await prizeCategoriesService.delete(id)
      setCategories(prev => prev.filter(cat => cat.id !== id))
      toast.success('Category deleted successfully')
    } catch (error) {
      console.error('Error deleting category:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete category')
    }
  }

  const addPrize = async () => {
    if (!newPrize.name.trim() || !newPrize.category) return
    
    try {
      const averageValue = newPrize.averageValue ? parseFloat(newPrize.averageValue) : undefined
      
      const prizeData = await prizesService.create({
        name: newPrize.name.trim(),
        image_url: newPrize.imageUrl.trim() || undefined,
        category: newPrize.category,
        average_value: averageValue && !isNaN(averageValue) ? averageValue : undefined,
        description: newPrize.description.trim() || undefined
      })
      
      setPrizes(prev => [...prev, prizeData])
      setNewPrize({ name: '', imageUrl: '', category: '', averageValue: '', description: '' })
      toast.success(`Prize "${prizeData.name}" added successfully`)
    } catch (error) {
      console.error('Error creating prize:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create prize')
    }
  }

  const removePrize = async (id: string) => {
    try {
      await prizesService.delete(id)
      setPrizes(prev => prev.filter(prize => prize.id !== id))
      toast.success('Prize deleted successfully')
    } catch (error) {
      console.error('Error deleting prize:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete prize')
    }
  }

  const handleBulkPrizeSubmit = async () => {
    if (!uploadResult?.prizes) return
    
    try {
      // Check for duplicates with existing prizes
      const duplicatesWithExisting: string[] = []
      
      for (const uploadedPrize of uploadResult.prizes) {
        const prizeExists = await prizeUtils.checkPrizeExists(uploadedPrize.prizeName, uploadedPrize.category)
        if (prizeExists) {
          duplicatesWithExisting.push(`"${uploadedPrize.prizeName}" in category ${uploadedPrize.category}`)
        }
      }
      
      if (duplicatesWithExisting.length > 0) {
        toast.error(`The following prizes already exist: ${duplicatesWithExisting.join(', ')}. Please remove them from your Excel file or use different names.`)
        return
      }
      
      // Create prizes
      const prizesToCreate = uploadResult.prizes.map(prize => ({
        name: prize.prizeName,
        image_url: prize.imageUrl,
        category: prize.category,
        average_value: prize.averageValue,
        description: prize.description || 'Imported from Excel'
      }))
      
      await prizesService.createBulk(prizesToCreate)
      
      // Reload prizes to get updated list
      const updatedPrizes = await prizesService.getAll()
      setPrizes(updatedPrizes)
      
      // Clear upload result
      setUploadResult(null)
      
      toast.success(`Successfully imported ${prizesToCreate.length} prizes!`)
      setActiveTab('all-prizes')
      
    } catch (error) {
      console.error('Error importing prizes:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to import prizes')
    }
  }

  // Group prizes by category
  const prizesByCategory = prizes.reduce((acc, prize) => {
    if (!acc[prize.category]) {
      acc[prize.category] = []
    }
    acc[prize.category].push(prize)
    return acc
  }, {} as Record<string, Prize[]>)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading prizes...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Manage Prizes</h2>
        <p className="text-sm text-muted-foreground">
          Create and manage prizes with categories and images
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
          <TabsTrigger value="add-prize">Add Prize</TabsTrigger>
          <TabsTrigger value="all-prizes">All Prizes ({prizes.length})</TabsTrigger>
          <TabsTrigger value="bulk-upload">Bulk Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <Card className="max-w-lg shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Add Category</CardTitle>
              <CardDescription className="text-sm">
                Create custom prize categories with unique codes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="category-name" className="text-sm font-medium">Category Name</Label>
                    <Input
                      id="category-name"
                      placeholder="e.g., Special Awards"
                      className="h-9"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category-code" className="text-sm font-medium">
                      Category Code (Optional)
                    </Label>
                    <Input
                      id="category-code"
                      placeholder="Auto-generated from name"
                      className="h-9"
                      maxLength={3}
                      value={newCategory.code}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    />
                    {newCategory.name.trim() && !newCategory.code.trim() && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Suggested code: <span className="font-mono font-medium">
                          {prizeUtils.generateCategoryCode(newCategory.name, categories.map(c => c.code))}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="category-desc" className="text-sm font-medium">Description (Optional)</Label>
                    <Textarea
                      id="category-desc"
                      placeholder="Brief description of this category..."
                      className="min-h-[60px] text-sm resize-none"
                      value={newCategory.description}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>
                <Button 
                  onClick={addCategory} 
                  size="sm" 
                  className="h-9" 
                  disabled={!newCategory.name.trim()}
                >
                  <Plus className="mr-1.5 h-3 w-3" />
                  Add Category
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Categories List */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">All Categories</CardTitle>
              <CardDescription className="text-sm">
                Manage your prize categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No categories found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create your first category to organize prizes
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {categories.map((category) => {
                    const categoryPrizeCount = prizes.filter(p => p.category === category.code).length
                    return (
                      <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">{category.name}</span>
                            <Badge variant="secondary" className="text-xs">{category.code}</Badge>
                            <span className="text-xs text-muted-foreground">
                              ({categoryPrizeCount} prize{categoryPrizeCount !== 1 ? 's' : ''})
                            </span>
                          </div>
                          {category.description && (
                            <p className="text-xs text-muted-foreground ml-6">{category.description}</p>
                          )}
                        </div>
                        <Button
                          onClick={() => removeCategory(category.id)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                          disabled={categoryPrizeCount > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add-prize" className="space-y-4">
          <Card className="max-w-lg shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Add Prize</CardTitle>
              <CardDescription className="text-sm">
                Create prizes with custom categories, images, and values
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="prize-name" className="text-sm font-medium">Prize Name</Label>
                    <Input
                      id="prize-name"
                      placeholder="e.g., FIRST PRIZE TROPHY"
                      className="h-9"
                      value={newPrize.name}
                      onChange={(e) => setNewPrize(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="prize-category" className="text-sm font-medium">Category</Label>
                    {categories.length === 0 ? (
                      <div className="text-center py-4 bg-yellow-50 border border-yellow-200 rounded-md">
                        <AlertCircle className="mx-auto h-6 w-6 text-yellow-600 mb-2" />
                        <p className="text-sm text-yellow-800 font-medium">No categories available</p>
                        <p className="text-xs text-yellow-600 mt-1">
                          Create categories first before adding prizes
                        </p>
                        <Button
                          onClick={() => setActiveTab('categories')}
                          variant="outline"
                          size="sm"
                          className="mt-2 h-7 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                        >
                          Create Categories
                        </Button>
                      </div>
                    ) : (
                      <Select
                        value={newPrize.category}
                        onValueChange={(value) => setNewPrize(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.code}>
                              <span className="flex items-center gap-2">
                                <span>{category.name}</span>
                                <span className="text-xs text-muted-foreground">({category.code})</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="prize-image" className="text-sm font-medium">
                        <span className="flex items-center gap-2">
                          <Image className="h-4 w-4" />
                          Image URL (Optional)
                        </span>
                      </Label>
                      <Input
                        id="prize-image"
                        placeholder="https://example.com/image.jpg"
                        className="h-9"
                        value={newPrize.imageUrl}
                        onChange={(e) => setNewPrize(prev => ({ ...prev, imageUrl: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="prize-value" className="text-sm font-medium">Average Value (Optional)</Label>
                      <Input
                        id="prize-value"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="h-9"
                        value={newPrize.averageValue}
                        onChange={(e) => setNewPrize(prev => ({ ...prev, averageValue: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="prize-desc" className="text-sm font-medium">Description (Optional)</Label>
                    <Textarea
                      id="prize-desc"
                      placeholder="Brief description of the prize..."
                      className="min-h-[60px] text-sm resize-none"
                      value={newPrize.description}
                      onChange={(e) => setNewPrize(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>
                <Button 
                  onClick={addPrize} 
                  size="sm" 
                  className="h-9" 
                  disabled={!newPrize.name.trim() || !newPrize.category || categories.length === 0}
                >
                  <Plus className="mr-1.5 h-3 w-3" />
                  Add Prize
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all-prizes" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">All Prizes</CardTitle>
              <CardDescription className="text-sm">
                Manage your prizes organized by categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              {prizes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No prizes found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add prizes manually or use bulk upload
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(prizesByCategory)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([category, categoryPrizes]) => (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center gap-2 border-b pb-2">
                        {(() => {
                          const categoryInfo = categories.find(c => c.code === category)
                          return (
                            <>
                              <h3 className="font-medium text-base">
                                {categoryInfo ? categoryInfo.name : `Category ${category}`}
                              </h3>
                              <Badge variant="outline" className="text-xs">
                                {category}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {categoryPrizes.length} prize{categoryPrizes.length !== 1 ? 's' : ''}
                              </Badge>
                              {categoryInfo?.description && (
                                <span className="text-xs text-muted-foreground">
                                  ({categoryInfo.description})
                                </span>
                              )}
                            </>
                          )
                        })()}
                      </div>
                      
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {categoryPrizes.map((prize) => (
                          <div 
                            key={prize.id} 
                            className="p-3 bg-gray-50 rounded-md border border-gray-100 hover:border-gray-200 transition-colors"
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-sm">{prize.name}</h4>
                                    {prize.average_value && (
                                      <Badge variant="outline" className="text-xs text-green-700">
                                        ₹{prize.average_value.toFixed(2)}
                                      </Badge>
                                    )}
                                  </div>
                                  {prize.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                      {prize.description}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  onClick={() => removePrize(prize.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              {prize.image_url && (
                                <div className="space-y-1">
                                  <div className="text-xs text-muted-foreground">Preview:</div>
                                  <div className="relative h-20 bg-gray-100 rounded border">
                                    <img 
                                      src={prize.image_url} 
                                      alt={prize.name}
                                      className="w-full h-full object-cover rounded"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement
                                        target.style.display = 'none'
                                        target.nextElementSibling?.classList.remove('hidden')
                                      }}
                                    />
                                    <div className="hidden absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                                      Image unavailable
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between pt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {prize.category}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {prize.created_at && new Date(prize.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
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
              <CardTitle className="text-lg">Bulk Upload Prizes</CardTitle>
              <CardDescription className="text-sm">
                Upload multiple prizes from Excel file with names, categories, and image URLs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button onClick={downloadPrizeTemplate} variant="outline" size="sm" className="h-9 flex-shrink-0">
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

                  {uploadResult.prizes.length > 0 && uploadResult.errors.length === 0 && (
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-green-800 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Upload Results ({uploadResult.prizes.length} prizes)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        <div className="max-h-32 overflow-y-auto">
                          <div className="grid gap-2">
                            {uploadResult.prizes.map((prize, index) => (
                              <div key={index} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{prize.prizeName}</span>
                                  {prize.imageUrl && <Image className="h-3 w-3 text-blue-600" />}
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {prize.category}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t border-green-200">
                          <Button 
                            onClick={handleBulkPrizeSubmit}
                            size="sm" 
                            className="h-9"
                            disabled={isProcessing}
                          >
                            <Upload className="mr-1.5 h-3 w-3" />
                            {isProcessing ? 'Importing...' : 'Import Prizes'}
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