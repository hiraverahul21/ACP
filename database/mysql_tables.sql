-- MySQL Database Tables for Pest Control Management Software
-- Run these commands in your MySQL database

-- Create Database
CREATE DATABASE IF NOT EXISTS pest_control_db;
USE pest_control_db;

-- Staff Roles Enum (MySQL doesn't have native enum support, so we'll use a lookup table)
CREATE TABLE staff_roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO staff_roles (role_name) VALUES 
('SUPERADMIN'),
('ADMIN'), 
('REGIONAL_MANAGER'), 
('AREA_MANAGER'), 
('TECHNICIAN');

-- Companies Table (Multi-tenant support)
CREATE TABLE companies (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(15),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    gst_number VARCHAR(20),
    pan_number VARCHAR(15),
    is_active BOOLEAN DEFAULT TRUE,
    subscription_plan ENUM('BASIC', 'PREMIUM', 'ENTERPRISE') DEFAULT 'BASIC',
    subscription_expires_at DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_companies_email (email),
    INDEX idx_companies_is_active (is_active)
);

-- Branches Table
CREATE TABLE branches (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    company_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    phone VARCHAR(15),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    INDEX idx_branches_company (company_id),
    INDEX idx_branches_is_active (is_active)
);

-- Staff Table (Main Authentication Table)
CREATE TABLE staff (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mobile VARCHAR(15) UNIQUE NOT NULL,
    role ENUM('SUPERADMIN', 'ADMIN', 'REGIONAL_MANAGER', 'AREA_MANAGER', 'TECHNICIAN') NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    company_id VARCHAR(36),
    branch_id VARCHAR(36),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    INDEX idx_staff_email (email),
    INDEX idx_staff_mobile (mobile),
    INDEX idx_staff_role (role)
);

-- Service Types Lookup
CREATE TABLE service_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type_name VARCHAR(100) UNIQUE NOT NULL
);

INSERT INTO service_types (type_name) VALUES 
('RESIDENTIAL_PEST_CONTROL'),
('COMMERCIAL_PEST_CONTROL'),
('TERMITE_CONTROL'),
('RODENT_CONTROL'),
('COCKROACH_CONTROL'),
('ANT_CONTROL'),
('MOSQUITO_CONTROL'),
('BED_BUG_CONTROL'),
('BIRD_CONTROL'),
('SNAKE_CONTROL');

-- Property Types Lookup
CREATE TABLE property_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type_name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO property_types (type_name) VALUES 
('APARTMENT'),
('INDEPENDENT_HOUSE'),
('VILLA'),
('OFFICE'),
('SHOP'),
('RESTAURANT'),
('WAREHOUSE'),
('FACTORY'),
('HOSPITAL'),
('SCHOOL'),
('OTHER');

-- Leads Table
CREATE TABLE leads (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(15) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    service_type ENUM('RESIDENTIAL_PEST_CONTROL', 'COMMERCIAL_PEST_CONTROL', 'TERMITE_CONTROL', 'RODENT_CONTROL', 'COCKROACH_CONTROL', 'ANT_CONTROL', 'MOSQUITO_CONTROL', 'BED_BUG_CONTROL', 'BIRD_CONTROL', 'SNAKE_CONTROL') NOT NULL,
    pest_type VARCHAR(100),
    property_type ENUM('APARTMENT', 'INDEPENDENT_HOUSE', 'VILLA', 'OFFICE', 'SHOP', 'RESTAURANT', 'WAREHOUSE', 'FACTORY', 'HOSPITAL', 'SCHOOL', 'OTHER') NOT NULL,
    property_size VARCHAR(50),
    urgency_level ENUM('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY') DEFAULT 'MEDIUM',
    preferred_date DATE,
    preferred_time VARCHAR(20),
    description TEXT,
    status ENUM('NEW', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'CONVERTED', 'LOST', 'CANCELLED') DEFAULT 'NEW',
    source ENUM('WEBSITE', 'PHONE_CALL', 'REFERRAL', 'SOCIAL_MEDIA', 'ADVERTISEMENT', 'WALK_IN', 'OTHER') DEFAULT 'WEBSITE',
    assigned_to VARCHAR(36),
    branch_id VARCHAR(36),
    estimated_cost DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (assigned_to) REFERENCES staff(id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    INDEX idx_leads_status (status),
    INDEX idx_leads_service_type (service_type),
    INDEX idx_leads_created_at (created_at),
    INDEX idx_leads_customer_phone (customer_phone)
);

-- Services Table
CREATE TABLE services (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    lead_id VARCHAR(36) NOT NULL,
    service_type ENUM('RESIDENTIAL_PEST_CONTROL', 'COMMERCIAL_PEST_CONTROL', 'TERMITE_CONTROL', 'RODENT_CONTROL', 'COCKROACH_CONTROL', 'ANT_CONTROL', 'MOSQUITO_CONTROL', 'BED_BUG_CONTROL', 'BIRD_CONTROL', 'SNAKE_CONTROL') NOT NULL,
    service_date DATETIME NOT NULL,
    technician_id VARCHAR(36) NOT NULL,
    status ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED') DEFAULT 'SCHEDULED',
    cost DECIMAL(10, 2) NOT NULL,
    payment_status ENUM('PENDING', 'PARTIAL', 'PAID', 'REFUNDED') DEFAULT 'PENDING',
    notes TEXT,
    materials_used TEXT,
    before_photos JSON,
    after_photos JSON,
    customer_rating TINYINT CHECK (customer_rating >= 1 AND customer_rating <= 5),
    customer_feedback TEXT,
    warranty_period INT, -- in months
    warranty_expiry DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (technician_id) REFERENCES staff(id) ON DELETE RESTRICT,
    INDEX idx_services_service_date (service_date),
    INDEX idx_services_status (status),
    INDEX idx_services_technician (technician_id)
);

-- OTP Verification Table (for signup process)
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
);

-- Password Reset Tokens Table
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
);

-- Insert Sample Data

-- Sample Companies
INSERT INTO companies (name, email, phone, address, city, state, pincode, gst_number, pan_number) VALUES
('Pest Control Solutions Pvt Ltd', 'info@pestcontrolsolutions.com', '+91-22-12345678', '123 Business Park, Andheri', 'Mumbai', 'Maharashtra', '400001', '27ABCDE1234F1Z5', 'ABCDE1234F'),
('Urban Pest Management', 'contact@urbanpest.com', '+91-11-87654321', '456 Corporate Tower, CP', 'Delhi', 'Delhi', '110001', '07FGHIJ5678K2L6', 'FGHIJ5678K'),
('Green Shield Pest Control', 'hello@greenshield.com', '+91-80-11223344', '789 Tech Park, Whitefield', 'Bangalore', 'Karnataka', '560001', '29MNOPQ9012R3S7', 'MNOPQ9012R');

-- Sample Branches
INSERT INTO branches (company_id, name, address, city, state, pincode, phone, email) VALUES
((SELECT id FROM companies WHERE name = 'Pest Control Solutions Pvt Ltd' LIMIT 1), 'Main Branch', '123 Main Street, Downtown', 'Mumbai', 'Maharashtra', '400001', '+91-22-12345678', 'main@pestcontrol.com'),
((SELECT id FROM companies WHERE name = 'Urban Pest Management' LIMIT 1), 'North Branch', '456 North Avenue, Sector 15', 'Delhi', 'Delhi', '110001', '+91-11-87654321', 'north@pestcontrol.com'),
((SELECT id FROM companies WHERE name = 'Green Shield Pest Control' LIMIT 1), 'South Branch', '789 South Road, IT Park', 'Bangalore', 'Karnataka', '560001', '+91-80-11223344', 'south@pestcontrol.com');

-- Sample Staff (passwords: superadmin123, admin123)
-- Superadmin (no company/branch restrictions)
INSERT INTO staff (name, email, mobile, role, password_hash, company_id, branch_id) VALUES
('Super Admin', 'superadmin@pestcontrol.com', '+91-9876543209', 'SUPERADMIN', '$2a$10$rOzJqKqJqKqJqKqJqKqJqOzJqKqJqKqJqKqJqKqJqKqJqKqJqKqJq', NULL, NULL);

-- Company Staff
INSERT INTO staff (name, email, mobile, role, password_hash, company_id, branch_id) VALUES
('Admin User', 'admin@pestcontrol.com', '+91-9876543210', 'ADMIN', '$2a$10$rOzJqKqJqKqJqKqJqKqJqOzJqKqJqKqJqKqJqKqJqKqJqKqJqKqJq', (SELECT id FROM companies WHERE name = 'Pest Control Solutions Pvt Ltd' LIMIT 1), (SELECT id FROM branches WHERE name = 'Main Branch' LIMIT 1)),
('Regional Manager', 'rm@pestcontrol.com', '+91-9876543211', 'REGIONAL_MANAGER', '$2a$10$rOzJqKqJqKqJqKqJqKqJqOzJqKqJqKqJqKqJqKqJqKqJqKqJqKqJq', (SELECT id FROM companies WHERE name = 'Pest Control Solutions Pvt Ltd' LIMIT 1), (SELECT id FROM branches WHERE name = 'Main Branch' LIMIT 1)),
('Area Manager', 'am@pestcontrol.com', '+91-9876543212', 'AREA_MANAGER', '$2a$10$rOzJqKqJqKqJqKqJqKqJqOzJqKqJqKqJqKqJqKqJqKqJqKqJqKqJq', (SELECT id FROM companies WHERE name = 'Urban Pest Management' LIMIT 1), (SELECT id FROM branches WHERE name = 'North Branch' LIMIT 1)),
('Technician', 'tech@pestcontrol.com', '+91-9876543213', 'TECHNICIAN', '$2a$10$rOzJqKqJqKqJqKqJqKqJqOzJqKqJqKqJqKqJqKqJqKqJqKqJqKqJq', (SELECT id FROM companies WHERE name = 'Green Shield Pest Control' LIMIT 1), (SELECT id FROM branches WHERE name = 'South Branch' LIMIT 1));

-- Sample Leads
INSERT INTO leads (customer_name, customer_email, customer_phone, address, city, state, pincode, service_type, property_type, urgency_level, description) VALUES
('John Doe', 'john@example.com', '+91-9123456789', '123 Residential Street', 'Mumbai', 'Maharashtra', '400002', 'RESIDENTIAL_PEST_CONTROL', 'APARTMENT', 'MEDIUM', 'Cockroach problem in kitchen'),
('Jane Smith', 'jane@example.com', '+91-9123456790', '456 Commercial Plaza', 'Delhi', 'Delhi', '110002', 'COMMERCIAL_PEST_CONTROL', 'OFFICE', 'HIGH', 'Ant infestation in office premises'),
('Bob Johnson', 'bob@example.com', '+91-9123456791', '789 Villa Complex', 'Bangalore', 'Karnataka', '560002', 'TERMITE_CONTROL', 'VILLA', 'EMERGENCY', 'Termite damage in wooden furniture');

-- Create Indexes for Performance
CREATE INDEX idx_staff_branch ON staff(branch_id);
CREATE INDEX idx_leads_assigned_staff ON leads(assigned_to);
CREATE INDEX idx_leads_branch ON leads(branch_id);
CREATE INDEX idx_services_lead ON services(lead_id);

-- Create Views for Common Queries
CREATE VIEW staff_with_details AS
SELECT 
    s.id,
    s.name,
    s.email,
    s.mobile,
    s.role,
    s.is_active,
    s.created_at,
    s.last_login,
    c.name as company_name,
    c.is_active as company_active,
    b.name as branch_name,
    b.city as branch_city,
    b.is_active as branch_active
FROM staff s
LEFT JOIN companies c ON s.company_id = c.id
LEFT JOIN branches b ON s.branch_id = b.id;

CREATE VIEW companies_with_stats AS
SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    c.city,
    c.state,
    c.is_active,
    c.subscription_plan,
    c.subscription_expires_at,
    c.created_at,
    COUNT(DISTINCT b.id) as total_branches,
    COUNT(DISTINCT CASE WHEN b.is_active = TRUE THEN b.id END) as active_branches,
    COUNT(DISTINCT s.id) as total_staff,
    COUNT(DISTINCT CASE WHEN s.is_active = TRUE THEN s.id END) as active_staff
FROM companies c
LEFT JOIN branches b ON c.id = b.company_id
LEFT JOIN staff s ON c.id = s.company_id
GROUP BY c.id, c.name, c.email, c.phone, c.city, c.state, c.is_active, c.subscription_plan, c.subscription_expires_at, c.created_at;

CREATE VIEW leads_summary AS
SELECT 
    l.id,
    l.customer_name,
    l.customer_phone,
    l.service_type,
    l.status,
    l.urgency_level,
    l.created_at,
    s.name as assigned_staff_name,
    b.name as branch_name,
    c.name as company_name
FROM leads l
LEFT JOIN staff s ON l.assigned_to = s.id
LEFT JOIN branches b ON l.branch_id = b.id
LEFT JOIN companies c ON b.company_id = c.id;

-- Show table structure
SHOW TABLES;
DESCRIBE staff;
DESCRIBE leads;
DESCRIBE services;