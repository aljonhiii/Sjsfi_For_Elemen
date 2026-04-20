const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { app } = require('electron'); // 🌟 1. Bring in Electron's app module

// 🌟 2. THE FIX: Ask Windows for the official AppData folder
const userDataPath = app.getPath('userData'); 

// 🌟 3. Create the data and archive folders INSIDE AppData
const dataDir = path.join(userDataPath, 'data');
const archiveDir = path.join(userDataPath, 'archive');
const liveDbPath = path.join(dataDir, 'elementary.db');

// Ensure our data folders exist
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });

let liveDb;
let reportDb;
let isArchiving = false;

// ... (The rest of your code stays exactly the same!) ...
// --- 1. INITIALIZE LIVE DB (SCANNER) ---
function initLiveDb() {
    if (liveDb) liveDb.close();
    
    liveDb = new Database(liveDbPath);
    console.log('🟢 Live DB Connected at:', liveDbPath);
    
    liveDb.pragma('journal_mode = WAL'); // Speeds up the scanner significantly

// 👨‍🎓 THE STUDENTS TABLE (Kept exactly as you designed it)
liveDb.exec(`
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_code TEXT UNIQUE,
        full_name TEXT,
        sex TEXT, 
        grade_level TEXT,
        profile_pic TEXT, 
        status INTEGER DEFAULT 1, 
        addedAt TEXT,
        deletedAt TEXT
    );
`);

// ⏱️ THE STUDENT LOGS TABLE (Strictly for RFID taps)
liveDb.exec(`
    CREATE TABLE IF NOT EXISTS student_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER, 
        log_type TEXT, 
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(student_id) REFERENCES students(id)
    );
`);

// 👋 THE VISITOR LOGS TABLE (Strictly for manual sign-ins)
liveDb.exec(`
    CREATE TABLE IF NOT EXISTS visitor_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visitor_name TEXT, 
        badge_code TEXT,    
        log_type TEXT, 
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

liveDb.exec(`
    CREATE TABLE IF NOT EXISTS master_badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        badge_code TEXT UNIQUE,
        description TEXT,
        date_added DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);
}

// --- 2. INITIALIZE REPORT DB (VIEWER) ---
function initReportDb(targetPath) {
    if (reportDb) reportDb.close();
    
    const isArchive = targetPath !== liveDbPath;
    reportDb = new Database(targetPath, { readonly: isArchive });
    console.log(`🔵 Report DB Connected at: ${targetPath} (Read-Only: ${isArchive})`);
}

// Start Connections
initLiveDb();
initReportDb(liveDbPath);

// --- 3. ARCHIVE LOGIC ---
async function archiveCurrentYear(schoolYearStr) {
    if (isArchiving) throw new Error('Archiving in progress.');
    isArchiving = true;

    try {
        const targetFilename = `attendance_${schoolYearStr}.db`;
        const targetPath = path.join(archiveDir, targetFilename);

        if (fs.existsSync(targetPath)) throw new Error(`Archive for ${schoolYearStr} already exists!`);

        console.log("🔒 Safely closing databases for archiving...");
        
        // 1. Merge the WAL files first
        if (liveDb) liveDb.pragma('wal_checkpoint(TRUNCATE)');
        
        // 2. Close the connections
        if (liveDb) { liveDb.close(); liveDb = null; }
        if (reportDb) { reportDb.close(); reportDb = null; }

        // 🌟 3. THE MAGIC FIX: Wait 200ms to give Windows time to release the lock
        await new Promise(resolve => setTimeout(resolve, 200));

        console.log("📂 Moving file to archive folder...");
        
        // 4. Double check if WAL files are still there and delete them manually
        if (fs.existsSync(liveDbPath + '-wal')) fs.unlinkSync(liveDbPath + '-wal');
        if (fs.existsSync(liveDbPath + '-shm')) fs.unlinkSync(liveDbPath + '-shm');

        // 5. Perform the rename
        fs.renameSync(liveDbPath, targetPath);

        console.log("🆕 Rebuilding new empty database...");
        initLiveDb();
        initReportDb(liveDbPath);

        return { success: true };
    } catch (error) {
        console.error("Archive Error:", error);
        // Safety: Re-init if something broke
        if (!liveDb) initLiveDb();
        if (!reportDb) initReportDb(liveDbPath);
        return { success: false, error: error.message };
    } finally {
        isArchiving = false;
    }
}

function switchReportDb(targetPath) {
    initReportDb(targetPath);
}

// Export everything for main.js to use
module.exports = {
    getLiveDb: () => liveDb,
    getReportDb: () => reportDb,
    getIsArchiving: () => isArchiving,
    archiveCurrentYear,
    switchReportDb,
    archiveDir,
    liveDbPath
};