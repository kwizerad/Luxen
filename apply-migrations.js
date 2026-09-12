const fs = require('fs');
const path = require('path');

async function main() {
  const migrationFile = process.argv[2];
  
  if (!migrationFile) {
    console.error('Please specify a migration file name');
    console.log('Usage: node apply-migrations.js <migration-file.sql>');
    console.log('\nAvailable migrations:');
    
    const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
      files.forEach(file => console.log(`  - ${file}`));
    }
    process.exit(1);
  }

  const migrationPath = path.join(__dirname, 'supabase', 'migrations', migrationFile);
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found: ${migrationFile}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('='.repeat(80));
  console.log(`Migration: ${migrationFile}`);
  console.log('='.repeat(80));
  console.log('\nSQL to execute in Supabase SQL Editor:\n');
  console.log(sql);
  console.log('\n' + '='.repeat(80));
  console.log('Instructions:');
  console.log('1. Go to your Supabase project SQL Editor');
  console.log('2. Copy and paste the SQL above');
  console.log('3. Click "Run" to execute the migration');
  console.log('='.repeat(80));
}

main();