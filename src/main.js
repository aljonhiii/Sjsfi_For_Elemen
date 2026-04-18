const { app, BrowserWindow, ipcMain, dialog, shell, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const sqlite = require('better-sqlite3');
const dbManager = require('./database.js'); // Dual-Connection Manager


const log = require('electron-log');





// 1. GLOBAL PATHS & STATE

let activeYearFile = 'current';




// 1. Format and Size Limits
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}';
log.transports.file.maxSize = 5 * 1024 * 1024; // Clears after 5MB


function getFriendlyError(error) {
    const errorString = String(error.message || error);
    if (errorString.includes('SQLITE_BUSY')) return "The database is busy right now. Please wait one second and scan again.";
    if (errorString.includes('no such column')) return "System update needed: The database is missing a column.";
    if (errorString.includes('EPERM')) return "Windows Security blocked the save. Please save to the Desktop.";
    if (errorString.includes('undefined') || errorString.includes('null')) return "The scanner read a barcode, but that student does not exist.";
    if (errorString.includes('ENOENT')) return "The system tried to open a file that doesn't exist.";
    return "Unknown System Error: " + errorString; 
}

// 2. Catch Silent Crashes
process.on('uncaughtException', (error) => log.error('CRITICAL CRASH:', error));
process.on('unhandledRejection', (error) => log.error('PROMISE REJECTION:', error));

// 3. Let Frontend Open the File
ipcMain.handle('open-log-file', async () => {
    try {
        await shell.openPath(log.transports.file.getFile().path);
        return { success: true };
    } catch (error) {
        log.error("Failed to open log file:", error);
        return { success: false };
    }
});



log.info("🚀 SJSFI Library System Booted Up Successfully!");

// 2. WINDOW CREATION 

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200, height: 800,
        
        // We start locked down because the first page is attendance.html
        kiosk: true,              
        autoHideMenuBar: true,    
        alwaysOnTop: true,        
        
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            webSecurity: false 
        }
    });


// ==========================================
    // 🚦 THE KIOSK TOGGLE LOGIC 🚦
    // ==========================================
    mainWindow.webContents.on('did-navigate', (event, url) => {
        
        if (url.includes('attendance.html')) {
            // 🔒 LOCK IT DOWN: Student Scanner
            console.log("Scanner active: Locking to absolute Full Screen");
            
            // 🌟 THE FIX: Un-maximize first, then apply full screen with a tiny delay
            setTimeout(() => {
                if (!mainWindow.isDestroyed()) {
                    // 1. Clear Windows' confused maximized state
                    if (mainWindow.isMaximized()) {
                        mainWindow.unmaximize(); 
                    }
                    
                    // 2. Now force it into absolute lock-down
                    mainWindow.setFullScreen(true); 
                    mainWindow.setKiosk(true);
                    mainWindow.setAlwaysOnTop(true, 'screen-saver');
                    
                    mainWindow.show();
                    mainWindow.focus();
                }
            }, 100);
            
        } else {
            // 🔓 UNLOCK IT: Admin/Visitor Dashboard
            console.log("Admin active: Unlocking normal window");
            
            // Turn off BOTH full screen and kiosk mode
            mainWindow.setKiosk(false);
            mainWindow.setFullScreen(false);
            mainWindow.setAlwaysOnTop(false);
            
            // Give Windows a split-second to exit Full Screen before maximizing
            setTimeout(() => {
                if (!mainWindow.isDestroyed()) {
                    mainWindow.maximize(); 
                    mainWindow.show();
                    mainWindow.focus();
                }
            }, 100);
        }
    });
    // ==========================================
    // ==========================================

    mainWindow.loadFile(path.join(__dirname, 'attendance.html'));
}

app.whenReady().then(() => {
    createWindow();

    // The emergency exit (Just in case!)
globalShortcut.register('CommandOrControl+Shift+Q', () => {
    console.log('Emergency Exit Triggered');
    app.quit();
});
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});


// 3. SCANNER LOGIC (Session-Aware)

ipcMain.handle('process-attendance', async (event, code) => {
    if (dbManager.getIsArchiving()) return { success: false, error: "System is archiving. Please wait." };

    if (activeYearFile !== 'current') {
        console.log("❌ SCAN BLOCKED: System is viewing an archive.");
        return { success: false, error: "Can't scan while viewing an archived school year. Please switch back to Current Year." };
    }

    try {
        const db = dbManager.getReportDb(); 
        const input = code.trim(); // Clean the input

        // 1. TRACKING: See exactly what the scanner sent
        console.log(`\n📡 SCAN RECEIVED: [${input}] (Length: ${input.length})`);

        // ==========================================================
        // 🌟 STEP 1.5: VISITOR CHECKOUT INTERCEPT 🌟
        // ==========================================================
        // Fix: We now check the badge_code column instead of the visitor_name!
        const latestBadgeLog = db.prepare(`
            SELECT log_type 
            FROM visitor_logs 
            WHERE badge_code COLLATE NOCASE = ? 
            AND date(timestamp, 'localtime') = date('now', 'localtime')
            ORDER BY id DESC LIMIT 1
        `).get(input);

        // If the badge is currently checked IN, intercept and log them OUT!
        if (latestBadgeLog && latestBadgeLog.log_type === 'TIME IN') {
            console.log(`✅ VISITOR BADGE MATCH: Checking out group [${input}]`);
            
            // Find the exact people who are currently signed in with this badge
            const groupMembers = db.prepare(`
                SELECT visitor_name 
                FROM visitor_logs 
                WHERE badge_code COLLATE NOCASE = ? 
                AND id IN (
                    SELECT MAX(id) FROM visitor_logs 
                    WHERE date(timestamp, 'localtime') = date('now', 'localtime') 
                    GROUP BY visitor_name COLLATE NOCASE
                )
                AND log_type = 'TIME IN'
            `).all(input);

            // Log them ALL out instantly
            const insertOut = db.prepare(`INSERT INTO visitor_logs (badge_code, visitor_name, log_type) VALUES (?, ?, 'TIME OUT')`);
            const checkoutMany = db.transaction((members) => {
                for (const member of members) {
                    insertOut.run(input, member.visitor_name);
                }
            });
            checkoutMany(groupMembers);

            // Extract just the names into a clean array
            const nameArray = groupMembers.map(m => m.visitor_name);

            // Send success back to the scanner WITH the names included!
            return { 
                success: true, 
                logType: 'TIME OUT', 
                studentName: ``, 
                grade: "Visitor Pass", 
                profilePic: null, 
                studentCode: input,
                visitorNames: nameArray
            };
        }
        // ==========================================================


        // 2. Exact Match Search (Now only looks for Students)
        let student = db.prepare("SELECT * FROM students WHERE student_code = ?").get(input);
        
        // 3. SMART FALLBACK
        if (!student) {
            console.log("⚠️ Exact student match failed. Trying Fuzzy Search...");
            student = db.prepare("SELECT * FROM students WHERE TRIM(student_code) = ?").get(input);
        }

        // 4. SECOND FALLBACK
        if (!student) {
            student = db.prepare("SELECT * FROM students WHERE student_code LIKE ?").get(`%${input}%`);
            if (student) console.log("⚠️ Found using Wildcard!");
        }

        // If STILL not found after trying Visitors AND Students...
// If STILL not found after trying Visitors AND Students...
        if (!student) {
            // 🌟 1. Define your Master Visitor IDs here!
            const MASTER_VISITOR_BADGES = ["0002075624","0002075629","0002075621","0002075622","0002075623","0002075626"]; 

            // 🌟 2. If it's a Master Badge, trigger the teleport!
            if (MASTER_VISITOR_BADGES.includes(input)) {
                console.log(`🎫 Master Visitor Badge Scanned [${input}]. Triggering Registration.`);
                return { success: false, action: "REGISTER_VISITOR", badgeCode: input }; 
            } // <-- THIS BRACE WAS MISSING!

            // 🌟 3. If it's NOT a master badge, throw the Unregistered Card error!
            console.log("❌ CRITICAL: Record not found in any table.");
            return { success: false, error: `[${input}] not found. Unregistered Card.` };
        }

        console.log(`✅ STUDENT MATCH: ${student.full_name} (DB ID: [${student.student_code}])`);

        if (student.status === 0) return { success: false, error: "Student is marked as Inactive/Dropped." };

        // Determine Student IN or OUT
        const lastLog = db.prepare(`
            SELECT log_type FROM student_logs 
            WHERE student_id = ? 
            AND date(timestamp, 'localtime') = date('now', 'localtime') 
            ORDER BY id DESC LIMIT 1
        `).get(student.id);

        const newLogType = (lastLog && lastLog.log_type === 'TIME IN') ? 'TIME OUT' : 'TIME IN';

        // Save Student Log
        db.prepare(`INSERT INTO student_logs (student_id, log_type) VALUES (?, ?)`).run(student.id, newLogType);

        return { 
            success: true, 
            logType: newLogType, 
            studentName: student.full_name, 
            grade: student.grade_level, 
            profilePic: student.profile_pic,
            studentCode: student.student_code
        };
    } catch(error) {
        // 1. We finally USE the tool right here! (This makes the warning disappear)
        const friendlyMessage = getFriendlyError(error);

        // 2. We log the beautifully translated message to the text file
        log.error(`User Alert: ${friendlyMessage} | Tech Details: ${error.message}`);
        
        return { success: false, error: friendlyMessage };
    }
});



// ==========================================
// GROUP VISITOR REGISTRATION LOGIC
// ==========================================
ipcMain.handle('process-visitors', async (event, badgeCode, visitorsArray) => {
    // If you have an archive check, keep it here:
    // if (dbManager.getIsArchiving()) return { success: false, error: "System archiving." };

    try {
        const db = dbManager.getLiveDb(); 
        
        // 🌟 NEW: We insert both the badge_code AND the visitor_name
        const insertVisitor = db.prepare(`
            INSERT INTO visitor_logs (badge_code, visitor_name, log_type) 
            VALUES (?, ?, 'TIME IN')
        `);

        // Transaction loops through the array and assigns the badge to everyone
        const insertMany = db.transaction((visitors) => {
            for (const visitor of visitors) {
                // Failsafe to make sure it's reading the names correctly
                if (visitor && visitor.name && visitor.name.trim() !== "") {
                    insertVisitor.run(badgeCode, visitor.name.trim()); 
                }
            }
        });

        insertMany(visitorsArray);
        return { success: true };

    } catch (error) { 
        console.error("Visitor Error:", error);
        return { success: false, error: error.message }; 
    }
});


// 4. STUDENT CRUD (Add, Edit, Delete, Get)

ipcMain.handle('get-students', async () => {
    try {
        const db = dbManager.getReportDb(); // Supports Archives
        const rows = db.prepare(`SELECT * FROM students WHERE status = 1 ORDER BY id DESC`).all();
        return { success: true, data: rows };
    } catch (error)
{// 1. We finally USE the tool right here! (This makes the warning disappear)
        const friendlyMessage = getFriendlyError(error);

        // 2. We log the beautifully translated message to the text file
        log.error(`User Alert: ${friendlyMessage} | Tech Details: ${error.message}`);
        
        return { success: false, error: friendlyMessage };; 
    }
});

ipcMain.handle('add-student', async (event, studentData) => {
    if(activeYearFile !== 'current') return {
        success: false, error: "You cannot add students while viewing past archive (data)"
    };
    if (dbManager.getIsArchiving()) return { success: false, error: "System is archiving." };
    try {
        const db = dbManager.getLiveDb(); 
        const { student_code, full_name, grade_level, status, profile_pic_data, profile_pic_ext, addedAt } = studentData;
        let savedPicPath = null;
        
        if (profile_pic_data && profile_pic_ext) {
            const imgDir = path.join(app.getPath('userData'), 'images');
            if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
            savedPicPath = path.join(imgDir, `${student_code}.${profile_pic_ext}`);
            fs.writeFileSync(savedPicPath, profile_pic_data.split(';base64,').pop(), { encoding: 'base64' });
        }

        const stmt = db.prepare(`INSERT INTO students (student_code, full_name, grade_level, profile_pic, status, addedAt) VALUES (?, ?, ?, ?, ?, ?)`);
        const info = stmt.run(student_code, full_name, grade_level, savedPicPath, status ? 1 : 0, addedAt);
        return { success: true, id: info.lastInsertRowid };
    } catch (error) { // 1. We finally USE the tool right here! (This makes the warning disappear)
        const friendlyMessage = getFriendlyError(error);

        // 2. We log the beautifully translated message to the text file
        log.error(`User Alert: ${friendlyMessage} | Tech Details: ${error.message}`);
        
        return { success: false, error: friendlyMessage }; }
});

ipcMain.handle('edit-student', async (event, studentData) => {
    if (activeYearFile !== 'current') return {
        success: false, error: "You cannot edit student while viewing the past archive (Data)"
    };
    if (dbManager.getIsArchiving()) return { success: false, error: 'System is archiving.' };
    try {
        const db = dbManager.getLiveDb();
        const { id, full_name, grade_level, status, profile_pic_data, profile_pic_ext } = studentData;
        let savedPicPath = null;

        if (profile_pic_data && profile_pic_ext) {
            const student = db.prepare(`SELECT student_code FROM students WHERE id = ?`).get(id);
            if (student) {
                const imgDir = path.join(app.getPath('userData'), 'images');
                if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
                savedPicPath = path.join(imgDir, `${student.student_code}.${profile_pic_ext}`);
                fs.writeFileSync(savedPicPath, profile_pic_data.split(';base64,').pop(), { encoding: 'base64' });
            }
        }

        if (savedPicPath) {
            db.prepare(`UPDATE students SET full_name = ?, grade_level = ?, status = ?, profile_pic = ? WHERE id = ?`)
              .run(full_name, grade_level, status ? 1 : 0, savedPicPath, id);
        } else {
            db.prepare(`UPDATE students SET full_name = ?, grade_level = ?, status = ? WHERE id = ?`)
              .run(full_name, grade_level, status ? 1 : 0, id);
        }
        return { success: true };
    } catch (error) { // 1. We finally USE the tool right here! (This makes the warning disappear)
        const friendlyMessage = getFriendlyError(error);

        // 2. We log the beautifully translated message to the text file
        log.error(`User Alert: ${friendlyMessage} | Tech Details: ${error.message}`);
        
        return { success: false, error: friendlyMessage }; }
});

ipcMain.handle('delete-student', async (event, id) => {
    if(activeYearFile !== 'current') return {
        success: false, error: "You cannot delete students while viewing the past archive (daTa)"
    }; 
    try {
        const db = dbManager.getLiveDb();
        const currentTime = new Date().toLocaleString('en-US', { 
            year: 'numeric', month: 'short', day: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        });

        console.log(`Attempting to delete ID: ${id} at ${currentTime}`);

        const result = db.prepare('UPDATE students SET status = 0, deletedAt = ? WHERE id = ?').run(currentTime, id);

        if (result.changes > 0) {
            console.log("✅ Success: Student archived.");
            return { success: true };
        } else {
            console.log("⚠️ Warning: No student found with that ID.");
            return { success: false, error: "Student not found." };
        }
    } catch (error) { 
// 1. We finally USE the tool right here! (This makes the warning disappear)
        const friendlyMessage = getFriendlyError(error);

        // 2. We log the beautifully translated message to the text file
        log.error(`User Alert: ${friendlyMessage} | Tech Details: ${error.message}`);
        
        return { success: false, error: friendlyMessage };
    }
});

ipcMain.handle('restore-student', async (event, id) => {
    if (activeYearFile !== 'current') return {
        success: false, error: "You cannot restore students. Please switch to Current Year."
    };
    try {
        const db = dbManager.getLiveDb();
        
        // This looks perfect! 
        db.prepare(`UPDATE students SET status = 1, deletedAt = NULL WHERE id = ?`).run(id);
        
        return { success: true };
    } catch (error) { 
// 1. We finally USE the tool right here! (This makes the warning disappear)
        const friendlyMessage = getFriendlyError(error);

        // 2. We log the beautifully translated message to the text file
        log.error(`User Alert: ${friendlyMessage} | Tech Details: ${error.message}`);
        
        return { success: false, error: friendlyMessage }; 
    }
});




ipcMain.handle('get-deleted-students', async () => {
    try {
        const db = dbManager.getLiveDb(); 
        
        // 🌟 Double-check your table name (students) and column (status)
        const rows = db.prepare(`
            SELECT * FROM students 
            WHERE status = 0 
            ORDER BY deletedAt DESC
        `).all();
        
        return { success: true, data: rows };
    } catch (error) {
// 1. We finally USE the tool right here! (This makes the warning disappear)
        const friendlyMessage = getFriendlyError(error);

        // 2. We log the beautifully translated message to the text file
        log.error(`User Alert: ${friendlyMessage} | Tech Details: ${error.message}`);
        
        return { success: false, error: friendlyMessage };
    }
});


// 5. REPORTS & SESSION SWITCHING

ipcMain.handle('get-logs', async (event, date) => {
    try {
        const db = dbManager.getReportDb(); 
const query = `
            SELECT 
                students.student_code AS student_code, 
                students.full_name AS full_name, 
                students.grade_level AS grade_level, 
                'STUDENT' AS user_type,
                student_logs.log_type, 
                datetime(student_logs.timestamp, 'localtime') as timestamp 
            FROM student_logs 
            JOIN students ON student_logs.student_id = students.id 
            WHERE DATE(student_logs.timestamp, 'localtime') = ? 

            UNION ALL

            SELECT 
                IFNULL(visitor_logs.badge_code, 'VISITOR') AS student_code, 
                visitor_logs.visitor_name AS full_name, 
                'Guest' AS grade_level, 
                'VISITOR' AS user_type,
                visitor_logs.log_type, 
                datetime(visitor_logs.timestamp, 'localtime') as timestamp 
            FROM visitor_logs 
            WHERE DATE(visitor_logs.timestamp, 'localtime') = ? 

            ORDER BY timestamp DESC`;

        return { success: true, data: db.prepare(query).all(date, date) };

    } catch (error) {
        const friendlyMessage = getFriendlyError(error);
        log.error(`User Alert: ${friendlyMessage} | Tech Details: ${error.message}`);
        return { success: false, error: friendlyMessage };
    }
});


// 6. Get-Active-People (In visitors interface)
ipcMain.handle('get-active-visitors', async () => {
    try {
        const db = dbManager.getLiveDb();
        
        // This query finds the absolute latest scan for every visitor today, 
        // and only returns them if that latest scan was a 'TIME IN'
const activeVisitors = db.prepare(`
            SELECT visitor_name, timestamp 
            FROM visitor_logs 
            WHERE id IN (
                SELECT MAX(id) FROM visitor_logs 
                WHERE date(timestamp, 'localtime') = date('now', 'localtime') 
                GROUP BY visitor_name COLLATE NOCASE
            )
            AND log_type = 'TIME IN'
            ORDER BY timestamp DESC
        `).all();

        return { success: true, data: activeVisitors };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-logs-range', async (event, start, end) => {
    try {
        const db = dbManager.getReportDb(); 
const query = `
            SELECT 
                students.student_code AS student_code, 
                students.full_name AS full_name, 
                students.grade_level AS grade_level, 
                'STUDENT' AS user_type,
                student_logs.log_type, 
                datetime(student_logs.timestamp, 'localtime') as timestamp 
            FROM student_logs 
            JOIN students ON student_logs.student_id = students.id 
            WHERE DATE(student_logs.timestamp, 'localtime') BETWEEN ? AND ? 

            UNION ALL

            SELECT 
                IFNULL(visitor_logs.badge_code, 'VISITOR') AS student_code, 
                visitor_logs.visitor_name AS full_name, 
                'Guest' AS grade_level, 
                'VISITOR' AS user_type,
                visitor_logs.log_type, 
                datetime(visitor_logs.timestamp, 'localtime') as timestamp 
            FROM visitor_logs 
            WHERE DATE(visitor_logs.timestamp, 'localtime') BETWEEN ? AND ? 

            ORDER BY timestamp DESC`;

        const logs = db.prepare(query).all(start, end, start, end);
        return { success: true, data: logs };

    } catch (error) {
        // This is what translates the error for your log file
        const friendlyMessage = getFriendlyError(error);
        log.error(`User Alert: ${friendlyMessage} | Tech Details: ${error.message}`);
        return { success: false, error: friendlyMessage };
    }
});

// --- THIS IS WHAT MAKES YOUR ARCHIVE DROPDOWN WORK ---
ipcMain.handle('switch-report-db', async (event, fileName) => {
    activeYearFile = fileName; 
    
    // 🌟 FIX: Use the paths exported from dbManager!
    const targetPath = (fileName === 'current') 
        ? dbManager.liveDbPath 
        : path.join(dbManager.archiveDir, fileName);
        
    dbManager.switchReportDb(targetPath);
    
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('database-switched', fileName);
    });
    return { success: true };
});

ipcMain.handle('get-active-session-year', () => activeYearFile);
ipcMain.handle('get-current-viewing-year', () => dbManager.currentDatabaseName || 'current');

ipcMain.handle('get-archives', () => {
    // 🌟 FIX: Use dbManager.archiveDir here too!
    if (!fs.existsSync(dbManager.archiveDir)) return [];
    
    return fs.readdirSync(dbManager.archiveDir)
        .filter(f => f.endsWith('.db'))
        .map(f => ({
            fileName: f,
            label: f.replace('attendance_', '').replace('.db', '').replace('_', '-')
        }));
});

ipcMain.handle('archive-school-year', async (event, schoolYearStr) => {
    return dbManager.archiveCurrentYear(schoolYearStr);
});


// 6. EXPORTS (PDF / CSV)

ipcMain.handle('generate-clean-pdf', async (event, fileName, htmlContent) => {
    let workerWindow = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } });
    await workerWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    const { filePath } = await dialog.showSaveDialog({
        title: 'Save Official Report', defaultPath: fileName,
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    if (!filePath) { workerWindow.close(); return { success: false, error: "Cancelled" }; }
    try {
        const data = await workerWindow.webContents.printToPDF({ printBackground: true, pageSize: 'A4' });
        fs.writeFileSync(filePath, data);
        workerWindow.close();
        return { success: true };
    } catch (error) { workerWindow.close(); // 1. We finally USE the tool right here! (This makes the warning disappear)
        const friendlyMessage = getFriendlyError(error);

        // 2. We log the beautifully translated message to the text file
        log.error(`User Alert: ${friendlyMessage} | Tech Details: ${error.message}`);
        
        return { success: false, error: friendlyMessage };}
});

ipcMain.handle('export-students-csv', async (event) => {
    try {
        const db = dbManager.getReportDb(); 
        const students = db.prepare(`SELECT student_code, full_name, grade_level, status FROM students`).all();
        let csvContent = "student_code,full_name,grade_level,status\n";
        students.forEach(s => csvContent += `"${s.student_code}","${s.full_name}","${s.grade_level}","${s.status}"\n`);

        const { filePath } = await dialog.showSaveDialog({
            title: 'Export Student Roster', defaultPath: 'student_roster.csv',
            filters: [{ name: 'CSV Files', extensions: ['csv'] }]
        });
        if (filePath) { fs.writeFileSync(filePath, csvContent); return { success: true }; }
        return { success: false, error: 'Cancelled' };
    } catch (error) { // 1. We finally USE the tool right here! (This makes the warning disappear)
        const friendlyMessage = getFriendlyError(error);

        // 2. We log the beautifully translated message to the text file
        log.error(`User Alert: ${friendlyMessage} | Tech Details: ${error.message}`);
        
        return { success: false, error: friendlyMessage }; }
});

ipcMain.handle('import-students-csv', async (event) => {
    if (dbManager.getIsArchiving()) return { success: false, error: "System is archiving. Please wait." };
    try {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            title: 'Import Students from CSV', filters: [{ name: 'CSV Files', extensions: ['csv'] }], properties: ['openFile']
        });
        if (canceled || filePaths.length === 0) return { success: false, error: 'Cancelled' };



        const currentTime = new Date().toLocaleString('en-US', { 
            year: 'numeric', month: 'short', day: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        });

        const fileContent = fs.readFileSync(filePaths[0], 'utf-8');
        const lines = fileContent.split(/\r?\n/); 
        if (lines.length < 2) return { success: false, error: 'CSV file is empty.' };

        const headers = lines[0].split(',').map(h => h.replace(/(^"|"$)/g, '').trim().toLowerCase());
        const colMap = {
            student_code: headers.indexOf('student_code'), full_name: headers.indexOf('full_name'),
            grade_level: headers.indexOf('grade_level'), status: headers.indexOf('status')
        };
        if (colMap.student_code === -1 || colMap.full_name === -1) return { success: false, error: "Missing required columns." };

        const db = dbManager.getLiveDb();
        const insertStmt = db.prepare(`INSERT OR IGNORE INTO students (student_code, full_name, grade_level, status, addedAt) VALUES (?, ?, ?, ?, ?)`);

const massImport = db.transaction((rows) => {
            let importCount = 0;
            let skippedCount = 0;
            
            for (let i = 1; i < rows.length; i++) {
                if (!rows[i].trim()) continue; 
                
                const rowData = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.replace(/(^"|"$)/g, '').trim());
                const s_code = rowData[colMap.student_code];
                const f_name = rowData[colMap.full_name];
                const grade = colMap.grade_level !== -1 ? rowData[colMap.grade_level] : '';
                let status = 1; 
                
                if (colMap.status !== -1 && rowData[colMap.status] !== undefined) {
                    const parsedStatus = parseInt(rowData[colMap.status]);
                    if (!isNaN(parsedStatus)) status = parsedStatus;
                }
                
                if (s_code && f_name) { 
                    // Run the insert
                    const info = insertStmt.run(s_code, f_name, grade, status, currentTime); 
                    
                    // Check if SQLite actually inserted it, or if it was a duplicate!
                    if (info.changes > 0) {
                        importCount++; 
                    } else {
                        skippedCount++;
                        console.log(`❌ SKIPPED (Duplicate ID): ${f_name} - ${s_code}`);
                    }
                } else {
                    skippedCount++;
                    console.log(`⚠️ SKIPPED (Missing Name or Code) on Row ${i + 1}`);
                }
            }
            
            console.log(`✅ IMPORT COMPLETE: ${importCount} inserted, ${skippedCount} skipped.`);
            return importCount;
        });
        return { success: true, count: massImport(lines) };
    } catch (error) { // 1. We finally USE the tool right here! (This makes the warning disappear)
        const friendlyMessage = getFriendlyError(error);

        // 2. We log the beautifully translated message to the text file
        log.error(`User Alert: ${friendlyMessage} | Tech Details: ${error.message}`);
        
        return { success: false, error: friendlyMessage }; }
});





