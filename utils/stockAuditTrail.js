const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Enhanced stock ledger entry creation with comprehensive audit trail
 * @param {Object} params - Stock ledger parameters
 * @param {string} params.item_id - Item ID
 * @param {string} params.batch_id - Batch ID
 * @param {string} params.location_type - Location type (COMPANY, BRANCH, TECHNICIAN)
 * @param {string} params.location_id - Location ID
 * @param {string} params.transaction_type - Transaction type
 * @param {string} params.transaction_id - Transaction ID
 * @param {Date} params.transaction_date - Transaction date
 * @param {number} params.quantity_in - Quantity in (optional)
 * @param {number} params.quantity_out - Quantity out (optional)
 * @param {number} params.balance_quantity - Balance quantity
 * @param {number} params.rate_per_unit - Rate per unit
 * @param {number} params.balance_value - Balance value
 * @param {string} params.created_by - User ID who created the transaction
 * @param {Object} params.auditInfo - Additional audit information
 * @param {string} params.auditInfo.user_role - User role at time of transaction
 * @param {string} params.auditInfo.ip_address - IP address
 * @param {string} params.auditInfo.user_agent - User agent string
 * @param {string} params.auditInfo.session_id - Session ID
 * @param {string} params.auditInfo.reference_no - External reference number
 * @param {string} params.auditInfo.notes - Additional notes
 * @param {boolean} params.auditInfo.system_generated - Whether system generated
 * @param {string} params.auditInfo.reversal_of - ID of transaction being reversed
 * @param {Object} params.prismaTransaction - Prisma transaction object (optional)
 * @returns {Promise<Object>} Created stock ledger entry
 */
async function createStockLedgerEntry(params, prismaTransaction = null) {
  const {
    item_id,
    batch_id,
    location_type,
    location_id,
    transaction_type,
    transaction_id,
    transaction_date,
    quantity_in = null,
    quantity_out = null,
    balance_quantity,
    rate_per_unit,
    balance_value,
    created_by,
    auditInfo = {}
  } = params;

  const stockLedgerData = {
    item_id,
    batch_id,
    location_type,
    location_id,
    transaction_type,
    transaction_id,
    transaction_date,
    quantity_in,
    quantity_out,
    balance_quantity,
    rate_per_unit,
    balance_value,
    created_by,
    user_role: auditInfo.user_role || null,
    ip_address: auditInfo.ip_address || null,
    user_agent: auditInfo.user_agent || null,
    session_id: auditInfo.session_id || null,
    reference_no: auditInfo.reference_no || null,
    notes: auditInfo.notes || null,
    system_generated: auditInfo.system_generated || false,
    reversal_of: auditInfo.reversal_of || null
  };

  const db = prismaTransaction || prisma;
  return await db.stockLedger.create({
    data: stockLedgerData
  });
}

/**
 * Create stock reversal entries for rejected material issues
 * @param {string} originalTransactionId - Original transaction ID to reverse
 * @param {string} created_by - User ID creating the reversal
 * @param {Object} auditInfo - Audit information
 * @param {Object} prismaTransaction - Prisma transaction object
 * @returns {Promise<Array>} Array of created reversal entries
 */
async function createStockReversalEntries(originalTransactionId, created_by, auditInfo = {}, prismaTransaction = null) {
  const db = prismaTransaction || prisma;
  
  // Find all stock ledger entries for the original transaction
  const originalEntries = await db.stockLedger.findMany({
    where: {
      transaction_id: originalTransactionId
    },
    include: {
      item: true,
      batch: true
    }
  });

  const reversalEntries = [];

  for (const entry of originalEntries) {
    // Create reversal entry with opposite quantities
    const reversalData = {
      item_id: entry.item_id,
      batch_id: entry.batch_id,
      location_type: entry.location_type,
      location_id: entry.location_id,
      transaction_type: 'ADJUSTMENT', // Use ADJUSTMENT for reversals
      transaction_id: `REV-${originalTransactionId}`,
      transaction_date: new Date(),
      quantity_in: entry.quantity_out, // Reverse the quantities
      quantity_out: entry.quantity_in,
      balance_quantity: entry.balance_quantity + (entry.quantity_out || 0) - (entry.quantity_in || 0),
      rate_per_unit: entry.rate_per_unit,
      balance_value: -entry.balance_value, // Reverse the value
      created_by,
      user_role: auditInfo.user_role || null,
      ip_address: auditInfo.ip_address || null,
      user_agent: auditInfo.user_agent || null,
      session_id: auditInfo.session_id || null,
      reference_no: auditInfo.reference_no || null,
      notes: auditInfo.notes || `Reversal of transaction ${originalTransactionId}`,
      system_generated: true,
      reversal_of: entry.id
    };

    const reversalEntry = await db.stockLedger.create({
      data: reversalData
    });

    reversalEntries.push(reversalEntry);
  }

  return reversalEntries;
}

/**
 * Extract audit information from HTTP request
 * @param {Object} req - Express request object
 * @returns {Object} Audit information object
 */
function extractAuditInfo(req) {
  return {
    user_role: req.user?.role || null,
    ip_address: req.ip || req.connection?.remoteAddress || null,
    user_agent: req.get('User-Agent') || null,
    session_id: req.sessionID || null
  };
}

/**
 * Get stock movement history for an item with audit trail
 * @param {string} item_id - Item ID
 * @param {Object} filters - Additional filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} Stock movement history with pagination
 */
async function getStockMovementHistory(item_id, filters = {}, page = 1, limit = 50) {
  const where = {
    item_id,
    ...filters
  };

  const skip = (page - 1) * limit;

  const [movements, totalCount] = await Promise.all([
    prisma.stockLedger.findMany({
      where,
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
            mfg_date: true,
            expiry_date: true
          }
        },
        created_by_staff: {
          select: {
            name: true,
            email: true,
            role: true
          }
        },
        branch: {
          select: {
            name: true,
            city: true
          }
        }
      },
      orderBy: {
        transaction_date: 'desc'
      },
      skip,
      take: limit
    }),
    prisma.stockLedger.count({ where })
  ]);

  return {
    movements,
    pagination: {
      current_page: page,
      total_pages: Math.ceil(totalCount / limit),
      total_records: totalCount,
      per_page: limit
    }
  };
}

/**
 * Generate audit report for stock transactions
 * @param {Object} filters - Report filters
 * @param {Date} filters.start_date - Start date
 * @param {Date} filters.end_date - End date
 * @param {string} filters.user_id - User ID
 * @param {string} filters.transaction_type - Transaction type
 * @param {string} filters.location_type - Location type
 * @param {string} filters.location_id - Location ID
 * @returns {Promise<Object>} Audit report data
 */
async function generateAuditReport(filters = {}) {
  const where = {};

  if (filters.start_date || filters.end_date) {
    where.transaction_date = {};
    if (filters.start_date) where.transaction_date.gte = filters.start_date;
    if (filters.end_date) where.transaction_date.lte = filters.end_date;
  }

  if (filters.user_id) where.created_by = filters.user_id;
  if (filters.transaction_type) where.transaction_type = filters.transaction_type;
  if (filters.location_type) where.location_type = filters.location_type;
  if (filters.location_id) where.location_id = filters.location_id;

  const [transactions, summary] = await Promise.all([
    prisma.stockLedger.findMany({
      where,
      include: {
        item: {
          select: {
            name: true,
            category: true
          }
        },
        created_by_staff: {
          select: {
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        transaction_date: 'desc'
      }
    }),
    prisma.stockLedger.groupBy({
      by: ['transaction_type', 'created_by'],
      where,
      _count: {
        id: true
      },
      _sum: {
        quantity_in: true,
        quantity_out: true,
        balance_value: true
      }
    })
  ]);

  return {
    transactions,
    summary,
    total_transactions: transactions.length,
    period: {
      start_date: filters.start_date,
      end_date: filters.end_date
    }
  };
}

module.exports = {
  createStockLedgerEntry,
  createStockReversalEntries,
  extractAuditInfo,
  getStockMovementHistory,
  generateAuditReport
};