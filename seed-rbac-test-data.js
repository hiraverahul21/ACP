const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { seedPermissions } = require('./seed-permissions');

const prisma = new PrismaClient();

async function seedRBACTestData() {
  console.log('🔐 Starting RBAC Test Data Seeding...');
  console.log('=' .repeat(60));

  try {
    // Step 1: Clear existing RBAC data
    console.log('🧹 Clearing existing RBAC data...');
    await prisma.rolePermission.deleteMany();
    await prisma.permission.deleteMany();
    console.log('✅ RBAC data cleared');

    // Step 2: Seed permissions and role permissions
    console.log('\n📋 Seeding permissions and role assignments...');
    await seedPermissions();
    console.log('✅ Permissions and role assignments seeded');

    // Step 3: Get existing companies and branches for test users
    const companies = await prisma.company.findMany();
    const branches = await prisma.branch.findMany();
    
    if (companies.length === 0 || branches.length === 0) {
      throw new Error('No companies or branches found. Please run basic data seeding first.');
    }

    const company1 = companies[0];
    const company2 = companies.length > 1 ? companies[1] : companies[0];
    const mainBranch = branches.find(b => b.branch_type === 'MAIN_BRANCH') || branches[0];
    const generalBranches = branches.filter(b => b.branch_type === 'GENERAL_BRANCH');
    const branch1 = generalBranches[0] || branches[1] || branches[0];
    const branch2 = generalBranches[1] || branches[2] || branches[0];

    // Step 4: Create test users with different roles
    console.log('\n👥 Creating RBAC test users...');
    const hashedPassword = await bcrypt.hash('testpass123', 10);

    const testUsers = [
      // Superadmin test user
      {
        id: 'test-superadmin-001',
        name: 'Test Superadmin',
        email: 'test.superadmin@rbactest.com',
        mobile: '+91-9999000001',
        role: 'SUPERADMIN',
        password_hash: hashedPassword,
        company_id: company1.id,
        branch_id: mainBranch.id
      },
      // Admin test users
      {
        id: 'test-admin-001',
        name: 'Test Admin Company 1',
        email: 'test.admin1@rbactest.com',
        mobile: '+91-9999000002',
        role: 'ADMIN',
        password_hash: hashedPassword,
        company_id: company1.id,
        branch_id: mainBranch.id
      },
      {
        id: 'test-admin-002',
        name: 'Test Admin Company 2',
        email: 'test.admin2@rbactest.com',
        mobile: '+91-9999000003',
        role: 'ADMIN',
        password_hash: hashedPassword,
        company_id: company2.id,
        branch_id: company2.id === company1.id ? branch1.id : branches.find(b => b.company_id === company2.id)?.id || branch1.id
      },
      // Regional Manager test user
      {
        id: 'test-regional-001',
        name: 'Test Regional Manager',
        email: 'test.regional@rbactest.com',
        mobile: '+91-9999000004',
        role: 'REGIONAL_MANAGER',
        password_hash: hashedPassword,
        company_id: company1.id,
        branch_id: mainBranch.id
      },
      // Area Manager test users
      {
        id: 'test-area-001',
        name: 'Test Area Manager Branch 1',
        email: 'test.area1@rbactest.com',
        mobile: '+91-9999000005',
        role: 'AREA_MANAGER',
        password_hash: hashedPassword,
        company_id: company1.id,
        branch_id: branch1.id
      },
      {
        id: 'test-area-002',
        name: 'Test Area Manager Branch 2',
        email: 'test.area2@rbactest.com',
        mobile: '+91-9999000006',
        role: 'AREA_MANAGER',
        password_hash: hashedPassword,
        company_id: company1.id,
        branch_id: branch2.id
      },
      // Technician test users
      {
        id: 'test-tech-001',
        name: 'Test Technician 1',
        email: 'test.tech1@rbactest.com',
        mobile: '+91-9999000007',
        role: 'TECHNICIAN',
        password_hash: hashedPassword,
        company_id: company1.id,
        branch_id: branch1.id
      },
      {
        id: 'test-tech-002',
        name: 'Test Technician 2',
        email: 'test.tech2@rbactest.com',
        mobile: '+91-9999000008',
        role: 'TECHNICIAN',
        password_hash: hashedPassword,
        company_id: company1.id,
        branch_id: branch2.id
      },
      {
        id: 'test-tech-003',
        name: 'Test Technician Inactive',
        email: 'test.tech3@rbactest.com',
        mobile: '+91-9999000009',
        role: 'TECHNICIAN',
        password_hash: hashedPassword,
        company_id: company1.id,
        branch_id: branch1.id,
        is_active: false // Inactive user for testing
      },
      // Inventory Manager test user
      {
        id: 'test-inventory-001',
        name: 'Test Inventory Manager',
        email: 'test.inventory@rbactest.com',
        mobile: '+91-9999000010',
        role: 'INVENTORY_MANAGER',
        password_hash: hashedPassword,
        company_id: company1.id,
        branch_id: mainBranch.id
      },
      // Supervisor test user
      {
        id: 'test-supervisor-001',
        name: 'Test Supervisor',
        email: 'test.supervisor@rbactest.com',
        mobile: '+91-9999000011',
        role: 'SUPERVISOR',
        password_hash: hashedPassword,
        company_id: company1.id,
        branch_id: branch1.id
      }
    ];

    // Create test users
    const createdUsers = [];
    for (const userData of testUsers) {
      try {
        const user = await prisma.staff.create({ data: userData });
        createdUsers.push(user);
        console.log(`   ✅ Created ${userData.role}: ${userData.email}`);
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`   ⚠️  User already exists: ${userData.email}`);
          const existingUser = await prisma.staff.findUnique({
            where: { email: userData.email }
          });
          if (existingUser) {
            createdUsers.push(existingUser);
          }
        } else {
          throw error;
        }
      }
    }

    // Step 5: Create test leads for permission testing
    console.log('\n📞 Creating test leads for RBAC testing...');
    const testLeads = [
      {
        id: 'rbac-lead-001',
        customer_name: 'RBAC Test Customer 1',
        customer_phone: '+91-8888000001',
        customer_email: 'customer1@rbactest.com',
        service_address: '123 Test Street, Test City',
        service_type: 'RESIDENTIAL',
        pest_type: 'Cockroaches',
        service_frequency: 'MONTHLY',
        status: 'NEW',
        priority: 'MEDIUM',
        company_id: company1.id,
        branch_id: branch1.id,
        assigned_to: createdUsers.find(u => u.role === 'TECHNICIAN')?.id,
        created_by: createdUsers.find(u => u.role === 'ADMIN')?.id
      },
      {
        id: 'rbac-lead-002',
        customer_name: 'RBAC Test Customer 2',
        customer_phone: '+91-8888000002',
        customer_email: 'customer2@rbactest.com',
        service_address: '456 Test Avenue, Test City',
        service_type: 'COMMERCIAL',
        pest_type: 'Termites',
        service_frequency: 'QUARTERLY',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        company_id: company1.id,
        branch_id: branch2.id,
        assigned_to: createdUsers.find(u => u.role === 'TECHNICIAN' && u.branch_id === branch2.id)?.id,
        created_by: createdUsers.find(u => u.role === 'AREA_MANAGER')?.id
      },
      {
        id: 'rbac-lead-003',
        customer_name: 'RBAC Test Customer 3',
        customer_phone: '+91-8888000003',
        customer_email: 'customer3@rbactest.com',
        service_address: '789 Test Boulevard, Test City',
        service_type: 'INDUSTRIAL',
        pest_type: 'Rodents',
        service_frequency: 'WEEKLY',
        status: 'COMPLETED',
        priority: 'LOW',
        company_id: company2.id,
        branch_id: company2.id === company1.id ? branch1.id : branches.find(b => b.company_id === company2.id)?.id || branch1.id,
        assigned_to: createdUsers.find(u => u.role === 'TECHNICIAN')?.id,
        created_by: createdUsers.find(u => u.role === 'ADMIN' && u.company_id === company2.id)?.id
      }
    ];

    const createdLeads = [];
    for (const leadData of testLeads) {
      try {
        const lead = await prisma.lead.create({ data: leadData });
        createdLeads.push(lead);
        console.log(`   ✅ Created lead: ${leadData.customer_name} (${leadData.status})`);
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`   ⚠️  Lead already exists: ${leadData.customer_name}`);
        } else {
          console.log(`   ❌ Error creating lead ${leadData.customer_name}:`, error.message);
        }
      }
    }

    // Step 6: Verify permissions are correctly assigned
    console.log('\n🔍 Verifying role permissions...');
    const roles = ['SUPERADMIN', 'ADMIN', 'REGIONAL_MANAGER', 'AREA_MANAGER', 'TECHNICIAN'];
    
    for (const role of roles) {
      const permissions = await prisma.rolePermission.findMany({
        where: { role },
        include: { permission: true }
      });
      console.log(`   ${role}: ${permissions.length} permissions assigned`);
    }

    // Step 7: Create test scenarios summary
    console.log('\n📋 RBAC Test Scenarios Created:');
    console.log('=' .repeat(60));
    console.log('\n🔐 Test User Credentials (Password: testpass123):');
    createdUsers.forEach(user => {
      console.log(`   ${user.role.padEnd(18)} | ${user.email.padEnd(30)} | ${user.name}`);
    });

    console.log('\n📞 Test Leads Created:');
    createdLeads.forEach(lead => {
      console.log(`   ${lead.status.padEnd(12)} | ${lead.customer_name.padEnd(25)} | ${lead.service_type}`);
    });

    console.log('\n🧪 Suggested RBAC Test Cases:');
    console.log('1. Login with different roles and verify dashboard access');
    console.log('2. Test SUPERADMIN can access Role Management page');
    console.log('3. Test ADMIN cannot access Role Management page');
    console.log('4. Test TECHNICIAN can only view assigned leads');
    console.log('5. Test AREA_MANAGER can manage leads in their branch');
    console.log('6. Test REGIONAL_MANAGER can view multiple branches');
    console.log('7. Test inactive user cannot login');
    console.log('8. Test cross-company data isolation');
    console.log('9. Test permission-based UI element visibility');
    console.log('10. Test API endpoint access based on permissions');

    console.log('\n✅ RBAC Test Data Seeding Completed Successfully!');
    console.log('=' .repeat(60));

    return {
      users: createdUsers,
      leads: createdLeads,
      testScenarios: [
        'Role-based dashboard access',
        'Permission-based feature access',
        'Cross-company data isolation',
        'Branch-level access control',
        'Inactive user restrictions'
      ]
    };

  } catch (error) {
    console.error('❌ RBAC Test Data Seeding Failed:', error);
    throw error;
  }
}

// Run the seeding function if called directly
if (require.main === module) {
  seedRBACTestData()
    .then((result) => {
      console.log('\n🎉 RBAC Test Data Seeding Process Completed!');
      console.log(`Created ${result.users.length} test users and ${result.leads.length} test leads`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 RBAC Test Data Seeding Process Failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { seedRBACTestData };