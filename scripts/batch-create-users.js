// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please check your .env.local file.')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Sample users to create - modify this array as needed
// Using real domain formats to avoid email validation issues
const usersToCreate = [
  {
    email: 'admin@gmail.com',
    password: 'admin123456',
    role: 'admin'
  },
  {
    email: 'teacher@yahoo.com',
    password: 'teacher123456',
    role: 'teacher'
  },
  {
    email: 'student@outlook.com',
    password: 'student123456',
    role: 'student'
  }
]

async function createUsers() {
  console.log('=== Batch User Creation Script ===\n')
  console.log(`Creating ${usersToCreate.length} users...\n`)
  
  for (let i = 0; i < usersToCreate.length; i++) {
    const user = usersToCreate[i]
    console.log(`Creating user ${i + 1}/${usersToCreate.length}: ${user.email}`)
    
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          role: user.role
        }
      })
      
      if (error) {
        console.error(`❌ Error creating ${user.email}:`, error.message)
      } else {
        console.log(`✅ Created ${user.email} (ID: ${data.user.id})`)
      }
    } catch (error) {
      console.error(`❌ Unexpected error creating ${user.email}:`, error.message)
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log('\n=== Batch creation completed ===')
}

// Check if this script is being run directly
if (require.main === module) {
  createUsers()
}

module.exports = { createUsers }