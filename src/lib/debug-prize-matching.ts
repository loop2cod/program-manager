// Debug utility to help troubleshoot prize assignment matching issues
import { supabase } from './supabase'

export async function debugPrizeMatching() {
  console.log('🔍 Starting Prize Matching Debug...')
  
  try {
    // 1. Get raw program winners
    const { data: winners, error: winnersError } = await supabase
      .from('program_winners')
      .select('id, program_id, student_id, placement, user_id')
      .limit(5)
    
    if (winnersError) {
      console.error('❌ Error fetching winners:', winnersError)
      return
    }
    
    console.log(`✅ Found ${winners?.length || 0} program winners`)
    
    // 2. Get raw prize assignments  
    const { data: assignments, error: assignmentsError } = await supabase
      .from('program_prize_assignments')
      .select('id, program_id, prize_id, placement, user_id')
      .limit(10)
    
    if (assignmentsError) {
      console.error('❌ Error fetching assignments:', assignmentsError)
      return
    }
    
    console.log(`✅ Found ${assignments?.length || 0} prize assignments`)
    
    // 3. Check if debug view exists and works
    const { data: debugData, error: debugError } = await supabase
      .from('debug_prize_join_check')
      .select('*')
      .limit(5)
    
    if (debugError) {
      console.log('❌ Debug view not available (run robust migration first)')
      console.log('Error:', debugError.message)
    } else {
      console.log('✅ Debug view available')
      console.log('Debug data sample:', debugData)
    }
    
    // 4. Manual matching check
    if (winners && assignments) {
      console.log('\n🔍 Manual Matching Analysis:')
      
      for (const winner of winners) {
        console.log(`\nWinner: ${winner.id}`)
        console.log(`  Program: ${winner.program_id}`)
        console.log(`  Placement: "${winner.placement}" (length: ${winner.placement?.length})`)
        
        // Find matching assignments
        const matches = assignments.filter(a => 
          a.program_id === winner.program_id && 
          a.user_id === winner.user_id
        )
        
        console.log(`  Program assignments: ${matches.length}`)
        
        for (const assignment of matches) {
          const exactMatch = assignment.placement === winner.placement
          const trimMatch = assignment.placement?.trim() === winner.placement?.trim()
          
          console.log(`    Assignment placement: "${assignment.placement}" (length: ${assignment.placement?.length})`)
          console.log(`    Exact match: ${exactMatch}`)
          console.log(`    Trim match: ${trimMatch}`)
          
          if (!exactMatch && !trimMatch) {
            console.log(`    ⚠️  MISMATCH DETECTED!`)
            console.log(`    Winner chars: [${winner.placement?.split('').map(c => `'${c}'`).join(', ')}]`)
            console.log(`    Assignment chars: [${assignment.placement?.split('').map(c => `'${c}'`).join(', ')}]`)
          }
        }
      }
    }
    
    // 5. Check current view results
    const { data: viewResults, error: viewError } = await supabase
      .from('program_winners_view')
      .select('student_name, program_name, placement, prize_name')
      .limit(5)
    
    if (viewError) {
      console.error('❌ Error fetching view results:', viewError)
    } else {
      console.log('\n📊 Current View Results:')
      viewResults?.forEach(result => {
        console.log(`  ${result.student_name} - ${result.program_name} - ${result.placement}`)
        console.log(`    Prize: ${result.prize_name || '❌ NO PRIZE'}`)
      })
    }
    
    console.log('\n✅ Debug complete!')
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

// Export for console use
if (typeof window !== 'undefined') {
  (window as any).debugPrizeMatching = debugPrizeMatching
}