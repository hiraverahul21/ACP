const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seedUrbanPestSolutions() {
  console.log('🌱 Starting Urban Pest Solutions data seeding...');

  try {
    // 1. Create Company
    console.log('📊 Creating Urban Pest Solutions company...');
    const company = await prisma.company.create({
      data: {
        name: 'Urban Pest Solutions',
        email: 'info@urbanpestsolutions.com',
        phone: '+91-9876543210',
        address: '123 Business Park, Sector 18',
        city: 'Gurgaon',
        state: 'Haryana',
        pincode: '122015',
        gst_number: '06ABCDE1234F1Z5',
        pan_number: 'ABCDE1234F',
        is_active: true,
        subscription_plan: 'PREMIUM',
        subscription_expires_at: new Date('2025-12-31')
      }
    });
    console.log(`✅ Company created: ${company.name} (ID: ${company.id})`);

    // 2. Create Branches
    console.log('🏢 Creating branches...');
    const branches = [];
    
    // Main Branch - Gurgaon
    const mainBranch = await prisma.branch.create({
      data: {
        name: 'Urban Pest Solutions - Main Branch',
        address: '123 Business Park, Sector 18',
        city: 'Gurgaon',
        state: 'Haryana',
        pincode: '122015',
        phone: '+91-9876543210',
        email: 'gurgaon@urbanpestsolutions.com',
        branch_type: 'MAIN_BRANCH',
        company_id: company.id
      }
    });
    branches.push(mainBranch);

    // Delhi Branch
    const delhiBranch = await prisma.branch.create({
      data: {
        name: 'Urban Pest Solutions - Delhi',
        address: '456 Commercial Complex, Connaught Place',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
        phone: '+91-9876543211',
        email: 'delhi@urbanpestsolutions.com',
        branch_type: 'GENERAL_BRANCH',
        company_id: company.id
      }
    });
    branches.push(delhiBranch);

    // Noida Branch
    const noidaBranch = await prisma.branch.create({
      data: {
        name: 'Urban Pest Solutions - Noida',
        address: '789 Tech Park, Sector 62',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201309',
        phone: '+91-9876543212',
        email: 'noida@urbanpestsolutions.com',
        branch_type: 'GENERAL_BRANCH',
        company_id: company.id
      }
    });
    branches.push(noidaBranch);

    console.log(`✅ Created ${branches.length} branches`);

    // 3. Create Staff Members
    console.log('👥 Creating staff members...');
    const staff = [];
    
    // Superadmin
    const superadmin = await prisma.staff.create({
      data: {
        name: 'Rajesh Kumar',
        email: 'rajesh.kumar@urbanpestsolutions.com',
        mobile: '+91-9876543200',
        role: 'SUPERADMIN',
        password_hash: await bcrypt.hash('admin123', 10),
        company_id: company.id,
        is_active: true
      }
    });
    staff.push(superadmin);

    // Admin for Main Branch
    const admin = await prisma.staff.create({
      data: {
        name: 'Priya Sharma',
        email: 'priya.sharma@urbanpestsolutions.com',
        mobile: '+91-9876543201',
        role: 'ADMIN',
        password_hash: await bcrypt.hash('admin123', 10),
        branch_id: mainBranch.id,
        company_id: company.id,
        is_active: true
      }
    });
    staff.push(admin);

    // Inventory Manager
    const inventoryManager = await prisma.staff.create({
      data: {
        name: 'Amit Singh',
        email: 'amit.singh@urbanpestsolutions.com',
        mobile: '+91-9876543202',
        role: 'INVENTORY_MANAGER',
        password_hash: await bcrypt.hash('inventory123', 10),
        branch_id: mainBranch.id,
        company_id: company.id,
        is_active: true
      }
    });
    staff.push(inventoryManager);

    // Sales Executives
    const salesExec1 = await prisma.staff.create({
      data: {
        name: 'Neha Gupta',
        email: 'neha.gupta@urbanpestsolutions.com',
        mobile: '+91-9876543203',
        role: 'SALES_EXECUTIVE',
        password_hash: await bcrypt.hash('sales123', 10),
        branch_id: delhiBranch.id,
        company_id: company.id,
        is_active: true
      }
    });
    staff.push(salesExec1);

    const salesExec2 = await prisma.staff.create({
      data: {
        name: 'Vikash Yadav',
        email: 'vikash.yadav@urbanpestsolutions.com',
        mobile: '+91-9876543204',
        role: 'SALES_EXECUTIVE',
        password_hash: await bcrypt.hash('sales123', 10),
        branch_id: noidaBranch.id,
        company_id: company.id,
        is_active: true
      }
    });
    staff.push(salesExec2);

    // Technicians
    const technician1 = await prisma.staff.create({
      data: {
        name: 'Ravi Kumar',
        email: 'ravi.kumar@urbanpestsolutions.com',
        mobile: '+91-9876543205',
        role: 'TECHNICIAN',
        password_hash: await bcrypt.hash('tech123', 10),
        branch_id: mainBranch.id,
        company_id: company.id,
        is_active: true
      }
    });
    staff.push(technician1);

    const technician2 = await prisma.staff.create({
      data: {
        name: 'Suresh Patel',
        email: 'suresh.patel@urbanpestsolutions.com',
        mobile: '+91-9876543206',
        role: 'TECHNICIAN',
        password_hash: await bcrypt.hash('tech123', 10),
        branch_id: delhiBranch.id,
        company_id: company.id,
        is_active: true
      }
    });
    staff.push(technician2);

    const technician3 = await prisma.staff.create({
      data: {
        name: 'Manoj Verma',
        email: 'manoj.verma@urbanpestsolutions.com',
        mobile: '+91-9876543207',
        role: 'TECHNICIAN',
        password_hash: await bcrypt.hash('tech123', 10),
        branch_id: noidaBranch.id,
        company_id: company.id,
        is_active: true
      }
    });
    staff.push(technician3);

    // Supervisors
    const supervisor1 = await prisma.staff.create({
      data: {
        name: 'Deepak Agarwal',
        email: 'deepak.agarwal@urbanpestsolutions.com',
        mobile: '+91-9876543208',
        role: 'SUPERVISOR',
        password_hash: await bcrypt.hash('super123', 10),
        branch_id: delhiBranch.id,
        company_id: company.id,
        is_active: true
      }
    });
    staff.push(supervisor1);

    const supervisor2 = await prisma.staff.create({
      data: {
        name: 'Sandeep Jain',
        email: 'sandeep.jain@urbanpestsolutions.com',
        mobile: '+91-9876543209',
        role: 'SUPERVISOR',
        password_hash: await bcrypt.hash('super123', 10),
        branch_id: noidaBranch.id,
        company_id: company.id,
        is_active: true
      }
    });
    staff.push(supervisor2);

    console.log(`✅ Created ${staff.length} staff members`);

    // 4. Create Inventory Items
    console.log('📦 Creating inventory items...');
    const items = [];

    // Pest Control Chemicals
    const cypermethrin = await prisma.item.create({
      data: {
        name: 'Cypermethrin 10% EC',
        category: 'Insecticide',
        base_uom: 'litre',
        gst_percentage: 18.00,
        hsn_code: '38089100',
        description: 'Synthetic pyrethroid insecticide for general pest control',
        company_id: company.id
      }
    });
    items.push(cypermethrin);

    const imidacloprid = await prisma.item.create({
      data: {
        name: 'Imidacloprid 17.8% SL',
        category: 'Insecticide',
        base_uom: 'litre',
        gst_percentage: 18.00,
        hsn_code: '38089100',
        description: 'Systemic insecticide for termite and ant control',
        company_id: company.id
      }
    });
    items.push(imidacloprid);

    const fipronil = await prisma.item.create({
      data: {
        name: 'Fipronil 5% SC',
        category: 'Insecticide',
        base_uom: 'litre',
        gst_percentage: 18.00,
        hsn_code: '38089100',
        description: 'Broad spectrum insecticide for cockroach and ant control',
        company_id: company.id
      }
    });
    items.push(fipronil);

    // Rodenticides
    const bromadiolone = await prisma.item.create({
      data: {
        name: 'Bromadiolone 0.005% Bait',
        category: 'Rodenticide',
        base_uom: 'kg',
        gst_percentage: 18.00,
        hsn_code: '38089200',
        description: 'Anticoagulant rodenticide bait for rat control',
        company_id: company.id
      }
    });
    items.push(bromadiolone);

    // Equipment
    const sprayPump = await prisma.item.create({
      data: {
        name: 'Battery Operated Spray Pump',
        category: 'Equipment',
        base_uom: 'pcs',
        gst_percentage: 18.00,
        hsn_code: '84249000',
        description: '16L battery operated knapsack sprayer',
        company_id: company.id
      }
    });
    items.push(sprayPump);

    const baitStation = await prisma.item.create({
      data: {
        name: 'Plastic Bait Station',
        category: 'Equipment',
        base_uom: 'pcs',
        gst_percentage: 18.00,
        hsn_code: '39269099',
        description: 'Tamper-resistant plastic bait station for rodent control',
        company_id: company.id
      }
    });
    items.push(baitStation);

    // Tools
    const handSprayer = await prisma.item.create({
      data: {
        name: 'Hand Compression Sprayer',
        category: 'Tools',
        base_uom: 'pcs',
        gst_percentage: 18.00,
        hsn_code: '84249000',
        description: '2L hand compression sprayer for spot treatment',
        company_id: company.id
      }
    });
    items.push(handSprayer);

    const flashlight = await prisma.item.create({
      data: {
        name: 'LED Flashlight',
        category: 'Tools',
        base_uom: 'pcs',
        gst_percentage: 18.00,
        hsn_code: '85131000',
        description: 'Rechargeable LED flashlight for inspection',
        company_id: company.id
      }
    });
    items.push(flashlight);

    console.log(`✅ Created ${items.length} inventory items`);

    // 5. Create Material Batches
    console.log('📋 Creating material batches...');
    const batches = [];

    // Cypermethrin batches
    const cyperBatch1 = await prisma.materialBatch.create({
      data: {
        item_id: cypermethrin.id,
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
    });
    batches.push(cyperBatch1);

    const cyperBatch2 = await prisma.materialBatch.create({
      data: {
        item_id: cypermethrin.id,
        batch_no: 'CYP-2024-002',
        mfg_date: new Date('2024-03-10'),
        expiry_date: new Date('2026-03-10'),
        initial_qty: 50.0,
        current_qty: 32.0,
        rate_per_unit: 450.00,
        gst_percentage: 18.00,
        location_type: 'BRANCH',
        location_id: delhiBranch.id
      }
    });
    batches.push(cyperBatch2);

    // Imidacloprid batches
    const imidaBatch1 = await prisma.materialBatch.create({
      data: {
        item_id: imidacloprid.id,
        batch_no: 'IMI-2024-001',
        mfg_date: new Date('2024-02-20'),
        expiry_date: new Date('2025-09-01'), // Expiring soon
        initial_qty: 75.0,
        current_qty: 45.5,
        rate_per_unit: 520.00,
        gst_percentage: 18.00,
        location_type: 'BRANCH',
        location_id: mainBranch.id
      }
    });
    batches.push(imidaBatch1);

    // Fipronil batches
    const fipronilBatch1 = await prisma.materialBatch.create({
      data: {
        item_id: fipronil.id,
        batch_no: 'FIP-2024-001',
        mfg_date: new Date('2024-04-05'),
        expiry_date: new Date('2026-04-05'),
        initial_qty: 60.0,
        current_qty: 42.0,
        rate_per_unit: 680.00,
        gst_percentage: 18.00,
        location_type: 'BRANCH',
        location_id: noidaBranch.id
      }
    });
    batches.push(fipronilBatch1);

    // Bromadiolone batches
    const bromaBatch1 = await prisma.materialBatch.create({
      data: {
        item_id: bromadiolone.id,
        batch_no: 'BRO-2024-001',
        mfg_date: new Date('2024-01-30'),
        expiry_date: new Date('2025-01-30'), // Expired
        initial_qty: 25.0,
        current_qty: 15.5,
        rate_per_unit: 320.00,
        gst_percentage: 18.00,
        location_type: 'BRANCH',
        location_id: mainBranch.id,
        is_expired: true
      }
    });
    batches.push(bromaBatch1);

    // Equipment batches
    const sprayBatch1 = await prisma.materialBatch.create({
      data: {
        item_id: sprayPump.id,
        batch_no: 'SPR-2024-001',
        mfg_date: new Date('2024-05-15'),
        expiry_date: null, // No expiry for equipment
        initial_qty: 10.0,
        current_qty: 7.0,
        rate_per_unit: 2500.00,
        gst_percentage: 18.00,
        location_type: 'BRANCH',
        location_id: mainBranch.id
      }
    });
    batches.push(sprayBatch1);

    const baitBatch1 = await prisma.materialBatch.create({
      data: {
        item_id: baitStation.id,
        batch_no: 'BAI-2024-001',
        mfg_date: new Date('2024-06-01'),
        expiry_date: new Date('2025-08-31'), // Expiring in 1 day
        initial_qty: 50.0,
        current_qty: 35.0,
        rate_per_unit: 150.00,
        gst_percentage: 18.00,
        location_type: 'BRANCH',
        location_id: delhiBranch.id
      }
    });
    batches.push(baitBatch1);

    console.log(`✅ Created ${batches.length} material batches`);

    // 6. Create Leads
    console.log('📞 Creating leads...');
    const leads = [];

    // Residential leads
    const lead1 = await prisma.lead.create({
      data: {
        customer_name: 'Rohit Sharma',
        customer_email: 'rohit.sharma@email.com',
        customer_phone: '+91-9876543301',
        address: 'A-101, Green Valley Apartments',
        city: 'Gurgaon',
        state: 'Haryana',
        pincode: '122001',
        area: 'Sector 21',
        service_type: 'RESIDENTIAL_PEST_CONTROL',
        pest_type: 'Cockroaches, Ants',
        property_type: 'APARTMENT',
        property_size: '2 BHK',
        urgency_level: 'HIGH',
        preferred_date: new Date('2025-09-05'),
        preferred_time: '10:00 AM',
        description: 'Heavy cockroach infestation in kitchen and bathroom areas',
        status: 'NEW',
        source: 'WEBSITE',
        lead_type: 'ONCALL',
        assigned_to: salesExec1.id,
        lead_generated_by: salesExec1.id,
        branch_id: delhiBranch.id,
        company_id: company.id,
        estimated_cost: 2500.00,
        notes: 'Customer mentioned seeing cockroaches during daytime'
      }
    });
    leads.push(lead1);

    const lead2 = await prisma.lead.create({
      data: {
        customer_name: 'Priya Agarwal',
        customer_email: 'priya.agarwal@email.com',
        customer_phone: '+91-9876543302',
        address: 'B-205, Sunrise Heights',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201301',
        area: 'Sector 15',
        service_type: 'TERMITE_CONTROL',
        pest_type: 'Termites',
        property_type: 'INDEPENDENT_HOUSE',
        property_size: '3 BHK',
        urgency_level: 'MEDIUM',
        preferred_date: new Date('2025-09-10'),
        preferred_time: '2:00 PM',
        description: 'Termite damage noticed in wooden furniture and door frames',
        status: 'CONTACTED',
        source: 'REFERRAL',
        lead_type: 'ONCALL',
        assigned_to: salesExec2.id,
        lead_generated_by: salesExec2.id,
        branch_id: noidaBranch.id,
        company_id: company.id,
        estimated_cost: 4500.00,
        notes: 'Referred by existing customer Mr. Gupta'
      }
    });
    leads.push(lead2);

    // Commercial lead
    const lead3 = await prisma.lead.create({
      data: {
        customer_name: 'Rajesh Enterprises',
        customer_email: 'contact@rajeshenterprises.com',
        customer_phone: '+91-9876543303',
        address: 'Plot 45, Industrial Area Phase 1',
        city: 'Gurgaon',
        state: 'Haryana',
        pincode: '122016',
        area: 'Industrial Area',
        service_type: 'COMMERCIAL_PEST_CONTROL',
        pest_type: 'Rodents, Cockroaches',
        property_type: 'WAREHOUSE',
        property_size: '5000 sq ft',
        urgency_level: 'HIGH',
        preferred_date: new Date('2025-09-02'),
        preferred_time: '9:00 AM',
        description: 'Warehouse pest control for food storage facility',
        status: 'QUALIFIED',
        source: 'PHONE_CALL',
        lead_type: 'AMC',
        assigned_to: admin.id,
        lead_generated_by: salesExec1.id,
        branch_id: mainBranch.id,
        company_id: company.id,
        estimated_cost: 15000.00,
        notes: 'Potential AMC customer, requires monthly service'
      }
    });
    leads.push(lead3);

    const lead4 = await prisma.lead.create({
      data: {
        customer_name: 'Sunita Devi',
        customer_email: 'sunita.devi@email.com',
        customer_phone: '+91-9876543304',
        address: 'C-301, Royal Residency',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110025',
        area: 'Karol Bagh',
        service_type: 'BED_BUG_CONTROL',
        pest_type: 'Bed Bugs',
        property_type: 'APARTMENT',
        property_size: '1 BHK',
        urgency_level: 'EMERGENCY',
        preferred_date: new Date('2025-08-31'),
        preferred_time: '11:00 AM',
        description: 'Severe bed bug infestation in bedroom',
        status: 'CONVERTED',
        source: 'SOCIAL_MEDIA',
        lead_type: 'ONCALL',
        assigned_to: technician2.id,
        lead_generated_by: salesExec1.id,
        branch_id: delhiBranch.id,
        company_id: company.id,
        estimated_cost: 3500.00,
        notes: 'Service completed successfully'
      }
    });
    leads.push(lead4);

    console.log(`✅ Created ${leads.length} leads`);

    // 7. Create Services
    console.log('🔧 Creating services...');
    const services = [];

    // Service for converted lead
    const service1 = await prisma.service.create({
      data: {
        lead_id: lead4.id,
        service_type: 'BED_BUG_CONTROL',
        service_date: new Date('2025-08-31T11:00:00'),
        technician_id: technician2.id,
        status: 'COMPLETED',
        cost: 3500.00,
        payment_status: 'PAID',
        notes: 'Complete bed bug treatment with follow-up spray',
        materials_used: 'Cypermethrin, Hand sprayer',
        customer_rating: 5,
        customer_feedback: 'Excellent service, very professional team',
        warranty_period: 30,
        warranty_expiry: new Date('2025-09-30')
      }
    });
    services.push(service1);

    // Scheduled service for qualified lead
    const service2 = await prisma.service.create({
      data: {
        lead_id: lead3.id,
        service_type: 'COMMERCIAL_PEST_CONTROL',
        service_date: new Date('2025-09-02T09:00:00'),
        technician_id: technician1.id,
        status: 'SCHEDULED',
        cost: 15000.00,
        payment_status: 'PENDING',
        notes: 'Initial pest control treatment for warehouse',
        materials_used: null
      }
    });
    services.push(service2);

    console.log(`✅ Created ${services.length} services`);

    // 8. Create Material Consumption
    console.log('📊 Creating material consumption records...');
    const consumptions = [];

    // Material consumption for completed service
    const consumption1 = await prisma.materialConsumption.create({
      data: {
        consumption_no: 'CON-2025-001',
        consumption_date: new Date('2025-08-31'),
        technician_id: technician2.id,
        service_id: service1.id,
        lead_id: lead4.id,
        customer_name: 'Sunita Devi',
        job_description: 'Bed bug control treatment',
        status: 'COMPLETED',
        created_by: technician2.id
      }
    });
    consumptions.push(consumption1);

    // Consumption items
    await prisma.materialConsumptionItem.create({
      data: {
        consumption_id: consumption1.id,
        item_id: cypermethrin.id,
        batch_id: cyperBatch2.id,
        quantity: 0.5,
        uom: 'litre',
        rate_per_unit: 450.00,
        total_amount: 225.00
      }
    });

    await prisma.materialConsumptionItem.create({
      data: {
        consumption_id: consumption1.id,
        item_id: handSprayer.id,
        batch_id: sprayBatch1.id,
        quantity: 1.0,
        uom: 'pcs',
        rate_per_unit: 2500.00,
        total_amount: 2500.00
      }
    });

    console.log(`✅ Created ${consumptions.length} material consumption records`);

    // 9. Create Stock Ledger Entries
    console.log('📋 Creating stock ledger entries...');
    
    // Stock ledger for material consumption
    await prisma.stockLedger.create({
      data: {
        item_id: cypermethrin.id,
        batch_id: cyperBatch2.id,
        location_type: 'BRANCH',
        location_id: delhiBranch.id,
        transaction_type: 'CONSUMPTION',
        transaction_id: consumption1.id,
        transaction_date: new Date('2025-08-31'),
        quantity_out: 0.5,
        balance_quantity: 31.5,
        rate_per_unit: 450.00,
        balance_value: 14175.00,
        created_by: technician2.id,
        user_role: 'TECHNICIAN',
        reference_no: 'CON-2025-001',
        notes: 'Material consumed for bed bug treatment'
      }
    });

    console.log('✅ Created stock ledger entries');

    console.log('🎉 Urban Pest Solutions data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Company: ${company.name}`);
    console.log(`- Branches: ${branches.length}`);
    console.log(`- Staff: ${staff.length}`);
    console.log(`- Items: ${items.length}`);
    console.log(`- Batches: ${batches.length}`);
    console.log(`- Leads: ${leads.length}`);
    console.log(`- Services: ${services.length}`);
    console.log(`- Material Consumptions: ${consumptions.length}`);

  } catch (error) {
    console.error('❌ Error seeding Urban Pest Solutions data:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedUrbanPestSolutions();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { seedUrbanPestSolutions };