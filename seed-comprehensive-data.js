const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seeding...');

  try {
    // Clear existing data in reverse dependency order
    console.log('🧹 Clearing existing data...');
    await prisma.stockLedger.deleteMany();
    await prisma.materialConsumptionItem.deleteMany();
    await prisma.materialConsumption.deleteMany();
    await prisma.materialTransferItem.deleteMany();
    await prisma.materialTransfer.deleteMany();
    await prisma.materialReturnItem.deleteMany();
    await prisma.materialReturn.deleteMany();
    await prisma.materialIssueItem.deleteMany();
    await prisma.materialIssue.deleteMany();
    await prisma.materialReceiptItem.deleteMany();
    await prisma.materialReceipt.deleteMany();
    await prisma.materialBatch.deleteMany();
    await prisma.uomConversion.deleteMany();
    await prisma.item.deleteMany();
    await prisma.leadService.deleteMany();
    await prisma.service.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.staff.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.company.deleteMany();
    await prisma.otp_verifications.deleteMany();
    await prisma.password_reset_tokens.deleteMany();

    // 1. Create Companies
    console.log('🏢 Creating companies...');
    const companies = await Promise.all([
      prisma.company.create({
        data: {
          id: 'company-1',
          name: 'PestControl Pro Ltd',
          email: 'admin@pestcontrolpro.com',
          phone: '+91-9876543210',
          address: '123 Business Park, Sector 18',
          city: 'Gurgaon',
          state: 'Haryana',
          pincode: '122001',
          gst_number: '06AABCP1234C1ZS',
          pan_number: 'AABCP1234C',
          subscription_plan: 'ENTERPRISE',
          subscription_expires_at: new Date('2025-12-31')
        }
      }),
      prisma.company.create({
        data: {
          id: 'company-2',
          name: 'Urban Pest Solutions',
          email: 'contact@urbanpest.com',
          phone: '+91-9876543211',
          address: '456 Industrial Area',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          gst_number: '27AABCU5678D1ZS',
          pan_number: 'AABCU5678D',
          subscription_plan: 'PREMIUM',
          subscription_expires_at: new Date('2025-06-30')
        }
      })
    ]);

    // 2. Create Branches
    console.log('🏪 Creating branches...');
    const branches = await Promise.all([
      // Company 1 branches
      prisma.branch.create({
        data: {
          id: 'branch-1-main',
          name: 'Main Branch - Gurgaon',
          address: '123 Business Park, Sector 18',
          city: 'Gurgaon',
          state: 'Haryana',
          pincode: '122001',
          phone: '+91-9876543210',
          email: 'gurgaon@pestcontrolpro.com',
          branch_type: 'MAIN_BRANCH',
          company_id: companies[0].id
        }
      }),
      prisma.branch.create({
        data: {
          id: 'branch-1-delhi',
          name: 'Delhi Branch',
          address: '789 Connaught Place',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110001',
          phone: '+91-9876543212',
          email: 'delhi@pestcontrolpro.com',
          branch_type: 'GENERAL_BRANCH',
          company_id: companies[0].id
        }
      }),
      prisma.branch.create({
        data: {
          id: 'branch-1-noida',
          name: 'Noida Branch',
          address: '321 Sector 62',
          city: 'Noida',
          state: 'Uttar Pradesh',
          pincode: '201301',
          phone: '+91-9876543213',
          email: 'noida@pestcontrolpro.com',
          branch_type: 'GENERAL_BRANCH',
          company_id: companies[0].id
        }
      }),
      // Company 2 branches
      prisma.branch.create({
        data: {
          id: 'branch-2-main',
          name: 'Main Branch - Mumbai',
          address: '456 Industrial Area',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          phone: '+91-9876543211',
          email: 'mumbai@urbanpest.com',
          branch_type: 'MAIN_BRANCH',
          company_id: companies[1].id
        }
      }),
      prisma.branch.create({
        data: {
          id: 'branch-2-pune',
          name: 'Pune Branch',
          address: '654 FC Road',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411001',
          phone: '+91-9876543214',
          email: 'pune@urbanpest.com',
          branch_type: 'GENERAL_BRANCH',
          company_id: companies[1].id
        }
      })
    ]);

    // 3. Create Staff with different roles
    console.log('👥 Creating staff members...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const staff = await Promise.all([
      // Superadmin
      prisma.staff.create({
        data: {
          id: 'staff-superadmin',
          name: 'System Administrator',
          email: 'superadmin@pestcontrolpro.com',
          mobile: '+91-9000000001',
          role: 'SUPERADMIN',
          password_hash: hashedPassword,
          company_id: companies[0].id,
          branch_id: branches[0].id
        }
      }),
      // Company 1 Staff
      prisma.staff.create({
        data: {
          id: 'staff-admin-1',
          name: 'Rajesh Kumar',
          email: 'rajesh@pestcontrolpro.com',
          mobile: '+91-9000000002',
          role: 'ADMIN',
          password_hash: hashedPassword,
          company_id: companies[0].id,
          branch_id: branches[0].id
        }
      }),
      prisma.staff.create({
        data: {
          id: 'staff-inventory-1',
          name: 'Priya Sharma',
          email: 'priya@pestcontrolpro.com',
          mobile: '+91-9000000003',
          role: 'INVENTORY_MANAGER',
          password_hash: hashedPassword,
          company_id: companies[0].id,
          branch_id: branches[0].id
        }
      }),
      prisma.staff.create({
        data: {
          id: 'staff-supervisor-1',
          name: 'Amit Singh',
          email: 'amit@pestcontrolpro.com',
          mobile: '+91-9000000004',
          role: 'SUPERVISOR',
          password_hash: hashedPassword,
          company_id: companies[0].id,
          branch_id: branches[1].id
        }
      }),
      prisma.staff.create({
        data: {
          id: 'staff-tech-1',
          name: 'Vikram Patel',
          email: 'vikram@pestcontrolpro.com',
          mobile: '+91-9000000005',
          role: 'TECHNICIAN',
          password_hash: hashedPassword,
          company_id: companies[0].id,
          branch_id: branches[1].id
        }
      }),
      prisma.staff.create({
        data: {
          id: 'staff-tech-2',
          name: 'Suresh Gupta',
          email: 'suresh@pestcontrolpro.com',
          mobile: '+91-9000000006',
          role: 'TECHNICIAN',
          password_hash: hashedPassword,
          company_id: companies[0].id,
          branch_id: branches[2].id
        }
      }),
      // Company 2 Staff
      prisma.staff.create({
        data: {
          id: 'staff-admin-2',
          name: 'Sneha Joshi',
          email: 'sneha@urbanpest.com',
          mobile: '+91-9000000007',
          role: 'ADMIN',
          password_hash: hashedPassword,
          company_id: companies[1].id,
          branch_id: branches[3].id
        }
      }),
      prisma.staff.create({
        data: {
          id: 'staff-tech-3',
          name: 'Ravi Mehta',
          email: 'ravi@urbanpest.com',
          mobile: '+91-9000000008',
          role: 'TECHNICIAN',
          password_hash: hashedPassword,
          company_id: companies[1].id,
          branch_id: branches[4].id
        }
      })
    ]);

    console.log('✅ Basic data seeded successfully!');
    console.log(`Created ${companies.length} companies`);
    console.log(`Created ${branches.length} branches`);
    console.log(`Created ${staff.length} staff members`);

    return { companies, branches, staff };

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('🎉 Database seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database seeding failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { seedComprehensiveData: main };