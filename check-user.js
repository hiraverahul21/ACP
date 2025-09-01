const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.staff.findUnique({
      where: { id: 'test-admin-001' },
      select: {
        id: true,
        name: true,
        role: true,
        company_id: true,
        is_active: true
      }
    });
    
    console.log('User from DB:', JSON.stringify(user, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();