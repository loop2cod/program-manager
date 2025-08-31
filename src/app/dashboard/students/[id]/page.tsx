'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  studentsService,
  type StudentWithDetails
} from '@/lib/database'
import { ArrowLeft, User, Award, CalendarDays, Hash, Building2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'

export default function StudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.id as string

  const [student, setStudent] = useState<StudentWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadStudent = async () => {
      try {
        setIsLoading(true)
        // For now, we'll get all students and find the one we need
        // In a production app, you'd have a getById method
        const allStudents = await studentsService.getAll()
        const foundStudent = allStudents.find(s => s.id === studentId)
        
        if (!foundStudent) {
          toast.error('Student not found')
          router.push('/dashboard/add-students')
          return
        }

        setStudent(foundStudent)
      } catch (error) {
        console.error('Error loading student:', error)
        toast.error('Failed to load student details')
        router.push('/dashboard/add-students')
      } finally {
        setIsLoading(false)
      }
    }

    if (studentId) {
      loadStudent()
    }
  }, [studentId, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading student details...</div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <User className="mx-auto h-12 w-12 text-muted-foreground" />
          <div>
            <p className="text-lg font-medium">Student not found</p>
            <p className="text-sm text-muted-foreground">The student you're looking for doesn't exist.</p>
          </div>
          <Button asChild>
            <Link href="/dashboard/add-students">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Students
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/add-students?tab=all-students">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Students
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{student.name}</h1>
            <p className="text-muted-foreground">Student Details</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Student Information */}
        <div className="md:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Student Information
              </CardTitle>
              <CardDescription>
                Basic details about the student
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Hash className="h-4 w-4" />
                    Chest Number
                  </div>
                  <Badge variant="outline" className="text-base px-3 py-1">
                    {student.chest_no}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <User className="h-4 w-4" />
                    Full Name
                  </div>
                  <p className="text-lg font-medium">{student.name}</p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    Section
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{student.section_code}</Badge>
                    <span className="text-sm">{student.section_name}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    Program
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{student.program_name}</Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  Registration Date
                </div>
                <p className="text-sm">
                  {student.created_at 
                    ? new Date(student.created_at).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'Not available'
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Program Participation Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Program Participation
              </CardTitle>
              <CardDescription>
                Details about the student's program participation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-blue-900">Current Program</h4>
                    <Badge variant="default">{student.program_name}</Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Section:</span>
                      <span className="font-medium">{student.section_name} ({student.section_code})</span>
                    </div>
                    {student.program_description && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Description:</span>
                        <span className="font-medium flex-1 text-right">{student.program_description}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Future: Add program history, achievements, etc. */}
              <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                <Award className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Program achievements and history will be displayed here
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{student.chest_no}</div>
                <p className="text-xs text-muted-foreground">Chest Number</p>
              </div>
              <Separator />
              <div className="text-center">
                <div className="text-lg font-semibold">{student.section_code}</div>
                <p className="text-xs text-muted-foreground">Section Code</p>
              </div>
              <Separator />
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">Active</div>
                <p className="text-xs text-muted-foreground">Status</p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <User className="mr-2 h-4 w-4" />
                Edit Details
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Award className="mr-2 h-4 w-4" />
                View Achievements
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <CalendarDays className="mr-2 h-4 w-4" />
                Activity History
              </Button>
            </CardContent>
          </Card>

          {/* Contact Information (Future) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4 border-2 border-dashed border-gray-200 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  Contact information will be added in future updates
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}