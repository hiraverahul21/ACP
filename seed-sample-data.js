const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const { logger } = require('./utils/logger')

const prisma = new PrismaClient()

async function main() {
  try {
    logger.info('🌱 Starting database seeding with sample data...')

    // Clear existing data (in reverse order of dependencies)
    await prisma.stockLedger.deleteMany()
    await prisma.materialConsumptionItem.deleteMany()
    await prisma.materialConsumption.deleteMany()
    await prisma.materialTransferItem.deleteMany()
    await prisma.materialTransfer.deleteMany()
    await prisma.materialReturnItem.deleteMany()
    await prisma.materialReturn.deleteMany()
    await prisma.materialIssueItem.deleteMany()
    await prisma.materialIssue.deleteMany()
    await prisma.materialReceiptItem.deleteMany()
    await prisma.materialReceipt.deleteMany()
    await prisma.materialBatch.deleteMany()
    await prisma.uomConversion.deleteMany()
    await prisma.item.deleteMany()
    await prisma.service.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.staff.deleteMany()
    await prisma.branch.deleteMany()
    await prisma.company.deleteMany()

    logger.info('🗑️ Cleared existing data')

    // Create Companies
    const companies = await Promise.all([
      prisma.company.create({
        data: {
          name: 'PestGuard Solutions',
          address: '123 Business Park, Sector 15',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          phone: '9876543210',
          email: 'info@pestguard.com',
          gst_number: 'GST123456789',
          pan_number: 'ABCDE1234F',
          is_active: true
        }
      }),
      prisma.company.create({
        data: {
          name: 'SafeHome Pest Control',
          address: '456 Industrial Area, Phase 2',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          phone: '9876543211',
          email: 'contact@safehome.com',
          gst_number: 'GST987654321',
          pan_number: 'FGHIJ5678K',
          is_active: true
        }
      }),
      prisma.company.create({
        data: {
          name: 'EcoClean Services',
          address: '789 Green Valley, IT Park',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
          phone: '9876543212',
          email: 'hello@ecoclean.com',
          gst_number: 'GST456789123',
          pan_number: 'KLMNO9012P',
          is_active: true
        }
      })
    ])

    logger.info(`✅ Created ${companies.length} companies`)

    // Create Branches
    const branches = await Promise.all([
      // PestGuard Solutions branches
      prisma.branch.create({
        data: {
          name: 'PestGuard Mumbai Central',
          address: '123 Business Park, Sector 15',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          phone: '9876543210',
          email: 'mumbai@pestguard.com',
          company_id: companies[0].id,
          is_active: true
        }
      }),
      prisma.branch.create({
        data: {
          name: 'PestGuard Andheri',
          address: '456 Andheri West, Link Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400058',
          phone: '9876543213',
          email: 'andheri@pestguard.com',
          company_id: companies[0].id,
          is_active: true
        }
      }),
      prisma.branch.create({
        data: {
          name: 'PestGuard Thane',
          address: '789 Thane East, Station Road',
          city: 'Thane',
          state: 'Maharashtra',
          pincode: '400601',
          phone: '9876543214',
          email: 'thane@pestguard.com',
          company_id: companies[0].id,
          is_active: true
        }
      }),
      // SafeHome Pest Control branches
      prisma.branch.create({
        data: {
          name: 'SafeHome Delhi Main',
          address: '456 Industrial Area, Phase 2',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          phone: '9876543211',
          email: 'delhi@safehome.com',
          company_id: companies[1].id,
          is_active: true
        }
      }),
      prisma.branch.create({
        data: {
          name: 'SafeHome Gurgaon',
          address: '321 Cyber City, Sector 24',
          city: 'Gurgaon',
          state: 'Haryana',
          pincode: '122001',
          phone: '9876543215',
          email: 'gurgaon@safehome.com',
          company_id: companies[1].id,
          is_active: true
        }
      }),
      // EcoClean Services branches
      prisma.branch.create({
        data: {
          name: 'EcoClean Bangalore HQ',
          address: '789 Green Valley, IT Park',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
          phone: '9876543212',
          email: 'bangalore@ecoclean.com',
          company_id: companies[2].id,
          is_active: true
        }
      }),
      prisma.branch.create({
        data: {
          name: 'EcoClean Whitefield',
          address: '654 Whitefield Main Road',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560066',
          phone: '9876543216',
          email: 'whitefield@ecoclean.com',
          company_id: companies[2].id,
          is_active: true
        }
      })
    ])

    logger.info(`✅ Created ${branches.length} branches`)

    // Hash password for all users
    const hashedPassword = await bcrypt.hash('password123', 10)

    // Create Staff (including SUPERADMIN, ADMIN, and other roles)
    const staff = await Promise.all([
      // SUPERADMIN
      prisma.staff.create({
        data: {
          name: 'Super Admin',
          email: 'superadmin@pestcontrol.com',
          mobile: '9999999999',
          password_hash: hashedPassword,
          role: 'SUPERADMIN',
          branch_id: branches[0].id,
          company_id: companies[0].id,
          is_active: true
        }
      }),
      // ADMIN for PestGuard Solutions
      prisma.staff.create({
        data: {
          name: 'Rajesh Kumar',
          email: 'admin@pestguard.com',
          mobile: '9876543220',
          password_hash: hashedPassword,
          role: 'ADMIN',
          branch_id: branches[0].id,
          company_id: companies[0].id,
          is_active: true
        }
      }),
      // ADMIN for SafeHome Pest Control
      prisma.staff.create({
        data: {
          name: 'Priya Sharma',
          email: 'admin@safehome.com',
          mobile: '9876543221',
          password_hash: hashedPassword,
          role: 'ADMIN',
          branch_id: branches[3].id,
          company_id: companies[1].id,
          is_active: true
        }
      }),
      // ADMIN for EcoClean Services
      prisma.staff.create({
        data: {
          name: 'Arjun Reddy',
          email: 'admin@ecoclean.com',
          mobile: '9876543222',
          password_hash: hashedPassword,
          role: 'ADMIN',
          branch_id: branches[5].id,
          company_id: companies[2].id,
          is_active: true
        }
      }),
      // REGIONAL_MANAGER
      prisma.staff.create({
        data: {
          name: 'Amit Patel',
          email: 'regional.manager@pestguard.com',
          mobile: '9876543223',
          password_hash: hashedPassword,
          role: 'REGIONAL_MANAGER',
          branch_id: branches[0].id,
          company_id: companies[0].id,
          is_active: true
        }
      }),
      // AREA_MANAGER
      prisma.staff.create({
        data: {
          name: 'Sunita Singh',
          email: 'area.manager@pestguard.com',
          mobile: '9876543224',
          password_hash: hashedPassword,
          role: 'AREA_MANAGER',
          branch_id: branches[1].id,
          company_id: companies[0].id,
          is_active: true
        }
      }),
      prisma.staff.create({
        data: {
          name: 'Vikram Gupta',
          email: 'area.manager@safehome.com',
          mobile: '9876543225',
          password_hash: hashedPassword,
          role: 'AREA_MANAGER',
          branch_id: branches[4].id,
          company_id: companies[1].id,
          is_active: true
        }
      }),
      // TECHNICIANS
      prisma.staff.create({
        data: {
          name: 'Ravi Technician',
          email: 'ravi.tech@pestguard.com',
          mobile: '9876543226',
          password_hash: hashedPassword,
          role: 'TECHNICIAN',
          branch_id: branches[0].id,
          company_id: companies[0].id,
          is_active: true
        }
      }),
      prisma.staff.create({
        data: {
          name: 'Suresh Kumar',
          email: 'suresh.tech@pestguard.com',
          mobile: '9876543227',
          password_hash: hashedPassword,
          role: 'TECHNICIAN',
          branch_id: branches[1].id,
          company_id: companies[0].id,
          is_active: true
        }
      }),
      prisma.staff.create({
        data: {
          name: 'Manoj Singh',
          email: 'manoj.tech@safehome.com',
          mobile: '9876543228',
          password_hash: hashedPassword,
          role: 'TECHNICIAN',
          branch_id: branches[3].id,
          company_id: companies[1].id,
          is_active: true
        }
      }),
      prisma.staff.create({
        data: {
          name: 'Kiran Reddy',
          email: 'kiran.tech@ecoclean.com',
          mobile: '9876543229',
          password_hash: hashedPassword,
          role: 'TECHNICIAN',
          branch_id: branches[5].id,
          company_id: companies[2].id,
          is_active: true
        }
      })
    ])

    logger.info(`✅ Created ${staff.length} staff members`)

    // Create Leads
    const leads = await Promise.all([
      prisma.lead.create({
        data: {
          customer_name: 'Rohit Sharma',
          customer_phone: '9876543230',
          customer_email: 'rohit.sharma@email.com',
          service_type: 'RESIDENTIAL_PEST_CONTROL',
          property_type: 'APARTMENT',
          property_size: '1200 sq ft',
          address: '101, Sunrise Apartments, Bandra West',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400050',
          urgency_level: 'HIGH',
          preferred_date: new Date('2025-08-25'),
          preferred_time: '10:00',
          description: 'Cockroach problem in kitchen and bathroom',
          status: 'NEW',
          branch_id: branches[0].id,
          company_id: companies[0].id,
          assigned_to: staff[7].id
        }
      }),
      prisma.lead.create({
        data: {
          customer_name: 'Priya Mehta',
          customer_phone: '9876543231',
          customer_email: 'priya.mehta@email.com',
          service_type: 'TERMITE_CONTROL',
          property_type: 'INDEPENDENT_HOUSE',
          property_size: '2500 sq ft',
          address: '45, Green Valley Society, Andheri East',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400069',
          urgency_level: 'MEDIUM',
          preferred_date: new Date('2025-08-26'),
          preferred_time: '14:00',
          description: 'Termite infestation in wooden furniture',
          status: 'CONTACTED',
          branch_id: branches[1].id,
          company_id: companies[0].id,
          assigned_to: staff[8].id
        }
      }),
      prisma.lead.create({
        data: {
          customer_name: 'Amit Restaurant',
          customer_phone: '9876543232',
          customer_email: 'amit.restaurant@email.com',
          service_type: 'COMMERCIAL_PEST_CONTROL',
          property_type: 'RESTAURANT',
          property_size: '800 sq ft',
          address: '23, Food Court, CP Market',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          urgency_level: 'EMERGENCY',
          preferred_date: new Date('2025-08-24'),
          preferred_time: '09:00',
          description: 'Rat problem in kitchen area',
          status: 'QUOTED',
          branch_id: branches[3].id,
          company_id: companies[1].id,
          assigned_to: staff[9].id
        }
      }),
      prisma.lead.create({
        data: {
          customer_name: 'Sneha Patel',
          customer_phone: '9876543233',
          customer_email: 'sneha.patel@email.com',
          service_type: 'MOSQUITO_CONTROL',
          property_type: 'VILLA',
          property_size: '3000 sq ft',
          address: '67, Palm Grove, Sector 14',
          city: 'Gurgaon',
          state: 'Haryana',
          pincode: '122001',
          urgency_level: 'HIGH',
          preferred_date: new Date('2025-08-27'),
          preferred_time: '16:00',
          description: 'Mosquito breeding in garden area',
          status: 'CONVERTED',
          branch_id: branches[4].id,
          company_id: companies[1].id,
          assigned_to: staff[9].id
        }
      }),
      prisma.lead.create({
        data: {
          customer_name: 'Tech Solutions Pvt Ltd',
          customer_phone: '9876543234',
          customer_email: 'admin@techsolutions.com',
          service_type: 'COMMERCIAL_PEST_CONTROL',
          property_type: 'OFFICE',
          property_size: '5000 sq ft',
          address: '12th Floor, IT Tower, Electronic City',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560100',
          urgency_level: 'MEDIUM',
          preferred_date: new Date('2025-08-28'),
          preferred_time: '11:00',
          description: 'Monthly sanitization service required',
          status: 'CONVERTED',
          branch_id: branches[5].id,
          company_id: companies[2].id,
          assigned_to: staff[10].id
        }
      }),
      prisma.lead.create({
        data: {
          customer_name: 'Rajesh Kumar',
          customer_phone: '9876543235',
          customer_email: 'rajesh.kumar@email.com',
          service_type: 'BED_BUG_CONTROL',
          property_type: 'APARTMENT',
          property_size: '900 sq ft',
          address: '34, Sunrise Heights, Whitefield',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560066',
          urgency_level: 'HIGH',
          preferred_date: new Date('2025-08-29'),
          preferred_time: '15:00',
          description: 'Bed bug infestation in bedrooms',
          status: 'CONVERTED',
          branch_id: branches[6].id,
          company_id: companies[2].id,
          assigned_to: staff[10].id
        }
      }),
      prisma.lead.create({
        data: {
          customer_name: 'Maya Singh',
          customer_phone: '9876543236',
          customer_email: 'maya.singh@email.com',
          service_type: 'RODENT_CONTROL',
          property_type: 'WAREHOUSE',
          property_size: '10000 sq ft',
          address: '89, Industrial Estate, Thane',
          city: 'Thane',
          state: 'Maharashtra',
          pincode: '400601',
          urgency_level: 'EMERGENCY',
          preferred_date: new Date('2025-08-30'),
          preferred_time: '08:00',
          description: 'Rat infestation in storage area',
          status: 'QUALIFIED',
          branch_id: branches[2].id,
          company_id: companies[0].id,
          assigned_to: staff[7].id
        }
      })
    ])

    logger.info(`✅ Created ${leads.length} leads`)

    // Create Services
    const services = await Promise.all([
      prisma.service.create({
        data: {
          lead_id: leads[0].id,
          service_type: 'RESIDENTIAL_PEST_CONTROL',
          service_date: new Date('2025-08-25'),
          technician_id: staff[7].id,
          status: 'SCHEDULED',
          cost: 2500.00,
          materials_used: 'Cockroach gel bait, spray',
          notes: 'Initial treatment scheduled'
        }
      }),
      prisma.service.create({
        data: {
          lead_id: leads[1].id,
          service_type: 'TERMITE_CONTROL',
          service_date: new Date('2025-08-26'),
          technician_id: staff[8].id,
          status: 'SCHEDULED',
          cost: 8500.00,
          materials_used: 'Termite treatment chemicals',
          notes: 'Pre-construction termite treatment'
        }
      }),
      prisma.service.create({
        data: {
          lead_id: leads[2].id,
          service_type: 'COMMERCIAL_PEST_CONTROL',
          service_date: new Date('2025-08-24'),
          technician_id: staff[9].id,
          status: 'IN_PROGRESS',
          cost: 5500.00,
          materials_used: 'Rodent bait stations, traps',
          notes: 'Commercial kitchen treatment in progress'
        }
      }),
      prisma.service.create({
        data: {
          lead_id: leads[4].id,
          service_type: 'COMMERCIAL_PEST_CONTROL',
          service_date: new Date('2025-08-28'),
          technician_id: staff[10].id,
          status: 'IN_PROGRESS',
          cost: 12000.00,
          materials_used: 'Disinfectant solution, fogging machine',
          notes: 'Office sanitization in progress'
        }
      }),
      prisma.service.create({
        data: {
          lead_id: leads[5].id,
          service_type: 'BED_BUG_CONTROL',
          service_date: new Date('2025-08-29'),
          technician_id: staff[10].id,
          status: 'COMPLETED',
          cost: 4500.00,
          materials_used: 'Bed bug spray, steam treatment',
          notes: 'Treatment completed successfully',
          customer_rating: 5,
          customer_feedback: 'Excellent service, very professional team'
        }
      }),
      prisma.service.create({
        data: {
          lead_id: leads[3].id,
          service_type: 'MOSQUITO_CONTROL',
          service_date: new Date('2025-08-27'),
          technician_id: staff[9].id,
          status: 'COMPLETED',
          cost: 3500.00,
          materials_used: 'Mosquito larvicide, fogging',
          notes: 'Garden area treated for mosquito control',
          customer_rating: 4,
          customer_feedback: 'Good service, mosquito problem reduced significantly'
        }
      })
    ])

    logger.info(`✅ Created ${services.length} services`)

    // Create Inventory Items
    const items = await Promise.all([
      prisma.item.create({
        data: {
          name: 'Cypermethrin 10% EC',
          category: 'Insecticide',
          base_uom: 'litre',
          gst_percentage: 18.00,
          hsn_code: '38089100',
          description: 'Synthetic pyrethroid insecticide for general pest control',
          company_id: companies[0].id
        }
      }),
      prisma.item.create({
        data: {
          name: 'Imidacloprid 17.8% SL',
          category: 'Insecticide',
          base_uom: 'litre',
          gst_percentage: 18.00,
          hsn_code: '38089100',
          description: 'Systemic insecticide for termite and cockroach control',
          company_id: companies[0].id
        }
      }),
      prisma.item.create({
        data: {
          name: 'Fipronil 5% SC',
          category: 'Insecticide',
          base_uom: 'litre',
          gst_percentage: 18.00,
          hsn_code: '38089100',
          description: 'Broad spectrum insecticide for ant and termite control',
          company_id: companies[0].id
        }
      }),
      prisma.item.create({
        data: {
          name: 'Bromadiolone 0.005%',
          category: 'Rodenticide',
          base_uom: 'kg',
          gst_percentage: 18.00,
          hsn_code: '38089200',
          description: 'Anticoagulant rodenticide bait',
          company_id: companies[0].id
        }
      }),
      prisma.item.create({
        data: {
          name: 'Zinc Phosphide 80% WP',
          category: 'Rodenticide',
          base_uom: 'kg',
          gst_percentage: 18.00,
          hsn_code: '38089200',
          description: 'Acute rodenticide powder',
          company_id: companies[0].id
        }
      }),
      prisma.item.create({
        data: {
          name: 'Hand Sprayer 2L',
          category: 'Equipment',
          base_uom: 'pcs',
          gst_percentage: 18.00,
          hsn_code: '84248900',
          description: 'Manual compression sprayer for chemical application',
          company_id: companies[0].id
        }
      }),
      prisma.item.create({
        data: {
          name: 'Motorized Sprayer',
          category: 'Equipment',
          base_uom: 'pcs',
          gst_percentage: 18.00,
          hsn_code: '84248900',
          description: 'Petrol operated high pressure sprayer',
          company_id: companies[0].id
        }
      }),
      prisma.item.create({
        data: {
          name: 'Safety Mask N95',
          category: 'Safety Equipment',
          base_uom: 'pcs',
          gst_percentage: 12.00,
          hsn_code: '63079000',
          description: 'Respiratory protection mask',
          company_id: companies[0].id
        }
      }),
      prisma.item.create({
        data: {
          name: 'Chemical Resistant Gloves',
          category: 'Safety Equipment',
          base_uom: 'pair',
          gst_percentage: 12.00,
          hsn_code: '39262000',
          description: 'Nitrile gloves for chemical handling',
          company_id: companies[0].id
        }
      }),
      prisma.item.create({
        data: {
          name: 'Gel Bait Stations',
          category: 'Bait Station',
          base_uom: 'pcs',
          gst_percentage: 18.00,
          hsn_code: '39269099',
          description: 'Plastic bait stations for gel application',
          company_id: companies[0].id
        }
      })
    ])

    logger.info(`✅ Created ${items.length} inventory items`)

    // Create UOM Conversions
    const uomConversions = await Promise.all([
      // Liquid conversions
      prisma.uomConversion.create({
        data: {
          item_id: items[0].id, // Cypermethrin
          from_uom: 'litre',
          to_uom: 'ml',
          conversion_factor: 1000.0000
        }
      }),
      prisma.uomConversion.create({
        data: {
          item_id: items[1].id, // Imidacloprid
          from_uom: 'litre',
          to_uom: 'ml',
          conversion_factor: 1000.0000
        }
      }),
      prisma.uomConversion.create({
        data: {
          item_id: items[2].id, // Fipronil
          from_uom: 'litre',
          to_uom: 'ml',
          conversion_factor: 1000.0000
        }
      }),
      // Solid conversions
      prisma.uomConversion.create({
        data: {
          item_id: items[3].id, // Bromadiolone
          from_uom: 'kg',
          to_uom: 'gm',
          conversion_factor: 1000.0000
        }
      }),
      prisma.uomConversion.create({
        data: {
          item_id: items[4].id, // Zinc Phosphide
          from_uom: 'kg',
          to_uom: 'gm',
          conversion_factor: 1000.0000
        }
      }),
      // Pair conversions
      prisma.uomConversion.create({
        data: {
          item_id: items[8].id, // Gloves
          from_uom: 'pair',
          to_uom: 'pcs',
          conversion_factor: 2.0000
        }
      })
    ])

    logger.info(`✅ Created ${uomConversions.length} UOM conversions`)

    // Create Material Batches with stock
    const materialBatches = await Promise.all([
      // Cypermethrin batches
      prisma.materialBatch.create({
        data: {
          item_id: items[0].id,
          batch_no: 'CYP001-2024',
          mfg_date: new Date('2024-01-15'),
          expiry_date: new Date('2026-01-15'),
          initial_qty: 50.0000,
          current_qty: 35.5000,
          rate_per_unit: 850.00,
          gst_percentage: 18.00,
          location_type: 'BRANCH',
          location_id: branches[0].id
        }
      }),
      prisma.materialBatch.create({
        data: {
          item_id: items[0].id,
          batch_no: 'CYP002-2024',
          mfg_date: new Date('2024-03-10'),
          expiry_date: new Date('2026-03-10'),
          initial_qty: 25.0000,
          current_qty: 20.0000,
          rate_per_unit: 875.00,
          gst_percentage: 18.00,
          location_type: 'BRANCH',
          location_id: branches[1].id
        }
      }),
      // Imidacloprid batches
      prisma.materialBatch.create({
        data: {
          item_id: items[1].id,
          batch_no: 'IMI001-2024',
          mfg_date: new Date('2024-02-20'),
          expiry_date: new Date('2026-02-20'),
          initial_qty: 30.0000,
          current_qty: 18.7500,
          rate_per_unit: 1200.00,
          gst_percentage: 18.00,
          location_type: 'BRANCH',
          location_id: branches[0].id
        }
      }),
      // Fipronil batches
      prisma.materialBatch.create({
        data: {
          item_id: items[2].id,
          batch_no: 'FIP001-2024',
          mfg_date: new Date('2024-01-05'),
          expiry_date: new Date('2025-12-05'), // Expiring soon
          initial_qty: 20.0000,
          current_qty: 5.2500,
          rate_per_unit: 1500.00,
          gst_percentage: 18.00,
          location_type: 'BRANCH',
          location_id: branches[0].id
        }
      }),
      // Bromadiolone batches
      prisma.materialBatch.create({
        data: {
          item_id: items[3].id,
          batch_no: 'BRO001-2024',
          mfg_date: new Date('2024-03-01'),
          expiry_date: new Date('2027-03-01'),
          initial_qty: 10.0000,
          current_qty: 7.5000,
          rate_per_unit: 2500.00,
          gst_percentage: 18.00,
          location_type: 'BRANCH',
          location_id: branches[0].id
        }
      }),
      // Equipment batches
      prisma.materialBatch.create({
        data: {
          item_id: items[5].id, // Hand Sprayer
          batch_no: 'HS001-2024',
          mfg_date: new Date('2024-01-01'),
          expiry_date: null,
          initial_qty: 20.0000,
          current_qty: 12.0000,
          rate_per_unit: 450.00,
          gst_percentage: 18.00,
          location_type: 'BRANCH',
          location_id: branches[0].id
        }
      }),
      prisma.materialBatch.create({
        data: {
          item_id: items[7].id, // Safety Mask
          batch_no: 'SM001-2024',
          mfg_date: new Date('2024-02-15'),
          expiry_date: new Date('2026-02-15'),
          initial_qty: 100.0000,
          current_qty: 65.0000,
          rate_per_unit: 25.00,
          gst_percentage: 12.00,
          location_type: 'BRANCH',
          location_id: branches[0].id
        }
      }),
      prisma.materialBatch.create({
        data: {
          item_id: items[8].id, // Gloves
          batch_no: 'GL001-2024',
          mfg_date: new Date('2024-01-20'),
          expiry_date: new Date('2026-01-20'),
          initial_qty: 50.0000,
          current_qty: 28.0000,
          rate_per_unit: 35.00,
          gst_percentage: 12.00,
          location_type: 'BRANCH',
          location_id: branches[0].id
        }
      }),
      prisma.materialBatch.create({
        data: {
          item_id: items[9].id, // Bait Stations
          batch_no: 'BS001-2024',
          mfg_date: new Date('2024-02-01'),
          expiry_date: null,
          initial_qty: 200.0000,
          current_qty: 150.0000,
          rate_per_unit: 15.00,
          gst_percentage: 18.00,
          location_type: 'BRANCH',
          location_id: branches[0].id
        }
      })
    ])

    logger.info(`✅ Created ${materialBatches.length} material batches`)

    // Create a sample Material Receipt
    const materialReceipt = await prisma.materialReceipt.create({
      data: {
        receipt_no: 'MR-2024-001',
        receipt_date: new Date('2024-01-15'),
        vendor_name: 'ChemSupply India Pvt Ltd',
        vendor_invoice_no: 'INV-2024-0015',
        vendor_invoice_date: new Date('2024-01-14'),
        to_location_type: 'BRANCH',
        to_location_id: branches[0].id,
        total_amount: 50000.00,
        discount_amount: 2500.00,
        gst_amount: 8550.00,
        net_amount: 56050.00,
        status: 'COMPLETED',
        created_by: staff[1].id, // Admin
        approved_by: staff[1].id
      }
    })

    // Create Material Receipt Items
    const receiptItems = await Promise.all([
      prisma.materialReceiptItem.create({
        data: {
          receipt_id: materialReceipt.id,
          item_id: items[0].id, // Cypermethrin
          batch_id: materialBatches[0].id,
          quantity: 50.0000,
          uom: 'litre',
          rate_per_unit: 850.00,
          discount_percent: 5.00,
          discount_amount: 2125.00,
          gst_percentage: 18.00,
          gst_amount: 7245.00,
          total_amount: 47620.00
        }
      }),
      prisma.materialReceiptItem.create({
        data: {
          receipt_id: materialReceipt.id,
          item_id: items[7].id, // Safety Mask
          batch_id: materialBatches[6].id,
          quantity: 100.0000,
          uom: 'pcs',
          rate_per_unit: 25.00,
          discount_percent: 10.00,
          discount_amount: 250.00,
          gst_percentage: 12.00,
          gst_amount: 270.00,
          total_amount: 2520.00
        }
      })
    ])

    // Create a sample Material Issue
    const materialIssue = await prisma.materialIssue.create({
      data: {
        issue_no: 'MI-2024-001',
        issue_date: new Date('2024-01-20'),
        from_location_type: 'BRANCH',
        from_location_id: branches[0].id,
        to_location_type: 'BRANCH',
        to_location_id: branches[1].id, // Issue to another branch
        purpose: 'Branch transfer for pest control service',
        status: 'COMPLETED',
        created_by: staff[1].id, // Admin
        approved_by: staff[1].id
      }
    })

    // Create Material Issue Items
    const issueItems = await Promise.all([
      prisma.materialIssueItem.create({
        data: {
          issue_id: materialIssue.id,
          item_id: items[0].id, // Cypermethrin
          batch_id: materialBatches[0].id,
          quantity: 2.5000,
          uom: 'litre',
          rate_per_unit: 850.00,
          total_amount: 2125.00
        }
      }),
      prisma.materialIssueItem.create({
        data: {
          issue_id: materialIssue.id,
          item_id: items[7].id, // Safety Mask
          batch_id: materialBatches[6].id,
          quantity: 5.0000,
          uom: 'pcs',
          rate_per_unit: 25.00,
          total_amount: 125.00
        }
      })
    ])

    logger.info(`✅ Created sample material receipt and issue transactions`)

    // Summary
    logger.info('🎉 Sample data seeding completed successfully!')
    logger.info('📊 Summary:')
    logger.info(`   • Companies: ${companies.length}`)
    logger.info(`   • Branches: ${branches.length}`)
    logger.info(`   • Staff: ${staff.length}`)
    logger.info(`   • Leads: ${leads.length}`)
    logger.info(`   • Services: ${services.length}`)
    logger.info(`   • Inventory Items: ${items.length}`)
    logger.info(`   • UOM Conversions: ${uomConversions.length}`)
    logger.info(`   • Material Batches: ${materialBatches.length}`)
    logger.info(`   • Material Receipts: 1`)
    logger.info(`   • Material Issues: 1`)
    logger.info('')
    logger.info('🔐 Login Credentials:')
    logger.info('   • SUPERADMIN: superadmin@pestcontrol.com / password123')
    logger.info('   • ADMIN (PestGuard): admin@pestguard.com / password123')
    logger.info('   • ADMIN (SafeHome): admin@safehome.com / password123')
    logger.info('   • ADMIN (EcoClean): admin@ecoclean.com / password123')
    logger.info('   • All other staff: [email] / password123')

  } catch (error) {
    logger.error('❌ Error seeding database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })