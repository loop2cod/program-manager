import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function AddPrizesPage() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Add Prize</h2>
        <p className="text-sm text-muted-foreground">
          Create a new prize for your programs
        </p>
      </div>

      <Card className="max-w-lg shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Prize Details</CardTitle>
          <CardDescription className="text-sm">
            Fill in the information below
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="prize-name" className="text-sm font-medium">Prize Name</Label>
              <Input id="prize-name" placeholder="Enter prize name" className="h-9" />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="prize-description" className="text-sm font-medium">Description</Label>
              <Textarea 
                id="prize-description" 
                placeholder="Enter prize description"
                rows={3}
                className="resize-none"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prize-value" className="text-sm font-medium">Prize Value</Label>
                <Input id="prize-value" type="number" placeholder="0.00" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quantity" className="text-sm font-medium">Quantity Available</Label>
                <Input id="quantity" type="number" placeholder="1" className="h-9" />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="prize-category" className="text-sm font-medium">Category</Label>
              <Input id="prize-category" placeholder="e.g., Academic, Sports, Arts" className="h-9" />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="eligibility" className="text-sm font-medium">Eligibility Criteria</Label>
              <Textarea 
                id="eligibility" 
                placeholder="Enter eligibility requirements"
                rows={2}
                className="resize-none"
              />
            </div>
            
            <Button type="submit" className="w-full h-9 mt-4">
              Create Prize
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}