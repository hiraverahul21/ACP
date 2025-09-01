const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTechnicians() {
  try {
    const technicians = await prisma.staff.findMany({
      where: {
        role: 'TECHNICIAN',
        is_active: true,
        company_id: 'company-1'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        company_id: true
      }
    });
    
    console.log('Technicians found:', technicians.length);
    console.log('Technicians:', JSON.stringify(technicians, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTechnicians();