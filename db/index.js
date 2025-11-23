const fs = require('fs');
const path = require('path');
const mongoDB = require('./mongodb');
const recordUtils = require('./record');
const vaultEvents = require('../events');
const backup = require('./backup');

async function addRecord({ name, value }) {
  recordUtils.validateRecord({ name, value });
  const data = await mongoDB.readDB();
  const newRecord = { 
    id: recordUtils.generateId(), 
    name, 
    value,
    createdDate: new Date().toISOString()
  };
  data.push(newRecord);
  await mongoDB.writeDB(data);
  // Create backup after add operation
  const backupFilename = backup.createBackup(data);
  console.log(`✅ Backup created: ${backupFilename}`);
  vaultEvents.emit('recordAdded', newRecord);
  return newRecord;
}

async function listRecords() {
  return await mongoDB.readDB();
}

async function updateRecord(id, newName, newValue) {
  const data = await mongoDB.readDB();
  const record = data.find(r => r.id === id);
  if (!record) return null;
  record.name = newName;
  record.value = newValue;
  record.modifiedDate = new Date().toISOString();
  await mongoDB.writeDB(data);
  vaultEvents.emit('recordUpdated', record);
  return record;
}

async function deleteRecord(id) {
  let data = await mongoDB.readDB();
  const record = data.find(r => r.id === id);
  if (!record) return null;
  data = data.filter(r => r.id !== id);
  await mongoDB.writeDB(data);
  // Create backup after delete operation
  const backupFilename = backup.createBackup(data);
  console.log(`✅ Backup created: ${backupFilename}`);
  vaultEvents.emit('recordDeleted', record);
  return record;
}

async function searchRecords(keyword) {
  const data = await mongoDB.readDB();
  const searchTerm = keyword.toLowerCase().trim();
  
  return data.filter(record => {
    // Case-insensitive search by name
    const nameMatch = record.name && record.name.toLowerCase().includes(searchTerm);
    // Search by ID (exact match or string contains)
    const idMatch = String(record.id).includes(searchTerm);
    return nameMatch || idMatch;
  });
}

async function sortRecords(field, order) {
  const data = await mongoDB.readDB();
  // Create a copy to avoid modifying the original array
  const sortedData = [...data];
  
  sortedData.sort((a, b) => {
    let compareResult = 0;
    
    if (field === 'Name') {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      compareResult = nameA.localeCompare(nameB);
    } else if (field === 'Creation Date') {
      const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
      const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
      compareResult = dateA - dateB;
    }
    
    // Apply ascending/descending order
    return order === 'Ascending' ? compareResult : -compareResult;
  });
  
  return sortedData;
}

async function exportToFile() {
  const data = await mongoDB.readDB();
  const exportPath = path.join(__dirname, '..', 'export.txt');
  const exportDate = new Date();
  const exportDateTime = exportDate.toLocaleString();
  const totalRecords = data.length;
  const filename = 'export.txt';
  
  let content = '========================================\n';
  content += 'NodeVault Data Export\n';
  content += '========================================\n';
  content += `Export Date/Time: ${exportDateTime}\n`;
  content += `Total Records: ${totalRecords}\n`;
  content += `Filename: ${filename}\n`;
  content += '========================================\n\n';
  
  if (data.length === 0) {
    content += 'No records found.\n';
  } else {
    data.forEach((record, index) => {
      const createdDate = record.createdDate 
        ? new Date(record.createdDate).toISOString().split('T')[0]
        : 'N/A';
      content += `Record ${index + 1}:\n`;
      content += `  ID: ${record.id}\n`;
      content += `  Name: ${record.name}\n`;
      content += `  Value: ${record.value}\n`;
      content += `  Created Date: ${createdDate}\n`;
      if (record.modifiedDate) {
        const modifiedDate = new Date(record.modifiedDate).toISOString().split('T')[0];
        content += `  Modified Date: ${modifiedDate}\n`;
      }
      content += '\n';
    });
  }
  
  fs.writeFileSync(exportPath, content, 'utf8');
  return exportPath;
}

async function getStatistics() {
  const data = await mongoDB.readDB();
  
  // Total records count
  const totalRecords = data.length;
  
  // Last modification date (get from the most recent modifiedDate in records)
  let lastModified = 'N/A';
  if (data.length > 0) {
    const recordsWithModified = data.filter(r => r.modifiedDate);
    if (recordsWithModified.length > 0) {
      const latestModified = recordsWithModified
        .map(r => new Date(r.modifiedDate))
        .sort((a, b) => b - a)[0];
      lastModified = latestModified.toISOString().replace('T', ' ').split('.')[0];
    } else {
      // If no modified dates, use the latest created date
      const latestCreated = data
        .filter(r => r.createdDate)
        .map(r => new Date(r.createdDate))
        .sort((a, b) => b - a)[0];
      if (latestCreated) {
        lastModified = latestCreated.toISOString().replace('T', ' ').split('.')[0];
      }
    }
  }
  
  // Find longest name
  let longestName = null;
  let longestNameLength = 0;
  if (data.length > 0) {
    data.forEach(record => {
      if (record.name && record.name.length > longestNameLength) {
        longestName = record.name;
        longestNameLength = record.name.length;
      }
    });
  }
  
  // Find earliest and latest record creation dates
  let earliestDate = null;
  let latestDate = null;
  if (data.length > 0) {
    const dates = data
      .filter(r => r.createdDate)
      .map(r => new Date(r.createdDate))
      .sort((a, b) => a - b);
    
    if (dates.length > 0) {
      earliestDate = dates[0].toISOString().split('T')[0];
      latestDate = dates[dates.length - 1].toISOString().split('T')[0];
    }
  }
  
  return {
    totalRecords,
    lastModified,
    longestName: longestName || 'N/A',
    longestNameLength,
    earliestRecord: earliestDate || 'N/A',
    latestRecord: latestDate || 'N/A'
  };
}

module.exports = { addRecord, listRecords, updateRecord, deleteRecord, searchRecords, sortRecords, exportToFile, getStatistics };
