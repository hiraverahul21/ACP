const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedInventoryData() {
  console.log('📦 Starting inventory data seeding...');

  try {
    // Get existing companies and branches
    const companies = await prisma.company.findMany();
    const branches = await prisma.branch.findMany();
    const staff = await prisma.staff.findMany();

    if (companies.length === 0 || branches.length === 0 || staff.length === 0) {
      throw new Error('Please run basic data seeding first!');
    }

    const company1 = companies[0];
    const mainBranch = branches.find(b => b.branch_type === 'MAIN_BRANCH' && b.company_id === company1.id);
    const generalBranches = branches.filter(b => b.branch_type === 'GENERAL_BRANCH' && b.company_id === company1.id);
    const inventoryManager = staff.find(s => s.role === 'INVENTORY_MANAGER');
    const superadmin = staff.find(s => s.role === 'SUPERADMIN');

    // 1. Create Items
    console.log('🧪 Creating inventory items...');
    const items = await Promise.all([
      // Pesticides
      prisma.item.create({
        data: {
          id: 'item-cypermethrin',
          name: 'Cypermethrin 10% EC',
          category: 'Pesticides',
          base_uom: 'Litre',
          gst_percentage: 18.00,
          hsn_code: '38089100',
          description: 'Synthetic pyrethroid insecticide for general pest control',
          company_id: company1.id
        }
      }),
      prisma.item.create({
        data: {
          id: 'item-imidacloprid',
          name: 'Imidacloprid 17.8% SL',
          category: 'Pesticides',
          base_uom: 'Litre',
          gst_percentage: 18.00,
          hsn_code: '38089100',
          description: 'Systemic insecticide for termite and cockroach control',
          company_id: company1.id
        }
      }),
      prisma.item.create({
        data: {
          id: 'item-fipronil',
          name: 'Fipronil 5% SC',
          category: 'Pesticides',
          base_uom: 'Litre',
          gst_percentage: 18.00,
          hsn_code: '38089100',
          description: 'Broad spectrum insecticide for ant and termite control',
          company_id: company1.id
        }
      }),
      // Rodenticides
      prisma.item.create({
        data: {
          id: 'item-bromadiolone',
          name: 'Bromadiolone 0.005% Bait',
          category: 'Rodenticides',
          base_uom: 'Kg',
          gst_percentage: 18.00,
          hsn_code: '38089200',
          description: 'Anticoagulant rodenticide bait for rat control',
          company_id: company1.id
        }
      }),
      prisma.item.create({
        data: {
          id: 'item-zinc-phosphide',
          name: 'Zinc Phosphide 80% DP',
          category: 'Rodenticides',
          base_uom: 'Kg',
          gst_percentage: 18.00,
          hsn_code: '38089200',
          description: 'Acute rodenticide for quick rat control',
          company_id: company1.id
        }
      }),
      // Equipment
      prisma.item.create({
        data: {
          id: 'item-sprayer-manual',
          name: 'Manual Hand Sprayer 16L',
          category: 'Equipment',
          base_uom: 'Pcs',
          gst_percentage: 18.00,
          hsn_code: '84248900',
          description: 'Manual knapsack sprayer for pesticide application',
          company_id: company1.id
        }
      }),
      prisma.item.create({
        data: {
          id: 'item-sprayer-electric',
          name: 'Electric Sprayer 12V',
          category: 'Equipment',
          base_uom: 'Pcs',
          gst_percentage: 18.00,
          hsn_code: '84248900',
          description: 'Battery operated sprayer for efficient application',
          company_id: company1.id
        }
      }),
      // Safety Equipment
      prisma.item.create({
        data: {
          id: 'item-mask-n95',
          name: 'N95 Respiratory Mask',
          category: 'Safety Equipment',
          base_uom: 'Pcs',
          gst_percentage: 12.00,
          hsn_code: '63079000',
          description: 'Personal protective equipment for technicians',
          company_id: company1.id
        }
      }),
      prisma.item.create({
        data: {
          id: 'item-gloves-nitrile',
          name: 'Nitrile Gloves',
          category: 'Safety Equipment',
          base_uom: 'Pair',
          gst_percentage: 12.00,
          hsn_code: '40151900',
          description: 'Chemical resistant gloves for safety',
          company_id: company1.id
        }
      }),
      // Consumables
      prisma.item.create({
        data: {
          id: 'item-bait-station',
          name: 'Plastic Bait Station',
          category: 'Consumables',
          base_uom: 'Pcs',
          gst_percentage: 18.00,
          hsn_code: '39269099',
          description: 'Tamper-resistant bait station for rodent control',
          company_id: company1.id
        }
      })
    ]);

    // 2. Create UOM Conversions
    console.log('📏 Creating UOM conversions...');
    const uomConversions = await Promise.all([
      // Litre to ML conversions
      prisma.uomConversion.create({
        data: {
          item_id: items[0].id, // Cypermethrin
          from_uom: 'Litre',
          to_uom: 'ML',
          conversion_factor: 1000
        }
      }),
      prisma.uomConversion.create({
        data: {
          item_id: items[1].id, // Imidacloprid
          from_uom: 'Litre',
          to_uom: 'ML',
          conversion_factor: 1000
        }
      }),
      // Kg to Gram conversions
      prisma.uomConversion.create({
        data: {
          item_id: items[3].id, // Bromadiolone
          from_uom: 'Kg',
          to_uom: 'Gram',
          conversion_factor: 1000
        }
      })
    ]);

    // 3. Create Material Batches with stock
    console.log('📋 Creating material batches...');
    const batches = await Promise.all([
      // Cypermethrin batches
      prisma.materialBatch.create({
        data: {
          id: 'batch-cyper-001',
          item_id: items[0].id,
          batch_no: 'CYP-2024-001',
          mfg_date: new Date('2024-01-15'),
          expiry_date: new Date('2026-01-15'),
          initial_qty: 100.0,
          current_qty: 85.5,
          rate_per_unit: 450.00,
          gst_percentage: 18.00,
          location_type: 'BRANCH',
          location_id: mainBranch.id
        }
      }),
      prisma.materialBatch.create({
        data: {
          id: 'batch-cyper-002',
          item_id: items[0].id,
          batch_no: 'CYP-2024-002',
          mfg_date: new Date('2024-03-10'),
          expiry_date: new Date('2026-03-10'),
          initial_qty: 50.0,
          current_qty: 30.0,
          rate_per_unit: 460.00,
          gst_percentage: 18.00,
          location_type: 'BRANCH',
          location_id: generalBranches[0].id
        }
      }),
      // Imidacloprid batches
      prisma.materialBatch.create({
        data: {
          id: 'batch-imida-001',
          item_id: items[1].id,
          batch_no: 'IMI-2024-001',
          mfg_date: new Date('2024-02-01'),
          expiry_date: new Date('2026-02-01'),
          initial_qty: 75.0,
          current_qty: 60.0,
          rate_per_unit: 520.00,
          gst_percentage: 18.00,
          location_type: 'BRANCH',
          location_id: mainBranch.id
        }
      }),
      // Fipronil batches
      prisma.materialBatch.create({
        data: {
          id: 'batch-fipro-001',
          item_id: items[2].id,
          batch_no: 'FIP-2024-001',
          mfg_date: new Date('2024-01-20'),
          expiry_date: new Date('2025-01-20'),
          initial_qty: 40.0,
          current_qty: 25.0,
          rate_per_unit: 680.00,
          gst_percentage: 18.00,
          location_type: 'BRANCH',
          location_id: mainBranch.id
        }
      }),
      // Bromadiolone batches
      prisma.materialBatch.create({
        data: {
          id: 'batch-broma-001',
          item_id: items[3].id,
          batch_no: 'BRO-2024-001',
          mfg_date: new Date('2024-01-10'),
          expiry_date: new Date('2025-01-10'),
          initial_qty: 25.0,
          current_qty: 18.5,
          rate_per_unit: 320.00,
          gst_percentage: 18.00,
          location_type: 'BRANCH',
          location_id: mainBranch.id
        }
      }),
      // Equipment batches
      prisma.materialBatch.create({
        data: {
          id: 'batch-sprayer-001',
          item_id: items[5].id,
          batch_no: 'SPR-2024-001',
          mfg_date: new Date('2024-01-05'),
          expiry_date: null,
          initial_qty: 10.0,
          current_qty: 7.0,
          rate_per_unit: 1200.00,
          gst_percentage: 18.00,
          location_type: 'BRANCH',
          location_id: mainBranch.id
        }
      }),
      // Safety equipment batches
      prisma.materialBatch.create({
        data: {
          id: 'batch-mask-001',
          item_id: items[7].id,
          batch_no: 'MSK-2024-001',
          mfg_date: new Date('2024-02-01'),
          expiry_date: new Date('2027-02-01'),
          initial_qty: 100.0,
          current_qty: 75.0,
          rate_per_unit: 25.00,
          gst_percentage: 12.00,
          location_type: 'BRANCH',
          location_id: mainBranch.id
        }
      }),
      prisma.materialBatch.create({
        data: {
          id: 'batch-gloves-001',
          item_id: items[8].id,
          batch_no: 'GLV-2024-001',
          mfg_date: new Date('2024-01-15'),
          expiry_date: new Date('2026-01-15'),
          initial_qty: 200.0,
          current_qty: 150.0,
          rate_per_unit: 15.00,
          gst_percentage: 12.00,
          location_type: 'BRANCH',
          location_id: mainBranch.id
        }
      }),
      // Bait station batches
      prisma.materialBatch.create({
        data: {
          id: 'batch-bait-001',
          item_id: items[9].id,
          batch_no: 'BAI-2024-001',
          mfg_date: new Date('2024-01-01'),
          expiry_date: null,
          initial_qty: 50.0,
          current_qty: 35.0,
          rate_per_unit: 45.00,
          gst_percentage: 18.00,
          location_type: 'BRANCH',
          location_id: mainBranch.id
        }
      })
    ]);

    // 4. Create initial stock ledger entries
    console.log('📊 Creating initial stock ledger entries...');
    const stockEntries = [];
    
    for (const batch of batches) {
      const stockEntry = await prisma.stockLedger.create({
        data: {
          item_id: batch.item_id,
          batch_id: batch.id,
          location_type: batch.location_type,
          location_id: batch.location_id,
          transaction_type: 'RECEIPT',
          transaction_id: 'INITIAL-STOCK',
          transaction_date: new Date('2024-01-01'),
          quantity_in: batch.initial_qty,
          quantity_out: null,
          balance_quantity: batch.current_qty,
          rate_per_unit: batch.rate_per_unit,
          balance_value: batch.current_qty * batch.rate_per_unit,
          created_by: inventoryManager.id,
          user_role: 'INVENTORY_MANAGER',
          reference_no: 'INIT-2024-001',
          notes: 'Initial stock entry for system setup',
          system_generated: true
        }
      });
      stockEntries.push(stockEntry);
    }

    console.log('✅ Inventory data seeded successfully!');
    console.log(`Created ${items.length} items`);
    console.log(`Created ${uomConversions.length} UOM conversions`);
    console.log(`Created ${batches.length} material batches`);
    console.log(`Created ${stockEntries.length} stock ledger entries`);

    return { items, uomConversions, batches, stockEntries };

  } catch (error) {
    console.error('❌ Error seeding inventory data:', error);
    throw error;
  }
}

if (require.main === module) {
  seedInventoryData()
    .then(() => {
      console.log('🎉 Inventory data seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Inventory data seeding failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { seedInventoryData };