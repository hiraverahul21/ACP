const mysql = require('mysql2/promise');
const { PrismaClient } = require('@prisma/client');

async function addBaseAmountColumn() {
  let connection;
  
  try {
    // Parse DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL not found in environment variables');
    }
    
    // Extract connection details from DATABASE_URL
    const url = new URL(dbUrl);
    const connectionConfig = {
      host: url.hostname,
      port: url.port || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1) // Remove leading '/'
    };
    
    // Create MySQL connection
    connection = await mysql.createConnection(connectionConfig);

    console.log('Connected to MySQL database');

    // Check if base_amount column already exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'material_issue_items' AND COLUMN_NAME = 'base_amount'
    `, [connectionConfig.database]);

    if (columns.length > 0) {
      console.log('base_amount column already exists in material_issue_items table');
      return;
    }

    // Add base_amount column
    await connection.execute(`
      ALTER TABLE material_issue_items 
      ADD COLUMN base_amount DECIMAL(10,2) DEFAULT 0.00 AFTER rate_per_unit
    `);

    console.log('Successfully added base_amount column to material_issue_items table');

  } catch (error) {
    console.error('Error adding base_amount column:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the function
addBaseAmountColumn()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });