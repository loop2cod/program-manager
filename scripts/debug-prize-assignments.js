const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugPrizeAssignments() {
  console.log('🔍 Debugging Prize Assignment Issue...\n')
  
  try {
    // 1. Check if program winners exist
    console.log('1. Checking Program Winners...')
    const { data: winners, error: winnersError } = await supabase
      .from('program_winners')
      .select('*')
      .limit(5)
    
    if (winnersError) {
      console.error('Error fetching winners:', winnersError)
      return
    }
    
    console.log(`   Found ${winners?.length || 0} program winners`)
    if (winners && winners.length > 0) {
      console.log('   Sample winner:', {
        student_id: winners[0].student_id,
        program_id: winners[0].program_id,
        placement: winners[0].placement
      })
    }
    console.log()

    // 2. Check if prize assignments exist
    console.log('2. Checking Program Prize Assignments...')
    const { data: assignments, error: assignmentsError } = await supabase
      .from('program_prize_assignments')
      .select('*')
      .limit(5)
    
    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError)
      return
    }
    
    console.log(`   Found ${assignments?.length || 0} program prize assignments`)
    if (assignments && assignments.length > 0) {
      console.log('   Sample assignment:', {
        program_id: assignments[0].program_id,
        placement: assignments[0].placement,
        prize_id: assignments[0].prize_id
      })
    }
    console.log()

    // 3. Check the program_winners_view
    console.log('3. Checking Program Winners View (what the app sees)...')
    const { data: viewData, error: viewError } = await supabase
      .from('program_winners_view')
      .select('student_name, program_name, placement, prize_name, prize_category')
      .limit(10)
    
    if (viewError) {
      console.error('Error fetching view data:', viewError)
      return
    }
    
    console.log(`   Found ${viewData?.length || 0} records in view`)
    if (viewData && viewData.length > 0) {
      console.log('   View data sample:')
      viewData.forEach((record, index) => {
        console.log(`     ${index + 1}. ${record.student_name} - ${record.program_name} - ${record.placement}`)
        console.log(`        Prize: ${record.prize_name || 'NO PRIZE ASSIGNED'}`)
        if (record.prize_category) {
          console.log(`        Category: ${record.prize_category}`)
        }
      })
    }
    console.log()

    // 4. Cross-check for matching issues
    if (winners && assignments && viewData) {
      console.log('4. Cross-checking for placement matching issues...')
      
      for (const winner of winners.slice(0, 3)) {
        const matchingAssignment = assignments.find(a => 
          a.program_id === winner.program_id && 
          a.placement === winner.placement
        )
        
        console.log(`   Winner placement: "${winner.placement}"`)
        console.log(`   Matching assignment: ${matchingAssignment ? 'YES' : 'NO'}`)
        
        if (matchingAssignment) {
          console.log(`   Assignment placement: "${matchingAssignment.placement}"`)
          console.log(`   Exact match: ${winner.placement === matchingAssignment.placement}`)
        } else {
          // Show available assignments for this program
          const programAssignments = assignments.filter(a => a.program_id === winner.program_id)
          console.log(`   Available assignments for this program: ${programAssignments.map(a => `"${a.placement}"`).join(', ')}`)
        }
        console.log()
      }
    }

    // 5. Check user context (RLS issue check)
    console.log('5. Checking user authentication context...')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.log('   ❌ No authenticated user found')
      console.log('   This might be the issue! The view requires authentication.')
      console.log('   Try running this script after logging into the app.')
    } else {
      console.log(`   ✅ User authenticated: ${user.id}`)
    }
    console.log()

  } catch (error) {
    console.error('Debug script error:', error)
  }
}

// Run the debug function
debugPrizeAssignments().then(() => {
  console.log('🔍 Debug complete!')
  process.exit(0)
}).catch(error => {
  console.error('Script failed:', error)
  process.exit(1)
})