const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Create or find sample company
    const company = await prisma.company.upsert({
      where: { email: 'info@pestcontrolsolutions.com' },
      update: {},
      create: {
        name: 'Pest Control Solutions Ltd',
        email: 'info@pestcontrolsolutions.com',
        phone: '+1-555-0123',
        address: '123 Business Street',
        city: 'New York',
        state: 'NY',
        pincode: '10001',
        gst_number: 'GST123456789',
        pan_number: 'ABCDE1234F',
        is_active: true,
        subscription_plan: 'PREMIUM',
        subscription_expires_at: new Date('2025-12-31')
      }
    });
    console.log('✅ Sample company created/found:', company.name);

    // Create or find sample branch
    let branch = await prisma.branch.findFirst({
      where: {
        company_id: company.id,
        name: 'Main Branch - NYC'
      }
    });
    
    if (!branch) {
      branch = await prisma.branch.create({
        data: {
          company_id: company.id,
          name: 'Main Branch - NYC',
          address: '123 Business Street, Suite 100',
          city: 'New York',
          state: 'NY',
          pincode: '10001',
          phone: '+1-555-0124',
          email: 'nyc@pestcontrolsolutions.com',
          is_active: true
        }
      });
    }
    console.log('✅ Sample branch created/found:', branch.name);

    // Create or find superadmin user
    const hashedPassword = await bcrypt.hash('SuperAdmin@123', 12);
    const superadmin = await prisma.staff.upsert({
      where: { email: 'superadmin@pestcontrol.com' },
      update: {},
      create: {
        name: 'Super Administrator',
        email: 'superadmin@pestcontrol.com',
        mobile: '+1-555-0100',
        password_hash: hashedPassword,
        role: 'SUPERADMIN',
        company_id: company.id,
        branch_id: branch.id,
        is_active: true
      }
    });
    console.log('✅ Superadmin user created/found:', superadmin.email);

    // Create or find sample admin user for the company
    const adminPassword = await bcrypt.hash('Admin@123', 12);
    const admin = await prisma.staff.upsert({
      where: { email: 'admin@pestcontrolsolutions.com' },
      update: {},
      create: {
        name: 'Company Administrator',
        email: 'admin@pestcontrolsolutions.com',
        mobile: '+1-555-0101',
        password_hash: adminPassword,
        role: 'ADMIN',
        company_id: company.id,
        branch_id: branch.id,
        is_active: true
      }
    });
    console.log('✅ Company admin user created/found:', admin.email);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Sample Login Credentials:');
    console.log('\n🔐 Superadmin Login:');
    console.log('   Email: superadmin@pestcontrol.com');
    console.log('   Password: SuperAdmin@123');
    console.log('\n🔐 Company Admin Login:');
    console.log('   Email: admin@pestcontrolsolutions.com');
    console.log('   Password: Admin@123');
    console.log('\n🏢 Sample Company:');
    console.log('   Name:', company.name);
    console.log('   ID:', company.id);
    console.log('\n🏪 Sample Branch:');
    console.log('   Name:', branch.name);
    console.log('   ID:', branch.id);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedDatabase()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });