const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { Prisma } = require('@prisma/client');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const { createStockLedgerEntry, extractAuditInfo, createStockReversalEntries } = require('../utils/stockAuditTrail');
const { revertMaterialIssueStock } = require('../utils/stockReversion');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Helper function to generate transaction numbers
const generateTransactionNumber = (prefix) => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

// Helper function to implement FEFO (First Expiry First Out)
const getAvailableBatches = async (itemId, locationId, locationType, requiredQty) => {
  const batches = await prisma.materialBatch.findMany({
    where: {
      item_id: itemId,
      location_id: locationId,
      location_type: locationType,
      current_qty: { gt: 0 },
      is_expired: false
    },
    orderBy: [
      { expiry_date: 'asc' }, // FEFO - First Expiry First Out
      { created_at: 'asc' }   // FIFO for same expiry dates
    ]
  });

  const selectedBatches = [];
  let remainingQty = requiredQty;

  for (const batch of batches) {
    if (remainingQty <= 0) break;
    
    const availableQty = Math.min(batch.current_qty, remainingQty);
    selectedBatches.push({
      ...batch,
      allocated_qty: availableQty
    });
    remainingQty -= availableQty;
  }

  return { selectedBatches, shortfall: remainingQty };
};

// Update stock ledger
const updateStockLedger = async (entries) => {
  for (const entry of entries) {
    await prisma.stockLedger.create({
      data: entry
    });
  }
};

// GET /api/inventory/available-items - Get items with available quantities from source branch
router.get('/available-items', asyncHandler(async (req, res) => {
  const { user } = req;
  const { from_location_id, from_location_type = 'BRANCH' } = req.query;

  if (!from_location_id) {
    throw new AppError('Source location is required', 400);
  }

  // Get items with their cumulative available quantities from the source location
  const itemsWithStock = await prisma.materialBatch.groupBy({
    by: ['item_id'],
    where: {
      location_type: from_location_type,
      location_id: from_location_id,
      current_qty: { gt: 0 },
      is_expired: false,
      item: {
        company_id: user.company_id,
        is_active: true
      }
    },
    _sum: {
      current_qty: true
    }
  });

  // Get item details with UOM conversions
  const itemIds = itemsWithStock.map(item => item.item_id);
  const items = await prisma.item.findMany({
    where: {
      id: { in: itemIds },
      company_id: user.company_id,
      is_active: true
    },
    select: {
      id: true,
      name: true,
      category: true,
      base_uom: true,
      hsn_code: true,
      uom_conversions: {
        select: {
          id: true,
          from_uom: true,
          to_uom: true,
          conversion_factor: true
        }
      }
    }
  });

  // Combine item details with available quantities and UOM options
  const availableItems = items.map(item => {
    const stockInfo = itemsWithStock.find(stock => stock.item_id === item.id);
    
    // Build available UOM options (base UOM + conversions)
    const availableUoms = [item.base_uom]; // Always include base UOM
    
    // Add converted UOMs from conversions where base_uom is the from_uom
    item.uom_conversions.forEach(conversion => {
      if (conversion.from_uom === item.base_uom && !availableUoms.includes(conversion.to_uom)) {
        availableUoms.push(conversion.to_uom);
      }
    });
    
    return {
      ...item,
      available_quantity: stockInfo?._sum.current_qty || 0,
      available_uoms: availableUoms,
      uom_conversions: item.uom_conversions
    };
  });

  res.json({
    success: true,
    data: availableItems
  });
}));

// GET /api/inventory/item-batches/:itemId - Get available batches for an item
router.get('/item-batches/:itemId', asyncHandler(async (req, res) => {
  const { user } = req;
  const { itemId } = req.params;
  const { from_location_id, from_location_type = 'BRANCH' } = req.query;

  if (!from_location_id) {
    throw new AppError('Source location is required', 400);
  }

  // Get available batches for the item, sorted by expiry date (FEFO)
  const batches = await prisma.materialBatch.findMany({
    where: {
      item_id: itemId,
      location_type: from_location_type,
      location_id: from_location_id,
      current_qty: { gt: 0 },
      is_expired: false,
      item: {
        company_id: user.company_id
      }
    },
    select: {
      id: true,
      batch_no: true,
      mfg_date: true,
      expiry_date: true,
      current_qty: true,
      rate_per_unit: true,
      gst_percentage: true
    },
    orderBy: [
      { expiry_date: 'asc' }, // Show expiring batches first
      { created_at: 'asc' }   // FIFO for same expiry dates
    ]
  });

  // Calculate days until expiry for each batch
  const batchesWithExpiry = batches.map(batch => {
    const today = new Date();
    const expiryDate = new Date(batch.expiry_date);
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    return {
      ...batch,
      days_until_expiry: daysUntilExpiry,
      is_expiring_soon: daysUntilExpiry <= 30 // Flag batches expiring within 30 days
    };
  });

  res.json({
    success: true,
    data: batchesWithExpiry
  });
}));

// GET /api/inventory/dashboard-stats - Dashboard statistics
router.get('/dashboard-stats', asyncHandler(async (req, res) => {
  const { user } = req;
  
  // Build base filter based on user role
  let baseFilter = {};
  
  if (user.role === 'ADMIN') {
    // Admin sees inventory from their company
    baseFilter.item = {
      company_id: user.company_id
    };
  } else if (user.role === 'AREA_MANAGER') {
    baseFilter.location_type = 'BRANCH';
    baseFilter.location_id = user.branch_id;
  } else if (user.role === 'SUPERADMIN') {
    // Superadmin can see all inventory across company
    // No additional filter needed
  }
  
  // Get total items count
  const totalItems = await prisma.item.count({
    where: {
      company_id: user.company_id,
      is_active: true
    }
  });
  
  // Get low stock items (items with total stock below minimum threshold)
  const lowStockItems = await prisma.materialBatch.groupBy({
    by: ['item_id'],
    where: {
      ...baseFilter,
      current_qty: { gt: 0 },
      is_expired: false,
      item: {
        company_id: user.company_id,
        is_active: true
      }
    },
    _sum: {
      current_qty: true
    },
    having: {
      current_qty: {
        _sum: {
          lt: 10 // Consider items with less than 10 units as low stock
        }
      }
    }
  });
  
  // Get expiring items (expiring within 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  const expiringItems = await prisma.materialBatch.count({
    where: {
      ...baseFilter,
      current_qty: { gt: 0 },
      is_expired: false,
      expiry_date: {
        not: null,
        lte: thirtyDaysFromNow,
        gte: new Date()
      },
      item: {
        company_id: user.company_id,
        is_active: true
      }
    }
  });
  
  // Calculate total stock value
  const stockValue = await prisma.materialBatch.aggregate({
    where: {
      ...baseFilter,
      current_qty: { gt: 0 },
      is_expired: false,
      item: {
        company_id: user.company_id,
        is_active: true
      }
    },
    _sum: {
      current_qty: true
    }
  });
  
  // Calculate total value by multiplying quantity with rate
  const batchesWithValue = await prisma.materialBatch.findMany({
    where: {
      ...baseFilter,
      current_qty: { gt: 0 },
      is_expired: false,
      item: {
        company_id: user.company_id,
        is_active: true
      }
    },
    select: {
      current_qty: true,
      rate_per_unit: true
    }
  });
  
  const totalStockValue = batchesWithValue.reduce((sum, batch) => {
    return sum + (batch.current_qty * batch.rate_per_unit);
  }, 0);
  
  const stats = {
    total_items: totalItems,
    low_stock_items: lowStockItems.length,
    expiring_items: expiringItems,
    total_stock_value: Math.round(totalStockValue * 100) / 100 // Round to 2 decimal places
  };
  
  res.json({
    success: true,
    data: stats
  });
}));

// Validation rules for material receipt
const materialReceiptValidation = [
  body('vendor_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Vendor name must be between 2 and 100 characters'),
  
  body('receipt_date')
    .isISO8601()
    .withMessage('Please provide a valid receipt date'),
  
  body('to_location_id')
    .notEmpty()
    .withMessage('Destination location is required'),
  
  body('to_location_type')
    .isIn(['WAREHOUSE', 'BRANCH'])
    .withMessage('Invalid destination location type'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  
  body('items.*.item_id')
    .notEmpty()
    .withMessage('Item ID is required'),
  
  body('items.*.quantity')
    .isFloat({ min: 0.001 })
    .withMessage('Quantity must be greater than 0'),
  
  body('items.*.issued_uom')
    .notEmpty()
    .withMessage('Issued UOM is required'),
  
  body('items.*.rate_per_unit')
    .isFloat({ min: 0 })
    .withMessage('Rate per unit must be a valid number'),
  
  body('items.*.gst_percentage')
    .isFloat({ min: 0, max: 100 })
    .withMessage('GST percentage must be between 0 and 100')
];

// POST /api/inventory/receipt - Create material receipt
router.post('/receipt', materialReceiptValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    console.log('Request body:', req.body);
    throw new AppError('Validation failed', 400, errors.array());
  }

  const {
    vendor_name,
    vendor_invoice_no,
    vendor_invoice_date,
    receipt_date,
    from_location_id,
    from_location_type,
    to_location_id,
    to_location_type,
    items,
    discount_amount = 0,
    notes
  } = req.body;

  // Role-based access control for material receipt creation
  if (req.user.role === 'ADMIN') {
    // Get user's branch information to check if they belong to Main Branch
    const userBranch = await prisma.branch.findUnique({
      where: { id: req.user.branch_id },
      select: { id: true, branch_type: true, company_id: true }
    });

    if (!userBranch) {
      throw new AppError('User branch not found.', 404);
    }

    // Check if ADMIN belongs to Main Branch
    const isMainBranchAdmin = userBranch.branch_type === 'MAIN_BRANCH';

    if (to_location_type === 'WAREHOUSE' && to_location_id === 'central-store') {
      // Allow Main Branch ADMIN to create receipts for central store (Main Branch)
      if (!isMainBranchAdmin) {
        throw new AppError('Access denied. Only Main Branch Admin users can create material receipts for central store.', 403);
      }
    }
    
    if (to_location_type === 'BRANCH' && to_location_id !== req.user.branch_id) {
      // Allow Main Branch ADMIN to create receipts for any branch in their company
      if (!isMainBranchAdmin) {
        throw new AppError('Access denied. Admin users can only create material receipts for their own branch.', 403);
      }
    }
    
    if (to_location_type === 'WAREHOUSE' && to_location_id !== req.user.branch_id) {
      // Allow Main Branch ADMIN to create receipts for Main Branch (warehouse type)
      if (!isMainBranchAdmin) {
        throw new AppError('Access denied. Admin users can only create material receipts for their own branch.', 403);
      }
    }
  }

  // Handle location processing based on type
  let processedLocationId = to_location_id;
  let processedLocationType = to_location_type;
  
  if (to_location_type === 'WAREHOUSE') {
    // For warehouse type, always use BRANCH for Prisma enum
    processedLocationType = 'BRANCH';
    
    // If location_id is 'central-store', find the main branch
    if (to_location_id === 'central-store') {
      const mainBranch = await prisma.branch.findFirst({
        where: {
          company_id: req.user.company_id,
          branch_type: 'MAIN_BRANCH',
          is_active: true
        },
        select: { id: true, name: true }
      });
      
      if (!mainBranch) {
        throw new AppError('No main branch (central store) found for your company. Please create a main branch first.', 400);
      }
      
      processedLocationId = mainBranch.id;
    }
    // Otherwise, use the provided location_id as it should be a valid branch ID
  }
  
  // Ensure processedLocationId is not null or empty
  if (!processedLocationId) {
    throw new AppError(`Location ID is required. Received: to_location_type=${to_location_type}, to_location_id=${to_location_id}`, 400);
  }

  const receipt = await prisma.$transaction(async (tx) => {
    // Calculate totals
    let total_amount = 0;
    let gst_amount = 0;
    
    const processedItems = [];
    
    for (const item of items) {
      // Fetch item details with UOM conversions
      const itemDetails = await tx.item.findUnique({
        where: { id: item.item_id },
        select: { 
          base_uom: true,
          uom_conversions: {
            select: {
              from_uom: true,
              to_uom: true,
              conversion_factor: true
            }
          }
        }
      });
      
      if (!itemDetails) {
        throw new AppError(`Item not found: ${item.item_id}`, 404);
      }
      
      // Validate issued UOM
      const availableUoms = [itemDetails.base_uom];
      itemDetails.uom_conversions.forEach(conversion => {
        if (conversion.from_uom === itemDetails.base_uom) {
          availableUoms.push(conversion.to_uom);
        }
      });
      
      if (!availableUoms.includes(item.issued_uom)) {
        throw new AppError(`Invalid issued UOM '${item.issued_uom}' for item ${item.item_id}. Available UOMs: ${availableUoms.join(', ')}`, 400);
      }
      
      // Calculate required quantity in base UOM for stock checking
      let requiredQtyInBaseUom = item.quantity;
      let conversionFactor = 1;
      
      if (item.issued_uom !== itemDetails.base_uom) {
        // Find conversion factor from issued UOM to base UOM
        const conversion = itemDetails.uom_conversions.find(
          conv => conv.from_uom === itemDetails.base_uom && conv.to_uom === item.issued_uom
        );
        
        if (conversion) {
          // Convert from issued UOM to base UOM
          // If 1 KG = 1000 GRAM, and user issues 500 GRAM, then base qty = 500/1000 = 0.5 KG
          conversionFactor = conversion.conversion_factor;
          requiredQtyInBaseUom = item.quantity / conversionFactor;
        } else {
          throw new AppError(`No conversion found from ${itemDetails.base_uom} to ${item.issued_uom}`, 400);
        }
      }
      
      const itemTotal = item.quantity * item.rate_per_unit;
      const itemDiscount = (item.discount_percent || 0) * itemTotal / 100;
      const discountedAmount = itemTotal - itemDiscount;
      const itemGst = discountedAmount * item.gst_percentage / 100;
      const finalAmount = discountedAmount + itemGst;
      
      total_amount += itemTotal;
      gst_amount += itemGst;
      
      // Create or update material batch
      const batch = await tx.materialBatch.create({
        data: {
          item_id: item.item_id,
          batch_no: item.batch_no || generateTransactionNumber('B'),
          mfg_date: item.mfg_date ? new Date(item.mfg_date) : null,
          expiry_date: item.expiry_date ? new Date(item.expiry_date) : null,
          initial_qty: item.quantity,
          current_qty: item.quantity,
          rate_per_unit: item.rate_per_unit,
          gst_percentage: item.gst_percentage,
          location_type: processedLocationType,
          location_id: processedLocationId
        }
      });
      
      processedItems.push({
        ...item,
        batch_id: batch.id,
        base_uom: itemDetails.base_uom,
        discount_amount: itemDiscount,
        gst_amount: itemGst,
        total_amount: finalAmount
      });
    }
    
    const net_amount = total_amount - discount_amount + gst_amount;
    
    // Create material receipt
    const receiptData = {
      receipt_no: generateTransactionNumber('MR'),
      vendor_name,
      vendor_invoice_no,
      vendor_invoice_date: vendor_invoice_date ? new Date(vendor_invoice_date) : null,
      receipt_date: new Date(receipt_date),
      to_location_id: processedLocationId,
      to_location_type: processedLocationType,
      total_amount,
      discount_amount,
      gst_amount,
      net_amount,
      created_by: req.user.id,
      approved_by: req.user.id, // Auto-approve and set approved_by
      status: 'APPROVED' // Auto-approve for now
    };
    
    // Only set from_location fields if they are provided (for internal transfers)
    if (from_location_type && from_location_id) {
      receiptData.from_location_type = from_location_type;
      receiptData.from_location_id = from_location_id;
    }
    
    const receipt = await tx.materialReceipt.create({
      data: receiptData
    });
    
    // Create receipt items
    for (const item of processedItems) {
      await tx.materialReceiptItem.create({
        data: {
          receipt_id: receipt.id,
          item_id: item.item_id,
          batch_id: item.batch_id,
          quantity: item.quantity,
          uom: item.base_uom,
          rate_per_unit: item.rate_per_unit,
          discount_percent: item.discount_percent || 0,
          discount_amount: item.discount_amount,
          gst_percentage: item.gst_percentage,
          gst_amount: item.gst_amount,
          total_amount: item.total_amount
        }
      });
      
      // Update stock ledger with enhanced audit trail
      const auditInfo = extractAuditInfo(req);
      auditInfo.reference_no = receipt.receipt_no;
      auditInfo.notes = `Material receipt: ${receipt.vendor_name || 'Internal transfer'}`;
      
      await createStockLedgerEntry({
        item_id: item.item_id,
        batch_id: item.batch_id,
        location_type: processedLocationType,
        location_id: processedLocationId,
        transaction_type: 'RECEIPT',
        transaction_id: receipt.id,
        transaction_date: new Date(receipt_date),
        quantity_in: item.quantity,
        quantity_out: null,
        balance_quantity: item.quantity,
        rate_per_unit: item.rate_per_unit,
        balance_value: item.total_amount,
        created_by: req.user.id,
        auditInfo
      }, tx);
    }
    
    return receipt;
  });

  logger.info(`Material receipt created: ${receipt.receipt_no}`, {
    receiptId: receipt.id,
    userId: req.user.id
  });

  res.status(201).json({
    success: true,
    message: 'Material receipt created successfully',
    data: receipt
  });
}));

// Validation rules for material issue
const materialIssueValidation = [
  body('from_location_id')
    .notEmpty()
    .withMessage('Source location is required'),
  
  body('from_location_type')
    .isIn(['COMPANY', 'BRANCH'])
    .withMessage('Invalid source location type'),
  
  body('to_location_id')
    .notEmpty()
    .withMessage('Destination location is required'),
  
  body('to_location_type')
    .isIn(['BRANCH', 'TECHNICIAN'])
    .withMessage('Invalid destination location type'),
  
  body('issue_date')
    .isISO8601()
    .withMessage('Please provide a valid issue date'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  
  body('items.*.item_id')
    .notEmpty()
    .withMessage('Item ID is required'),
  
  body('items.*.quantity')
    .isFloat({ min: 0.001 })
    .withMessage('Quantity must be greater than 0'),

  body('items.*.issued_uom')
    .optional()
    .notEmpty()
    .withMessage('Issued UOM cannot be empty if provided')
];

// POST /api/inventory/issue - Create material issue with role-based logic
router.post('/issue', materialIssueValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, errors.array());
  }

  const {
    to_location_id,
    to_location_type,
    issue_date,
    items,
    purpose,
    remarks,
    from_location_id: frontend_from_location_id
  } = req.body;

  // Role-based validation and location setup
  let from_location_id, from_location_type;
  
  if (req.user.role === 'SUPERADMIN') {
    // Superadmin can issue from any branch within their company
    // The from_location_id should be a valid branch ID from the frontend
    from_location_type = 'BRANCH';
    from_location_id = frontend_from_location_id; // Use the provided location from frontend
    
    if (to_location_type !== 'BRANCH') {
      throw new AppError('Superadmin can only issue materials to branches', 400);
    }
    
    // Verify both source and target branches belong to the same company
    const [sourceBranch, targetBranch] = await Promise.all([
      prisma.branch.findFirst({
        where: { id: from_location_id, company_id: req.user.company_id }
      }),
      prisma.branch.findFirst({
        where: { id: to_location_id, company_id: req.user.company_id }
      })
    ]);
    
    if (!sourceBranch) {
      throw new AppError('Invalid source branch', 400);
    }
    
    if (!targetBranch) {
      throw new AppError('Invalid target branch', 400);
    }
  } else if (req.user.role === 'ADMIN') {
    // Admin issues from Branch Store to Technician
    from_location_type = 'BRANCH';
    from_location_id = req.user.branch_id;
    
    if (to_location_type !== 'TECHNICIAN') {
      throw new AppError('Admin can only issue materials to technicians', 400);
    }
    
    // Verify the target technician belongs to the same company
    const targetTechnician = await prisma.staff.findFirst({
      where: { 
        id: to_location_id, 
        company_id: req.user.company_id,
        role: 'TECHNICIAN',
        is_active: true
      }
    });
    
    if (!targetTechnician) {
      throw new AppError('Invalid target technician', 400);
    }
  } else {
    throw new AppError('Insufficient permissions to create material issues', 403);
  }

  // Validate all referenced IDs exist before starting transaction
  try {
    // Validate source and destination locations exist
    if (from_location_type === 'BRANCH') {
      const sourceBranch = await prisma.branch.findUnique({
        where: { id: from_location_id },
        select: { id: true, name: true, is_active: true }
      });
      if (!sourceBranch || !sourceBranch.is_active) {
        throw new AppError(`Source branch not found or inactive: ${from_location_id}`, 400);
      }
    }
    
    if (to_location_type === 'BRANCH') {
      const targetBranch = await prisma.branch.findUnique({
        where: { id: to_location_id },
        select: { id: true, name: true, is_active: true }
      });
      if (!targetBranch || !targetBranch.is_active) {
        throw new AppError(`Target branch not found or inactive: ${to_location_id}`, 400);
      }
    } else if (to_location_type === 'TECHNICIAN') {
      const technician = await prisma.staff.findUnique({
        where: { 
          id: to_location_id,
          company_id: req.user.company_id
        },
        select: { id: true, name: true, is_active: true, role: true, company_id: true }
      });
      if (!technician || !technician.is_active || technician.role !== 'TECHNICIAN') {
        throw new AppError('Invalid technician assignment. The specified technician does not exist or is not active. Please select a valid technician from the dropdown.', 400);
      }
    }
    
    // Validate all items exist and are active
    const itemIds = items.map(item => item.item_id);
    const existingItems = await prisma.item.findMany({
      where: {
        id: { in: itemIds },
        is_active: true,
        company_id: req.user.company_id
      },
      select: { id: true, name: true }
    });
    
    const missingItems = itemIds.filter(id => !existingItems.find(item => item.id === id));
    if (missingItems.length > 0) {
      throw new AppError(`Items not found or inactive: ${missingItems.join(', ')}`, 400);
    }
  } catch (validationError) {
    // Re-throw validation errors
    throw validationError;
  }

  const issue = await prisma.$transaction(async (tx) => {
    try {
    // Check stock availability using FEFO
    const issueItems = [];
    
    for (const item of items) {
      // Fetch item details to get base_uom and uom_conversions
      const itemDetails = await tx.item.findUnique({
        where: { id: item.item_id },
        select: { 
          base_uom: true,
          uom_conversions: {
            select: {
              from_uom: true,
              to_uom: true,
              conversion_factor: true
            }
          }
        }
      });
      
      if (!itemDetails) {
        throw new AppError(`Item not found: ${item.item_id}`, 404);
      }
      
      // Calculate required quantity in base UOM for stock checking
      let requiredQtyInBaseUom = item.quantity;
      let conversionFactor = 1;
      
      if (item.issued_uom && item.issued_uom !== itemDetails.base_uom) {
        // Find conversion factor from issued UOM to base UOM
        const conversion = itemDetails.uom_conversions.find(
          conv => conv.from_uom === itemDetails.base_uom && conv.to_uom === item.issued_uom
        );
        
        if (conversion) {
          // Convert from issued UOM to base UOM
          // If 1 KG = 1000 GRAM, and user issues 500 GRAM, then base qty = 500/1000 = 0.5 KG
          conversionFactor = conversion.conversion_factor;
          requiredQtyInBaseUom = item.quantity / conversionFactor;
        } else {
          throw new AppError(`No conversion found from ${itemDetails.base_uom} to ${item.issued_uom}`, 400);
        }
      }
      
      let selectedBatches = [];
      let shortfall = 0;
      
      if (item.batch_id) {
        // Use specific batch if provided
        console.log(`Looking for batch ${item.batch_id} for item ${item.item_id}`);
        console.log(`Location: ${from_location_id}, Type: ${from_location_type}`);
        
        const specificBatch = await tx.materialBatch.findUnique({
          where: { 
            id: item.batch_id
          }
        });
        
        console.log('Found batch:', specificBatch);
        
        if (!specificBatch) {
          throw new AppError(`Batch ${item.batch_id} not found for item ${item.item_id}`, 400);
        }
        
        // Check all conditions separately for better error messages
        if (specificBatch.item_id !== item.item_id) {
          throw new AppError(`Batch ${item.batch_id} does not belong to item ${item.item_id}`, 400);
        }
        
        if (specificBatch.location_id !== from_location_id) {
          throw new AppError(`Batch ${item.batch_id} is not in the specified location ${from_location_id}. Current location: ${specificBatch.location_id}`, 400);
        }
        
        if (specificBatch.location_type !== from_location_type) {
          throw new AppError(`Batch ${item.batch_id} is not in the specified location type ${from_location_type}. Current type: ${specificBatch.location_type}`, 400);
        }
        
        if (specificBatch.current_qty <= 0) {
          throw new AppError(`Batch ${item.batch_id} has no available stock. Current quantity: ${specificBatch.current_qty}`, 400);
        }
        
        if (specificBatch.is_expired) {
          throw new AppError(`Batch ${item.batch_id} has expired`, 400);
        }
        
        if (specificBatch.current_qty < requiredQtyInBaseUom) {
          throw new AppError(`Insufficient stock in specified batch for item ${item.item_id}. Available: ${specificBatch.current_qty}, Required: ${requiredQtyInBaseUom} (${item.quantity} ${item.issued_uom})`, 400);
        }
        
        selectedBatches = [{
          ...specificBatch,
          allocated_qty: requiredQtyInBaseUom
        }];
      } else {
        // Use FEFO logic if no specific batch is provided
        const result = await getAvailableBatches(
          item.item_id,
          from_location_id,
          from_location_type,
          requiredQtyInBaseUom
        );
        selectedBatches = result.selectedBatches;
        shortfall = result.shortfall;
        
        if (shortfall > 0) {
          throw new AppError(`Insufficient stock for item ${item.item_id}. Short by ${shortfall} ${itemDetails.base_uom} (${item.quantity} ${item.issued_uom})`, 400);
        }
      }
      
      issueItems.push({ 
        ...item, 
        base_uom: itemDetails.base_uom, 
        batches: selectedBatches,
        original_quantity: item.quantity,
        original_uom: item.issued_uom,
        converted_quantity: requiredQtyInBaseUom,
        conversionFactor: conversionFactor
      });
    }
    
    // Create material issue with AWAITING_APPROVAL status
    const issue = await tx.materialIssue.create({
      data: {
        issue_no: generateTransactionNumber('MI'),
        issue_date: new Date(issue_date),
        from_location_id,
        from_location_type,
        to_location_id,
        to_location_type,
        purpose,
        remarks,
        created_by: req.user.id,
        status: 'AWAITING_APPROVAL'
      }
    });
    
    // Process each item and its batches
    const createdIssueItems = [];
    for (const item of issueItems) {
      // Get conversion factor for this item (stored during stock checking)
      const conversionFactor = item.conversionFactor || 1;
      
      for (const batch of item.batches) {
        // Calculate amount based on UOM conversion formula: (item.quantity / conversionFactor) * rate_per_unit
        const baseAmount = (item.quantity / conversionFactor) * batch.rate_per_unit;
        const gstAmount = (baseAmount * (batch.gst_percentage || 0)) / 100;
        const totalAmount = baseAmount + gstAmount;
        
        // Create issue item with original issued quantity and UOM
        const createdIssueItem = await tx.materialIssueItem.create({
          data: {
            issue_id: issue.id,
            item_id: item.item_id,
            batch_id: batch.id,
            quantity: item.original_quantity,
            uom: item.original_uom,
            rate_per_unit: batch.rate_per_unit,
            base_amount: baseAmount,
            gst_amount: gstAmount,
            total_amount: totalAmount
          }
        });
        
        createdIssueItems.push(createdIssueItem);
        
        // Deduct stock immediately from source location
        await tx.materialBatch.update({
          where: { id: batch.id },
          data: {
            current_qty: {
              decrement: batch.allocated_qty
            }
          }
        });
        
        // Create stock ledger entry for outward movement with enhanced audit trail
        const auditInfo = extractAuditInfo(req);
        auditInfo.reference_no = issue.issue_no;
        auditInfo.notes = `Material issue to ${to_location_type === 'BRANCH' ? 'branch' : 'technician'}: ${issue.issued_to}`;
        
        await createStockLedgerEntry({
           item_id: item.item_id,
           batch_id: batch.id,
           location_type: from_location_type,
           location_id: from_location_id,
           transaction_type: 'ISSUE',
           transaction_id: issue.id,
           transaction_date: new Date(issue_date),
           quantity_in: null,
           quantity_out: batch.allocated_qty,
           balance_quantity: batch.current_qty - batch.allocated_qty,
           rate_per_unit: batch.rate_per_unit,
           balance_value: -(batch.allocated_qty * batch.rate_per_unit),
           created_by: req.user.id,
           auditInfo
         }, tx);
      }
    }
    
    // Create approval record
    const approval = await tx.materialApproval.create({
      data: {
        issue_id: issue.id,
        assigned_to_type: to_location_type,
        assigned_to_id: to_location_id,
        status: 'PENDING',
        approval_items: {
          create: createdIssueItems.map(issueItem => ({
            issue_item_id: issueItem.id,
            original_quantity: issueItem.quantity,
            original_uom: issueItem.uom,
            original_base_amount: issueItem.base_amount,
            original_gst_amount: issueItem.gst_amount,
            original_total_amount: issueItem.total_amount,
            status: 'PENDING'
          }))
        }
      },
      include: {
        approval_items: true
      }
    });
    
      return issue;
    } catch (error) {
      // Provide more specific error messages based on the type of error
      if (error.code === 'P2002') {
        throw new AppError('Duplicate material issue detected. Please check if this issue already exists.', 409);
      } else if (error.code === 'P2003') {
         // Extract field name from Prisma error meta
         const fieldName = error.meta?.field_name || 'unknown field';
         let specificMessage = 'Invalid reference data';
         
         if (fieldName.includes('item_id')) {
           specificMessage = 'Invalid item ID. The specified item does not exist or is not active.';
         } else if (fieldName.includes('batch_id')) {
           specificMessage = 'Invalid batch ID. The specified batch does not exist or has insufficient stock.';
         } else if (fieldName.includes('location_id') || fieldName.includes('branch_id')) {
           specificMessage = 'Invalid location ID. The specified branch or location does not exist.';
         } else if (fieldName.includes('assigned_to_id')) {
           if (to_location_type === 'BRANCH') {
             specificMessage = 'Invalid destination branch. The specified branch does not exist or you do not have access to it. Please select a valid branch from the dropdown.';
           } else if (to_location_type === 'TECHNICIAN') {
             specificMessage = 'Invalid technician assignment. The specified technician does not exist or is not active. Please select a valid technician from the dropdown.';
           } else {
             specificMessage = 'Invalid assignment target. Please verify the destination and try again.';
           }
         } else if (fieldName.includes('created_by') || fieldName.includes('user_id')) {
           specificMessage = 'Invalid user reference. Please log in again and try.';
         } else if (fieldName.includes('company_id')) {
           specificMessage = 'Invalid company reference. Please contact system administrator.';
         } else {
           specificMessage = `Invalid reference in field: ${fieldName}. Please verify the data and try again.`;
         }
         
         throw new AppError(specificMessage, 400);
      } else if (error.code === 'P2025') {
        throw new AppError('Required data not found. Please verify all items, batches, and locations exist.', 404);
      } else if (error.message && error.message.includes('original_uom')) {
        throw new AppError('UOM validation failed. Please ensure all items have valid unit of measurement.', 400);
      } else if (error.message && error.message.includes('Insufficient stock')) {
        throw new AppError(error.message, 400);
      } else if (error.message && error.message.includes('Invalid')) {
        throw new AppError(error.message, 400);
      } else {
        logger.error('Material issue creation failed:', {
          error: error.message,
          stack: error.stack,
          userId: req.user.id,
          requestData: { to_location_id, to_location_type, from_location_id, items }
        });
        throw new AppError('Failed to create material issue. Please check your data and try again.', 500);
      }
    }
  });

  logger.info(`Material issue created: ${issue.issue_no}`, {
    issueId: issue.id,
    userId: req.user.id,
    fromLocation: `${from_location_type}:${from_location_id}`,
    toLocation: `${to_location_type}:${to_location_id}`
  });

  res.status(201).json({
    success: true,
    message: 'Material issue created successfully and awaiting approval',
    data: issue
  });
}));

// GET /api/inventory/approvals - Get material approvals for current user
router.get('/approvals', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status = 'PENDING' } = req.query;
  
  let where = {
    status: status.toUpperCase()
  };
  
  // Role-based filtering for who can see approvals
  if (req.user.role === 'INVENTORY_MANAGER') {
    // Inventory Manager sees approvals assigned to their branch
    where.assigned_to_type = 'BRANCH';
    where.assigned_to_id = req.user.branch_id;
  } else if (req.user.role === 'TECHNICIAN') {
    // Technician sees approvals assigned to them
    where.assigned_to_type = 'TECHNICIAN';
    where.assigned_to_id = req.user.id;
  } else {
    throw new AppError('Insufficient permissions to view approvals', 403);
  }
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [approvals, totalCount] = await Promise.all([
    prisma.materialApproval.findMany({
      where,
      include: {
        issue: {
          include: {
            from_branch: {
              select: { name: true, city: true }
            },
            created_by_staff: {
              select: { name: true, email: true }
            }
          }
        },
        approval_items: {
          include: {
            issue_item: {
              include: {
                item: {
                  select: { name: true, category: true, base_uom: true }
                },
                batch: {
                  select: { batch_no: true, expiry_date: true, gst_percentage: true }
                }
              }
            }
          }
        },
        approved_by_staff: {
          select: { name: true, email: true }
        },
        _count: {
          select: { approval_items: true }
        }
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: parseInt(limit)
    }),
    prisma.materialApproval.count({ where })
  ]);
  
  res.json({
    success: true,
    data: {
      approvals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    }
  });
}));

// GET /api/inventory/approvals/:id - Get specific approval details
router.get('/approvals/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const approval = await prisma.materialApproval.findUnique({
    where: { id },
    include: {
      issue: {
        include: {
          from_branch: {
            select: { name: true, city: true, address: true }
          },
          created_by_staff: {
            select: { name: true, email: true, mobile: true }
          }
        }
      },
      approval_items: {
        include: {
          issue_item: {
            include: {
              item: {
                select: { 
                  name: true, 
                  category: true, 
                  base_uom: true,
                  uom_conversions: {
                    select: {
                      id: true,
                      from_uom: true,
                      to_uom: true,
                      conversion_factor: true
                    }
                  }
                }
              },
              batch: {
                select: { batch_no: true, expiry_date: true, gst_percentage: true, rate_per_unit: true }
              }
            }
          }
        }
      },
      approved_by_staff: {
        select: { name: true, email: true }
      },
      _count: {
        select: { approval_items: true }
      }
    }
  });
  
  if (!approval) {
    throw new AppError('Approval not found', 404);
  }
  
  // Check if user has permission to view this approval
  const canView = (
    (req.user.role === 'INVENTORY_MANAGER' && approval.assigned_to_type === 'BRANCH' && approval.assigned_to_id === req.user.branch_id) ||
    (req.user.role === 'TECHNICIAN' && approval.assigned_to_type === 'TECHNICIAN' && approval.assigned_to_id === req.user.id)
  );
  
  if (!canView) {
    throw new AppError('Insufficient permissions to view this approval', 403);
  }
  
  res.json({
    success: true,
    data: approval
  });
}));

// POST /api/inventory/approvals/:id/approve - Approve material issue
router.post('/approvals/:id/approve', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { remarks } = req.body;
  
  const result = await prisma.$transaction(async (tx) => {
    // Get approval with all related data
    const approval = await tx.materialApproval.findUnique({
      where: { id },
      include: {
        issue: {
          include: {
            issue_items: {
              include: {
                batch: true,
                item: true
              }
            }
          }
        },
        approval_items: {
          include: {
            issue_item: {
              include: {
                batch: true
              }
            }
          }
        }
      }
    });
    
    if (!approval) {
      throw new AppError('Approval not found', 404);
    }
    
    if (approval.status !== 'PENDING') {
      throw new AppError('Approval has already been processed', 400);
    }
    
    // Check permissions
    const canApprove = (
      (req.user.role === 'INVENTORY_MANAGER' && approval.assigned_to_type === 'BRANCH' && approval.assigned_to_id === req.user.branch_id) ||
      (req.user.role === 'TECHNICIAN' && approval.assigned_to_type === 'TECHNICIAN' && approval.assigned_to_id === req.user.id)
    );
    
    if (!canApprove) {
      throw new AppError('Insufficient permissions to approve this request', 403);
    }
    
    // Update approval status
    const updatedApproval = await tx.materialApproval.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approved_by: req.user.id,
        approved_at: new Date(),
        remarks
      }
    });
    
    // Update all approval items to approved using raw SQL to copy original values
    await tx.$executeRaw`
      UPDATE material_approval_items 
      SET status = 'APPROVED',
          approved_quantity = original_quantity,
          approved_base_amount = original_base_amount,
          approved_gst_amount = original_gst_amount,
          approved_total_amount = original_total_amount
      WHERE approval_id = ${id}
    `;
    
    // Update material issue status
    await tx.materialIssue.update({
      where: { id: approval.issue_id },
      data: {
        status: 'APPROVED',
        approved_by: req.user.id,
        approval_date: new Date()
      }
    });
    
    return updatedApproval;
  });
  
  logger.info(`Material issue approved`, {
    approvalId: id,
    issueId: result.issue_id,
    approvedBy: req.user.id
  });
  
  res.json({
    success: true,
    message: 'Material issue approved successfully',
    data: result
  });
}));

// POST /api/inventory/approvals/:id/reject - Reject material issue
router.post('/approvals/:id/reject', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rejection_reason, remarks } = req.body;
  
  if (!rejection_reason) {
    throw new AppError('Rejection reason is required', 400);
  }
  
  const result = await prisma.$transaction(async (tx) => {
    // Get approval
    const approval = await tx.materialApproval.findUnique({
      where: { id },
      include: {
        issue: {
          include: {
            issue_items: {
              include: {
                batch: true
              }
            }
          }
        }
      }
    });
    
    if (!approval) {
      throw new AppError('Approval not found', 404);
    }
    
    if (approval.status !== 'PENDING') {
      throw new AppError('Approval has already been processed', 400);
    }
    
    // Check permissions
    const canReject = (
      (req.user.role === 'INVENTORY_MANAGER' && approval.assigned_to_type === 'BRANCH' && approval.assigned_to_id === req.user.branch_id) ||
      (req.user.role === 'TECHNICIAN' && approval.assigned_to_type === 'TECHNICIAN' && approval.assigned_to_id === req.user.id)
    );
    
    if (!canReject) {
      throw new AppError('Insufficient permissions to reject this request', 403);
    }
    
    // Update approval status
    const updatedApproval = await tx.materialApproval.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approved_by: req.user.id,
        approved_at: new Date(),
        rejection_reason,
        remarks
      }
    });
    
    // Update all approval items to rejected
    await tx.materialApprovalItem.updateMany({
      where: { approval_id: id },
      data: {
        status: 'REJECTED'
      }
    });
    
    // Update material issue status
    await tx.materialIssue.update({
      where: { id: approval.issue_id },
      data: {
        status: 'REJECTED',
        approved_by: req.user.id,
        approval_date: new Date(),
        rejection_reason
      }
    });
    
    // Restore stock for rejected items with proper UOM conversion
    for (const issueItem of approval.issue.issue_items) {
      // Get item details for UOM conversion
      const itemDetails = await tx.item.findUnique({
        where: { id: issueItem.item_id },
        select: {
          base_uom: true,
          uom_conversions: {
            select: {
              from_uom: true,
              to_uom: true,
              conversion_factor: true
            }
          }
        }
      });

      if (!itemDetails) {
        throw new AppError(`Item not found: ${issueItem.item_id}`, 404);
      }

      // Convert issued quantity to base UOM for stock restoration
      let quantityToRestore = issueItem.quantity;
      
      if (issueItem.uom !== itemDetails.base_uom) {
        // Find conversion factor from issued UOM to base UOM
        const conversion = itemDetails.uom_conversions.find(
          conv => conv.from_uom === itemDetails.base_uom && conv.to_uom === issueItem.uom
        );
        
        if (conversion) {
          // Convert from issued UOM to base UOM
          // If 1 KG = 1000 GRAM, and issued 500 GRAM, then base qty = 500/1000 = 0.5 KG
          quantityToRestore = issueItem.quantity / conversion.conversion_factor;
        } else {
          throw new AppError(`No conversion found from ${itemDetails.base_uom} to ${issueItem.uom}`, 400);
        }
      }

      await tx.materialBatch.update({
        where: { id: issueItem.batch_id },
        data: {
          current_qty: {
            increment: quantityToRestore
          }
        }
      });
    }
    
    return updatedApproval;
  });
  
  logger.info(`Material issue rejected`, {
    approvalId: id,
    issueId: result.issue_id,
    rejectedBy: req.user.id,
    reason: rejection_reason
  });
  
  res.json({
    success: true,
    message: 'Material issue rejected successfully',
    data: result
  });
}));

// POST /api/inventory/approvals/:id/partial-accept - Partially accept material issue
router.post('/approvals/:id/partial-accept', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { items, remarks } = req.body;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new AppError('Items array is required for partial acceptance', 400);
  }
  
  const result = await prisma.$transaction(async (tx) => {
    // Get approval with all related data
    const approval = await tx.materialApproval.findUnique({
      where: { id },
      include: {
        issue: {
          include: {
            issue_items: {
              include: {
                batch: true,
                item: {
                  include: {
                    uom_conversions: true
                  }
                }
              }
            }
          }
        },
        approval_items: {
          include: {
            issue_item: {
              include: {
                batch: true,
                item: {
                  include: {
                    uom_conversions: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    if (!approval) {
      throw new AppError('Approval not found', 404);
    }
    
    if (approval.status !== 'PENDING') {
      throw new AppError('Approval has already been processed', 400);
    }
    
    // Check permissions
    const canPartialAccept = (
      (req.user.role === 'INVENTORY_MANAGER' && approval.assigned_to_type === 'BRANCH' && approval.assigned_to_id === req.user.branch_id) ||
      (req.user.role === 'TECHNICIAN' && approval.assigned_to_type === 'TECHNICIAN' && approval.assigned_to_id === req.user.id)
    );
    
    if (!canPartialAccept) {
      throw new AppError('Insufficient permissions to partially accept this request', 403);
    }
    
    let hasApprovedItems = false;
    let hasRejectedItems = false;
    
    // Process each item
    for (const itemUpdate of items) {
      const { approval_item_id, status, approved_quantity, approved_uom, approved_gst_amount, approved_total_amount } = itemUpdate;
      
      const approvalItem = approval.approval_items.find(ai => ai.id === approval_item_id);
      if (!approvalItem) {
        throw new AppError(`Approval item ${approval_item_id} not found`, 400);
      }
      
      if (status === 'APPROVED') {
        hasApprovedItems = true;
        
        // Validate approved quantity
        if (!approved_quantity || approved_quantity <= 0) {
          throw new AppError(`Invalid approved quantity for item ${approvalItem.issue_item.item.name}`, 400);
        }
        
        if (approved_quantity > approvalItem.original_quantity) {
          throw new AppError(`Approved quantity cannot exceed original quantity for item ${approvalItem.issue_item.item.name}`, 400);
        }
        
        // Convert approved quantity to base UOM if needed
        let approvedQuantityInBaseUOM = approved_quantity;
        if (approved_uom && approved_uom !== approvalItem.issue_item.item.base_uom) {
          // Try direct conversion first (approved_uom to base_uom)
          let conversion = approvalItem.issue_item.item.uom_conversions.find(
            c => c.from_uom === approved_uom && c.to_uom === approvalItem.issue_item.item.base_uom
          );
          
          if (conversion) {
            // Direct conversion found
            approvedQuantityInBaseUOM = approved_quantity * conversion.conversion_factor;
          } else {
            // Try reverse conversion (base_uom to approved_uom)
            conversion = approvalItem.issue_item.item.uom_conversions.find(
              c => c.from_uom === approvalItem.issue_item.item.base_uom && c.to_uom === approved_uom
            );
            
            if (conversion) {
              // Reverse conversion found - divide by factor
              approvedQuantityInBaseUOM = approved_quantity / conversion.conversion_factor;
            } else {
              throw new AppError(`UOM conversion not found from ${approved_uom} to ${approvalItem.issue_item.item.base_uom}`, 400);
            }
          }
        }
        
        // Calculate base amount based on approved quantity
        const ratePerUnit = approvalItem.issue_item.batch.rate_per_unit;
        const calculatedBaseAmount = approvedQuantityInBaseUOM * ratePerUnit;
        
        // Update approval item
        await tx.materialApprovalItem.update({
          where: { id: approval_item_id },
          data: {
            status: 'APPROVED',
            approved_quantity: approvedQuantityInBaseUOM,
            approved_uom: approved_uom || approvalItem.issue_item.item.base_uom,
            approved_base_amount: calculatedBaseAmount,
            approved_gst_amount: approved_gst_amount || (calculatedBaseAmount * approvalItem.issue_item.batch.gst_percentage / 100),
            approved_total_amount: approved_total_amount || (calculatedBaseAmount + (calculatedBaseAmount * approvalItem.issue_item.batch.gst_percentage / 100))
          }
        });
        
        // Update stock allocation - adjust for difference in quantity
        const quantityDifference = approvalItem.original_quantity - approvedQuantityInBaseUOM;
        if (quantityDifference > 0) {
          // Increase current stock for rejected portion
          await tx.materialBatch.update({
            where: { id: approvalItem.issue_item.batch_id },
            data: {
              current_qty: {
                increment: quantityDifference
              }
            }
          });
        }
        
      } else if (status === 'REJECTED') {
        hasRejectedItems = true;
        
        // Update approval item
        await tx.materialApprovalItem.update({
          where: { id: approval_item_id },
          data: {
            status: 'REJECTED'
          }
        });
        
        // Restore full stock for rejected item
        await tx.materialBatch.update({
          where: { id: approvalItem.issue_item.batch_id },
          data: {
            current_qty: {
              increment: approvalItem.original_quantity
            }
          }
        });
      }
    }
    
    // Determine overall approval status
    let overallStatus = 'PARTIAL';
    if (hasApprovedItems && !hasRejectedItems) {
      overallStatus = 'APPROVED';
    } else if (!hasApprovedItems && hasRejectedItems) {
      overallStatus = 'REJECTED';
    }
    
    // Update approval status
    const updatedApproval = await tx.materialApproval.update({
      where: { id },
      data: {
        status: overallStatus,
        approved_by: req.user.id,
        approved_at: new Date(),
        remarks
      }
    });
    
    // Update material issue status
    await tx.materialIssue.update({
      where: { id: approval.issue_id },
      data: {
        status: overallStatus,
        approved_by: req.user.id,
        approval_date: new Date()
      }
    });
    
    return updatedApproval;
  });
  
  logger.info(`Material issue partially accepted`, {
    approvalId: id,
    issueId: result.issue_id,
    processedBy: req.user.id
  });
  
  res.json({
    success: true,
    message: 'Material issue processed successfully',
    data: result
  });
}));

// GET /api/inventory/issues/pending - Get pending material issues for approval
router.get('/issues/pending', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  
  let where = {
    status: 'AWAITING_APPROVAL'
  };
  
  // Role-based filtering for who can see pending issues
  if (req.user.role === 'ADMIN') {
    // Admin sees issues from their company
    where.company_id = req.user.company_id;
  } else if (req.user.role === 'AREA_MANAGER') {
    // Area Manager sees issues sent to their branch
    where.to_location_type = 'BRANCH';
    where.to_location_id = req.user.branch_id;
  } else if (req.user.role === 'TECHNICIAN') {
    // Technician sees issues sent to them
    where.to_location_type = 'TECHNICIAN';
    where.to_location_id = req.user.id;
  } else {
    throw new AppError('Insufficient permissions to view pending issues', 403);
  }
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [issues, totalCount] = await Promise.all([
    prisma.materialIssue.findMany({
      where,
      include: {
        issue_items: {
          include: {
            item: {
              select: {
                name: true,
                category: true,
                base_uom: true
              }
            },
            batch: {
              select: {
                batch_no: true,
                expiry_date: true
              }
            }
          }
        },
        created_by_staff: {
          select: {
            name: true,
            role: true
          }
        },
        from_branch: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      skip,
      take: parseInt(limit)
    }),
    prisma.materialIssue.count({ where })
  ]);
  
  res.json({
    success: true,
    data: issues,
    pagination: {
      current_page: parseInt(page),
      total_pages: Math.ceil(totalCount / parseInt(limit)),
      total_records: totalCount,
      per_page: parseInt(limit)
    }
  });
}));

// PUT /api/inventory/issues/:id/approve - Approve material issue
router.put('/issues/:id/approve', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { remarks } = req.body;
  
  const issue = await prisma.materialIssue.findFirst({
    where: {
      id,
      status: 'AWAITING_APPROVAL'
    },
    include: {
      issue_items: {
        include: {
          item: true,
          batch: true
        }
      },
      created_by_staff: {
        select: {
          company_id: true
        }
      }
    }
  });
  
  if (!issue) {
    throw new AppError('Material issue not found or already processed', 404);
  }
  
  // Verify user has permission to approve this issue
  if (req.user.role === 'ADMIN' && issue.created_by_staff.company_id === req.user.company_id) {
    // Admin can approve issues from their company
  } else if (req.user.role === 'AREA_MANAGER' && issue.to_location_type === 'BRANCH' && issue.to_location_id === req.user.branch_id) {
    // Area Manager can approve issues sent to their branch
  } else if (req.user.role === 'TECHNICIAN' && issue.to_location_type === 'TECHNICIAN' && issue.to_location_id === req.user.id) {
    // Technician can approve issues sent to them
  } else {
    throw new AppError('Insufficient permissions to approve this issue', 403);
  }
  
  await prisma.$transaction(async (tx) => {
    // Update issue status to RECEIVED
    await tx.materialIssue.update({
      where: { id },
      data: {
        status: 'RECEIVED',
        approved_by: req.user.id,
        approval_date: new Date(),
        remarks: remarks || issue.remarks
      }
    });
    
    // Create batches at destination and update stock ledger
    for (const issueItem of issue.issue_items) {
      const batch = issueItem.batch;
      
      // Create or update batch at destination
      await tx.materialBatch.upsert({
        where: {
          item_id_batch_no_location_type_location_id: {
            item_id: issueItem.item_id,
            batch_no: batch.batch_no,
            location_type: issue.to_location_type,
            location_id: issue.to_location_id
          }
        },
        create: {
          item_id: issueItem.item_id,
          batch_no: batch.batch_no,
          mfg_date: batch.mfg_date,
          expiry_date: batch.expiry_date,
          initial_qty: issueItem.quantity,
          current_qty: issueItem.quantity,
          rate_per_unit: batch.rate_per_unit,
          gst_percentage: batch.gst_percentage,
          location_type: issue.to_location_type,
          location_id: issue.to_location_id
        },
        update: {
          current_qty: {
            increment: issueItem.quantity
          }
        }
      });
      
      // Create stock ledger entry for inward movement at destination with enhanced audit trail
      const auditInfo = extractAuditInfo(req);
      auditInfo.reference_no = issue.issue_no;
      auditInfo.notes = `Material issue approved - received at ${issue.to_location_type === 'BRANCH' ? 'branch' : 'technician'}: ${issue.issued_to}`;
      
      await createStockLedgerEntry({
        item_id: issueItem.item_id,
        batch_id: batch.id,
        location_type: issue.to_location_type,
        location_id: issue.to_location_id,
        transaction_type: 'ISSUE',
        transaction_id: issue.id,
        transaction_date: new Date(),
        quantity_in: issueItem.quantity,
        quantity_out: null,
        balance_quantity: issueItem.quantity,
        rate_per_unit: batch.rate_per_unit,
        balance_value: issueItem.quantity * batch.rate_per_unit,
        created_by: req.user.id,
        auditInfo
      }, tx);
    }
  });
  
  logger.info(`Material issue approved: ${issue.issue_no}`, {
    issueId: issue.id,
    approvedBy: req.user.id
  });
  
  res.json({
    success: true,
    message: 'Material issue approved successfully'
  });
}));

// PUT /api/inventory/issues/:id/reject - Reject material issue
router.put('/issues/:id/reject', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rejection_reason } = req.body;
  
  if (!rejection_reason) {
    throw new AppError('Rejection reason is required', 400);
  }
  
  const issue = await prisma.materialIssue.findFirst({
    where: {
      id,
      status: 'AWAITING_APPROVAL'
    },
    include: {
      issue_items: {
        include: {
          batch: true
        }
      },
      created_by_staff: {
        select: {
          company_id: true
        }
      }
    }
  });
  
  if (!issue) {
    throw new AppError('Material issue not found or already processed', 404);
  }
  
  // Verify user has permission to reject this issue
  if (req.user.role === 'ADMIN' && issue.created_by_staff.company_id === req.user.company_id) {
    // Admin can reject issues from their company
  } else if (req.user.role === 'AREA_MANAGER' && issue.to_location_type === 'BRANCH' && issue.to_location_id === req.user.branch_id) {
    // Area Manager can reject issues sent to their branch
  } else if (req.user.role === 'TECHNICIAN' && issue.to_location_type === 'TECHNICIAN' && issue.to_location_id === req.user.id) {
    // Technician can reject issues sent to them
  } else {
    throw new AppError('Insufficient permissions to reject this issue', 403);
  }
  
  await prisma.$transaction(async (tx) => {
    // Update issue status to REJECTED
    await tx.materialIssue.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approved_by: req.user.id,
        approval_date: new Date(),
        rejection_reason
      }
    });
    
    // Revert stock using the enhanced reversion utility
    await revertMaterialIssueStock(id, rejection_reason, req, tx);
  });
  
  logger.info(`Material issue rejected: ${issue.issue_no}`, {
    issueId: issue.id,
    rejectedBy: req.user.id,
    reason: rejection_reason
  });
  
  res.json({
    success: true,
    message: 'Material issue rejected and stock restored'
  });
}));

// GET /api/inventory/items - Get all items
router.get('/items', asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search, category } = req.query;
  const skip = (page - 1) * limit;
  
  // Filter items by company
  const where = {
    is_active: true,
    company_id: req.user.company_id
  };
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { item_code: { contains: search, mode: 'insensitive' } },
      { hsn_code: { contains: search, mode: 'insensitive' } }
    ];
  }
  
  if (category) {
    where.category = category;
  }
  
  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        category: true,
        subcategory: true,
        brand: true,
        model: true,
        hsn_code: true,
        base_uom: true,
        min_stock_level: true,
        max_stock_level: true,
        reorder_level: true,
        description: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        uom_conversions: true
      }
    }),
    prisma.item.count({ where })
  ]);
  
  res.json({
    success: true,
    data: items,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// POST /api/inventory/items - Create new item
router.post('/items', [
  body('name').notEmpty().withMessage('Item name is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('subcategory').optional(),
  body('brand').optional(),
  body('model').optional(),
  body('uom_id').notEmpty().withMessage('UOM is required'),
  body('item_code').optional(),
  body('hsn_code').optional(),
  body('description').optional(),
  body('min_stock_level').optional({ nullable: true }).isNumeric().withMessage('Min stock level must be numeric'),
  body('max_stock_level').optional({ nullable: true }).isNumeric().withMessage('Max stock level must be numeric'),
  body('reorder_level').optional({ nullable: true }).isNumeric().withMessage('Reorder level must be numeric'),
  body('uom_conversions').optional().isArray().withMessage('UOM conversions must be an array'),
  body('uom_conversions.*.from_uom').optional().notEmpty().withMessage('From UOM is required for conversions'),
  body('uom_conversions.*.to_uom').optional().notEmpty().withMessage('To UOM is required for conversions'),
  body('uom_conversions.*.conversion_factor').optional().isFloat({ min: 0.0001 }).withMessage('Conversion factor must be a positive number')
], asyncHandler(async (req, res) => {
  console.log('POST /api/inventory/items - Request body:', JSON.stringify(req.body, null, 2));
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', JSON.stringify(errors.array(), null, 2));
    throw new AppError('Validation failed', 400, errors.array());
  }
  
  const {
    name,
    category,
    subcategory,
    brand,
    model,
    uom_id,
    item_code,
    hsn_code,
    min_stock_level,
    max_stock_level,
    reorder_level,
    description,
    uom_conversions = []
  } = req.body;
  
  // Check if item name already exists for this company
  const existingItem = await prisma.item.findFirst({
    where: {
      name,
      company_id: req.user.company_id
    }
  });
  
  if (existingItem) {
    throw new AppError('Item with this name already exists', 400);
  }
  
  // Check if item code already exists (if provided)
  if (item_code) {
    const existingItemCode = await prisma.item.findFirst({
      where: {
        item_code,
        company_id: req.user.company_id
      }
    });
    
    if (existingItemCode) {
      throw new AppError('Item with this code already exists', 400);
    }
  }
  
  // Verify UOM is valid (basic validation for common UOM values)
  const validUOMs = ['pcs', 'kg', 'litre', 'meter', 'box', 'packet', 'bottle', 'gallon', 'gm', 'ml'];
  if (!validUOMs.includes(uom_id)) {
    throw new AppError('Invalid UOM selected', 400);
  }
  
  const newItem = await prisma.$transaction(async (tx) => {
    // Create the item
    const item = await tx.item.create({
      data: {
        name,
        category,
        subcategory: subcategory || null,
        brand: brand || null,
        model: model || null,
        base_uom: uom_id,
        gst_percentage: 18.0, // Default GST percentage
        hsn_code: hsn_code || null,
        description: description || null,
        min_stock_level: min_stock_level ? parseFloat(min_stock_level) : null,
        max_stock_level: max_stock_level ? parseFloat(max_stock_level) : null,
        reorder_level: reorder_level ? parseFloat(reorder_level) : null,
        company_id: req.user.company_id,
        is_active: true
      }
    });

    // Create UOM conversions if provided
    if (uom_conversions && uom_conversions.length > 0) {
      for (const conversion of uom_conversions) {
        if (conversion.from_uom && conversion.to_uom && conversion.conversion_factor) {
          await tx.uomConversion.create({
            data: {
              item_id: item.id,
              from_uom: conversion.from_uom,
              to_uom: conversion.to_uom,
              conversion_factor: parseFloat(conversion.conversion_factor)
            }
          });
        }
      }
    }

    return item;
  });
  
  logger.info(`Item created: ${newItem.name}`, {
    itemId: newItem.id,
    userId: req.user.id,
    companyId: req.user.company_id
  });
  
  res.status(201).json({
    success: true,
    message: 'Item created successfully',
    data: newItem
  });
}));

// GET /api/inventory/stock-ledger - Get stock ledger
router.get('/stock-ledger', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 50, 
    item_id, 
    location_type, 
    location_id,
    from_date,
    to_date
  } = req.query;
  
  const skip = (page - 1) * limit;
  
  const where = {};
  
  if (item_id) where.item_id = item_id;
  if (location_type) where.location_type = location_type;
  if (location_id) where.location_id = location_id;
  
  if (from_date || to_date) {
    where.transaction_date = {};
    if (from_date) where.transaction_date.gte = new Date(from_date);
    if (to_date) where.transaction_date.lte = new Date(to_date);
  }
  
  const [entries, total] = await Promise.all([
    prisma.stockLedger.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { transaction_date: 'desc' },
      include: {
        item: true,
        batch: true
      }
    }),
    prisma.stockLedger.count({ where })
  ]);
  
  res.json({
    success: true,
    data: entries,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// GET /api/inventory/expiry-alerts - Get expiry alerts
router.get('/expiry-alerts', asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const { user } = req;
  const alertDate = new Date();
  alertDate.setDate(alertDate.getDate() + parseInt(days));
  
  // Build base filter based on user role
  // Set current date to start of day to include items expiring today
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  
  let baseFilter = {
    expiry_date: {
      lte: alertDate,
      gte: currentDate
    },
    current_qty: { gt: 0 },
    is_expired: false
  };
  
  // Temporarily disable role-based filtering for debugging
  // if (user.role === 'ADMIN') {
  //   baseFilter.location_type = 'BRANCH';
  //   baseFilter.location_id = user.branch_id;
  // } else if (user.role === 'SUPERADMIN') {
  //   // Superadmin can see all expiry alerts across company
  //   // No additional filter needed
  // }
  
  // Query for expiring batches with company filter
  const expiringBatches = await prisma.materialBatch.findMany({
    where: {
      ...baseFilter,
      item: {
        company_id: user.company_id,
        is_active: true
      }
    },
    include: {
      item: true
    },
    orderBy: { expiry_date: 'asc' }
  });
  
  // Debug logging using both console.log and logger
  console.log('=== EXPIRY ALERTS DEBUG ===');
  console.log('User details:', { role: user.role, company_id: user.company_id, branch_id: user.branch_id });
  console.log('Base filter:', baseFilter);
  console.log('Alert date:', alertDate.toISOString());
  console.log('Found batches count:', expiringBatches.length);
  if (expiringBatches.length > 0) {
    console.log('Sample batch:', JSON.stringify(expiringBatches[0], null, 2));
  }
  console.log('=== END EXPIRY ALERTS DEBUG ===');
  
  logger.info('=== EXPIRY ALERTS DEBUG ===');
  logger.info('User details:', { role: user.role, company_id: user.company_id, branch_id: user.branch_id });
  logger.info('Base filter:', baseFilter);
  logger.info('Alert date:', alertDate.toISOString());
  logger.info('Found batches count:', expiringBatches.length);
  if (expiringBatches.length > 0) {
    logger.info('Sample batch:', JSON.stringify(expiringBatches[0], null, 2));
  }
  logger.info('=== END EXPIRY ALERTS DEBUG ===');
  
  // Calculate days to expiry for each batch
  const now = new Date();
  const alertsWithDays = expiringBatches.map(batch => {
    const expiryDate = new Date(batch.expiry_date);
    const timeDiff = expiryDate.getTime() - now.getTime();
    const daysToExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return {
      id: batch.id,
      item_name: batch.item.name,
      batch_no: batch.batch_no,
      expiry_date: batch.expiry_date,
      quantity: batch.current_qty,
      uom: batch.item.base_uom,
      days_to_expiry: daysToExpiry
    };
  });
  
  res.json({
    success: true,
    data: alertsWithDays,
    count: alertsWithDays.length
  });
}));

// Validation rules for material return
const materialReturnValidation = [
  body('from_location_id')
    .notEmpty()
    .withMessage('Source location is required'),
  
  body('to_location_id')
    .notEmpty()
    .withMessage('Destination location is required'),
  
  body('return_date')
    .isISO8601()
    .withMessage('Please provide a valid return date'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required')
];

// POST /api/inventory/return - Create material return
router.post('/return', materialReturnValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, errors.array());
  }

  const {
    from_location_id,
    from_location_type,
    to_location_id,
    to_location_type,
    return_date,
    items,
    reason,
    notes
  } = req.body;

  const materialReturn = await prisma.$transaction(async (tx) => {
    // Create material return
    const materialReturn = await tx.materialReturn.create({
      data: {
        return_no: generateTransactionNumber('MRT'),
        return_date: new Date(return_date),
        from_location_id,
        from_location_type,
        to_location_id,
        to_location_type,
        reason,
        notes,
        created_by: req.user.id,
        status: 'APPROVED'
      }
    });
    
    // Process each item
    for (const item of items) {
      // Fetch item details to get base_uom
      const itemDetails = await tx.item.findUnique({
        where: { id: item.item_id },
        select: { base_uom: true }
      });
      
      if (!itemDetails) {
        throw new AppError(`Item not found: ${item.item_id}`, 404);
      }
      
      // Find the batch to return from
      const batch = await tx.materialBatch.findFirst({
        where: {
          id: item.batch_id,
          location_id: from_location_id,
          location_type: from_location_type,
          current_qty: { gte: item.quantity }
        }
      });
      
      if (!batch) {
        throw new AppError(`Insufficient stock for batch ${item.batch_id}`, 400);
      }
      
      const itemAmount = item.quantity * batch.rate_per_unit;
      
      // Create return item
      await tx.materialReturnItem.create({
        data: {
          return_id: materialReturn.id,
          item_id: item.item_id,
          batch_id: item.batch_id,
          quantity: item.quantity,
          uom: itemDetails.base_uom,
          rate_per_unit: batch.rate_per_unit,
          total_amount: itemAmount
        }
      });
      
      // Update source batch quantity
      await tx.materialBatch.update({
        where: { id: item.batch_id },
        data: {
          current_qty: {
            decrement: item.quantity
          }
        }
      });
      
      // Update destination batch quantity
      await tx.materialBatch.upsert({
        where: {
          item_id_batch_no_location_type_location_id: {
            item_id: item.item_id,
            batch_no: batch.batch_no,
            location_type: to_location_type,
            location_id: to_location_id
          }
        },
        create: {
          item_id: item.item_id,
          batch_no: batch.batch_no,
          mfg_date: batch.mfg_date,
          expiry_date: batch.expiry_date,
          initial_qty: item.quantity,
          current_qty: item.quantity,
          gst_percentage: batch.gst_percentage,
          location_type: to_location_type,
          location_id: to_location_id
        },
        update: {
          current_qty: {
            increment: item.quantity
          }
        }
      });
      
      // Update stock ledger - outward from source with enhanced audit trail
      const auditInfo = extractAuditInfo(req);
      auditInfo.reference_no = materialReturn.return_no;
      auditInfo.notes = `Material return from ${from_location_type} to ${to_location_type}: ${materialReturn.returned_by}`;
      
      await createStockLedgerEntry({
        item_id: item.item_id,
        batch_id: item.batch_id,
        location_type: from_location_type,
        location_id: from_location_id,
        transaction_type: 'RETURN',
        transaction_id: materialReturn.id,
        transaction_date: new Date(return_date),
        quantity_in: null,
        quantity_out: item.quantity,
        balance_quantity: batch.current_qty - item.quantity,
        rate_per_unit: batch.rate_per_unit,
        balance_value: -itemAmount,
        created_by: req.user.id,
        auditInfo
      }, tx);
      
      // Update stock ledger - inward to destination with enhanced audit trail
      auditInfo.notes = `Material return received at ${to_location_type}: ${materialReturn.returned_by}`;
      
      await createStockLedgerEntry({
        item_id: item.item_id,
        batch_id: item.batch_id,
        location_type: to_location_type,
        location_id: to_location_id,
        transaction_type: 'RETURN',
        transaction_id: materialReturn.id,
        transaction_date: new Date(return_date),
        quantity_in: item.quantity,
        quantity_out: null,
        balance_quantity: item.quantity,
        rate_per_unit: batch.rate_per_unit,
        balance_value: itemAmount,
        created_by: req.user.id,
        auditInfo
      }, tx);
    }
    
    return materialReturn;
  });

  logger.info(`Material return created: ${materialReturn.return_no}`, {
    returnId: materialReturn.id,
    userId: req.user.id
  });

  res.status(201).json({
    success: true,
    message: 'Material return created successfully',
    data: materialReturn
  });
}));

// Validation rules for material transfer
const materialTransferValidation = [
  body('from_location_id')
    .notEmpty()
    .withMessage('Source location is required'),
  
  body('to_location_id')
    .notEmpty()
    .withMessage('Destination location is required'),
  
  body('transfer_date')
    .isISO8601()
    .withMessage('Please provide a valid transfer date'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required')
];

// POST /api/inventory/transfer - Create material transfer
router.post('/transfer', materialTransferValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, errors.array());
  }

  const {
    from_location_id,
    from_location_type,
    to_location_id,
    to_location_type,
    transfer_date,
    items,
    purpose,
    notes
  } = req.body;

  const transfer = await prisma.$transaction(async (tx) => {
    // Check stock availability using FEFO
    const transferItems = [];
    
    for (const item of items) {
      // Fetch item details to get base_uom
      const itemDetails = await tx.item.findUnique({
        where: { id: item.item_id },
        select: { base_uom: true }
      });
      
      if (!itemDetails) {
        throw new AppError(`Item not found: ${item.item_id}`, 404);
      }
      
      const { selectedBatches, shortfall } = await getAvailableBatches(
        item.item_id,
        from_location_id,
        from_location_type,
        item.quantity
      );
      
      if (shortfall > 0) {
        throw new AppError(`Insufficient stock for item ${item.item_id}. Short by ${shortfall} units`, 400);
      }
      
      transferItems.push({ ...item, base_uom: itemDetails.base_uom, batches: selectedBatches });
    }
    
    // Create material transfer
    const transfer = await tx.materialTransfer.create({
      data: {
        transfer_no: generateTransactionNumber('MT'),
        transfer_date: new Date(transfer_date),
        from_location_id,
        from_location_type,
        to_location_id,
        to_location_type,
        purpose,
        created_by: req.user.id,
        status: 'APPROVED'
      }
    });
    
    // Process each item and its batches
    for (const item of transferItems) {
      for (const batch of item.batches) {
        const itemAmount = batch.allocated_qty * batch.rate_per_unit;
        
        // Create transfer item
        await tx.materialTransferItem.create({
          data: {
            transfer_id: transfer.id,
            item_id: item.item_id,
            batch_id: batch.id,
            quantity: batch.allocated_qty,
            uom: itemDetails.base_uom,
            rate_per_unit: batch.rate_per_unit,
            total_amount: itemAmount
          }
        });
        
        // Update source batch quantity
        await tx.materialBatch.update({
          where: { id: batch.id },
          data: {
            current_qty: {
              decrement: batch.allocated_qty
            }
          }
        });
        
        // Create/update destination batch
        await tx.materialBatch.upsert({
          where: {
            item_id_batch_no_location_type_location_id: {
              item_id: item.item_id,
              batch_no: batch.batch_no,
              location_type: to_location_type,
              location_id: to_location_id
            }
          },
          create: {
            item_id: item.item_id,
            batch_no: batch.batch_no,
            mfg_date: batch.mfg_date,
            expiry_date: batch.expiry_date,
            initial_qty: batch.allocated_qty,
            current_qty: batch.allocated_qty,
            gst_percentage: batch.gst_percentage,
            location_type: to_location_type,
            location_id: to_location_id
          },
          update: {
            current_qty: {
              increment: batch.allocated_qty
            }
          }
        });
        
        // Update stock ledger - outward from source with enhanced audit trail
        const auditInfo = extractAuditInfo(req);
        auditInfo.reference_no = transfer.transfer_no;
        auditInfo.notes = `Material transfer from ${from_location_type} to ${to_location_type}: ${transfer.transferred_by}`;
        
        await createStockLedgerEntry({
          item_id: item.item_id,
          batch_id: batch.id,
          location_type: from_location_type,
          location_id: from_location_id,
          transaction_type: 'TRANSFER',
          transaction_id: transfer.id,
          transaction_date: new Date(transfer_date),
          quantity_in: null,
          quantity_out: batch.allocated_qty,
          balance_quantity: batch.current_qty - batch.allocated_qty,
          rate_per_unit: batch.rate_per_unit,
          balance_value: -itemAmount,
          created_by: req.user.id,
          auditInfo
        }, tx);
        
        // Update stock ledger - inward to destination with enhanced audit trail
        auditInfo.notes = `Material transfer received at ${to_location_type}: ${transfer.transferred_by}`;
        
        await createStockLedgerEntry({
          item_id: item.item_id,
          batch_id: batch.id,
          location_type: to_location_type,
          location_id: to_location_id,
          transaction_type: 'TRANSFER',
          transaction_id: transfer.id,
          transaction_date: new Date(transfer_date),
          quantity_in: batch.allocated_qty,
          quantity_out: null,
          balance_quantity: batch.allocated_qty,
          rate_per_unit: batch.rate_per_unit,
          balance_value: itemAmount,
          created_by: req.user.id,
          auditInfo
        }, tx);
      }
    }
    
    return transfer;
  });

  logger.info(`Material transfer created: ${transfer.transfer_no}`, {
    transferId: transfer.id,
    userId: req.user.id
  });

  res.status(201).json({
    success: true,
    message: 'Material transfer created successfully',
    data: transfer
  });
}));

// Validation rules for material consumption
const materialConsumptionValidation = [
  body('technician_id')
    .notEmpty()
    .withMessage('Technician ID is required'),
  
  body('service_id')
    .optional()
    .notEmpty()
    .withMessage('Service ID cannot be empty if provided'),
  
  body('lead_id')
    .optional()
    .notEmpty()
    .withMessage('Lead ID cannot be empty if provided'),
  
  body('consumption_date')
    .isISO8601()
    .withMessage('Please provide a valid consumption date'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required')
];

// POST /api/inventory/consumption - Create material consumption
router.post('/consumption', materialConsumptionValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, errors.array());
  }

  const {
    technician_id,
    service_id,
    lead_id,
    consumption_date,
    items,
    notes
  } = req.body;

  const consumption = await prisma.$transaction(async (tx) => {
    // Create material consumption
    const consumption = await tx.materialConsumption.create({
      data: {
        consumption_no: generateTransactionNumber('MC'),
        technician_id,
        service_id,
        lead_id,
        consumption_date: new Date(consumption_date),
        notes,
        created_by: req.user.id,
        status: 'APPROVED'
      }
    });
    
    // Process each item
    for (const item of items) {
      // Fetch item details to get base_uom
      const itemDetails = await tx.item.findUnique({
        where: { id: item.item_id },
        select: { base_uom: true }
      });
      
      if (!itemDetails) {
        throw new AppError(`Item not found: ${item.item_id}`, 404);
      }
      
      // Find available batches for technician
      const { selectedBatches, shortfall } = await getAvailableBatches(
        item.item_id,
        technician_id,
        'TECHNICIAN',
        item.quantity
      );
      
      if (shortfall > 0) {
        throw new AppError(`Insufficient stock for item ${item.item_id}. Short by ${shortfall} units`, 400);
      }
      
      for (const batch of selectedBatches) {
        const itemAmount = batch.allocated_qty * batch.rate_per_unit;
        
        // Create consumption item
        await tx.materialConsumptionItem.create({
          data: {
            consumption_id: consumption.id,
            item_id: item.item_id,
            batch_id: batch.id,
            quantity: batch.allocated_qty,
            uom: item.base_uom,
            rate_per_unit: batch.rate_per_unit,
            total_amount: itemAmount
          }
        });
        
        // Update batch quantity
        await tx.materialBatch.update({
          where: { id: batch.id },
          data: {
            current_qty: {
              decrement: batch.allocated_qty
            }
          }
        });
        
        // Update stock ledger - consumption (outward) with enhanced audit trail
        const auditInfo = extractAuditInfo(req);
        auditInfo.reference_no = consumption.consumption_no;
        auditInfo.notes = `Material consumption by technician: ${consumption.consumed_by}`;
        
        await createStockLedgerEntry({
          item_id: item.item_id,
          batch_id: batch.id,
          location_type: 'TECHNICIAN',
          location_id: technician_id,
          transaction_type: 'CONSUMPTION',
          transaction_id: consumption.id,
          transaction_date: new Date(consumption_date),
          quantity_in: null,
          quantity_out: batch.allocated_qty,
          balance_quantity: batch.current_qty - batch.allocated_qty,
          rate_per_unit: batch.rate_per_unit,
          balance_value: -itemAmount,
          created_by: req.user.id,
          auditInfo
        }, tx);
      }
    }
    
    return consumption;
  });

  logger.info(`Material consumption created: ${consumption.consumption_no}`, {
    consumptionId: consumption.id,
    userId: req.user.id
  });

  res.status(201).json({
    success: true,
    message: 'Material consumption created successfully',
    data: consumption
  });
}));

// GET /api/inventory/reports/stock-valuation - Stock valuation report
router.get('/reports/stock-valuation', asyncHandler(async (req, res) => {
  const { location_type, location_id } = req.query;
  
  const where = {
    current_qty: { gt: 0 },
    is_expired: false
  };
  
  // Role-based filtering for company and branches
  if (req.user.role === 'ADMIN') {
    where.item = {
      company_id: req.user.company_id
    };
  } else if (req.user.role === 'AREA_MANAGER') {
    where.location_type = 'BRANCH';
    where.location_id = req.user.branch_id;
    where.item = {
      company_id: req.user.company_id
    };
  } else if (req.user.role === 'SUPERADMIN') {
    // SUPERADMIN can see all data, no additional filtering needed
  }
  
  if (location_type) where.location_type = location_type;
  if (location_id) where.location_id = location_id;
  
  const batches = await prisma.materialBatch.findMany({
    where,
    include: {
      item: true
    },
    orderBy: [
      { location_type: 'asc' },
      { location_id: 'asc' },
      { item: { name: 'asc' } }
    ]
  });
  
  // Get unique location IDs for branch lookup - filter by company for ADMIN users
  const branchIds = [...new Set(batches.filter(b => b.location_type === 'BRANCH').map(b => b.location_id))];
  let branchWhere = { id: { in: branchIds } };
  
  // For ADMIN users, only show branches from their company
  if (req.user.role === 'ADMIN') {
    branchWhere.company_id = req.user.company_id;
  }
  
  const branches = branchIds.length > 0 ? await prisma.branch.findMany({
    where: branchWhere,
    select: { id: true, name: true }
  }) : [];
  
  const branchMap = branches.reduce((map, branch) => {
    map[branch.id] = branch.name;
    return map;
  }, {});

  const stockValuation = batches.map(batch => ({
    id: batch.id,
    name: batch.item.name,
    category: batch.item.category,
    uom: batch.item.base_uom,
    current_qty: batch.current_qty,
    rate_per_unit: batch.rate_per_unit,
    total_value: batch.current_qty * batch.rate_per_unit,
    location_name: batch.location_type === 'BRANCH' ? (branchMap[batch.location_id] || 'Unknown Branch') : batch.location_type,
     expiry_date: batch.expiry_date
   }));
   
   const totalValue = stockValuation.reduce((sum, item) => sum + parseFloat(item.total_value), 0);
  
  res.json({
    success: true,
    data: stockValuation,
    summary: {
      total_items: stockValuation.length,
      total_value: totalValue
    }
  });
}));

// GET /api/inventory/reports/stock-report - Stock report with filtering
router.get('/reports/stock-report', asyncHandler(async (req, res) => {
  const { 
    start_date, 
    end_date, 
    location_type, 
    location_id, 
    item_category,
    item_id,
    include_expired = 'false'
  } = req.query;
  
  const where = {
    current_qty: { gt: 0 }
  };
  
  if (include_expired === 'false') {
    where.is_expired = false;
  }
  
  if (location_type) where.location_type = location_type;
  if (location_id) where.location_id = location_id;
  if (item_id) where.item_id = item_id;
  
  if (start_date || end_date) {
    where.created_at = {};
    if (start_date) where.created_at.gte = new Date(start_date);
    if (end_date) where.created_at.lte = new Date(end_date);
  }
  
  const itemWhere = {};
  if (item_category) itemWhere.category = item_category;
  
  const batches = await prisma.materialBatch.findMany({
    where: {
      ...where,
      item: itemWhere
    },
    include: {
      item: true
    },
    orderBy: [
      { location_type: 'asc' },
      { location_id: 'asc' },
      { item: { name: 'asc' } },
      { expiry_date: 'asc' }
    ]
  });
  
  // Get unique location IDs for branch lookup
  const branchIds = [...new Set(batches.filter(b => b.location_type === 'BRANCH').map(b => b.location_id))];
  
  // Filter branches by company for ADMIN users
  const branchWhere = { id: { in: branchIds } };
  if (user.role === 'ADMIN') {
    branchWhere.company_id = user.company_id;
  }
  
  const branches = branchIds.length > 0 ? await prisma.branch.findMany({
    where: branchWhere,
    select: { id: true, name: true }
  }) : [];
  
  const branchMap = branches.reduce((map, branch) => {
    map[branch.id] = branch.name;
    return map;
  }, {});
  
  const stockReport = batches.map(batch => ({
    item_id: batch.item_id,
    item_name: batch.item.name,
    item_category: batch.item.category,
    uom: batch.item.base_uom,
    batch_no: batch.batch_no,
    location_type: batch.location_type,
    location_id: batch.location_id,
    location_name: batch.location_type === 'BRANCH' ? 
      `BRANCH - ${branchMap[batch.location_id] || 'Unknown Branch'}` : 
      `${batch.location_type} - ${batch.location_id}`,
    current_qty: batch.current_qty,
    rate_per_unit: batch.rate_per_unit,
    total_value: batch.current_qty * batch.rate_per_unit,
    mfg_date: batch.mfg_date,
    expiry_date: batch.expiry_date,
    is_expired: batch.is_expired,
    days_to_expiry: batch.expiry_date ? 
      Math.ceil((new Date(batch.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)) : null
  }));
  
  const summary = {
    total_items: stockReport.length,
    total_value: stockReport.reduce((sum, item) => sum + parseFloat(item.total_value), 0),
    expired_items: stockReport.filter(item => item.is_expired).length,
    expiring_soon: stockReport.filter(item => 
      item.days_to_expiry !== null && item.days_to_expiry <= 30 && item.days_to_expiry > 0
    ).length
  };
  
  res.json({
    success: true,
    data: stockReport,
    summary
  });
}));

// GET /api/inventory/reports/stock-ledger - Stock ledger with transaction history
router.get('/reports/stock-ledger', asyncHandler(async (req, res) => {
  const { 
    item_id, 
    location_type, 
    location_id, 
    start_date, 
    end_date,
    transaction_type,
    page = 1,
    limit = 50
  } = req.query;
  
  const where = {};
  
  // Role-based filtering
  if (req.user.role === 'ADMIN') {
    // ADMIN users can only see transactions from branches in their company
    const companyBranches = await prisma.branch.findMany({
      where: { company_id: req.user.company_id },
      select: { id: true }
    });
    const branchIds = companyBranches.map(branch => branch.id);
    
    where.OR = [
      {
        location_type: 'BRANCH',
        location_id: { in: branchIds }
      },
      {
        location_type: 'COMPANY',
        location_id: req.user.company_id
      }
    ];
  } else if (req.user.role === 'AREA_MANAGER') {
    // AREA_MANAGER users can only see transactions from their specific branch
    where.OR = [
      {
        location_type: 'BRANCH',
        location_id: req.user.branch_id
      },
      {
        location_type: 'COMPANY',
        location_id: req.user.company_id
      }
    ];
  }
  // SUPERADMIN can see all transactions (no additional filtering)
  
  if (item_id) where.item_id = item_id;
  if (location_type) where.location_type = location_type;
  if (location_id) where.location_id = location_id;
  if (transaction_type) where.transaction_type = transaction_type;
  
  if (start_date || end_date) {
    where.transaction_date = {};
    if (start_date) where.transaction_date.gte = new Date(start_date);
    if (end_date) where.transaction_date.lte = new Date(end_date);
  }
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [transactions, totalCount] = await Promise.all([
    prisma.stockLedger.findMany({
      where,
      include: {
        item: true,
        batch: true,
        branch: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        transaction_date: 'desc'
      },
      skip,
      take: parseInt(limit)
    }),
    prisma.stockLedger.count({ where })
  ]);
  
  const ledgerEntries = transactions.map(transaction => ({
    id: transaction.id,
    transaction_no: transaction.transaction_id,
    transaction_type: transaction.transaction_type,
    transaction_date: transaction.transaction_date,
    item_id: transaction.item_id,
    item_name: transaction.item.name,
    item_category: transaction.item.category,
    uom: transaction.item.base_uom || 'N/A',
    batch_no: transaction.batch?.batch_no,
    location_type: transaction.location_type,
    location_id: transaction.location_id,
    location_name: transaction.branch?.name || 'N/A',
    quantity: transaction.quantity_in || transaction.quantity_out || 0,
    rate_per_unit: transaction.rate_per_unit,
    total_amount: transaction.balance_value,
    balance_qty: transaction.balance_quantity,
    notes: ''
  }));
  
  res.json({
    success: true,
    data: ledgerEntries,
    pagination: {
      current_page: parseInt(page),
      total_pages: Math.ceil(totalCount / parseInt(limit)),
      total_records: totalCount,
      per_page: parseInt(limit)
    }
  });
}));

// GET /api/inventory/reports/movement-analysis - Movement analysis report
router.get('/reports/movement-analysis', asyncHandler(async (req, res) => {
  const { 
    start_date, 
    end_date, 
    location_type, 
    location_id,
    item_category
  } = req.query;
  
  const where = {};
  
  if (location_type) where.location_type = location_type;
  if (location_id) where.location_id = location_id;
  
  if (start_date || end_date) {
    where.transaction_date = {};
    if (start_date) where.transaction_date.gte = new Date(start_date);
    if (end_date) where.transaction_date.lte = new Date(end_date);
  }
  
  const itemWhere = {};
  if (item_category) itemWhere.category = item_category;
  
  const transactions = await prisma.materialTransaction.findMany({
    where: {
      ...where,
      item: itemWhere
    },
    include: {
      item: true
    }
  });
  
  // Group by item and calculate movement statistics
  const movementMap = new Map();
  
  transactions.forEach(transaction => {
    const key = transaction.item_id;
    if (!movementMap.has(key)) {
      movementMap.set(key, {
        item_id: transaction.item_id,
        item_name: transaction.item.name,
        item_category: transaction.item.category,
        uom: transaction.item.base_uom,
        total_receipts: 0,
        total_issues: 0,
        total_returns: 0,
        total_transfers_in: 0,
        total_transfers_out: 0,
        total_consumption: 0,
        net_movement: 0,
        transaction_count: 0
      });
    }
    
    const movement = movementMap.get(key);
    movement.transaction_count++;
    
    switch (transaction.transaction_type) {
      case 'RECEIPT':
        movement.total_receipts += transaction.quantity;
        movement.net_movement += transaction.quantity;
        break;
      case 'ISSUE':
        movement.total_issues += transaction.quantity;
        movement.net_movement -= transaction.quantity;
        break;
      case 'RETURN':
        movement.total_returns += transaction.quantity;
        movement.net_movement += transaction.quantity;
        break;
      case 'TRANSFER_IN':
        movement.total_transfers_in += transaction.quantity;
        movement.net_movement += transaction.quantity;
        break;
      case 'TRANSFER_OUT':
        movement.total_transfers_out += transaction.quantity;
        movement.net_movement -= transaction.quantity;
        break;
      case 'CONSUMPTION':
        movement.total_consumption += transaction.quantity;
        movement.net_movement -= transaction.quantity;
        break;
    }
  });
  
  const movementAnalysis = Array.from(movementMap.values())
    .sort((a, b) => Math.abs(b.net_movement) - Math.abs(a.net_movement));
  
  res.json({
    success: true,
    data: movementAnalysis,
    summary: {
      total_items_analyzed: movementAnalysis.length,
      period: {
        start_date: start_date || 'All time',
        end_date: end_date || 'Present'
      }
    }
  });
}));

// GET /api/inventory/reports/expiry-report - Expiry report
router.get('/reports/expiry-report', asyncHandler(async (req, res) => {
  const { 
    location_type, 
    location_id, 
    days_ahead = 90,
    include_expired = 'true'
  } = req.query;
  const { user } = req;
  
  const where = {
    current_qty: { gt: 0 },
    expiry_date: { not: null },
    // Filter by company for items
    item: {
      company_id: user.role === 'SUPERADMIN' ? undefined : user.company_id,
      is_active: true
    }
  };
  
  // Role-based filtering for locations
  if (user.role === 'ADMIN') {
    // ADMIN users can only see data from branches in their company
    if (location_type) {
      where.location_type = location_type;
    }
    if (location_id) {
      where.location_id = location_id;
    }
  } else if (user.role === 'AREA_MANAGER') {
    // AREA_MANAGER can only see their specific branch
    where.location_type = 'BRANCH';
    where.location_id = user.branch_id;
  } else if (user.role === 'SUPERADMIN') {
    // SUPERADMIN can see all locations
    if (location_type) where.location_type = location_type;
    if (location_id) where.location_id = location_id;
  }
  
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + parseInt(days_ahead));
  
  if (include_expired === 'true') {
    where.expiry_date.lte = futureDate;
  } else {
    where.expiry_date = {
      gte: new Date(),
      lte: futureDate
    };
  }
  
  const batches = await prisma.materialBatch.findMany({
    where,
    include: {
      item: true
    },
    orderBy: {
      expiry_date: 'asc'
    }
  });
  
  // Get unique location IDs for branch lookup
  const branchIds = [...new Set(batches.filter(b => b.location_type === 'BRANCH').map(b => b.location_id))];
  const branches = branchIds.length > 0 ? await prisma.branch.findMany({
    where: { id: { in: branchIds } },
    select: { id: true, name: true }
  }) : [];
  
  const branchMap = branches.reduce((map, branch) => {
    map[branch.id] = branch.name;
    return map;
  }, {});

  const expiryReport = batches.map(batch => {
    const daysToExpiry = Math.ceil((new Date(batch.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
    let status = 'GOOD';
    
    if (daysToExpiry < 0) {
      status = 'EXPIRED';
    } else if (daysToExpiry <= 7) {
      status = 'CRITICAL';
    } else if (daysToExpiry <= 30) {
      status = 'WARNING';
    }
    
    return {
      item_id: batch.item_id,
      item_name: batch.item.name,
      item_category: batch.item.category,
      uom: batch.item.base_uom,
      batch_no: batch.batch_no,
      location_type: batch.location_type,
      location_id: batch.location_id,
      location_name: batch.location_type === 'BRANCH' ? (branchMap[batch.location_id] || 'Unknown Branch') : batch.location_type,
      current_qty: batch.current_qty,
      rate_per_unit: batch.rate_per_unit,
      total_value: batch.current_qty * batch.rate_per_unit,
      mfg_date: batch.mfg_date,
      expiry_date: batch.expiry_date,
      days_to_expiry: daysToExpiry,
      status
   };
 });
  
  const summary = {
    expired_items: expiryReport.filter(item => item.status === 'EXPIRED').length,
    critical_items: expiryReport.filter(item => item.status === 'CRITICAL').length,
    warning_items: expiryReport.filter(item => item.status === 'WARNING').length,
    good_items: expiryReport.filter(item => item.status === 'GOOD').length,
    total_expired_value: expiryReport
      .filter(item => item.status === 'EXPIRED')
      .reduce((sum, item) => sum + parseFloat(item.total_value), 0),
    total_critical_value: expiryReport
      .filter(item => item.status === 'CRITICAL')
      .reduce((sum, item) => sum + parseFloat(item.total_value), 0)
  };
  
  res.json({
    success: true,
    data: expiryReport,
    summary
  });
}));

// GET /api/inventory/receipts - Get all material receipts with pagination
router.get('/receipts', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    start_date, 
    end_date, 
    vendor_name,
    receipt_no
  } = req.query;
  
  const where = {};
  
  // Role-based filtering
  if (req.user.role === 'ADMIN') {
    where.company_id = req.user.company_id;
  } else if (req.user.role === 'AREA_MANAGER') {
    where.to_location_id = req.user.branch_id;
  } else if (req.user.role === 'SUPERADMIN') {
    where.company_id = req.user.company_id;
  }
  
  if (start_date || end_date) {
    where.receipt_date = {};
    if (start_date) where.receipt_date.gte = new Date(start_date);
    if (end_date) where.receipt_date.lte = new Date(end_date);
  }
  
  if (vendor_name) {
    where.vendor_name = {
      contains: vendor_name,
      mode: 'insensitive'
    };
  }
  
  if (receipt_no) {
    where.receipt_no = {
      contains: receipt_no,
      mode: 'insensitive'
    };
  }
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [receipts, totalCount] = await Promise.all([
    prisma.materialReceipt.findMany({
      where,
      include: {
        items: {
          include: {
            item: true
          }
        },
        to_branch: {
          select: {
            name: true,
            branch_type: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      skip,
      take: parseInt(limit)
    }),
    prisma.materialReceipt.count({ where })
  ]);
  
  res.json({
    success: true,
    data: receipts,
    pagination: {
      current_page: parseInt(page),
      total_pages: Math.ceil(totalCount / parseInt(limit)),
      total_records: totalCount,
      per_page: parseInt(limit)
    }
  });
}));

// GET /api/inventory/receipts/:id - Get single material receipt
router.get('/receipts/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const where = { id };
  
  // Role-based filtering
  if (req.user.role === 'ADMIN') {
    where.company_id = req.user.company_id;
  } else if (req.user.role === 'AREA_MANAGER') {
    where.to_location_id = req.user.branch_id;
  } else if (req.user.role === 'SUPERADMIN') {
    where.company_id = req.user.company_id;
  }
  
  const receipt = await prisma.materialReceipt.findFirst({
    where,
    include: {
      items: {
        include: {
          item: true
        }
      },
      to_branch: {
        select: {
          name: true,
          branch_type: true
        }
      }
    }
  });
  
  if (!receipt) {
    throw new AppError('Material receipt not found', 404);
  }
  
  res.json({
    success: true,
    data: receipt
  });
}));

// PUT /api/inventory/receipts/:id - Update material receipt
router.put('/receipts/:id', materialReceiptValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, errors.array());
  }
  
  const { id } = req.params;
  const {
    vendor_name,
    vendor_invoice_no,
    vendor_invoice_date,
    receipt_date,
    discount_amount = 0,
    notes
  } = req.body;
  
  const where = { id };
  
  // Role-based filtering
  if (req.user.role === 'ADMIN') {
    where.to_location_id = req.user.branch_id;
  } else if (req.user.role === 'SUPERADMIN') {
    where.company_id = req.user.company_id;
  }
  
  const existingReceipt = await prisma.materialReceipt.findFirst({
    where,
    include: {
      items: true
    }
  });
  
  if (!existingReceipt) {
    throw new AppError('Material receipt not found', 404);
  }
  
  // Only allow editing of header information, not items
  const updatedReceipt = await prisma.materialReceipt.update({
    where: { id },
    data: {
      vendor_name,
      vendor_invoice_no,
      vendor_invoice_date: vendor_invoice_date ? new Date(vendor_invoice_date) : null,
      receipt_date: new Date(receipt_date),
      discount_amount: parseFloat(discount_amount),
      notes,
      updated_at: new Date()
    },
    include: {
      items: {
        include: {
          item: true
        }
      },
      to_branch: {
        select: {
          name: true,
          branch_type: true
        }
      }
    }
  });
  
  logger.info(`Material receipt updated: ${updatedReceipt.receipt_no}`, {
    receiptId: updatedReceipt.id,
    userId: req.user.id
  });
  
  res.json({
    success: true,
    message: 'Material receipt updated successfully',
    data: updatedReceipt
  });
}));

// DELETE /api/inventory/receipts/:id - Delete material receipt
router.delete('/receipts/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const where = { id };
  
  // Role-based filtering
  if (req.user.role === 'ADMIN') {
    where.to_location_id = req.user.branch_id;
  } else if (req.user.role === 'SUPERADMIN') {
    where.company_id = req.user.company_id;
  }
  
  const receipt = await prisma.materialReceipt.findFirst({
    where,
    include: {
      items: true
    }
  });
  
  if (!receipt) {
    throw new AppError('Material receipt not found', 404);
  }
  
  // Check if any items from this receipt have been issued or consumed
  const hasTransactions = await prisma.materialTransaction.findFirst({
    where: {
      transaction_type: { in: ['ISSUE', 'CONSUMPTION', 'TRANSFER_OUT'] },
      batch: {
        receipt_id: id
      }
    }
  });
  
  if (hasTransactions) {
    throw new AppError('Cannot delete material receipt. Items from this receipt have been issued or consumed.', 400);
  }
  
  await prisma.$transaction(async (tx) => {
    // Delete related batches and transactions
    await tx.materialTransaction.deleteMany({
      where: {
        batch: {
          receipt_id: id
        }
      }
    });
    
    await tx.materialBatch.deleteMany({
      where: {
        receipt_id: id
      }
    });
    
    // Delete receipt items
    await tx.materialReceiptItem.deleteMany({
      where: {
        receipt_id: id
      }
    });
    
    // Delete receipt
    await tx.materialReceipt.delete({
      where: { id }
    });
  });
  
  logger.info(`Material receipt deleted: ${receipt.receipt_no}`, {
    receiptId: receipt.id,
    userId: req.user.id
  });
  
  res.json({
    success: true,
    message: 'Material receipt deleted successfully'
  });
}));

// PUT /api/inventory/items/:id - Update item details
router.put('/items/:id', [
  body('name').notEmpty().withMessage('Item name is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('subcategory').optional(),
  body('brand').optional(),
  body('model').optional(),
  body('uom_id').notEmpty().withMessage('UOM is required'),
  body('description').optional(),
  body('min_stock_level').optional({ nullable: true }).isNumeric().withMessage('Min stock level must be numeric'),
  body('max_stock_level').optional({ nullable: true }).isNumeric().withMessage('Max stock level must be numeric'),
  body('reorder_level').optional({ nullable: true }).isNumeric().withMessage('Reorder level must be numeric'),
  body('uom_conversions').optional().isArray().withMessage('UOM conversions must be an array'),
  body('uom_conversions.*.from_uom').optional().notEmpty().withMessage('From UOM is required'),
  body('uom_conversions.*.to_uom').optional().notEmpty().withMessage('To UOM is required'),
  body('uom_conversions.*.conversion_factor').optional().isFloat({ min: 0.001 }).withMessage('Conversion factor must be greater than 0')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, errors.array());
  }
  
  const { id } = req.params;
  const {
    name,
    category,
    subcategory,
    brand,
    model,
    uom_id,
    min_stock_level,
    max_stock_level,
    reorder_level,
    description,
    uom_conversions
  } = req.body;
  
  const where = { id };
  
  // Role-based filtering
  if (req.user.role === 'ADMIN') {
    where.company_id = req.user.company_id;
  } else if (req.user.role === 'SUPERADMIN') {
    where.company_id = req.user.company_id;
  }
  
  const existingItem = await prisma.item.findFirst({
    where
  });
  
  if (!existingItem) {
    throw new AppError('Item not found', 404);
  }
  
  // Check if name already exists for another item
  const duplicateItem = await prisma.item.findFirst({
    where: {
      name,
      company_id: req.user.company_id,
      id: { not: id }
    }
  });
  
  if (duplicateItem) {
    throw new AppError('Item with this name already exists', 400);
  }
  
  const updatedItem = await prisma.$transaction(async (tx) => {
    // Update the item
    const item = await tx.item.update({
      where: { id },
      data: {
        name,
        category,
        subcategory,
        brand,
        model,
        base_uom: uom_id,
        min_stock_level: min_stock_level ? parseFloat(min_stock_level) : null,
        max_stock_level: max_stock_level ? parseFloat(max_stock_level) : null,
        reorder_level: reorder_level ? parseFloat(reorder_level) : null,
        description,
        updated_at: new Date()
      }
    });

    // Handle UOM conversions if provided
    if (uom_conversions && uom_conversions.length > 0) {
      // Delete existing conversions for this item
      await tx.uomConversion.deleteMany({
        where: { item_id: id }
      });

      // Create new conversions
      for (const conversion of uom_conversions) {
        await tx.uomConversion.create({
          data: {
            item_id: id,
            from_uom: conversion.from_uom,
            to_uom: conversion.to_uom,
            conversion_factor: parseFloat(conversion.conversion_factor)
          }
        });
      }
    }

    return item;
  });
  
  logger.info(`Item updated: ${updatedItem.name}`, {
    itemId: updatedItem.id,
    userId: req.user.id
  });
  
  res.json({
    success: true,
    message: 'Item updated successfully',
    data: updatedItem
  });
}));

// DELETE /api/inventory/items/:id - Delete item
router.delete('/items/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const where = { id };
  
  // Role-based filtering
  if (req.user.role === 'ADMIN') {
    where.company_id = req.user.company_id;
  } else if (req.user.role === 'SUPERADMIN') {
    where.company_id = req.user.company_id;
  }
  
  const item = await prisma.item.findFirst({
    where
  });
  
  if (!item) {
    throw new AppError('Item not found', 404);
  }
  
  // Check if item has any stock or transactions
  const hasStock = await prisma.materialBatch.findFirst({
    where: {
      item_id: id,
      current_qty: { gt: 0 }
    }
  });
  
  if (hasStock) {
    throw new AppError('Cannot delete item. Item has existing stock.', 400);
  }
  
  const hasTransactions = await prisma.materialTransaction.findFirst({
    where: {
      item_id: id
    }
  });
  
  if (hasTransactions) {
    throw new AppError('Cannot delete item. Item has transaction history.', 400);
  }
  
  await prisma.$transaction(async (tx) => {
    // Delete any empty batches
    await tx.materialBatch.deleteMany({
      where: {
        item_id: id
      }
    });
    
    // Delete item
    await tx.item.delete({
      where: { id }
    });
  });
  
  logger.info(`Item deleted: ${item.name}`, {
    itemId: item.id,
    userId: req.user.id
  });
  
  res.json({
    success: true,
    message: 'Item deleted successfully'
  });
}));

module.exports = router;