const { prisma } = require('./config/database');

async function checkSuperadmin() {
  try {
    const superadmin = await prisma.staff.findUnique({
      where: { id: 'staff-superadmin' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_active: true
      }
    });
    
    console.log('Superadmin found:', superadmin);
    
    if (!superadmin) {
      console.log('Superadmin not found! Let\'s check all staff with superadmin role:');
      const allSuperadmins = await prisma.staff.findMany({
        where: { role: 'SUPERADMIN' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          is_active: true
        }
      });
      console.log('All superadmins:', allSuperadmins);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSuperadmin();