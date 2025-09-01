const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Default permissions for all modules
const defaultPermissions = [
  // Dashboard permissions
  { name: 'dashboard.view', module: 'DASHBOARD', action: 'VIEW', description: 'View dashboard analytics and reports' },
  { name: 'dashboard.export', module: 'DASHBOARD', action: 'EXPORT', description: 'Export dashboard data' },

  // Company management permissions
  { name: 'company.view', module: 'COMPANY', action: 'VIEW', description: 'View company details' },
  { name: 'company.create', module: 'COMPANY', action: 'CREATE', description: 'Create new companies' },
  { name: 'company.edit', module: 'COMPANY', action: 'EDIT', description: 'Edit company details' },
  { name: 'company.delete', module: 'COMPANY', action: 'DELETE', description: 'Delete companies' },

  // Branch management permissions
  { name: 'branch.view', module: 'BRANCH', action: 'VIEW', description: 'View branch details' },
  { name: 'branch.create', module: 'BRANCH', action: 'CREATE', description: 'Create new branches' },
  { name: 'branch.edit', module: 'BRANCH', action: 'EDIT', description: 'Edit branch details' },
  { name: 'branch.delete', module: 'BRANCH', action: 'DELETE', description: 'Delete branches' },

  // Staff management permissions
  { name: 'staff.view', module: 'STAFF', action: 'VIEW', description: 'View staff members' },
  { name: 'staff.create', module: 'STAFF', action: 'CREATE', description: 'Create new staff members' },
  { name: 'staff.edit', module: 'STAFF', action: 'EDIT', description: 'Edit staff details' },
  { name: 'staff.delete', module: 'STAFF', action: 'DELETE', description: 'Delete staff members' },
  { name: 'staff.approve', module: 'STAFF', action: 'APPROVE', description: 'Approve staff registrations' },

  // Lead management permissions
  { name: 'lead.view', module: 'LEAD', action: 'VIEW', description: 'View leads' },
  { name: 'lead.create', module: 'LEAD', action: 'CREATE', description: 'Create new leads' },
  { name: 'lead.edit', module: 'LEAD', action: 'EDIT', description: 'Edit lead details' },
  { name: 'lead.delete', module: 'LEAD', action: 'DELETE', description: 'Delete leads' },
  { name: 'lead.assign', module: 'LEAD', action: 'ASSIGN', description: 'Assign leads to staff' },
  { name: 'lead.export', module: 'LEAD', action: 'EXPORT', description: 'Export lead data' },

  // Service management permissions
  { name: 'service.view', module: 'SERVICE', action: 'VIEW', description: 'View services' },
  { name: 'service.create', module: 'SERVICE', action: 'CREATE', description: 'Create new services' },
  { name: 'service.edit', module: 'SERVICE', action: 'EDIT', description: 'Edit service details' },
  { name: 'service.delete', module: 'SERVICE', action: 'DELETE', description: 'Delete services' },
  { name: 'service.approve', module: 'SERVICE', action: 'APPROVE', description: 'Approve service completions' },

  // Quotation management permissions
  { name: 'quotation.view', module: 'QUOTATION', action: 'VIEW', description: 'View quotations' },
  { name: 'quotation.create', module: 'QUOTATION', action: 'CREATE', description: 'Create new quotations' },
  { name: 'quotation.edit', module: 'QUOTATION', action: 'EDIT', description: 'Edit quotation details' },
  { name: 'quotation.delete', module: 'QUOTATION', action: 'DELETE', description: 'Delete quotations' },
  { name: 'quotation.approve', module: 'QUOTATION', action: 'APPROVE', description: 'Approve quotations' },
  { name: 'quotation.export', module: 'QUOTATION', action: 'EXPORT', description: 'Export quotation data' },

  // Inventory management permissions
  { name: 'inventory.view', module: 'INVENTORY', action: 'VIEW', description: 'View inventory items' },
  { name: 'inventory.create', module: 'INVENTORY', action: 'CREATE', description: 'Create new inventory items' },
  { name: 'inventory.edit', module: 'INVENTORY', action: 'EDIT', description: 'Edit inventory items' },
  { name: 'inventory.delete', module: 'INVENTORY', action: 'DELETE', description: 'Delete inventory items' },
  { name: 'inventory.transfer', module: 'INVENTORY', action: 'TRANSFER', description: 'Transfer inventory between branches' },
  { name: 'inventory.approve', module: 'INVENTORY', action: 'APPROVE', description: 'Approve inventory transactions' },

  // Material management permissions
  { name: 'material.view', module: 'MATERIAL', action: 'VIEW', description: 'View material batches and stock' },
  { name: 'material.receive', module: 'MATERIAL', action: 'RECEIVE', description: 'Receive materials' },
  { name: 'material.issue', module: 'MATERIAL', action: 'ISSUE', description: 'Issue materials' },
  { name: 'material.return', module: 'MATERIAL', action: 'RETURN', description: 'Return materials' },
  { name: 'material.consume', module: 'MATERIAL', action: 'CONSUME', description: 'Consume materials for services' },
  { name: 'material.approve', module: 'MATERIAL', action: 'APPROVE', description: 'Approve material transactions' },

  // Financial management permissions
  { name: 'financial.view', module: 'FINANCIAL', action: 'VIEW', description: 'View financial reports' },
  { name: 'financial.export', module: 'FINANCIAL', action: 'EXPORT', description: 'Export financial data' },
  { name: 'financial.approve', module: 'FINANCIAL', action: 'APPROVE', description: 'Approve financial transactions' },

  // Reports permissions
  { name: 'reports.view', module: 'REPORTS', action: 'VIEW', description: 'View reports' },
  { name: 'reports.export', module: 'REPORTS', action: 'EXPORT', description: 'Export reports' },
  { name: 'reports.create', module: 'REPORTS', action: 'CREATE', description: 'Create custom reports' },

  // System administration permissions
  { name: 'system.view', module: 'SYSTEM', action: 'VIEW', description: 'View system settings' },
  { name: 'system.edit', module: 'SYSTEM', action: 'EDIT', description: 'Edit system settings' },
  { name: 'system.backup', module: 'SYSTEM', action: 'BACKUP', description: 'Create system backups' },
  { name: 'system.restore', module: 'SYSTEM', action: 'RESTORE', description: 'Restore system from backup' },

  // Role management permissions
  { name: 'role.view', module: 'ROLE', action: 'VIEW', description: 'View roles and permissions' },
  { name: 'role.edit', module: 'ROLE', action: 'EDIT', description: 'Edit role permissions' },
  { name: 'role.create', module: 'ROLE', action: 'CREATE', description: 'Create custom roles' },
  { name: 'role.delete', module: 'ROLE', action: 'DELETE', description: 'Delete custom roles' }
];

// Default role permissions mapping
const defaultRolePermissions = {
  SUPERADMIN: [
    // Superadmin gets all permissions
    ...defaultPermissions.map(p => p.name)
  ],
  ADMIN: [
    // Dashboard
    'dashboard.view', 'dashboard.export',
    // Company
    'company.view', 'company.edit',
    // Branch management
    'branch.view', 'branch.create', 'branch.edit', 'branch.delete',
    // Staff management
    'staff.view', 'staff.create', 'staff.edit', 'staff.delete', 'staff.approve',
    // Lead management
    'lead.view', 'lead.create', 'lead.edit', 'lead.delete', 'lead.assign', 'lead.export',
    // Service management
    'service.view', 'service.create', 'service.edit', 'service.delete', 'service.approve',
    // Quotation management
    'quotation.view', 'quotation.create', 'quotation.edit', 'quotation.delete', 'quotation.approve', 'quotation.export',
    // Inventory management
    'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete', 'inventory.transfer', 'inventory.approve',
    // Material management
    'material.view', 'material.receive', 'material.issue', 'material.return', 'material.approve',
    // Financial
    'financial.view', 'financial.export', 'financial.approve',
    // Reports
    'reports.view', 'reports.export', 'reports.create'
  ],
  REGIONAL_MANAGER: [
    // Dashboard
    'dashboard.view', 'dashboard.export',
    // Company
    'company.view',
    // Branch
    'branch.view',
    // Staff management (limited)
    'staff.view', 'staff.create', 'staff.edit',
    // Lead management
    'lead.view', 'lead.create', 'lead.edit', 'lead.assign', 'lead.export',
    // Service management
    'service.view', 'service.create', 'service.edit', 'service.approve',
    // Quotation management
    'quotation.view', 'quotation.create', 'quotation.edit', 'quotation.approve', 'quotation.export',
    // Inventory
    'inventory.view', 'inventory.transfer', 'inventory.approve',
    // Material management
    'material.view', 'material.receive', 'material.issue', 'material.return', 'material.approve',
    // Reports
    'reports.view', 'reports.export', 'reports.create'
  ],
  AREA_MANAGER: [
    // Dashboard
    'dashboard.view',
    // Company
    'company.view',
    // Branch
    'branch.view',
    // Staff
    'staff.view',
    // Lead management
    'lead.view', 'lead.create', 'lead.edit', 'lead.assign',
    // Service management
    'service.view', 'service.create', 'service.edit',
    // Quotation management
    'quotation.view', 'quotation.create', 'quotation.edit',
    // Inventory
    'inventory.view',
    // Material management
    'material.view', 'material.issue', 'material.return',
    // Reports
    'reports.view', 'reports.export'
  ],
  TECHNICIAN: [
    // Dashboard
    'dashboard.view',
    // Lead
    'lead.view',
    // Service management
    'service.view', 'service.edit',
    // Quotation
    'quotation.view',
    // Material consumption
    'material.view', 'material.consume',
    // Reports
    'reports.view'
  ]
};

async function seedPermissions() {
  try {
    console.log('🌱 Starting permissions seeding...');

    // Create permissions
    console.log('📋 Creating permissions...');
    for (const permission of defaultPermissions) {
      await prisma.permission.upsert({
        where: {
          name: permission.name
        },
        update: {
          module: permission.module,
          action: permission.action,
          description: permission.description
        },
        create: permission
      });
    }
    console.log(`✅ Created ${defaultPermissions.length} permissions`);

    // Create role permissions
    console.log('🔐 Assigning permissions to roles...');
    for (const [role, permissions] of Object.entries(defaultRolePermissions)) {
      // Delete existing role permissions
      await prisma.rolePermission.deleteMany({
        where: { role }
      });

      // Create new role permissions
      for (const perm of permissions) {
        const permission = await prisma.permission.findFirst({
          where: {
            name: perm
          }
        });

        if (permission) {
          await prisma.rolePermission.create({
            data: {
              role,
              permission_id: permission.id
            }
          });
        }
      }
      console.log(`✅ Assigned ${permissions.length} permissions to ${role}`);
    }

    console.log('🎉 Permissions seeding completed successfully!');
    
    // Summary
    const totalPermissions = await prisma.permission.count();
    const totalRolePermissions = await prisma.rolePermission.count();
    
    console.log('\n📊 Summary:');
    console.log(`   Total Permissions: ${totalPermissions}`);
    console.log(`   Total Role Permissions: ${totalRolePermissions}`);
    
    // Show role permission counts
    for (const role of Object.keys(defaultRolePermissions)) {
      const count = await prisma.rolePermission.count({
        where: { role }
      });
      console.log(`   ${role}: ${count} permissions`);
    }

  } catch (error) {
    console.error('❌ Error seeding permissions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
if (require.main === module) {
  seedPermissions()
    .then(() => {
      console.log('✅ Permissions seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Permissions seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedPermissions, defaultPermissions, defaultRolePermissions };