// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('=== Supabase Debug & User Creation ===\n')

// Check configuration
console.log('Configuration Check:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing')
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing')
console.log()

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is missing')
  process.exit(1)
}

if (!supabaseAnonKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing')
  process.exit(1)
}

// Try different approaches
async function testUserCreation() {
  const testEmail = 'admin@vkj.com'
  const testPassword = '123vkj'
  
  console.log('Testing different user creation methods...\n')
  
  // Method 1: Using service role (admin)
  if (supabaseServiceKey) {
    console.log('Method 1: Admin user creation (service role)')
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    try {
      const { data, error } = await adminSupabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true
      })
      
      if (error) {
        console.log('❌ Admin creation failed:', error.message)
        console.log('   Error code:', error.code || 'No code')
        console.log()
      } else {
        console.log('✅ Admin creation successful!')
        console.log('   User ID:', data.user.id)
        console.log('   Email:', data.user.email)
        console.log()
        
        // Clean up test user
        await adminSupabase.auth.admin.deleteUser(data.user.id)
        console.log('🧹 Test user cleaned up\n')
        return
      }
    } catch (err) {
      console.log('❌ Admin creation error:', err.message)
      console.log()
    }
  } else {
    console.log('Method 1: Skipped (no service role key)')
    console.log()
  }
  
  // Method 2: Regular sign up
  console.log('Method 2: Regular user signup')
  const publicSupabase = createClient(supabaseUrl, supabaseAnonKey)
  
  try {
    const { data, error } = await publicSupabase.auth.signUp({
      email: testEmail,
      password: testPassword
    })
    
    if (error) {
      console.log('❌ Public signup failed:', error.message)
      console.log('   Error code:', error.code || 'No code')
      console.log()
      
      // Provide specific solutions based on error
      if (error.code === 'email_address_invalid') {
        console.log('💡 Solutions for email_address_invalid:')
        console.log('   1. Check Supabase Auth settings for email domain restrictions')
        console.log('   2. Verify your project allows new user signups')
        console.log('   3. Try a different email format (use real domain)')
        console.log('   4. Check if email confirmation is required but not configured')
        console.log()
      }
    } else {
      console.log('✅ Public signup successful!')
      console.log('   User ID:', data.user?.id || 'Pending confirmation')
      console.log('   Email:', data.user?.email || testEmail)
      console.log('   Confirmation:', data.user?.email_confirmed_at ? 'Confirmed' : 'Pending')
      console.log()
    }
  } catch (err) {
    console.log('❌ Public signup error:', err.message)
    console.log()
  }
}

async function createSpecificUser() {
  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  function askQuestion(question) {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer)
      })
    })
  }
  
  console.log('=== Create Actual User ===')
  const email = await askQuestion('Enter email: ')
  const password = await askQuestion('Enter password: ')
  
  // Try with admin first, then fallback to public
  let success = false
  
  if (supabaseServiceKey) {
    console.log('\nTrying admin creation...')
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    
    try {
      const { data, error } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })
      
      if (!error) {
        console.log('✅ User created successfully via admin!')
        console.log('User ID:', data.user.id)
        success = true
      } else {
        console.log('❌ Admin creation failed:', error.message)
      }
    } catch (err) {
      console.log('❌ Admin creation error:', err.message)
    }
  }
  
  if (!success) {
    console.log('\nTrying public signup...')
    const publicSupabase = createClient(supabaseUrl, supabaseAnonKey)
    
    try {
      const { data, error } = await publicSupabase.auth.signUp({
        email,
        password
      })
      
      if (!error) {
        console.log('✅ User created successfully via signup!')
        console.log('User ID:', data.user?.id || 'Pending')
        console.log('Note: User may need to confirm email')
      } else {
        console.log('❌ Public signup failed:', error.message)
      }
    } catch (err) {
      console.log('❌ Public signup error:', err.message)
    }
  }
  
  rl.close()
}

// Run tests first, then allow user creation
testUserCreation().then(() => {
  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  rl.question('\nWould you like to create a user now? (y/n): ', (answer) => {
    rl.close()
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      createSpecificUser()
    } else {
      console.log('Done!')
    }
  })
})