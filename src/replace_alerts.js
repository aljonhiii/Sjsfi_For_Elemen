const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'assets', 'js', 'reports.js');
let content = fs.readFileSync(file, 'utf8');

const modalCode = `
// ==========================================
// 🎨 UI FUNCTIONS (CUSTOM MODAL CONTROLS)
// ==========================================
function showCustomModal(type, title, message) {
    const modal = document.getElementById('customModal');
    const modalIcon = document.getElementById('modalIcon');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalBtn = document.getElementById('modalBtn');
    
    if(!modal) {
        alert(title + ": " + message);
        return;
    }
    
    modalTitle.innerText = title;
    modalMessage.innerText = message;
    
    if (type === 'success') {
        modalIcon.innerHTML = "<i class='bx bx-check-circle' style='color: var(--success-color); font-size: 50px;'></i>";
        modalBtn.className = 'btn-confirm';
        modalBtn.innerText = 'Continue';
    } else if (type === 'error') {
        modalIcon.innerHTML = "<i class='bx bx-x-circle' style='color: var(--danger-color); font-size: 50px;'></i>";
        modalBtn.className = 'btn-danger';
        modalBtn.innerText = 'Try Again';
    } else {
        modalIcon.innerHTML = "<i class='bx bx-info-circle' style='color: #3b82f6; font-size: 50px;'></i>";
        modalBtn.className = 'btn-confirm';
        modalBtn.innerText = 'OK';
    }
    
    openModal('customModal');
}
`;

content += modalCode;

// Replace exact cases based on what they are
content = content.replace(/alert\("End Date cannot be in the future!"\)/g, "showCustomModal('error', 'Invalid Date', 'End Date cannot be in the future!')");
content = content.replace(/alert\("Start Date cannot be after End Date!"\)/g, "showCustomModal('error', 'Invalid Date', 'Start Date cannot be after End Date!')");
content = content.replace(/alert\("Database Error: " \+ response\.error\)/g, "showCustomModal('error', 'Database Error', 'Database Error: ' + response.error)");
content = content.replace(/alert\("System Error\. Check Console\."\)/g, "showCustomModal('error', 'System Error', 'System Error. Check Console.')");
content = content.replace(/alert\("Please load the data before exporting!"\)/g, "showCustomModal('error', 'Export Error', 'Please load the data before exporting!')");
content = content.replace(/alert\(`No records found for \$\{selectedDept\} in this date range\.`\)/g, "showCustomModal('error', 'No Records', `No records found for ${selectedDept} in this date range.`)");
content = content.replace(/alert\("Logs PDF Saved Successfully!"\)/g, "showCustomModal('success', 'Success', 'Logs PDF Saved Successfully!')");
content = content.replace(/alert\("Please click 'Compute' to load the data before exporting!"\)/g, "showCustomModal('error', 'Export Error', 'Please click \\'Compute\\' to load the data before exporting!')");
content = content.replace(/alert\(`No records found for \$\{deptFilter\} in this date range\.`\)/g, "showCustomModal('error', 'No Records', `No records found for ${deptFilter} in this date range.`)");
content = content.replace(/alert\("Summary PDF Saved Successfully!"\)/g, "showCustomModal('success', 'Success', 'Summary PDF Saved Successfully!')");
content = content.replace(/alert\("Please type a year format like 2026_2027"\)/g, "showCustomModal('error', 'Invalid Input', 'Please type a year format like 2026_2027')");
content = content.replace(/alert\("Archive Successful!"\)/g, "showCustomModal('success', 'Success', 'Archive Successful!')");
content = content.replace(/alert\("Error: " \+ result\.error\)/g, "showCustomModal('error', 'Error', 'Error: ' + result.error)");

fs.writeFileSync(file, content);
console.log('Done');
