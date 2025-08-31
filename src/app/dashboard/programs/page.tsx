import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function ProgramsPage() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Programs</h2>
          <p className="text-sm text-muted-foreground">
            Manage all your programs here
          </p>
        </div>
        <Button size="sm" className="h-9">
          <Plus className="mr-1.5 h-3 w-3" />
          New Program
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">All Programs</CardTitle>
          <CardDescription className="text-sm">
            A list of all programs in your system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground">No programs found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Get started by creating your first program
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}