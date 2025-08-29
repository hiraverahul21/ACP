const { prisma } = require('./config/database');

async function debugLeads() {
  try {
    console.log('=== Debugging Leads List Issue ===\n');
    
    // Check database connection
    console.log('1. Testing database connection...');
    await prisma.$connect();
    console.log('✓ Database connected successfully\n');
    
    // Check total leads count
    console.log('2. Checking leads count in database...');
    const leadCount = await prisma.lead.count();
    console.log(`Total leads in database: ${leadCount}\n`);
    
    if (leadCount > 0) {
      // Show sample leads
      console.log('3. Sample leads from database:');
      const sampleLeads = await prisma.lead.findMany({
        take: 3,
        select: {
          id: true,
          customer_name: true,
          status: true,
          created_at: true
        }
      });
      console.table(sampleLeads);
      console.log('');
    } else {
      console.log('3. No leads found in database\n');
    }
    
    console.log('4. Database check complete.');
    console.log('\nTo test the API endpoint manually, use:');
    console.log('curl -H "Cookie: jwt=your_jwt_token" http://localhost:8765/api/leads');
    
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugLeads();