const { db, getNextBugNumber } = require('./database');

async function migrateBugNumbers() {
  try {
    console.log('Starting bug number migration...');
    
    // Get all bugs without bug numbers
    const [bugs] = await db.execute('SELECT id FROM bugs WHERE bug_number IS NULL ORDER BY created_at ASC');
    
    console.log(`Found ${bugs.length} bugs without bug numbers`);
    
    for (const bug of bugs) {
      const bugNumber = await getNextBugNumber();
      await db.execute('UPDATE bugs SET bug_number = ? WHERE id = ?', [bugNumber, bug.id]);
      console.log(`Assigned ${bugNumber} to bug ${bug.id}`);
    }
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateBugNumbers();