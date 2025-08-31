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
  programWinnersService,
  programPrizeAssignmentsService,
  type StudentWithDetails,
  type ProgramWinnerWithDetails,
  type ProgramPrizeAssignmentWithDetails
} from '@/lib/database'
import { ArrowLeft, User, Award, CalendarDays, Hash, Building2, BookOpen, Trophy, Medal, Download, Printer, Gift } from 'lucide-react'
import { toast } from 'sonner'
import { 
  exportStudentPrizesToExcel, 
  printPrizeCertificate, 
  type StudentPrizeExportData 
} from '@/lib/excel-utils'

export default function StudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.id as string

  const [student, setStudent] = useState<StudentWithDetails | null>(null)
  const [programWinners, setProgramWinners] = useState<ProgramWinnerWithDetails[]>([])
  const [programPrizes, setProgramPrizes] = useState<ProgramPrizeAssignmentWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingWinners, setIsLoadingWinners] = useState(false)
  const [isLoadingPrizes, setIsLoadingPrizes] = useState(false)

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
        
        // Load program winners for this student
        setIsLoadingWinners(true)
        try {
          const winnersData = await programWinnersService.getByStudent(studentId)
          setProgramWinners(winnersData)
        } catch (error) {
          console.error('Error loading program winners:', error)
          // Don't show error toast for winners - it's not critical
        } finally {
          setIsLoadingWinners(false)
        }

        // Load program prize assignments for the student's program
        setIsLoadingPrizes(true)
        try {
          const prizesData = await programPrizeAssignmentsService.getByProgram(foundStudent.program_id)
          setProgramPrizes(prizesData)
        } catch (error) {
          console.error('Error loading program prizes:', error)
          // Don't show error toast for prizes - it's not critical
        } finally {
          setIsLoadingPrizes(false)
        }
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

  const handleExportPrizes = async () => {
    if (!student || programWinners.length === 0) {
      toast.error('No prizes to export')
      return
    }

    try {
      const prizeData: StudentPrizeExportData[] = programWinners
        .filter(winner => winner.prize_name) // Only include winners with prizes
        .map(winner => ({
          studentName: winner.student_name,
          chestNo: winner.student_chest_no,
          sectionCode: winner.section_code,
          sectionName: winner.section_name,
          programName: winner.program_name,
          placement: winner.placement,
          prizeName: winner.prize_name || 'Unknown Prize',
          prizeCategory: winner.prize_category_name || winner.prize_category || 'Unknown',
          prizeValue: winner.prize_average_value,
          dateAwarded: winner.created_at 
            ? new Date(winner.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            : 'N/A',
          notes: winner.notes
        }))

      if (prizeData.length === 0) {
        toast.error('No prizes assigned to export')
        return
      }

      exportStudentPrizesToExcel(prizeData, student.name)
      toast.success(`Exported ${prizeData.length} prizes for ${student.name}`)
    } catch (error) {
      console.error('Error exporting prizes:', error)
      toast.error('Failed to export prizes')
    }
  }

  const handlePrintCertificate = (winner: ProgramWinnerWithDetails) => {
    if (!winner.prize_name) {
      toast.error('No prize assigned to this placement')
      return
    }

    try {
      const prizeData: StudentPrizeExportData = {
        studentName: winner.student_name,
        chestNo: winner.student_chest_no,
        sectionCode: winner.section_code,
        sectionName: winner.section_name,
        programName: winner.program_name,
        placement: winner.placement,
        prizeName: winner.prize_name,
        prizeCategory: winner.prize_category_name || winner.prize_category || 'Unknown',
        prizeValue: winner.prize_average_value,
        dateAwarded: winner.created_at 
          ? new Date(winner.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          : 'N/A',
        notes: winner.notes
      }

      printPrizeCertificate(prizeData)
    } catch (error) {
      console.error('Error printing certificate:', error)
      toast.error('Failed to print certificate')
    }
  }

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
            <p className="text-sm text-muted-foreground">The student you&apos;re looking for doesn&apos;t exist.</p>
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
                Details about the student&apos;s program participation
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
              
              {/* Program Awards and Achievements */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Awards & Achievements</h4>
                  <div className="flex items-center gap-2">
                    {programWinners.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {programWinners.length} Awards
                      </Badge>
                    )}
                    {programWinners.some(w => w.prize_name) && (
                      <Button
                        onClick={handleExportPrizes}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                      >
                        <Download className="mr-1 h-3 w-3" />
                        Export Prizes
                      </Button>
                    )}
                  </div>
                </div>
                
                {isLoadingWinners ? (
                  <div className="text-center py-4">
                    <div className="text-sm text-muted-foreground">Loading achievements...</div>
                  </div>
                ) : programWinners.length > 0 ? (
                  <div className="space-y-3">
                    {programWinners.map((winner) => (
                      <div key={winner.id} className={`border rounded-lg p-4 ${
                        winner.prize_name 
                          ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
                          : 'bg-gradient-to-r from-gray-50 to-blue-50 border-gray-200'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex-shrink-0">
                              {winner.prize_name ? (
                                <Gift className="h-6 w-6 text-green-600" />
                              ) : winner.placement_order <= 3 ? (
                                <Trophy className={`h-6 w-6 ${
                                  winner.placement_order === 1 ? 'text-yellow-500' :
                                  winner.placement_order === 2 ? 'text-gray-400' :
                                  'text-orange-600'
                                }`} />
                              ) : (
                                <Medal className="h-6 w-6 text-blue-500" />
                              )}
                            </div>
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={winner.placement_order <= 3 ? "default" : "secondary"}
                                  className="text-xs font-medium"
                                >
                                  {winner.placement}
                                </Badge>
                                <span className="text-sm font-medium text-gray-900">
                                  {winner.program_name}
                                </span>
                              </div>
                              
                              {winner.prize_name && (
                                <div className="bg-white bg-opacity-70 rounded-md p-2 border border-yellow-300">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Gift className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-800">Prize Awarded</span>
                                  </div>
                                  <div className="text-sm text-gray-700">
                                    <div className="font-medium">{winner.prize_name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      Category: {winner.prize_category_name || winner.prize_category}
                                      {winner.prize_average_value && (
                                        <> • Value: ${winner.prize_average_value}</>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline" className="text-xs">
                                  {winner.section_code}
                                </Badge>
                                <span>{winner.section_name}</span>
                              </div>
                              
                              {winner.notes && (
                                <p className="text-xs text-muted-foreground italic">
                                  {winner.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* {winner.prize_name && (
                            <div className="flex flex-col gap-1 ml-2">
                              <Button
                                onClick={() => handlePrintCertificate(winner)}
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                              >
                                <Printer className="h-3 w-3" />
                              </Button>
                            </div>
                          )} */}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                    <Award className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No awards or achievements yet
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Awards will appear here when assigned to program placements
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Program Prize Structure */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Available Program Prizes
              </CardTitle>
              <CardDescription>
                Prize structure for {student.program_name} program
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingPrizes ? (
                <div className="text-center py-4">
                  <div className="text-sm text-muted-foreground">Loading prize information...</div>
                </div>
              ) : programPrizes.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground mb-3">
                    The following prizes are available for different placements in this program:
                  </div>
                  {programPrizes
                    .sort((a, b) => a.placement_order - b.placement_order)
                    .map((prize) => {
                      const isWon = programWinners.some(w => w.placement === prize.placement)
                      return (
                        <div key={prize.id} className={`border rounded-lg p-4 ${
                          isWon 
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                            : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex-shrink-0">
                                {isWon ? (
                                  <Trophy className="h-6 w-6 text-green-600" />
                                ) : (
                                  <Gift className="h-6 w-6 text-gray-500" />
                                )}
                              </div>
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant={prize.placement_order <= 3 ? "default" : "secondary"}
                                    className="text-xs font-medium"
                                  >
                                    {prize.placement}
                                  </Badge>
                                  {isWon && (
                                    <Badge variant="default" className="text-xs bg-green-600">
                                      WON
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="bg-white bg-opacity-70 rounded-md p-3 border border-gray-300">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Gift className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium text-gray-800">Prize Details</span>
                                  </div>
                                  <div className="text-sm text-gray-700">
                                    <div className="font-medium">{prize.prize_name}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Category: {prize.prize_category_name || prize.prize_category}
                                      {prize.prize_average_value && (
                                        <> • Value: ${prize.prize_average_value}</>
                                      )}
                                      <> • Quantity: {prize.quantity}</>
                                    </div>
                                    {prize.prize_description && (
                                      <div className="text-xs text-muted-foreground mt-1 italic">
                                        {prize.prize_description}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {prize.notes && (
                                  <div className="text-xs text-muted-foreground italic">
                                    Notes: {prize.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                  <Gift className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No prizes assigned to this program yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Prizes can be assigned in Program Prize Assignments
                  </p>
                </div>
              )}
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
                <div className="text-lg font-semibold text-yellow-600">{programWinners.length}</div>
                <p className="text-xs text-muted-foreground">Awards</p>
              </div>
              <Separator />
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">
                  {programWinners.filter(w => w.prize_name).length}
                </div>
                <p className="text-xs text-muted-foreground">Prizes</p>
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