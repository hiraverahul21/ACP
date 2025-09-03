const mysql = require('mysql2/promise');
require('dotenv').config();

async function addGstAmountColumn() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'pest_control_db'
  });

  try {
    console.log('Adding gst_amount column to material_issue_items table...');
    
    // Check if column already exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'material_issue_items' AND COLUMN_NAME = 'gst_amount'
    `, [process.env.DB_NAME || 'pest_control_db']);
    
    if (columns.length > 0) {
      console.log('Column gst_amount already exists.');
      return;
    }
    
    // Add the column
    await connection.execute(`
      ALTER TABLE material_issue_items 
      ADD COLUMN gst_amount DECIMAL(10,2) DEFAULT 0.00 
      AFTER rate_per_unit
    `);
    
    console.log('Successfully added gst_amount column to material_issue_items table.');
    
  } catch (error) {
    console.error('Error adding column:', error.message);
  } finally {
    await connection.end();
  }
}

addGstAmountColumn();