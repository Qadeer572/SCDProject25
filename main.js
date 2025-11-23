require('dotenv').config(); // Load environment variables from .env file
const readline = require('readline');
const db = require('./db');
const mongoDB = require('./db/mongodb');
require('./events/logger'); // Initialize event logger

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function menu() {
  console.log(`
===== NodeVault =====
1. Add Record
2. List Records
3. Update Record
4. Delete Record
5. Search Records
6. Sort Records
7. Export Data
8. View Vault Statistics
9. Exit
=====================
  `);

  rl.question('Choose option: ', ans => {
    switch (ans.trim()) {
      case '1':
        rl.question('Enter name: ', async name => {
          rl.question('Enter value: ', async value => {
            try {
              await db.addRecord({ name, value });
              console.log('✅ Record added successfully!');
            } catch (error) {
              console.log('❌ Error adding record:', error.message);
            }
            menu();
          });
        });
        break;

      case '2':
        (async () => {
          try {
            const records = await db.listRecords();
            if (records.length === 0) console.log('No records found.');
            else records.forEach(r => console.log(`ID: ${r.id} | Name: ${r.name} | Value: ${r.value}`));
          } catch (error) {
            console.log('❌ Error listing records:', error.message);
          }
          menu();
        })();
        break;

      case '3':
        rl.question('Enter record ID to update: ', id => {
          rl.question('New name: ', name => {
            rl.question('New value: ', async value => {
              try {
                const updated = await db.updateRecord(Number(id), name, value);
                console.log(updated ? '✅ Record updated!' : '❌ Record not found.');
              } catch (error) {
                console.log('❌ Error updating record:', error.message);
              }
              menu();
            });
          });
        });
        break;

      case '4':
        rl.question('Enter record ID to delete: ', async id => {
          try {
            const deleted = await db.deleteRecord(Number(id));
            console.log(deleted ? '🗑️ Record deleted!' : '❌ Record not found.');
          } catch (error) {
            console.log('❌ Error deleting record:', error.message);
          }
          menu();
        });
        break;

      case '5':
        rl.question('Enter search keyword: ', async keyword => {
          try {
            const results = await db.searchRecords(keyword);
            if (results.length === 0) {
              console.log('No records found.');
            } else {
              console.log(`Found ${results.length} matching record(s):`);
              results.forEach((record, index) => {
                // Format created date as YYYY-MM-DD
                const createdDate = record.createdDate 
                  ? new Date(record.createdDate).toISOString().split('T')[0]
                  : 'N/A';
                console.log(`${index + 1}. ID: ${record.id} | Name: ${record.name} | Created: ${createdDate}`);
              });
            }
          } catch (error) {
            console.log('❌ Error searching records:', error.message);
          }
          menu();
        });
        break;

      case '6':
        rl.question('Choose field to sort by (Name/Creation Date): ', field => {
          if (field.trim() !== 'Name' && field.trim() !== 'Creation Date') {
            console.log('Invalid field. Please choose Name or Creation Date.');
            menu();
            return;
          }
          rl.question('Choose order (Ascending/Descending): ', async order => {
            if (order.trim() !== 'Ascending' && order.trim() !== 'Descending') {
              console.log('Invalid order. Please choose Ascending or Descending.');
              menu();
              return;
            }
            try {
              const sortedRecords = await db.sortRecords(field.trim(), order.trim());
              if (sortedRecords.length === 0) {
                console.log('No records to sort.');
              } else {
                console.log('\nSorted Records:');
                sortedRecords.forEach((record, index) => {
                  console.log(`${index + 1}. ID: ${record.id} | Name: ${record.name}`);
                });
              }
            } catch (error) {
              console.log('❌ Error sorting records:', error.message);
            }
            menu();
          });
        });
        break;

      case '7':
        (async () => {
          try {
            await db.exportToFile();
            console.log('✅ Data exported successfully to export.txt');
          } catch (error) {
            console.log('❌ Error exporting data:', error.message);
          }
          menu();
        })();
        break;

      case '8':
        (async () => {
          try {
            const stats = await db.getStatistics();
            console.log('\nVault Statistics:');
            console.log('--------------------------');
            console.log(`Total Records: ${stats.totalRecords}`);
            console.log(`Last Modified: ${stats.lastModified}`);
            if (stats.longestName !== 'N/A') {
              console.log(`Longest Name: ${stats.longestName} (${stats.longestNameLength} characters)`);
            } else {
              console.log(`Longest Name: ${stats.longestName}`);
            }
            console.log(`Earliest Record: ${stats.earliestRecord}`);
            console.log(`Latest Record: ${stats.latestRecord}`);
            console.log('');
          } catch (error) {
            console.log('❌ Error getting statistics:', error.message);
          }
          menu();
        })();
        break;

      case '9':
        console.log('👋 Exiting NodeVault...');
        (async () => {
          try {
            await mongoDB.close();
          } catch (error) {
            // Ignore connection close errors
          }
          rl.close();
        })();
        break;

      default:
        console.log('Invalid option.');
        menu();
    }
  });
}

// Initialize MongoDB connection and start the application
(async () => {
  try {
    await mongoDB.connect();
    menu();
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    console.log('Exiting...');
    process.exit(1);
  }
})();
