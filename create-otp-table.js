#!/usr/bin/env node

/**
 * Script to create missing OTP verifications table
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function createOTPTable() {
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
      database: url.pathname.slice(1), // Remove leading '/'
    };
    
    console.log('🔗 Connecting to MySQL database...');
    connection = await mysql.createConnection(connectionConfig);
    
    console.log('✅ Connected to database successfully');
    
    // Check if otp_verifications table exists
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'otp_verifications'"
    );
    
    if (tables.length > 0) {
      console.log('ℹ️  OTP verifications table already exists');
      return;
    }
    
    console.log('📝 Creating otp_verifications table...');
    
    // Create otp_verifications table
    const createTableSQL = `
      CREATE TABLE otp_verifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL,
        otp_code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        attempts INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_otp_email (email),
        INDEX idx_otp_expires (expires_at)
      )
    `;
    
    await connection.execute(createTableSQL);
    console.log('✅ OTP verifications table created successfully');
    
    // Also create password_reset_tokens table if it doesn't exist
    const [resetTables] = await connection.execute(
      "SHOW TABLES LIKE 'password_reset_tokens'"
    );
    
    if (resetTables.length === 0) {
      console.log('📝 Creating password_reset_tokens table...');
      
      const createResetTableSQL = `
        CREATE TABLE password_reset_tokens (
          id INT PRIMARY KEY AUTO_INCREMENT,
          email VARCHAR(255) NOT NULL,
          token VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          is_used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          INDEX idx_reset_email (email),
          INDEX idx_reset_token (token),
          INDEX idx_reset_expires (expires_at)
        )
      `;
      
      await connection.execute(createResetTableSQL);
      console.log('✅ Password reset tokens table created successfully');
    }
    
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

if (require.main === module) {
  createOTPTable();
}

module.exports = { createOTPTable };