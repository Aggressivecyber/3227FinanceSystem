const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const EXCEL_FILE_PATH = path.join(__dirname, '../../data/records.xlsx');

// Initialize Excel file if not exists
const initExcel = () => {
    if (!fs.existsSync(EXCEL_FILE_PATH)) {
        const wb = xlsx.utils.book_new();
        // Headers: Time, Amount, Purpose, Invoice, User, Status, Reviewer
        const ws = xlsx.utils.aoa_to_sheet([['Time', 'Amount', 'Purpose', 'Invoice', 'User', 'Status', 'Reviewer']]);
        xlsx.utils.book_append_sheet(wb, ws, 'Records');
        xlsx.writeFile(wb, EXCEL_FILE_PATH);
    }
};

const addRecord = (record) => {
    try {
        initExcel();
        const wb = xlsx.readFile(EXCEL_FILE_PATH);
        const ws = wb.Sheets['Records'];
        const data = xlsx.utils.sheet_to_json(ws, { header: 1 });

        // Add new row
        const newRow = [
            new Date().toLocaleString('zh-CN'),
            record.amount,
            record.purpose,
            record.invoiceUrl,
            record.username,
            record.status,
            record.reviewer || ''
        ];

        data.push(newRow);
        const newWs = xlsx.utils.aoa_to_sheet(data);
        wb.Sheets['Records'] = newWs;
        xlsx.writeFile(wb, EXCEL_FILE_PATH);
    } catch (error) {
        console.error('Error writing to Excel:', error);
    }
};

module.exports = { initExcel, addRecord };
