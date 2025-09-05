const mysql = require('mysql2/promise');
require('dotenv').config();

async function addApprovalTables() {
  let connection;
  
  try {
    // Parse DATABASE_URL to get connection details
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    const url = new URL(databaseUrl);
    const connectionConfig = {
      host: url.hostname,
      port: url.port || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1) // Remove leading slash
    };
    
    connection = await mysql.createConnection(connectionConfig);
    console.log('Connected to MySQL database');
    
    // Check if material_approvals table exists
    const [approvalTableExists] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'material_approvals'
    `, [connectionConfig.database]);
    
    if (approvalTableExists[0].count === 0) {
      // Create material_approvals table
      await connection.execute(`
        CREATE TABLE material_approvals (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          issue_id VARCHAR(191) NOT NULL UNIQUE,
          status ENUM('PENDING', 'APPROVED', 'REJECTED', 'PARTIALLY_APPROVED') NOT NULL DEFAULT 'PENDING',
          assigned_to_type ENUM('BRANCH', 'TECHNICIAN') NOT NULL,
          assigned_to_id VARCHAR(191) NOT NULL,
          approved_by VARCHAR(191) NULL,
          approved_at DATETIME(3) NULL,
          rejection_reason TEXT NULL,
          remarks TEXT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          INDEX idx_issue_id (issue_id),
          INDEX idx_assigned_to (assigned_to_type, assigned_to_id),
          INDEX idx_status (status)
        )
      `);
      console.log('Created material_approvals table');
    } else {
      console.log('material_approvals table already exists');
    }
    
    // Check if material_approval_items table exists
    const [approvalItemsTableExists] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'material_approval_items'
    `, [connectionConfig.database]);
    
    if (approvalItemsTableExists[0].count === 0) {
      // Create material_approval_items table
      await connection.execute(`
        CREATE TABLE material_approval_items (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          approval_id VARCHAR(191) NOT NULL,
          issue_item_id VARCHAR(191) NOT NULL,
          original_quantity DECIMAL(15,4) NOT NULL,
          approved_quantity DECIMAL(15,4) NULL,
          original_base_amount DECIMAL(10,2) NOT NULL,
          approved_base_amount DECIMAL(10,2) NULL,
          original_gst_amount DECIMAL(10,2) NOT NULL,
          approved_gst_amount DECIMAL(10,2) NULL,
          original_total_amount DECIMAL(12,2) NOT NULL,
          approved_total_amount DECIMAL(12,2) NULL,
          status ENUM('PENDING', 'APPROVED', 'REJECTED', 'PARTIALLY_APPROVED') NOT NULL DEFAULT 'PENDING',
          remarks TEXT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          INDEX idx_approval_id (approval_id),
          INDEX idx_issue_item_id (issue_item_id),
          INDEX idx_status (status)
        )
      `);
      console.log('Created material_approval_items table');
    } else {
      console.log('material_approval_items table already exists');
    }
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addApprovalTables();