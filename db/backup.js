const fs = require('fs');
const path = require('path');

const backupsDir = path.join(__dirname, '..', 'backups');

// Ensure backups directory exists
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

function createBackup(data) {
  // Generate backup filename: backup_YYYY-MM-DD_HH-MM-SS.json
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const filename = `backup_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.json`;
  const backupPath = path.join(backupsDir, filename);
  
  // Write complete vault state to backup file
  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2), 'utf8');
  
  return filename;
}

module.exports = { createBackup };

