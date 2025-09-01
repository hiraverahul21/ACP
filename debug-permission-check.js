const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugPermissionCheck() {
  try {
    console.log('Testing permission check for ADMIN role with BRANCH.VIEW...');
    
    // This is the exact query from the auth middleware
    const hasPermission = await prisma.rolePermission.findFirst({
      where: {
        role: 'ADMIN',
        permission: {
          module: 'BRANCH',
          action: 'VIEW'
        }
      },
      include: {
        permission: true
      }
    });
    
    console.log('Permission check result:', hasPermission ? 'FOUND' : 'NOT FOUND');
    
    if (hasPermission) {
      console.log('Permission details:', JSON.stringify(hasPermission, null, 2));
    } else {
      console.log('\nLet\'s check what BRANCH permissions exist...');
      
      const branchPermissions = await prisma.permission.findMany({
        where: {
          module: 'BRANCH'
        }
      });
      
      console.log('Available BRANCH permissions:');
      branchPermissions.forEach(p => {
        console.log(`- ${p.name}: module='${p.module}', action='${p.action}'`);
      });
      
      console.log('\nLet\'s check ADMIN role permissions...');
      const adminRolePermissions = await prisma.rolePermission.findMany({
        where: {
          role: 'ADMIN'
        },
        include: {
          permission: {
            select: {
              name: true,
              module: true,
              action: true
            }
          }
        }
      });
      
      console.log('ADMIN role permissions:');
      adminRolePermissions.forEach(rp => {
        console.log(`- ${rp.permission.name}: module='${rp.permission.module}', action='${rp.permission.action}'`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPermissionCheck();