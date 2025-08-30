const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('Checking material batches with expiry dates...');
    
    // Test the same filter logic as the expiry alerts endpoint
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const alertDate = new Date();
    alertDate.setDate(alertDate.getDate() + 30);
    
    const batches = await prisma.materialBatch.findMany({
      where: {
        expiry_date: {
          lte: alertDate,
          gte: currentDate
        },
        current_qty: { gt: 0 },
        is_expired: false
      },
      include: {
        item: {
          select: { name: true }
        }
      },
      orderBy: { expiry_date: 'asc' },
      take: 10
    });
    
    console.log('Testing expiry alerts filter logic...');
    console.log(`Filter: expiry_date >= ${currentDate.toISOString()} AND <= ${alertDate.toISOString()}`);
    
    console.log(`Found ${batches.length} batches with expiry dates:`);
    
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    console.log(`Current date: ${currentDate.toISOString()}`);
    console.log(`30 days from now: ${thirtyDaysFromNow.toISOString()}`);
    console.log('');
    
    batches.forEach((batch, index) => {
      const expiryDate = new Date(batch.expiry_date);
      const daysToExpiry = Math.ceil((expiryDate - currentDate) / (1000 * 60 * 60 * 24));
      const isWithin30Days = expiryDate <= thirtyDaysFromNow && expiryDate >= currentDate;
      
      console.log(`${index + 1}. ${batch.item.name}:`);
      console.log(`   Expiry Date: ${batch.expiry_date}`);
      console.log(`   Days to Expiry: ${daysToExpiry}`);
      console.log(`   Within 30 days: ${isWithin30Days}`);
      console.log(`   Quantity: ${batch.current_qty}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();