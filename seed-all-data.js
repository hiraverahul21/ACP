const { PrismaClient } = require('@prisma/client');
const { seedComprehensiveData } = require('./seed-comprehensive-data');
const { seedInventoryData } = require('./seed-inventory-data');
const { seedTransactionsData } = require('./seed-transactions-data');

const prisma = new PrismaClient();

async function clearAllData() {
  console.log('🧹 Clearing existing data...');
  
  try {
    // Clear in reverse dependency order
    await prisma.materialConsumptionItem.deleteMany();
    await prisma.materialConsumption.deleteMany();
    await prisma.service.deleteMany();
    await prisma.leadService.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.materialTransferItem.deleteMany();
    await prisma.materialTransfer.deleteMany();
    await prisma.materialReturnItem.deleteMany();
    await prisma.materialReturn.deleteMany();
    await prisma.materialIssueItem.deleteMany();
    await prisma.materialIssue.deleteMany();
    await prisma.materialReceiptItem.deleteMany();
    await prisma.materialReceipt.deleteMany();
    await prisma.stockLedger.deleteMany();
    await prisma.materialBatch.deleteMany();
    await prisma.uomConversion.deleteMany();
    await prisma.item.deleteMany();
    await prisma.password_reset_tokens.deleteMany();
    await prisma.otp_verifications.deleteMany();
    await prisma.staff.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.company.deleteMany();
    
    console.log('✅ All existing data cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw error;
  }
}

async function seedAllData() {
  console.log('🚀 Starting comprehensive database seeding...');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Clear existing data
    await clearAllData();
    console.log();
    
    // Step 2: Seed basic company, branch, and staff data
    console.log('📋 Step 1: Seeding companies, branches, and staff...');
    const basicData = await seedComprehensiveData();
    console.log('✅ Basic data seeded successfully!');
    console.log();
    
    // Step 3: Seed inventory data
    console.log('📦 Step 2: Seeding inventory items, batches, and stock...');
    const inventoryData = await seedInventoryData();
    console.log('✅ Inventory data seeded successfully!');
    console.log();
    
    // Step 4: Seed transaction data
    console.log('💼 Step 3: Seeding material transactions and workflows...');
    const transactionData = await seedTransactionsData();
    console.log('✅ Transaction data seeded successfully!');
    console.log();
    
    // Summary
    console.log('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(60));
    console.log('📊 SUMMARY:');
    console.log(`👥 Companies: ${basicData.companies.length}`);
    console.log(`🏢 Branches: ${basicData.branches.length}`);
    console.log(`👤 Staff Members: ${basicData.staff.length}`);
    console.log(`📦 Inventory Items: ${inventoryData.items.length}`);
    console.log(`🏷️  Material Batches: ${inventoryData.batches.length}`);
    console.log(`📥 Material Receipts: ${transactionData.receipts.length}`);
    console.log(`📤 Material Issues: ${transactionData.issues.length}`);
    console.log(`🔙 Material Returns: ${transactionData.returns.length}`);
    console.log(`🔄 Material Transfers: ${transactionData.transfers.length}`);
    console.log(`🎯 Leads: ${transactionData.leads.length}`);
    console.log(`🔧 Services: ${transactionData.services.length}`);
    console.log(`⚡ Material Consumptions: ${transactionData.consumptions.length}`);
    console.log('=' .repeat(60));
    
    // Login credentials summary
    console.log('🔐 LOGIN CREDENTIALS:');
    console.log('Superadmin: superadmin@pestcontrol.com / password123');
    console.log('Admin: admin@pestcontrol.com / password123');
    console.log('Inventory Manager: inventory@pestcontrol.com / password123');
    console.log('Supervisor: supervisor@pestcontrol.com / password123');
    console.log('Technician 1: tech1@pestcontrol.com / password123');
    console.log('Technician 2: tech2@pestcontrol.com / password123');
    console.log('=' .repeat(60));
    
    return {
      basicData,
      inventoryData,
      transactionData
    };
    
  } catch (error) {
    console.error('💥 Database seeding failed:', error);
    throw error;
  }
}

if (require.main === module) {
  seedAllData()
    .then(() => {
      console.log('🎊 All data seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Data seeding failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { seedAllData, clearAllData };