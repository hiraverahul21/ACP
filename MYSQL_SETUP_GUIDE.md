# MySQL Server Setup Guide

This guide will help you configure MySQL server credentials for your Pest Control Management application.

## Prerequisites

1. **Install MySQL Server**
   - Download from: https://dev.mysql.com/downloads/mysql/
   - Or install via package manager:
     ```bash
     # Windows (using Chocolatey)
     choco install mysql
     
     # macOS (using Homebrew)
     brew install mysql
     
     # Ubuntu/Debian
     sudo apt update
     sudo apt install mysql-server
     ```

2. **Start MySQL Service**
   ```bash
   # Windows
   net start mysql
   
   # macOS/Linux
   sudo systemctl start mysql
   # or
   brew services start mysql
   ```

## Step 1: Create Database and User

1. **Login to MySQL as root:**
   ```bash
   mysql -u root -p
   ```

2. **Create the database:**
   ```sql
   CREATE DATABASE pest_control_db;
   ```

3. **Create a dedicated user (recommended):**
   ```sql
   CREATE USER 'pestcontrol_user'@'localhost' IDENTIFIED BY 'your_secure_password';
   GRANT ALL PRIVILEGES ON pest_control_db.* TO 'pestcontrol_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

4. **Exit MySQL:**
   ```sql
   EXIT;
   ```

## Step 2: Configure Environment Variables

Update your `.env` file with your MySQL credentials:

```env
# Database Configuration - MySQL
DATABASE_URL="mysql://pestcontrol_user:your_secure_password@localhost:3306/pest_control_db"
```

### Common Configuration Examples:

**Local MySQL with root user:**
```env
DATABASE_URL="mysql://root:your_root_password@localhost:3306/pest_control_db"
```

**Remote MySQL server:**
```env
DATABASE_URL="mysql://username:password@your-server-ip:3306/pest_control_db"
```

**MySQL with custom port:**
```env
DATABASE_URL="mysql://username:password@localhost:3307/pest_control_db"
```

**MySQL with SSL (for production):**
```env
DATABASE_URL="mysql://username:password@host:3306/database?sslaccept=strict"
```

## Step 3: Install MySQL Client for Node.js

Install the MySQL client package:

```bash
npm install mysql2
```

## Step 4: Generate and Run Database Migration

1. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

2. **Create and run migration:**
   ```bash
   npx prisma migrate dev --name init
   ```

3. **Push schema to database (alternative):**
   ```bash
   npx prisma db push
   ```

## Step 5: Test Database Connection

Test your connection:

```bash
npx prisma studio
```

This will open Prisma Studio in your browser to manage your database.

## Troubleshooting

### Common Issues:

1. **"Access denied for user" error:**
   - Check username and password in DATABASE_URL
   - Ensure user has proper privileges
   - Verify MySQL service is running

2. **"Can't connect to MySQL server" error:**
   - Check if MySQL service is running
   - Verify host and port in DATABASE_URL
   - Check firewall settings

3. **"Unknown database" error:**
   - Ensure database exists: `CREATE DATABASE pest_control_db;`
   - Check database name in DATABASE_URL

4. **Connection timeout:**
   - Add connection timeout to DATABASE_URL:
   ```env
   DATABASE_URL="mysql://user:pass@localhost:3306/db?connection_timeout=60"
   ```

### MySQL Commands Reference:

```sql
-- Show all databases
SHOW DATABASES;

-- Show all users
SELECT User, Host FROM mysql.user;

-- Show user privileges
SHOW GRANTS FOR 'username'@'localhost';

-- Reset user password
ALTER USER 'username'@'localhost' IDENTIFIED BY 'new_password';
```

## Security Best Practices

1. **Use strong passwords**
2. **Create dedicated database users** (don't use root for applications)
3. **Limit user privileges** to only what's needed
4. **Use SSL connections** for production
5. **Keep MySQL updated**
6. **Backup your database regularly**

## Next Steps

After configuring MySQL:

1. Update your `.env` file with correct credentials
2. Run `npx prisma migrate dev` to create tables
3. Start your application: `npm run dev`
4. Test the authentication flow

For any issues, check the application logs and MySQL error logs.