const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedTransactionsData() {
  console.log('🔄 Starting transactions data seeding...');

  try {
    // Get existing data
    const companies = await prisma.company.findMany();
    const branches = await prisma.branch.findMany();
    const staff = await prisma.staff.findMany();
    const items = await prisma.item.findMany();
    const batches = await prisma.materialBatch.findMany();

    if (companies.length === 0 || branches.length === 0 || staff.length === 0 || items.length === 0) {
      throw new Error('Please run basic data and inventory seeding first!');
    }

    const company1 = companies[0];
    const mainBranch = branches.find(b => b.branch_type === 'MAIN_BRANCH' && b.company_id === company1.id);
    const generalBranches = branches.filter(b => b.branch_type === 'GENERAL_BRANCH' && b.company_id === company1.id);
    
    const superadmin = staff.find(s => s.role === 'SUPERADMIN');
    const admin = staff.find(s => s.role === 'ADMIN');
    const inventoryManager = staff.find(s => s.role === 'INVENTORY_MANAGER');
    const supervisor = staff.find(s => s.role === 'SUPERVISOR');
    const technicians = staff.filter(s => s.role === 'TECHNICIAN');

    if (!superadmin || !admin || !inventoryManager || !supervisor || technicians.length < 2) {
      throw new Error('Required staff roles not found. Please ensure all roles are created.');
    }

    if (generalBranches.length < 2) {
      throw new Error('At least 2 general branches are required for transactions.');
    }

    // 1. Create Material Receipts
    console.log('📥 Creating material receipts...');
    const receipts = await Promise.all([
      prisma.materialReceipt.create({
        data: {
          id: 'receipt-001',
          receipt_no: 'RCP-2024-001',
          receipt_date: new Date('2024-01-15'),
          vendor_name: 'ChemCorp Industries',
          vendor_invoice_no: 'CC-INV-2024-001',
          vendor_invoice_date: new Date('2024-01-10'),
          to_location_type: 'BRANCH',
          to_location_id: mainBranch.id,
          total_amount: 45000.00,
          gst_amount: 8100.00,
          net_amount: 53100.00,
          status: 'APPROVED',
          created_by: inventoryManager.id,
          approved_by: admin.id
        }
      }),
      prisma.materialReceipt.create({
        data: {
          id: 'receipt-002',
          receipt_no: 'RCP-2024-002',
          receipt_date: new Date('2024-02-01'),
          vendor_name: 'Safety Equipment Ltd',
          vendor_invoice_no: 'SEL-INV-2024-001',
          vendor_invoice_date: new Date('2024-01-28'),
          to_location_type: 'BRANCH',
          to_location_id: mainBranch.id,
          total_amount: 5000.00,
          gst_amount: 600.00,
          net_amount: 5600.00,
          status: 'APPROVED',
          created_by: inventoryManager.id,
          approved_by: admin.id
        }
      })
    ]);

    // 2. Create Material Issues
    console.log('📤 Creating material issues...');
    const issues = await Promise.all([
      // Approved issue from main branch to general branch
      prisma.materialIssue.create({
        data: {
          id: 'issue-001',
          issue_no: 'ISS-2024-001',
          issue_date: new Date('2024-02-15'),
          from_location_type: 'BRANCH',
          from_location_id: mainBranch.id,
          to_location_type: 'BRANCH',
          to_location_id: generalBranches[0].id,
          purpose: 'Branch stock replenishment',
          remarks: 'Monthly stock transfer to Delhi branch',
          status: 'APPROVED',
          created_by: inventoryManager.id,
          approved_by: admin.id,
          approval_date: new Date('2024-02-16')
        }
      }),
      // Approved issue from main branch to general branch
      prisma.materialIssue.create({
        data: {
          id: 'issue-002',
          issue_no: 'ISS-2024-002',
          issue_date: new Date('2024-03-01'),
          from_location_type: 'BRANCH',
          from_location_id: mainBranch.id,
          to_location_type: 'BRANCH',
          to_location_id: generalBranches[1].id,
          purpose: 'Branch stock replenishment',
          remarks: 'Materials for Noida branch operations',
          status: 'APPROVED',
          created_by: inventoryManager.id,
          approved_by: admin.id,
          approval_date: new Date('2024-03-02')
        }
      }),
      // Pending issue awaiting approval
      prisma.materialIssue.create({
        data: {
          id: 'issue-003',
          issue_no: 'ISS-2024-003',
          issue_date: new Date('2024-03-15'),
          from_location_type: 'BRANCH',
          from_location_id: generalBranches[0].id,
          to_location_type: 'BRANCH',
          to_location_id: generalBranches[1].id,
          purpose: 'Emergency stock transfer',
          remarks: 'Urgent requirement for commercial client',
          status: 'AWAITING_APPROVAL',
          created_by: supervisor.id
        }
      }),
      // Rejected issue
      prisma.materialIssue.create({
        data: {
          id: 'issue-004',
          issue_no: 'ISS-2024-004',
          issue_date: new Date('2024-03-10'),
          from_location_type: 'BRANCH',
          from_location_id: mainBranch.id,
          to_location_type: 'BRANCH',
          to_location_id: generalBranches[1].id,
          purpose: 'Stock transfer',
          remarks: 'Transfer to Noida branch',
          status: 'REJECTED',
          created_by: inventoryManager.id,
          approved_by: admin.id,
          approval_date: new Date('2024-03-11'),
          rejection_reason: 'Insufficient stock available'
        }
      })
    ]);

    // 3. Create Material Issue Items
    console.log('📋 Creating material issue items...');
    const issueItems = await Promise.all([
      // Items for issue-001 (approved)
      prisma.materialIssueItem.create({
        data: {
          issue_id: issues[0].id,
          item_id: items[0].id, // Cypermethrin
          batch_id: batches[0].id,
          quantity: 10.0,
          uom: 'Litre',
          rate_per_unit: 450.00,
          total_amount: 4500.00
        }
      }),
      prisma.materialIssueItem.create({
        data: {
          issue_id: issues[0].id,
          item_id: items[1].id, // Imidacloprid
          batch_id: batches[2].id,
          quantity: 5.0,
          uom: 'Litre',
          rate_per_unit: 520.00,
          total_amount: 2600.00
        }
      }),
      // Items for issue-002 (approved)
      prisma.materialIssueItem.create({
        data: {
          issue_id: issues[1].id,
          item_id: items[1].id, // Imidacloprid
          batch_id: batches[2].id,
          quantity: 8.0,
          uom: 'Litre',
          rate_per_unit: 520.00,
          total_amount: 4160.00
        }
      }),
      prisma.materialIssueItem.create({
        data: {
          issue_id: issues[1].id,
          item_id: items[3].id, // Bromadiolone
          batch_id: batches[4].id,
          quantity: 5.0,
          uom: 'Kg',
          rate_per_unit: 320.00,
          total_amount: 1600.00
        }
      }),
      // Items for issue-003 (pending)
      prisma.materialIssueItem.create({
        data: {
          issue_id: issues[2].id,
          item_id: items[2].id, // Fipronil
          batch_id: batches[3].id,
          quantity: 3.0,
          uom: 'Litre',
          rate_per_unit: 680.00,
          total_amount: 2040.00
        }
      }),
      // Items for issue-004 (rejected)
      prisma.materialIssueItem.create({
        data: {
          issue_id: issues[3].id,
          item_id: items[0].id, // Cypermethrin
          batch_id: batches[0].id,
          quantity: 50.0,
          uom: 'Litre',
          rate_per_unit: 450.00,
          total_amount: 22500.00
        }
      })
    ]);

    // 4. Create Material Returns
    console.log('🔙 Creating material returns...');
    const returns = await Promise.all([
      prisma.materialReturn.create({
        data: {
          id: 'return-001',
          return_no: 'RET-2024-001',
          return_date: new Date('2024-03-20'),
          from_location_type: 'BRANCH',
          from_location_id: generalBranches[1].id,
          to_location_type: 'BRANCH',
          to_location_id: mainBranch.id,
          reason: 'Excess stock return to main branch',
          status: 'APPROVED',
          created_by: inventoryManager.id,
          approved_by: admin.id
        }
      })
    ]);

    // 5. Create Material Transfers
    console.log('🔄 Creating material transfers...');
    const transfers = await Promise.all([
      prisma.materialTransfer.create({
        data: {
          id: 'transfer-001',
          transfer_no: 'TRF-2024-001',
          transfer_date: new Date('2024-02-20'),
          from_location_type: 'BRANCH',
          from_location_id: generalBranches[0].id,
          to_location_type: 'BRANCH',
          to_location_id: generalBranches[1].id,
          purpose: 'Inter-branch stock balancing',
          status: 'APPROVED',
          created_by: inventoryManager.id,
          approved_by: admin.id
        }
      })
    ]);

    // 6. Create Leads for consumption tracking
    console.log('🎯 Creating sample leads...');
    const leads = await Promise.all([
      prisma.lead.create({
        data: {
          id: 'lead-001',
          customer_name: 'Rajesh Apartments',
          customer_email: 'rajesh@example.com',
          customer_phone: '+91-9876543210',
          address: '123 Sector 15',
          city: 'Gurgaon',
          state: 'Haryana',
          pincode: '122001',
          service_type: 'RESIDENTIAL_PEST_CONTROL',
          property_type: 'APARTMENT',
          property_size: '3BHK',
          urgency_level: 'MEDIUM',
          status: 'CONVERTED',
          assigned_to: technicians[0].id,
          lead_generated_by: admin.id,
          branch_id: generalBranches[0].id,
          company_id: company1.id,
          estimated_cost: 2500.00
        }
      }),
      prisma.lead.create({
        data: {
          id: 'lead-002',
          customer_name: 'Metro Mall Complex',
          customer_email: 'admin@metromall.com',
          customer_phone: '+91-9876543211',
          address: '456 MG Road',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110001',
          service_type: 'COMMERCIAL_PEST_CONTROL',
          property_type: 'OFFICE',
          property_size: '10000 sq ft',
          urgency_level: 'HIGH',
          status: 'CONVERTED',
          assigned_to: technicians[1].id,
          lead_generated_by: admin.id,
          branch_id: generalBranches[1].id,
          company_id: company1.id,
          estimated_cost: 15000.00
        }
      })
    ]);

    // 7. Create Services
    console.log('🔧 Creating services...');
    const services = await Promise.all([
      prisma.service.create({
        data: {
          id: 'service-001',
          lead_id: leads[0].id,
          service_type: 'RESIDENTIAL_PEST_CONTROL',
          service_date: new Date('2024-03-05'),
          technician_id: technicians[0].id,
          status: 'COMPLETED',
          cost: 2500.00,
          payment_status: 'PAID',
          notes: 'General pest control treatment completed successfully'
        }
      }),
      prisma.service.create({
        data: {
          id: 'service-002',
          lead_id: leads[1].id,
          service_type: 'COMMERCIAL_PEST_CONTROL',
          service_date: new Date('2024-03-10'),
          technician_id: technicians[1].id,
          status: 'COMPLETED',
          cost: 15000.00,
          payment_status: 'PAID',
          notes: 'Commercial pest control for shopping mall'
        }
      })
    ]);

    // 8. Create Material Consumptions
    console.log('⚡ Creating material consumptions...');
    const consumptions = await Promise.all([
      prisma.materialConsumption.create({
        data: {
          id: 'consumption-001',
          consumption_no: 'CON-2024-001',
          consumption_date: new Date('2024-03-05'),
          technician_id: technicians[0].id,
          service_id: services[0].id,
          lead_id: leads[0].id,
          customer_name: 'Rajesh Apartments',
          job_description: 'Residential pest control treatment',
          status: 'COMPLETED',
          created_by: technicians[0].id
        }
      }),
      prisma.materialConsumption.create({
        data: {
          id: 'consumption-002',
          consumption_no: 'CON-2024-002',
          consumption_date: new Date('2024-03-10'),
          technician_id: technicians[1].id,
          service_id: services[1].id,
          lead_id: leads[1].id,
          customer_name: 'Metro Mall Complex',
          job_description: 'Commercial pest control treatment',
          status: 'COMPLETED',
          created_by: technicians[1].id
        }
      })
    ]);

    // 9. Create Material Consumption Items
    console.log('📊 Creating material consumption items...');
    const consumptionItems = await Promise.all([
      // Consumption for service-001
      prisma.materialConsumptionItem.create({
        data: {
          consumption_id: consumptions[0].id,
          item_id: items[0].id, // Cypermethrin
          batch_id: batches[1].id,
          quantity: 0.5,
          uom: 'Litre',
          rate_per_unit: 460.00,
          total_amount: 230.00
        }
      }),
      prisma.materialConsumptionItem.create({
        data: {
          consumption_id: consumptions[0].id,
          item_id: items[7].id, // N95 Masks
          batch_id: batches[6].id,
          quantity: 2.0,
          uom: 'Pcs',
          rate_per_unit: 25.00,
          total_amount: 50.00
        }
      }),
      // Consumption for service-002
      prisma.materialConsumptionItem.create({
        data: {
          consumption_id: consumptions[1].id,
          item_id: items[1].id, // Imidacloprid
          batch_id: batches[2].id,
          quantity: 2.0,
          uom: 'Litre',
          rate_per_unit: 520.00,
          total_amount: 1040.00
        }
      }),
      prisma.materialConsumptionItem.create({
        data: {
          consumption_id: consumptions[1].id,
          item_id: items[3].id, // Bromadiolone
          batch_id: batches[4].id,
          quantity: 1.0,
          uom: 'Kg',
          rate_per_unit: 320.00,
          total_amount: 320.00
        }
      })
    ]);

    console.log('✅ Transactions data seeded successfully!');
    console.log(`Created ${receipts.length} material receipts`);
    console.log(`Created ${issues.length} material issues`);
    console.log(`Created ${issueItems.length} material issue items`);
    console.log(`Created ${returns.length} material returns`);
    console.log(`Created ${transfers.length} material transfers`);
    console.log(`Created ${leads.length} leads`);
    console.log(`Created ${services.length} services`);
    console.log(`Created ${consumptions.length} material consumptions`);
    console.log(`Created ${consumptionItems.length} consumption items`);

    return {
      receipts,
      issues,
      issueItems,
      returns,
      transfers,
      leads,
      services,
      consumptions,
      consumptionItems
    };

  } catch (error) {
    console.error('❌ Error seeding transactions data:', error);
    throw error;
  }
}

if (require.main === module) {
  seedTransactionsData()
    .then(() => {
      console.log('🎉 Transactions data seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Transactions data seeding failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { seedTransactionsData };