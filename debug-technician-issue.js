const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugTechnicianIssue() {
  console.log('🔍 Debugging technician issue creation...');

  try {
    // Check all technicians in PestControl Pro Ltd
    const company = await prisma.company.findFirst({
      where: { name: 'PestControl Pro Ltd' }
    });

    if (!company) {
      console.log('❌ PestControl Pro Ltd company not found!');
      return;
    }

    console.log(`✅ Found company: ${company.name} (ID: ${company.id})`);

    // Get all technicians for this company
    const technicians = await prisma.staff.findMany({
      where: {
        company_id: company.id,
        role: 'TECHNICIAN',
        is_active: true
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`\n👥 Found ${technicians.length} active technicians:`);
    technicians.forEach((tech, index) => {
      console.log(`${index + 1}. ${tech.name} (${tech.email})`);
      console.log(`   ID: ${tech.id}`);
      console.log(`   Branch: ${tech.branch.name} (${tech.branch.id})`);
      console.log(`   Mobile: ${tech.mobile}`);
      console.log('');
    });

    // Check the admin user who would be creating the issue
    const admin = await prisma.staff.findFirst({
      where: {
        company_id: company.id,
        role: 'ADMIN',
        is_active: true
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (admin) {
      console.log(`🔑 Admin user: ${admin.name} (${admin.email})`);
      console.log(`   ID: ${admin.id}`);
      console.log(`   Branch: ${admin.branch.name} (${admin.branch.id})`);
    } else {
      console.log('❌ No admin user found for this company!');
    }

    // Check if there are any material issues already
    const existingIssues = await prisma.materialIssue.findMany({
      where: {
        OR: [
          { from_location_id: company.id },
          { to_location_id: { in: technicians.map(t => t.id) } }
        ]
      },
      take: 5,
      orderBy: { created_at: 'desc' }
    });

    console.log(`\n📋 Recent material issues: ${existingIssues.length}`);
    existingIssues.forEach((issue, index) => {
      console.log(`${index + 1}. Issue #${issue.issue_no}`);
      console.log(`   From: ${issue.from_location_type} (${issue.from_location_id})`);
      console.log(`   To: ${issue.to_location_type} (${issue.to_location_id})`);
      console.log(`   Status: ${issue.status}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error debugging:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug function
debugTechnicianIssue()
  .catch((error) => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  });