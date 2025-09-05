const { prisma } = require('../config/database');
const { Prisma } = require('@prisma/client');
const { createStockReversalEntries, extractAuditInfo } = require('./stockAuditTrail');
const { logger } = require('./logger');

/**
 * Revert stock for rejected material issues
 * @param {string} issueId - Material issue ID
 * @param {string} rejectionReason - Reason for rejection
 * @param {Object} req - Express request object for audit info
 * @param {Object} tx - Prisma transaction object (optional)
 * @returns {Promise<void>}
 */
async function revertMaterialIssueStock(issueId, rejectionReason, req, tx = null) {
  const prismaClient = tx || prisma;
  
  try {
    // Get the material issue with items and batches
    const issue = await prismaClient.materialIssue.findUnique({
      where: { id: issueId },
      include: {
        issue_items: {
          include: {
            batch: true,
            item: true
          }
        }
      }
    });
    
    if (!issue) {
      throw new Error(`Material issue with ID ${issueId} not found`);
    }
    
    if (issue.status !== 'PENDING') {
      throw new Error(`Cannot revert stock for issue with status: ${issue.status}`);
    }
    
    const auditInfo = extractAuditInfo(req);
    auditInfo.reference_no = issue.issue_no;
    auditInfo.notes = `Stock reversion for rejected material issue. Reason: ${rejectionReason}`;
    auditInfo.system_generated = true;
    
    // Create reversal entries for each issued item
    const reversalEntries = [];
    
    for (const issueItem of issue.issue_items) {
      const batch = issueItem.batch;
      
      // Restore quantity to original batch
      await prismaClient.materialBatch.update({
        where: { id: batch.id },
        data: {
          current_qty: {
            increment: issueItem.quantity
          }
        }
      });
      
      // Find the original outward stock ledger entry
      const originalEntry = await prismaClient.stockLedger.findFirst({
        where: {
          transaction_type: 'ISSUE',
          transaction_id: issue.id,
          item_id: issueItem.item_id,
          batch_id: batch.id,
          quantity_out: issueItem.quantity
        }
      });
      
      if (originalEntry) {
        // Create reversal entry
        const reversalEntry = {
          item_id: issueItem.item_id,
          batch_id: batch.id,
          location_type: issue.from_location_type,
          location_id: issue.from_location_id,
          transaction_type: 'ADJUSTMENT',
          transaction_id: issue.id,
          transaction_date: new Date(),
          quantity_in: issueItem.quantity,
          quantity_out: null,
          balance_quantity: batch.current_qty + issueItem.quantity,
          rate_per_unit: batch.rate_per_unit,
          balance_value: issueItem.quantity * batch.rate_per_unit,
          created_by: req.user.id,
          reversal_of: originalEntry.id,
          auditInfo
        };
        
        reversalEntries.push(reversalEntry);
      }
    }
    
    // Create all reversal entries
    if (reversalEntries.length > 0) {
      await createStockReversalEntries(reversalEntries, prismaClient);
    }
    
    logger.info(`Stock reverted for rejected material issue: ${issue.issue_no}`, {
      issueId: issue.id,
      itemsReverted: reversalEntries.length,
      rejectedBy: req.user.id,
      reason: rejectionReason
    });
    
  } catch (error) {
    logger.error('Error reverting material issue stock:', {
      issueId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Revert stock for cancelled material transfers
 * @param {string} transferId - Material transfer ID
 * @param {string} cancellationReason - Reason for cancellation
 * @param {Object} req - Express request object for audit info
 * @param {Object} tx - Prisma transaction object (optional)
 * @returns {Promise<void>}
 */
async function revertMaterialTransferStock(transferId, cancellationReason, req, tx = null) {
  const prismaClient = tx || prisma;
  
  try {
    // Get the material transfer with items and batches
    const transfer = await prismaClient.materialTransfer.findUnique({
      where: { id: transferId },
      include: {
        transfer_items: {
          include: {
            batch: true,
            item: true
          }
        }
      }
    });
    
    if (!transfer) {
      throw new Error(`Material transfer with ID ${transferId} not found`);
    }
    
    if (transfer.status !== 'PENDING') {
      throw new Error(`Cannot revert stock for transfer with status: ${transfer.status}`);
    }
    
    const auditInfo = extractAuditInfo(req);
    auditInfo.reference_no = transfer.transfer_no;
    auditInfo.notes = `Stock reversion for cancelled material transfer. Reason: ${cancellationReason}`;
    auditInfo.system_generated = true;
    
    // Create reversal entries for each transferred item
    const reversalEntries = [];
    
    for (const transferItem of transfer.transfer_items) {
      const batch = transferItem.batch;
      
      // Restore quantity to source location batch
      await prismaClient.materialBatch.update({
        where: { id: batch.id },
        data: {
          current_qty: {
            increment: transferItem.quantity
          }
        }
      });
      
      // Remove quantity from destination location batch
      await prismaClient.materialBatch.updateMany({
        where: {
          item_id: transferItem.item_id,
          batch_no: batch.batch_no,
          location_type: transfer.to_location_type,
          location_id: transfer.to_location_id
        },
        data: {
          current_qty: {
            decrement: transferItem.quantity
          }
        }
      });
      
      // Find the original outward stock ledger entry
      const originalOutwardEntry = await prismaClient.stockLedger.findFirst({
        where: {
          transaction_type: 'TRANSFER',
          transaction_id: transfer.id,
          item_id: transferItem.item_id,
          batch_id: batch.id,
          quantity_out: transferItem.quantity,
          location_type: transfer.from_location_type
        }
      });
      
      // Find the original inward stock ledger entry
      const originalInwardEntry = await prismaClient.stockLedger.findFirst({
        where: {
          transaction_type: 'TRANSFER',
          transaction_id: transfer.id,
          item_id: transferItem.item_id,
          batch_id: batch.id,
          quantity_in: transferItem.quantity,
          location_type: transfer.to_location_type
        }
      });
      
      // Create reversal entries
      if (originalOutwardEntry) {
        const outwardReversalEntry = {
          item_id: transferItem.item_id,
          batch_id: batch.id,
          location_type: transfer.from_location_type,
          location_id: transfer.from_location_id,
          transaction_type: 'ADJUSTMENT',
          transaction_id: transfer.id,
          transaction_date: new Date(),
          quantity_in: transferItem.quantity,
          quantity_out: null,
          balance_quantity: batch.current_qty + transferItem.quantity,
          rate_per_unit: batch.rate_per_unit,
          balance_value: transferItem.quantity * batch.rate_per_unit,
          created_by: req.user.id,
          reversal_of: originalOutwardEntry.id,
          auditInfo
        };
        
        reversalEntries.push(outwardReversalEntry);
      }
      
      if (originalInwardEntry) {
        const inwardReversalEntry = {
          item_id: transferItem.item_id,
          batch_id: batch.id,
          location_type: transfer.to_location_type,
          location_id: transfer.to_location_id,
          transaction_type: 'ADJUSTMENT',
          transaction_id: transfer.id,
          transaction_date: new Date(),
          quantity_in: null,
          quantity_out: transferItem.quantity,
          balance_quantity: 0,
          rate_per_unit: batch.rate_per_unit,
          balance_value: -(transferItem.quantity * batch.rate_per_unit),
          created_by: req.user.id,
          reversal_of: originalInwardEntry.id,
          auditInfo
        };
        
        reversalEntries.push(inwardReversalEntry);
      }
    }
    
    // Create all reversal entries
    if (reversalEntries.length > 0) {
      await createStockReversalEntries(reversalEntries, prismaClient);
    }
    
    logger.info(`Stock reverted for cancelled material transfer: ${transfer.transfer_no}`, {
      transferId: transfer.id,
      itemsReverted: reversalEntries.length,
      cancelledBy: req.user.id,
      reason: cancellationReason
    });
    
  } catch (error) {
    logger.error('Error reverting material transfer stock:', {
      transferId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Get stock reversion history for a transaction
 * @param {string} transactionId - Transaction ID
 * @param {string} transactionType - Transaction type (ISSUE, TRANSFER, etc.)
 * @returns {Promise<Array>} Array of reversal entries
 */
async function getStockReversionHistory(transactionId, transactionType) {
  try {
    const reversalEntries = await prisma.stockLedger.findMany({
      where: {
        transaction_id: transactionId,
        transaction_type: 'ADJUSTMENT',
        reversal_of: {
          not: null
        }
      },
      include: {
        item: {
          select: {
            item_name: true,
            item_code: true
          }
        },
        batch: {
          select: {
            batch_no: true
          }
        },
        created_by_staff: {
          select: {
            name: true,
            employee_id: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    
    return reversalEntries;
  } catch (error) {
    logger.error('Error getting stock reversion history:', {
      transactionId,
      transactionType,
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  revertMaterialIssueStock,
  revertMaterialTransferStock,
  getStockReversionHistory
};