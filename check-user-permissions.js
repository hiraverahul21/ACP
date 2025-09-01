const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserPermissions() {
  try {
    // Check user details
    const user = await prisma.staff.findUnique({
      where: { id: 'test-admin-001' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        company_id: true,
        branch_id: true
      }
    });
    
    console.log('User Details:', JSON.stringify(user, null, 2));
    
    // Check role permissions for ADMIN role
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role: 'ADMIN' },
      include: {
        permission: {
          select: {
            id: true,
            name: true,
            module: true,
            action: true
          }
        }
      }
    });
    
    console.log('\nADMIN Role Permissions Count:', rolePermissions.length);
    
    // Check specifically for BRANCH.VIEW permission
    const branchViewPermission = rolePermissions.find(rp => 
      rp.permission.module === 'BRANCH' && rp.permission.action === 'VIEW'
    );
    
    console.log('\nBRANCH.VIEW Permission:', branchViewPermission ? 'FOUND' : 'NOT FOUND');
    if (branchViewPermission) {
      console.log('Permission Details:', JSON.stringify(branchViewPermission.permission, null, 2));
    }
    
    // List all BRANCH permissions for ADMIN
    const branchPermissions = rolePermissions.filter(rp => rp.permission.module === 'BRANCH');
    console.log('\nAll BRANCH permissions for ADMIN:');
    branchPermissions.forEach(rp => {
      console.log(`- ${rp.permission.name} (${rp.permission.module}.${rp.permission.action})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserPermissions();