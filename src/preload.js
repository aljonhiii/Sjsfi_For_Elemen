const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    addStudent: (data) => ipcRenderer.invoke('add-student', data),
    getStudents: () => ipcRenderer.invoke('get-students'), 
    processAttendance: (code) => ipcRenderer.invoke('process-attendance', code),
getLogs: (date) => ipcRenderer.invoke('get-logs', date),
getLogsRange: (start, end) => ipcRenderer.invoke('get-logs-range', start, end),
    getLogsRange: (startDate, endDate) => ipcRenderer.invoke('get-logs-range', startDate, endDate),
    editStudent: (data) => ipcRenderer.invoke('edit-student', data),
    deleteStudent: (id) => ipcRenderer.invoke('delete-student', id),
    generatePDF: (fileName, htmlContent) => ipcRenderer.invoke('generate-clean-pdf', fileName, htmlContent),
    archiveSchoolYear: (yearStr) => ipcRenderer.invoke('archive-school-year', yearStr),
    getArchives: () => ipcRenderer.invoke('get-archives'),
    switchReportDb: (fileName) => ipcRenderer.invoke('switch-report-db', fileName),
    exportStudentsCSV: () => ipcRenderer.invoke('export-students-csv'),
    importStudentsCSV: () => ipcRenderer.invoke('import-students-csv'),
    onDatabaseSwitched: (callback) => ipcRenderer.on('database-switched', (event, fileName) => callback(fileName)),


    // Add this inside your contextBridge 'api' object
getActiveSessionYear: () => ipcRenderer.invoke('get-active-session-year'),


getDeletedStudents: () => ipcRenderer.invoke('get-deleted-students'),
    restoreStudent: (id) => ipcRenderer.invoke('restore-student', id),


    openLogFile: () => ipcRenderer.invoke('open-log-file'),


    processVisitors: (visitorsArray) => ipcRenderer.invoke('process-visitors', visitorsArray),

            
            getActiveVisitors: () => ipcRenderer.invoke('get-active-visitors')

});
