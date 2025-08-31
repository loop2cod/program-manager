import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function AddStudentsPage() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Add Student</h2>
        <p className="text-sm text-muted-foreground">
          Register a new student in the system
        </p>
      </div>

      <Card className="max-w-2xl shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Student Information</CardTitle>
          <CardDescription className="text-sm">
            Fill in the student details below
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="first-name" className="text-sm font-medium">First Name</Label>
                <Input id="first-name" placeholder="Enter first name" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last-name" className="text-sm font-medium">Last Name</Label>
                <Input id="last-name" placeholder="Enter last name" className="h-9" />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input id="email" type="email" placeholder="student@example.com" className="h-9" />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="student-id" className="text-sm font-medium">Student ID</Label>
                <Input id="student-id" placeholder="Enter student ID" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                <Input id="phone" type="tel" placeholder="Enter phone number" className="h-9" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="grade" className="text-sm font-medium">Grade/Level</Label>
                <Input id="grade" placeholder="e.g., 10th Grade" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date-of-birth" className="text-sm font-medium">Date of Birth</Label>
                <Input id="date-of-birth" type="date" className="h-9" />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-sm font-medium">Address</Label>
              <Textarea 
                id="address" 
                placeholder="Enter student address"
                rows={2}
                className="resize-none"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="emergency-contact" className="text-sm font-medium">Emergency Contact</Label>
              <Input id="emergency-contact" placeholder="Enter emergency contact info" className="h-9" />
            </div>
            
            <Button type="submit" className="w-full h-9 mt-4">
              Register Student
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}