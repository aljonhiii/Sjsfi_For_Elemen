        // === GLOBAL MEMORY ===
        let currentLogsData = [];
        let currentSummaryData = [];
        let currentPage = 1;
        const rowsPerPage = 10; 
        
        // This will hold the encoded image data so PDF never loses the picture!
        let base64Logo = ""; 

        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        
        // Turns on the loading screen and changes the text
        function showLoading(message = "Processing...") {
            document.getElementById('loading-text').innerText = message;
            document.getElementById('loading-overlay').classList.remove('hidden');
        }

        // Turns off the loading screen
        function hideLoading() {
            document.getElementById('loading-overlay').classList.add('hidden');
        }

        // === PAGE INITIALIZATION ===
        document.addEventListener('DOMContentLoaded', async () => {
            // 1. Setup Dates
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const formattedToday = `${year}-${month}-${day}`;

            const dateInputs = ['logStart', 'logEnd', 'sumStart', 'sumEnd'];
            dateInputs.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.value = formattedToday;
                    el.setAttribute("max", formattedToday);
                }
            });

            // 2. Pre-load the Logo for the PDF
            try {
                const logoImg = document.getElementById('sidebarLogo'); 
                if (logoImg) {
                    const response = await fetch(logoImg.src);
                    const blob = await response.blob();
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        base64Logo = reader.result; 
                    };
                    reader.readAsDataURL(blob);
                }
            } catch (error) {
                console.error("Could not load base64 logo", error);
            }

            // 3. Setup Archives & Load Data
            await loadArchiveUI();
            const sessionYear = await window.api.getActiveSessionYear();
            
            const select = document.getElementById('archiveSelect');
            if (select) {
                select.value = sessionYear;
                const label = select.options[select.selectedIndex] ? select.options[select.selectedIndex].text : "Live";
                updateHeaderIndicator(sessionYear, label);
            }

            // 4. Show empty state instead of auto-loading!
            const logsTable = document.getElementById('logsTable');
            const sumTable = document.getElementById('summaryTable');
            
            if (logsTable) {
                logsTable.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 40px; color: var(--text-secondary);"><i class="bx bx-list-ul" style="font-size: 24px; display: block; margin-bottom: 8px;"></i> Click "View Logs" to load data.</td></tr>';
            }
            if (sumTable) {
                sumTable.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 40px; color: var(--text-secondary);"><i class="bx bx-calculator" style="font-size: 24px; display: block; margin-bottom: 8px;"></i> Click "Compute" to load summary.</td></tr>';
            }
        });

        // ==========================================
        // SECTION 1: LOGS LOGIC & EXPORTS
        // ==========================================
async function loadLogs() {
    const start = document.getElementById('logStart').value;
    const end = document.getElementById('logEnd').value;
    
    // 🌟 THE FIX: Build "Today" using the Local Zamboanga Clock
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayLocal = `${year}-${month}-${day}`;

    // Now it compares "2026-04-13" > "2026-04-13" (which safely passes!)
    if (end > todayLocal) { 
        alert("End Date cannot be in the future!"); 
        return; 
    }
    if (start > end) { 
        alert("Start Date cannot be after End Date!"); 
        return; 
    }

    showLoading("Fetching Database Logs...");
    try {
        await sleep(300);
        const response = await window.api.getLogsRange(start, end);
        if(response.success) {
            currentLogsData = response.data;
            currentPage = 1;
            renderLogsTable();
        } else {
            alert("Database Error: " + response.error);
        }
    } catch (error) {
        alert("System Error. Check Console.");
    } finally {
        hideLoading();
    }
}

function renderLogsTable() {
            const tbody = document.getElementById('logsTable');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            if(currentLogsData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">No logs for this range.</td></tr>';
                return;
            }
            const start = (currentPage - 1) * rowsPerPage;
            const end = start + rowsPerPage;
            
            currentLogsData.slice(start, end).forEach(log => {
                const logTypeClass = log.log_type.includes('IN') ? 'log-in' : 'log-out';
                const logTypeIcon = log.log_type.includes('IN') ? "<i class='bx bx-right-arrow-alt'></i>" : "<i class='bx bx-left-arrow-alt'></i>";
                
                const dateObj = new Date(log.timestamp);
                const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dateStr = dateObj.toLocaleDateString();
                
                // 🌟 CLEAN TEXT LABEL INSTEAD OF BULKY BADGE 🌟
                const typeLabel = log.user_type === 'VISITOR' 
                    ? `<span style="color: #f39c12; font-weight: 800; font-size: 12px; margin-left: 6px;"></span>`
                    : `<span style="color: #1420c9; font-weight: 800; font-size: 12px; margin-left: 6px;"></span>`;
                
                tbody.innerHTML += `<tr>
                    <td><strong style="color: var(--primary-dark); font-size: 15px;">${log.full_name}</strong> ${typeLabel}</td>
                    <td><span style="font-weight: 600; color: var(--text-secondary);">${log.grade_level !== 'Guest' ? 'Grade ' : ''}${log.grade_level}</span></td>
                    <td><span class="${logTypeClass}" style="font-weight: 800;">${logTypeIcon} ${log.log_type}</span></td>
                    <td style="font-weight:600; font-family: monospace;">${dateStr} ${timeStr}</td>
                </tr>`;
            });
            
            const totalPages = Math.ceil(currentLogsData.length / rowsPerPage);
            const pageInfo = document.getElementById('pageInfo');
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            
            if (pageInfo) pageInfo.innerText = `Page ${currentPage} of ${totalPages || 1}`;
            if (prevBtn) prevBtn.disabled = currentPage === 1;
            if (nextBtn) nextBtn.disabled = currentPage === totalPages || totalPages === 0;
        }

        function changePage(dir) { currentPage += dir; renderLogsTable(); }

        function isGradeInDept(gradeValue, dept) {
            if (dept === 'ALL' || !dept) return true;
            
            // This cleans the data: "Grade 7" or "7th" both become the number 7
            const num = parseInt(String(gradeValue).replace(/\D/g, ''), 10);
            if (isNaN(num)) return false; 

            if (dept === 'Elementary') return num >= 1 && num <= 6;
            if (dept === 'Junior High') return num >= 7 && num <= 10;
            if (dept === 'Senior High') return num >= 11 && num <= 12;
            return false;
        } 

        // --- PDF LOGS ---
async function exportLogsPDF() {
            const start = document.getElementById('logStart').value;
            const end = document.getElementById('logEnd').value;
            
            // 1. Get the selected Department from the dropdown
            const deptFilter = document.getElementById('deptFilterLogs');
            const selectedDept = deptFilter ? deptFilter.value : 'ALL';

            if (currentLogsData.length === 0) {
                alert("Please load the data before exporting!"); 
                return;
            }

            showLoading('Exporting Pdf for Logs...');
            
            try {
                let fullTableRows = "";
                let rowCount = 0;

                // 2. Loop through logs and apply the Smart Filter (Visitors included!)
                currentLogsData.forEach(log => {
                    
                    // Filter Logic:
                    if (selectedDept === 'VISITOR') {
                        if (log.user_type !== 'VISITOR') return; // Skip students if we only want visitors
                    } else if (selectedDept !== 'ALL') {
                        if (log.user_type === 'VISITOR') return; // Skip visitors if we selected a specific student grade
                        if (!isGradeInDept(log.grade_level, selectedDept)) return; // Skip students not in the grade
                    }

                    const dateObj = new Date(log.timestamp);
                    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const dateStr = dateObj.toLocaleDateString();
                    const typeColor = log.log_type.includes('IN') ? '#27ae60' : '#d63031';
                    
                    // 🌟 CLEAN TEXT LABEL FOR PDF 🌟
                    const roleLabel = log.user_type === 'VISITOR' 
                        ? `<span style="color: #f39c12; font-size: 11px; font-weight: bold; margin-left: 4px;"></span>` 
                        : `<span style="color: #1420c9; font-size: 11px; font-weight: bold; margin-left: 4px;"></span>`;
                    
                    fullTableRows += `<tr>
                        <td><b>${log.full_name}</b> ${roleLabel}</td>
                        <td>${log.grade_level !== 'Guest' ? 'Grade ' : ''}${log.grade_level}</td>
                        <td style="color: ${typeColor}; font-weight: bold;">${log.log_type}</td>
                        <td>${dateStr} ${timeStr}</td>
                    </tr>`;
                    rowCount++;
                });

                // 3. If no records match the filter, stop here
                if (rowCount === 0) {
                    alert(`No records found for ${selectedDept} in this date range.`);
                    return;
                }

                const imageTag = base64Logo ? `<img src="${base64Logo}" width="80" height="80" style="margin-bottom: 10px; object-fit: contain;">` : '';

                const reportHTML = `
                    <html>
                    <head>
                        <style>
                            /* --- GLOBAL PRINT SETTINGS --- */
                            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #000; margin: 0; }
                            
                            /* --- SCHOOL LETTERHEAD DESIGN --- */
                            .school-header {
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                gap: 15px;
                                margin-bottom: 20px;
                                padding-bottom: 15px;
                            }
                            .logo-container img {
                                width: 85px;
                                height: 85px;
                                object-fit: contain;
                            }
                            .text-container {
                                display: flex;
                                flex-direction: column;
                            }
                            .chinese-text {
                                font-size: 16px;
                                font-weight: bold;
                                margin-bottom: 2px;
                                color: #000;
                            }
                            .school-name {
                                font-size: 24px;
                                font-family: 'Times New Roman', serif;
                                font-weight: 800;
                                margin: 0;
                                color: #000;
                                border-bottom: 2px solid #1e8449;
                                padding-bottom: 4px;
                                margin-bottom: 4px;
                                letter-spacing: 0.5px;
                            }
                            .contact-info {
                                font-size: 11px;
                                font-family: Arial, sans-serif;
                                line-height: 1.4;
                                color: #000;
                            }

                            /* --- REPORT TITLE --- */
                            .report-title { text-align: center; margin-bottom: 20px; }
                            .report-title h2 { margin: 0; color: #1e8449; font-size: 18px; text-transform: uppercase; }
                            .report-title p { margin: 5px 0 0 0; font-size: 12px; font-weight: bold; color: #555; }

                            /* --- TABLE STYLES --- */
                            table { width: 100%; border-collapse: collapse; }
                            th { background-color: #f3faef; border: 1px solid #d1e8d8; padding: 10px; text-align: left; font-size: 12px; color: #1e8449; }
                            td { border: 1px solid #d1e8d8; padding: 8px 10px; font-size: 12px; }

                            /* --- REPEATING PDF MAGIC --- */
                            @media print {
                                thead { display: table-header-group; }
                                tfoot { display: table-footer-group; }
                            }
                            
                            .sig-container {
                                display: flex;
                                justify-content: space-between;
                                align-items: flex-end;
                                padding-top: 40px;
                            }
                            .sig-box { text-align: center; }
                            .sig-line {
                                border-bottom: 1px solid #000;
                                width: 180px;
                                height: 30px;
                                margin-bottom: 5px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="school-header">
                            <div class="logo-container">
                                ${imageTag}
                            </div>
                            <div class="text-container">
                                <span class="chinese-text">三寶顏忠義中學</span>
                                <h1 class="school-name">SAINT JOSEPH SCHOOL FOUNDATION, INC.</h1>
                                <div class="contact-info">
                                    Gov. Camins Avenue P.O Box 210 7000 Zamboanga City<br>
                                    Tel. No. (062) 991-6675 / Fax No. (062) 993-2231
                                </div>
                            </div>
                        </div>

                        <div class="report-title">
                            <h2>Attendance Logs Report</h2>
                            <p>Dept: <b>${selectedDept}</b> | Period: <b>${start}</b> to <b>${end}</b></p>
                        </div>

                        <table>
                            <thead>
                                <tr><th>Name & Role</th><th>Grade Level</th><th>Log Type</th><th>Time / Date</th></tr>
                            </thead>
                            <tbody>
                                ${fullTableRows}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="4" style="border: none;">
                                        <div class="sig-container">
                                            <div class="sig-box">
                                                <div class="sig-line"></div>
                                                <b style="font-size: 12px;">Librarian Signature</b>
                                            </div>
                                            <div style="font-size: 11px; color: #555;">
                                                Generated: ${new Date().toLocaleDateString()}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </body>
                    </html>
                `;

                // Include the department in the filename for better organization
                const fileName = `Library_Logs_${selectedDept}_${start}_to_${end}.pdf`;
                const result = await window.api.generatePDF(fileName, reportHTML); 
                if (result.success) alert("Logs PDF Saved Successfully!");

            } finally {
                hideLoading();
            }
        }

        // ==========================================
        // SECTION 2: SUMMARY LOGIC & EXPORTS
        // ==========================================
        async function loadSummary() {
    const start = document.getElementById('sumStart').value;
    const end = document.getElementById('sumEnd').value;
    
    // 🌟 TIMEZONE FIX: Build "Today" using the Local Zamboanga Clock
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayLocal = `${year}-${month}-${day}`;

    // Use todayLocal for safe mathematical string comparison
    if (end > todayLocal) { alert("End Date cannot be in the future!"); return; }
    if (start > end) { alert("Start Date cannot be after End Date!"); return; }

    const response = await window.api.getLogsRange(start, end);
    const tbody = document.getElementById('summaryTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    currentSummaryData = []; 

    if(response.success && response.data.length > 0) {
        const summary = {};
        
        // Ensure data is sorted chronological (oldest to newest) for accurate time math
        const sortedData = response.data.reverse(); 

        sortedData.forEach(log => {
            // Skip visitors for summary calculation
            if (log.user_type === 'VISITOR') return; 

            // 🌟 MATH FIX: Group by 'student_code' so IN and OUT match the same person!
            const sCode = log.student_code; 

            if(!summary[sCode]) summary[sCode] = { name: log.full_name, grade: log.grade_level, total: 0, lastIn: null };
            
            if(log.log_type === 'TIME IN') {
                summary[sCode].lastIn = new Date(log.timestamp);
            } 
            else if(log.log_type === 'TIME OUT' && summary[sCode].lastIn) {
                summary[sCode].total += (new Date(log.timestamp) - summary[sCode].lastIn);
                summary[sCode].lastIn = null; // Reset for their next visit
            }
        });
        
        Object.values(summary).forEach(s => {
            // Only show students who actually completed a visit (total > 0)
            if (s.total > 0) {
                const hours = Math.floor(s.total / 3600000);
                const mins = Math.floor((s.total % 3600000) / 60000);
                
                // Format nicely: e.g., "1h 5m" or just "45m"
                let timeString = '';
                if (hours > 0) timeString += `${hours}h `;
                timeString += `${mins}m`;
                
                currentSummaryData.push({ name: s.name, grade: s.grade, time: timeString });
                
                tbody.innerHTML += `<tr>
                    <td><strong style="color: var(--primary-dark);">${s.name}</strong></td>
                    <td>${s.grade}</td>
                    <td><strong style="color: var(--primary-color);">${timeString}</strong></td>
                </tr>`;
            }
        });
        
        if (currentSummaryData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px;">No completed library sessions found.</td></tr>';
        }
    } else { 
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px;">No data found.</td></tr>'; 
    }
}

        // --- PDF SUMMARY ---
        async function exportSummaryPDF() {
            const start = document.getElementById('sumStart').value;
            const end = document.getElementById('sumEnd').value;

            if (currentSummaryData.length === 0) {
                alert("Please click 'Compute' to load the data before exporting!"); return;
            }

            showLoading('Exporting Pdf for Summary');
            try {
                await sleep(2000);
                let fullTableRows = "";
                currentSummaryData.forEach(row => {
                    fullTableRows += `<tr>
                        <td><b>${row.name}</b></td>
                        <td>Grade ${row.grade}</td>
                        <td style="color: #1e8449; font-weight: bold;">${row.time}</td>
                    </tr>`;
                });

                const imageTag = base64Logo ? `<img src="${base64Logo}" width="80" height="80" style="margin-bottom: 10px; object-fit: contain;">` : '';

                const reportHTML = `
                    <html>
                    <head>
                        <style>
                            /* --- GLOBAL PRINT SETTINGS --- */
                            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #000; margin: 0; }
                            
                            /* --- SCHOOL LETTERHEAD DESIGN --- */
                            .school-header {
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                gap: 15px;
                                margin-bottom: 20px;
                                padding-bottom: 15px;
                            }
                            .logo-container img {
                                width: 85px;
                                height: 85px;
                                object-fit: contain;
                            }
                            .text-container {
                                display: flex;
                                flex-direction: column;
                            }
                            .chinese-text {
                                font-size: 16px;
                                font-weight: bold;
                                margin-bottom: 2px;
                                color: #000;
                            }
                            .school-name {
                                font-size: 24px;
                                font-family: 'Times New Roman', serif;
                                font-weight: 800;
                                margin: 0;
                                color: #000;
                                border-bottom: 2px solid #1e8449; 
                                padding-bottom: 4px;
                                margin-bottom: 4px;
                                letter-spacing: 0.5px;
                            }
                            .contact-info {
                                font-size: 11px;
                                font-family: Arial, sans-serif;
                                line-height: 1.4;
                                color: #000;
                            }

                            /* --- REPORT TITLE --- */
                            .report-title { text-align: center; margin-bottom: 20px; }
                            .report-title h2 { margin: 0; color: #1e8449; font-size: 18px; text-transform: uppercase; }
                            .report-title p { margin: 5px 0 0 0; font-size: 12px; font-weight: bold; color: #555; }

                            /* --- TABLE STYLES --- */
                            table { width: 100%; border-collapse: collapse; }
                            th { background-color: #f3faef; border: 1px solid #d1e8d8; padding: 10px; text-align: left; font-size: 12px; color: #1e8449; }
                            td { border: 1px solid #d1e8d8; padding: 8px 10px; font-size: 12px; }

                            /* --- REPEATING PDF MAGIC --- */
                            @media print {
                                thead { display: table-header-group; }
                                tfoot { display: table-footer-group; }
                            }
                            
                            .sig-container {
                                display: flex;
                                justify-content: space-between;
                                align-items: flex-end;
                                padding-top: 40px; 
                            }
                            .sig-box { text-align: center; }
                            .sig-line {
                                border-bottom: 1px solid #000;
                                width: 180px;
                                height: 30px; 
                                margin-bottom: 5px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="school-header">
                            <div class="logo-container">
                                ${imageTag}
                            </div>
                            <div class="text-container">
                                <span class="chinese-text">三寶顏忠義中學</span>
                                <h1 class="school-name">SAINT JOSEPH SCHOOL FOUNDATION, INC.</h1>
                                <div class="contact-info">
                                    Gov. Camins Avenue P.O Box 210 7000 Zamboanga City<br>
                                    Tel. No. (062) 991-6675 / Fax No. (062) 993-2231
                                </div>
                            </div>
                        </div>

                        <div class="report-title">
                            <h2>Time Summary Report</h2>
                            <p>Period: <b>${start}</b> to <b>${end}</b></p>
                        </div>

                        <table>
                            <thead>
                                <tr><th>Student Name</th><th>Grade Level</th><th>Total Library Time</th></tr>
                            </thead>
                            
                            <tbody>
                                ${fullTableRows}
                            </tbody>
                            
                            <tfoot>
                                <tr>
                                    <td colspan="3" style="border: none;">
                                        <div class="sig-container">
                                            <div class="sig-box">
                                                <div class="sig-line"></div>
                                                <b style="font-size: 12px;">Librarian Signature</b>
                                            </div>
                                            <div style="font-size: 11px; color: #555;">
                                                Generated: ${new Date().toLocaleDateString()}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </body>
                    </html>
                `;

                const fileName = `Library_Summary_${start}_to_${end}.pdf`;
                const result = await window.api.generatePDF(fileName, reportHTML);
                if (result.success) alert("Summary PDF Saved Successfully!");
            } finally {
                hideLoading();
            }
        }

        // ==========================================
        // SECTION 3: ARCHIVE UI LOGIC
        // ==========================================
        function updateHeaderIndicator(fileName, label) {
            const headerTitle = document.querySelector('.header h1');
            if(!headerTitle) return;

            if(fileName === 'current') {
                headerTitle.innerHTML = `Reports <span style="font-size: 13px; background: var(--primary-color); color: white; padding: 4px 12px; border-radius: 20px; margin-left: 10px; vertical-align: middle; font-weight: 600;">LIVE DATA</span>`;
            } else {
                headerTitle.innerHTML = `Reports <span style="font-size: 13px; background: #f39c12; color: white; padding: 4px 12px; border-radius: 20px; margin-left: 10px; vertical-align: middle; font-weight: 600;">ARCHIVE: ${label}</span>`;
            }
        }

        async function loadArchiveUI() {
            const select = document.getElementById('archiveSelect');
            if (!select) return;
            const archives = await window.api.getArchives();
            
            select.innerHTML = `<option value="current">Current Year (Live)</option>`;
            
            archives.forEach(arc => {
                const option = document.createElement('option');
                option.value = arc.fileName;
                option.innerText = arc.label;
                select.appendChild(option);
            });
        }

        async function handleYearChange() {
            const select = document.getElementById('archiveSelect');
            if (!select) return;
            
            const fileName = select.value;
            const label = select.options[select.selectedIndex].text;

            const logsTable = document.getElementById('logsTable');
            const sumTable = document.getElementById('summaryTable');

            showLoading('Syncing the archive database....');
            try {
                await sleep(1000);
                
                if (logsTable) logsTable.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 40px;">Switching source...</td></tr>';
                if (sumTable) sumTable.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 40px;">Recalculating...</td></tr>';

                currentLogsData = [];
                currentSummaryData = [];

                await window.api.switchReportDb(fileName);
                updateHeaderIndicator(fileName, label);

                if (logsTable) {
                    logsTable.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 40px; color: var(--text-secondary);"><i class="bx bx-list-ul" style="font-size: 24px; display: block; margin-bottom: 8px;"></i> Click "View Logs" to load data for this archive.</td></tr>';
                }
                if (sumTable) {
                    sumTable.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 40px; color: var(--text-secondary);"><i class="bx bx-calculator" style="font-size: 24px; display: block; margin-bottom: 8px;"></i> Click "Compute" to load summary for this archive.</td></tr>';
                }
                
                console.log("Database Sync Active: " + label);
            } finally {
                hideLoading();
            }
        } 

        // 5. Execute Archive
        async function executeArchive() {
            const yearInputObj = document.getElementById('newYearInput');
            const yearInput = yearInputObj.value.trim();

            if (!yearInput) return alert("Please type a year format like 2026_2027");

            if (confirm(`CRITICAL: This will archive the current data as ${yearInput}. Continue?`)) {
                const result = await window.api.archiveSchoolYear(yearInput);

                showLoading('Archiving Database Please Wait...')
                try {
                    await sleep(2000);
                    if (result.success) {
                        alert("Archive Successful!");
                        yearInputObj.value = '';
                        await loadArchiveUI(); 
                        document.getElementById('archiveSelect').value = 'current'; 
                        await handleYearChange(); 
                    } else {
                        alert("Error: " + result.error);
                    }
                } finally {
                    hideLoading();
                }
            }
        }


        // ==========================================
// 🎨 UI FUNCTIONS (MODAL CONTROLS)
// ==========================================
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Ensure your existing functions (loadLogs, executeArchive, handleYearChange, etc.) 
// remain exactly as they are below this line!