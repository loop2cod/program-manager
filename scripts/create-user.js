// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')
const readline = require('readline')

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // You'll need to add this to .env.local

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

function askPasswordQuestion(question) {
  return new Promise((resolve) => {
    process.stdout.write(question)
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    
    let password = ''
    
    process.stdin.on('data', function(char) {
      char = char + ''
      
      switch(char) {
        case '\n':
        case '\r':
        case '\u0004':
          process.stdin.setRawMode(false)
          process.stdin.pause()
          console.log()
          resolve(password)
          break
        case '\u0003':
          process.exit()
          break
        case '\u007f': // backspace
          if (password.length > 0) {
            password = password.slice(0, -1)
            process.stdout.write('\b \b')
          }
          break
        default:
          password += char
          process.stdout.write('*')
          break
      }
    })
  })
}

async function createUser() {
  console.log('=== Supabase User Creation Script ===\n')
  
  try {
    const email = await askQuestion('Enter email: ')
    const password = await askPasswordQuestion('Enter password (6+ characters): ')
    const confirmPassword = await askPasswordQuestion('Confirm password: ')
    
    if (password !== confirmPassword) {
      console.error('Passwords do not match!')
      rl.close()
      return
    }
    
    if (password.length < 6) {
      console.error('Password must be at least 6 characters long!')
      rl.close()
      return
    }
    
    console.log('\nCreating user...')
    
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true // Auto-confirm email
    })
    
    if (error) {
      console.error('Error creating user:', error.message)
    } else {
      console.log('✅ User created successfully!')
      console.log('User ID:', data.user.id)
      console.log('Email:', data.user.email)
      console.log('Email Confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No')
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message)
  } finally {
    rl.close()
  }
}

// Run the script
createUser()