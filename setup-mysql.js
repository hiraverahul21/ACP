#!/usr/bin/env node

/**
 * MySQL Setup Script for Pest Control Management
 * This script helps you configure MySQL database connection
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function setupMySQL() {
  console.log('\n🔧 MySQL Configuration Setup for Pest Control Management\n');
  
  try {
    // Get database configuration from user
    const host = await askQuestion('Enter MySQL host (default: localhost): ') || 'localhost';
    const port = await askQuestion('Enter MySQL port (default: 3306): ') || '3306';
    const username = await askQuestion('Enter MySQL username (default: root): ') || 'root';
    const password = await askQuestion('Enter MySQL password: ');
    const database = await askQuestion('Enter database name (default: pest_control_db): ') || 'pest_control_db';
    
    // Construct DATABASE_URL
    const databaseUrl = `mysql://${username}:${password}@${host}:${port}/${database}`;
    
    // Read current .env file
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update DATABASE_URL in .env content
    const lines = envContent.split('\n');
    let updated = false;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('DATABASE_URL=')) {
        lines[i] = `DATABASE_URL="${databaseUrl}"`;
        updated = true;
        break;
      }
    }
    
    if (!updated) {
      lines.unshift(`DATABASE_URL="${databaseUrl}"`);
    }
    
    // Write updated .env file
    fs.writeFileSync(envPath, lines.join('\n'));
    
    console.log('\n✅ Configuration saved to .env file!');
    console.log(`\n📝 Your DATABASE_URL: ${databaseUrl}`);
    
    console.log('\n🚀 Next steps:');
    console.log('1. Make sure MySQL server is running');
    console.log(`2. Create database: CREATE DATABASE ${database};`);
    console.log('3. Run: npx prisma generate');
    console.log('4. Run: npx prisma migrate dev --name init');
    console.log('5. Start your application: npm run dev');
    
    console.log('\n📖 For detailed setup instructions, see MYSQL_SETUP_GUIDE.md');
    
  } catch (error) {
    console.error('❌ Error during setup:', error.message);
  } finally {
    rl.close();
  }
}

// Run the setup
if (require.main === module) {
  setupMySQL();
}

module.exports = { setupMySQL };