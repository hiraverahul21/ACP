const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyData() {
  try {
    console.log('🔍 Verifying Urban Pest Solutions data...');
    
    // Check company
    const company = await prisma.company.findFirst({
      where: { name: 'Urban Pest Solutions' },
      include: {
        branches: true,
        staff: true,
        items: true,
        leads: true
      }
    });
    
    if (!company) {
      console.log('❌ Company not found!');
      return;
    }
    
    console.log('✅ Company found:', company.name);
    console.log('📧 Email:', company.email);
    console.log('📞 Phone:', company.phone);
    console.log('🏢 Branches:', company.branches.length);
    console.log('👥 Staff:', company.staff.length);
    console.log('📦 Items:', company.items.length);
    console.log('📞 Leads:', company.leads.length);
    
    // Check branches
    console.log('\n🏢 Branch Details:');
    company.branches.forEach((branch, index) => {
      console.log(`${index + 1}. ${branch.name} - ${branch.city}, ${branch.state}`);
    });
    
    // Check staff roles
    console.log('\n👥 Staff by Role:');
    const staffByRole = {};
    company.staff.forEach(staff => {
      if (!staffByRole[staff.role]) {
        staffByRole[staff.role] = 0;
      }
      staffByRole[staff.role]++;
    });
    Object.entries(staffByRole).forEach(([role, count]) => {
      console.log(`- ${role}: ${count}`);
    });
    
    // Check inventory items
    console.log('\n📦 Inventory Items:');
    company.items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} (${item.category}) - ${item.base_uom}`);
    });
    
    // Check material batches
    const batches = await prisma.materialBatch.findMany({
      where: {
        item: {
          company_id: company.id
        }
      },
      include: {
        item: true
      }
    });
    
    console.log('\n📋 Material Batches:');
    batches.forEach((batch, index) => {
      console.log(`${index + 1}. ${batch.item.name} - Batch: ${batch.batch_no}, Qty: ${batch.current_qty}`);
    });
    
    // Check leads
    console.log('\n📞 Lead Details:');
    company.leads.forEach((lead, index) => {
      console.log(`${index + 1}. ${lead.customer_name} - ${lead.service_type} (${lead.status})`);
    });
    
    // Check services
    const services = await prisma.service.findMany({
      where: {
        lead: {
          company_id: company.id
        }
      },
      include: {
        lead: true,
        technician: true
      }
    });
    
    console.log('\n🔧 Services:');
    services.forEach((service, index) => {
      console.log(`${index + 1}. ${service.service_type} for ${service.lead.customer_name} - ${service.status}`);
    });
    
    console.log('\n🎉 Data verification completed successfully!');
    
  } catch (error) {
    console.error('❌ Error verifying data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyData();