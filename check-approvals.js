const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkApprovals() {
  try {
    const approvals = await prisma.materialApproval.findMany({
      include: {
        issue: {
          include: {
            from_branch: { select: { name: true, city: true } },
            created_by_staff: { select: { name: true, email: true } }
          }
        }
      }
    });
    
    console.log('Current material approvals:', approvals.length);
    approvals.forEach((approval, index) => {
      console.log(`\n${index + 1}. Approval ID: ${approval.id}`);
      console.log(`   Status: ${approval.status}`);
      console.log(`   Assigned to: ${approval.assigned_to_type} (${approval.assigned_to_id})`);
      console.log(`   Issue: ${approval.issue.issue_no}`);
      console.log(`   From: ${approval.issue.from_branch.name}, ${approval.issue.from_branch.city}`);
      console.log(`   Created by: ${approval.issue.created_by_staff.name}`);
    });
    
    // Also check branches and users for testing
    const branches = await prisma.branch.findMany({
      select: { id: true, name: true, city: true, branch_type: true }
    });
    
    console.log('\n\nAvailable branches:');
    branches.forEach(branch => {
      console.log(`- ${branch.name} (${branch.city}) - Type: ${branch.branch_type} - ID: ${branch.id}`);
    });
    
    const users = await prisma.staff.findMany({
      where: {
        role: { in: ['ADMIN', 'INVENTORY_MANAGER'] }
      },
      select: { id: true, name: true, email: true, role: true, branch_id: true }
    });
    
    console.log('\n\nAdmin and Inventory Manager users:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role} - Branch: ${user.branch_id}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkApprovals();