const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// ─── PATH SETUP ────────────────────────────────────────────────────────────────
const userDataPath = app.getPath('userData');
const dataDir     = path.join(userDataPath, 'data');
const archiveDir  = path.join(userDataPath, 'archive');
const liveDbPath  = path.join(dataDir, 'elementary.db');

if (!fs.existsSync(dataDir))    fs.mkdirSync(dataDir,    { recursive: true });
if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });

// ─── STATE ─────────────────────────────────────────────────────────────────────
let liveDb          = null;
let reportDb        = null;
let currentReportPath = null; // 🌟 Guard: prevents re-opening the same file
let isArchiving     = false;

// ─── 1. INITIALIZE LIVE DB ─────────────────────────────────────────────────────
function initLiveDb() {
    if (liveDb) liveDb.close();

    liveDb = new Database(liveDbPath);
    console.log('🟢 Live DB Connected at:', liveDbPath);

    // 🌟 OPTIMIZED PRAGMAS
    // WAL = concurrent reads during writes (scanner won't block reports)
    // NORMAL sync = safe with WAL, much faster than FULL
    // 64MB cache = fewer disk reads for repeated queries
    // mmap = memory-mapped I/O for large sequential scans
    liveDb.pragma('journal_mode = WAL');
    liveDb.pragma('synchronous = NORMAL');
    liveDb.pragma('cache_size = -64000');
    liveDb.pragma('mmap_size = 268435456');
    liveDb.pragma('foreign_keys = ON');

    // 🌟 WRAP ALL TABLE CREATION IN ONE TRANSACTION (faster first-run init)
    liveDb.exec(`
        BEGIN;

        -- 👨‍🎓 STUDENTS
        CREATE TABLE IF NOT EXISTS students (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            student_code TEXT UNIQUE,
            full_name    TEXT,
            sex          TEXT,
            grade_level  TEXT,
            profile_pic  TEXT,
            status       INTEGER DEFAULT 1,
            addedAt      TEXT,
            deletedAt    TEXT
        );

        -- ⏱️ STUDENT LOGS (RFID taps)
        CREATE TABLE IF NOT EXISTS student_logs (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            log_type   TEXT,
            timestamp  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(student_id) REFERENCES students(id)
        );

        -- 👋 VISITOR LOGS (manual sign-ins)
        CREATE TABLE IF NOT EXISTS visitor_logs (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            visitor_name TEXT,
            mobile       TEXT,
            address      TEXT,
            badge_code   TEXT,
            log_type     TEXT,
            timestamp    DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 🎫 MASTER BADGES
        CREATE TABLE IF NOT EXISTS master_badges (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            badge_code  TEXT UNIQUE,
            description TEXT,
            date_added  DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 🔐 ADMIN RFIDS
        CREATE TABLE IF NOT EXISTS admin_rfids (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            rfid_code  TEXT UNIQUE NOT NULL,
            name       TEXT,
            date_added DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 🏫 GRADE LEVELS
        CREATE TABLE IF NOT EXISTS grade_levels (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            level_name TEXT UNIQUE NOT NULL
        );

        -- 🏢 DEPARTMENTS
        CREATE TABLE IF NOT EXISTS departments (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            dept_name TEXT UNIQUE NOT NULL
        );

        -- 👩‍🏫 FACULTY
        CREATE TABLE IF NOT EXISTS faculty (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            faculty_code TEXT UNIQUE,
            full_name    TEXT,
            sex          TEXT,
            department   TEXT,
            profile_pic  TEXT,
            status       INTEGER DEFAULT 1,
            addedAt      TEXT,
            deletedAt    TEXT
        );

        -- ⏱️ FACULTY LOGS (RFID taps)
        CREATE TABLE IF NOT EXISTS faculty_logs (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            faculty_id INTEGER,
            log_type   TEXT,
            timestamp  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(faculty_id) REFERENCES faculty(id)
        );

        COMMIT;
    `);

    // ─── INDEXES ───────────────────────────────────────────────────────────────
    // 🌟 These are the biggest performance win for the scanner.
    // Every "last log today" query hits student_id + timestamp — without these,
    // SQLite does a full table scan on EVERY card tap.

    // Students
    liveDb.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_student_code       ON students(student_code)`);
    liveDb.exec(`CREATE INDEX        IF NOT EXISTS idx_student_logs_sid   ON student_logs(student_id)`);
    liveDb.exec(`CREATE INDEX        IF NOT EXISTS idx_student_logs_ts    ON student_logs(timestamp)`);

    // Faculty
    liveDb.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_faculty_code       ON faculty(faculty_code)`);
    liveDb.exec(`CREATE INDEX        IF NOT EXISTS idx_faculty_logs_fid   ON faculty_logs(faculty_id)`);
    liveDb.exec(`CREATE INDEX        IF NOT EXISTS idx_faculty_logs_ts    ON faculty_logs(timestamp)`);

    // Visitor logs — badge_code lookups happen on EVERY visitor card tap
    liveDb.exec(`CREATE INDEX        IF NOT EXISTS idx_visitor_badge      ON visitor_logs(badge_code)`);
    liveDb.exec(`CREATE INDEX        IF NOT EXISTS idx_visitor_logs_ts    ON visitor_logs(timestamp)`);
}

// ─── 2. INITIALIZE REPORT DB ───────────────────────────────────────────────────
function initReportDb(targetPath) {
    // 🌟 Guard: skip re-opening if already connected to the same file
    if (currentReportPath === targetPath && reportDb) {
        console.log(`🔵 Report DB already connected at: ${targetPath} — skipping re-open.`);
        return;
    }

    if (reportDb) reportDb.close();

    const isArchive = targetPath !== liveDbPath;
    reportDb = new Database(targetPath, { readonly: isArchive });
    currentReportPath = targetPath;

    // Apply read-performance pragmas even for the report connection
    reportDb.pragma('cache_size = -32000'); // 32MB cache for report queries
    reportDb.pragma('mmap_size = 134217728');

    console.log(`🔵 Report DB Connected at: ${targetPath} (Read-Only: ${isArchive})`);
}

// ─── BOOT ──────────────────────────────────────────────────────────────────────
initLiveDb();
initReportDb(liveDbPath);

// ─── 3. ARCHIVE LOGIC ──────────────────────────────────────────────────────────
async function archiveCurrentYear(schoolYearStr) {
    if (isArchiving) throw new Error('Archiving in progress.');
    isArchiving = true;

    try {
        const targetFilename = `attendance_${schoolYearStr}.db`;
        const targetPath     = path.join(archiveDir, targetFilename);

        if (fs.existsSync(targetPath)) throw new Error(`Archive for ${schoolYearStr} already exists!`);

        console.log("🔒 Safely closing databases for archiving...");

        // 1. Flush WAL to the main file
        if (liveDb) liveDb.pragma('wal_checkpoint(TRUNCATE)');

        // 2. Close all connections
        if (liveDb)   { liveDb.close();   liveDb   = null; }
        if (reportDb) { reportDb.close(); reportDb = null; currentReportPath = null; }

        // 3. Brief pause to let Windows fully release the file lock
        await new Promise(resolve => setTimeout(resolve, 200));

        console.log("📂 Moving file to archive folder...");

        // 4. Clean up leftover WAL/SHM files if present
        if (fs.existsSync(liveDbPath + '-wal')) fs.unlinkSync(liveDbPath + '-wal');
        if (fs.existsSync(liveDbPath + '-shm')) fs.unlinkSync(liveDbPath + '-shm');

        // 5. Move the DB file
        fs.renameSync(liveDbPath, targetPath);

        console.log("🆕 Rebuilding new empty database...");
        initLiveDb();
        initReportDb(liveDbPath);

        return { success: true };
    } catch (error) {
        console.error("Archive Error:", error);
        if (!liveDb)   initLiveDb();
        if (!reportDb) initReportDb(liveDbPath);
        return { success: false, error: error.message };
    } finally {
        isArchiving = false;
    }
}

// ─── 4. SWITCH REPORT DB ───────────────────────────────────────────────────────
function switchReportDb(targetPath) {
    initReportDb(targetPath);
}

// ─── 5. GRACEFUL SHUTDOWN ──────────────────────────────────────────────────────
// 🌟 Ensures DB connections are cleanly closed on app exit or crash,
//    preventing WAL corruption on Windows.
function closeAll() {
    if (liveDb)   { liveDb.close();   liveDb   = null; }
    if (reportDb) { reportDb.close(); reportDb = null; }
    console.log("🔴 All DB connections closed.");
}

process.on('exit',    closeAll);
process.on('SIGINT',  () => { closeAll(); process.exit(0); });
process.on('SIGTERM', () => { closeAll(); process.exit(0); });

// ─── EXPORTS ───────────────────────────────────────────────────────────────────
module.exports = {
    getLiveDb:        () => liveDb,
    getReportDb:      () => reportDb,
    getIsArchiving:   () => isArchiving,
    archiveCurrentYear,
    switchReportDb,
    archiveDir,
    liveDbPath,
};