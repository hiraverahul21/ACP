const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPartialBatchApprovalLogic() {
  try {
    console.log('🧪 Testing partial batch approval logic...');
    
    // 1. Find existing branches and users
    const branches = await prisma.branch.findMany({
      where: { branch_type: 'GENERAL_BRANCH' },
      take: 2
    });
    
    if (branches.length < 2) {
      console.log('❌ Need at least 2 general branches for testing');
      return;
    }
    
    const sourceBranch = branches[0];
    const destBranch = branches[1];
    
    console.log(`📍 Source: ${sourceBranch.name}`);
    console.log(`📍 Destination: ${destBranch.name}`);
    
    // 2. Find a user who can create issues
    const sourceUser = await prisma.staff.findFirst({
      where: {
        role: { in: ['ADMIN', 'INVENTORY_MANAGER'] },
        is_active: true
      }
    });
    
    if (!sourceUser) {
      console.log('❌ No suitable user found');
      return;
    }
    
    console.log(`👤 User: ${sourceUser.name} (${sourceUser.role})`);
    
    // 3. Find an item with available batch (need at least 10 units for partial testing)
    const batch = await prisma.materialBatch.findFirst({
      where: {
        current_qty: { gte: 10 },
        location_type: 'BRANCH',
        location_id: sourceBranch.id
      },
      include: {
        item: true
      }
    });
    
    if (!batch) {
      console.log('❌ No suitable batch found for testing (need at least 10 units)');
      return;
    }
    
    console.log(`📦 Item: ${batch.item.name}`);
    console.log(`🏷️  Batch: ${batch.batch_no}`);
    console.log(`📊 Available Qty: ${batch.current_qty}`);
    
    // 4. Check if same batch already exists at destination
    const existingDestBatch = await prisma.materialBatch.findFirst({
      where: {
        item_id: batch.item_id,
        batch_no: batch.batch_no,
        location_type: 'BRANCH',
        location_id: destBranch.id
      }
    });
    
    console.log(`\n🔍 Existing batch at destination: ${existingDestBatch ? 'YES' : 'NO'}`);
    if (existingDestBatch) {
      console.log(`   Current quantity: ${existingDestBatch.current_qty}`);
    }
    
    // 5. Create a test material issue with 8 units (will partially approve 5, reject 3)
    const testQty = 8;
    
    console.log(`\n🚀 Creating test material issue for ${testQty} units...`);
    
    const issue = await prisma.materialIssue.create({
      data: {
        issue_no: `PARTIAL-TEST-${Date.now()}`,
        issue_date: new Date(),
        from_location_type: 'BRANCH',
        from_location_id: sourceBranch.id,
        to_location_type: 'BRANCH',
        to_location_id: destBranch.id,
        purpose: 'Testing partial batch approval logic',
        status: 'AWAITING_APPROVAL',
        created_by: sourceUser.id,
        issue_items: {
          create: [{
            item_id: batch.item_id,
            batch_id: batch.id,
            quantity: testQty,
            uom: batch.item.base_uom,
            rate_per_unit: batch.rate_per_unit,
            base_amount: testQty * batch.rate_per_unit,
            gst_amount: (testQty * batch.rate_per_unit * batch.gst_percentage) / 100,
            total_amount: testQty * batch.rate_per_unit * (1 + batch.gst_percentage / 100)
          }]
        }
      },
      include: {
        issue_items: true
      }
    });
    
    // 6. Create approval record
    const approval = await prisma.materialApproval.create({
      data: {
        issue_id: issue.id,
        assigned_to_type: 'BRANCH',
        assigned_to_id: destBranch.id,
        status: 'PENDING',
        approval_items: {
          create: issue.issue_items.map(item => ({
            issue_item_id: item.id,
            original_quantity: item.quantity,
            original_uom: item.uom,
            original_base_amount: item.base_amount,
            original_gst_amount: item.gst_amount,
            original_total_amount: item.total_amount,
            status: 'PENDING'
          }))
        }
      }
    });
    
    console.log(`✅ Created material issue: ${issue.issue_no}`);
    console.log(`✅ Created approval record: ${approval.id}`);
    
    console.log('\n📋 Test Summary:');
    console.log(`   - Issue ID: ${issue.id}`);
    console.log(`   - Approval ID: ${approval.id}`);
    console.log(`   - Item: ${batch.item.name}`);
    console.log(`   - Batch: ${batch.batch_no}`);
    console.log(`   - Total Requested: ${testQty}`);
    console.log(`   - Suggested Partial Approval: 5 units (approve), 3 units (reject)`);
    console.log(`   - Expected behavior: ${existingDestBatch ? 'Add 5 units to existing batch' : 'Create new batch with 5 units'}`);
    
    console.log('\n🎯 Now test the PARTIAL ACCEPTANCE in the UI to verify batch handling!');
    console.log('   - Approve 5 units and reject 3 units to test the logic');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPartialBatchApprovalLogic();