const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestBranchTobranchIssue() {
  try {
    // Get branches for testing
    const branches = await prisma.branch.findMany({
      where: { branch_type: 'GENERAL_BRANCH' },
      take: 2
    });
    
    if (branches.length < 2) {
      console.log('Need at least 2 general branches for testing');
      return;
    }
    
    const fromBranch = branches[0];
    const toBranch = branches[1];
    
    console.log(`Creating test issue from ${fromBranch.name} to ${toBranch.name}`);
    
    // Get any user to create the issue (we'll use any available admin/inventory manager)
    const sourceUser = await prisma.staff.findFirst({
      where: {
        role: { in: ['INVENTORY_MANAGER', 'ADMIN'] }
      }
    });
    
    if (!sourceUser) {
      console.log('No suitable user found');
      return;
    }
    
    console.log(`Using user: ${sourceUser.name} (${sourceUser.role})`);
    
    // Get any item and batch for testing (simplified)
    const batch = await prisma.materialBatch.findFirst({
      where: {
        current_qty: { gt: 0 }
      },
      include: {
        item: true
      }
    });
    
    if (!batch) {
      console.log('No suitable batch found for testing');
      return;
    }
    
    const item = batch.item;
    
    // Create the material issue
    const issue = await prisma.materialIssue.create({
      data: {
        issue_no: `TEST-${Date.now()}`,
        issue_date: new Date(),
        from_location_type: 'BRANCH',
        from_location_id: fromBranch.id,
        to_location_type: 'BRANCH',
        to_location_id: toBranch.id,
        purpose: 'Test branch-to-branch transfer for approval workflow',
        remarks: 'Testing ADMIN and INVENTORY_MANAGER approval permissions',
        status: 'AWAITING_APPROVAL',
        created_by: sourceUser.id,
        issue_items: {
          create: [{
            item_id: item.id,
            batch_id: batch.id,
            quantity: 1.0,
            uom: item.base_uom,
            rate_per_unit: batch.rate_per_unit,
            base_amount: batch.rate_per_unit,
            gst_amount: 0,
            total_amount: batch.rate_per_unit
          }]
        }
      },
      include: {
        issue_items: true
      }
    });
    
    // Create the approval record
    const approval = await prisma.materialApproval.create({
      data: {
        issue_id: issue.id,
        assigned_to_type: 'BRANCH',
        assigned_to_id: toBranch.id,
        status: 'PENDING',
        approval_items: {
          create: issue.issue_items.map(issueItem => ({
            issue_item_id: issueItem.id,
            original_quantity: issueItem.quantity,
            original_uom: issueItem.uom,
            original_base_amount: issueItem.base_amount,
            original_gst_amount: issueItem.gst_amount,
            original_total_amount: issueItem.total_amount,
            status: 'PENDING'
          }))
        }
      }
    });
    
    console.log(`\n✅ Test material issue created:`);
    console.log(`   Issue ID: ${issue.id}`);
    console.log(`   Issue No: ${issue.issue_no}`);
    console.log(`   From: ${fromBranch.name} (${fromBranch.id})`);
    console.log(`   To: ${toBranch.name} (${toBranch.id})`);
    console.log(`   Approval ID: ${approval.id}`);
    console.log(`   Status: ${approval.status}`);
    
    // Show who can approve this
    const destinationUsers = await prisma.staff.findMany({
      where: {
        branch_id: toBranch.id,
        role: { in: ['ADMIN', 'INVENTORY_MANAGER'] }
      },
      select: { id: true, name: true, email: true, role: true }
    });
    
    console.log(`\n👥 Users who can approve this issue:`);
    destinationUsers.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
    });
    
    return { issue, approval, destinationUsers };
    
  } catch (error) {
    console.error('Error creating test issue:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestBranchTobranchIssue();