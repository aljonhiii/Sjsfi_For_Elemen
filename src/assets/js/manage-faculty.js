// ==========================================
// 1. GLOBAL STATE & HELPERS
// ==========================================
let allFaculty = [];
let filteredFaculty = [];
let currentPage = 1;
const rowsPerPage = 10;
let isArchiveView = false;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function showLoading(message = "Processing...") {
    const textElement = document.getElementById('loading-text');
    const loader = document.getElementById('loading-overlay');
    if (textElement) textElement.innerText = message;
    if (loader) {
        loader.classList.remove('hidden');
        loader.style.display = 'flex';
    }
}

function hideLoading() {
    const loader = document.getElementById('loading-overlay');
    if (loader) loader.style.display = 'none';
}

// ==========================================
// NEW: CUSTOM PROMISE MODAL
// ==========================================
function showModal(type, title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customModal');
        const modalIcon = document.getElementById('modalIcon');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        const modalBtn = document.getElementById('modalBtn');

        // Dynamically create a sleek Cancel button
        let cancelBtn = document.getElementById('modalCancelBtn');
        if (!cancelBtn) {
            cancelBtn = document.createElement('button');
            cancelBtn.id = 'modalCancelBtn';
            modalBtn.parentNode.insertBefore(cancelBtn, modalBtn);
        }

        // Reset manual styles so they don't mix
        modalBtn.style.cssText = "margin-top:0; padding: 12px 24px; border-radius: 10px; font-weight: 800; border: none; cursor: pointer;";
        cancelBtn.style.cssText = "display: none; margin-top:0; padding: 12px 24px; border-radius: 10px; font-weight: 800; border: 2px solid #e2e8f0; background: transparent; color: #64748b; cursor: pointer;";

        modalTitle.innerText = title;
        modalMessage.innerText = message;

        modalBtn.onclick = null;
        cancelBtn.onclick = null;

        if (type === 'success') {
            modalIcon.innerHTML = "<i class='bx bx-check-circle' style='color: #10b981; font-size: 50px;'></i>";
            modalBtn.style.backgroundColor = "#10b981"; // Force Green
            modalBtn.style.color = "white";
            modalBtn.innerText = 'Continue';
            
            modalBtn.onclick = () => {
                modal.style.display = 'none'; // Force Hide
                resolve(true);
            };
        } 
        else if (type === 'error') {
            modalIcon.innerHTML = "<i class='bx bx-x-circle' style='color: #ef4444; font-size: 50px;'></i>";
            modalBtn.style.backgroundColor = "#ef4444"; // Force Red
            modalBtn.style.color = "white";
            modalBtn.innerText = 'Got it';
            
            modalBtn.onclick = () => {
                modal.style.display = 'none'; // Force Hide
                resolve(true);
            };
        } 
        else if (type === 'confirm') {
            modalIcon.innerHTML = "<i class='bx bx-error-circle' style='color: #f59e0b; font-size: 50px;'></i>";
            
            modalBtn.style.backgroundColor = "#10b981"; // Force Green
            modalBtn.style.color = "white";
            modalBtn.innerText = 'Yes, Proceed';
            
            cancelBtn.innerText = 'Cancel';
            cancelBtn.style.display = 'inline-block'; // Force Show Cancel
            
            modalBtn.onclick = () => {
                modal.style.display = 'none'; // Force Hide
                resolve(true); 
            };
            cancelBtn.onclick = () => {
                modal.style.display = 'none'; // Force Hide
                resolve(false); 
            };
        }
        
        // 🚀 THE MAGIC LINE: Physically forces the modal onto the screen!
        modal.style.display = 'flex'; 
    });
}
function closeModal() {
    const modal = document.getElementById('customModal');
    if(modal) modal.style.display = 'none';
}

// ==========================================
// 2. INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    await loadDynamicDepartments();
    await loadFaculty();
});

window.api.onDatabaseSwitched((fileName) => {
    console.log("Database changed to: " + fileName);
    loadFaculty(); 
    
    const title = document.querySelector('.header h1');
    if (fileName === 'current') {
        title.innerText = "Faculty Roster";
        title.style.color = "var(--primary-dark)";
    } else {
        title.innerText = `Faculty Archive: ${fileName}`;
        title.style.color = "#e67e22"; 
    }
});

// ==========================================
// 3. DATABASE FETCHING
// ==========================================
async function loadDynamicDepartments() {
    const dropdown = document.getElementById('deptFilter');
    if (!dropdown) return;

    try {
        const response = await window.api.getDepartments();
        if (response.success) {
            dropdown.innerHTML = '<option value="all">All Departments</option>';
            response.data.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.dept_name;
                opt.innerText = item.dept_name;
                dropdown.appendChild(opt);
            });
        }
    } catch (err) {
        console.error("Failed to load departments:", err);
    }
}

async function loadFaculty() {
    showLoading(isArchiveView ? "Loading Recycle Bin..." : "Loading Roster...");
    try {
        const response = await window.api.getFaculty(isArchiveView);

        if (!response.success) { 
            // Replaced Alert
            showModal('error', 'Database Error', "Failed to load database: " + response.error); 
            return; 
        }
        
        allFaculty = response.data;
        applyFilters(); 
    } finally {
        hideLoading();
    }
}

// ==========================================
// 4. FILTERING & RENDERING
// ==========================================
function applyFilters() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const deptFilter = document.getElementById('deptFilter').value;

    filteredFaculty = allFaculty.filter(faculty => {
        const matchesSearch = 
            (faculty.full_name || "").toLowerCase().includes(searchInput) || 
            (faculty.faculty_code || "").toLowerCase().includes(searchInput);

        const matchesDept = (deptFilter === 'all' || faculty.department === deptFilter);

        return matchesSearch && matchesDept;
    });

    currentPage = 1; 
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('facultyTable');
    tbody.innerHTML = '';
    
    if (filteredFaculty.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 50px;">No faculty found.</td></tr>`;
        document.getElementById('pageInfo').innerText = "Showing 0 records";
        return;
    }

    const totalPages = Math.ceil(filteredFaculty.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedData = filteredFaculty.slice(startIndex, startIndex + rowsPerPage);

    paginatedData.forEach(f => {
        let avatarHTML = '';
        if (f.profile_pic) {
            let safeUrl = encodeURI("file:///" + f.profile_pic.replace(/\\/g, '/'));
            avatarHTML = `<img src="${safeUrl}">`;
        } else {
            const initials = f.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            avatarHTML = `<span>${initials}</span>`;
        }
        
        const displayDate = isArchiveView ? (f.deletedAt || 'N/A') : (f.addedAt || 'Legacy Record');
        const dateIcon = isArchiveView ? 'bx-calendar-x' : 'bx-time';
        const dateLabel = isArchiveView ? 'Deleted:' : 'Registered:';

        tbody.innerHTML += `<tr>
            <td><div class="student-info"><div class="avatar">${avatarHTML}</div><strong>${f.full_name}</strong></div></td>
            <td style="font-family: monospace; font-weight: 600;">${f.faculty_code}</td>
            <td><span style="background:#e0e7ff; color:#3730a3; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${f.department}</span></td>
            <td>
                <div style="display: flex; flex-direction: column;">
                    <small style="font-size: 10px; color: var(--text-secondary); margin-left: 5px;">${dateLabel}</small>
                    <span style="font-size: 12px; font-weight: 600; color: var(--text-secondary); background: var(--bg-body); padding: 4px 10px; border-radius: 12px; border: 1px solid var(--border-color);">
                        <i class='bx ${dateIcon}'></i> ${displayDate}
                    </span>
                </div>
            </td>
            <td style="text-align: right;">
                ${isArchiveView ? `
                    <button class="action-btn" style="color: var(--success-color); border-color: var(--success-color);" 
                            onclick="handleRestore(${f.id}, '${f.full_name}')" title="Restore Faculty">
                        <i class='bx bx-undo'></i> Restore
                    </button>
                ` : `
                    <button class="action-btn" onclick="editFaculty(${f.id})" title="Edit"><i class='bx bx-edit-alt'></i></button>
                    <button class="action-btn" style="color: var(--danger-color);" 
                            onclick="deleteFaculty(${f.id}, '${f.full_name}')" title="Delete"><i class='bx bx-trash'></i></button>
                `}
            </td>
        </tr>`;
    });
    
    document.getElementById('pageInfo').innerText = `Page ${currentPage} of ${totalPages} (${filteredFaculty.length} total records)`;
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages || totalPages === 0;
}

function changePage(dir) { 
    currentPage += dir; 
    renderTable();
}

// ==========================================
// 5. ARCHIVE VIEW TOGGLE
// ==========================================
async function toggleArchiveView() {
    isArchiveView = !isArchiveView;
    const btn = document.getElementById('toggleArchiveBtn');
    const headerTitle = document.querySelector('.header h1'); 

    document.body.classList.toggle('recycle-mode');

    if (isArchiveView) {
        btn.innerHTML = `<i class='bx bx-undo'></i> Back to Roster`;
        btn.classList.add('btn-archive-active'); 
        if (headerTitle) headerTitle.innerHTML = `<i class='bx bx-trash'></i> Deleted Faculty Interface`;
    } else {
        btn.innerHTML = `<i class='bx bx-recycle'></i> View Recycle Bin`;
        btn.classList.remove('btn-archive-active');
        if (headerTitle) headerTitle.innerHTML = `Faculty & Staff Roster`;
    }

    await loadFaculty();
}

// ==========================================
// 6. EDIT MODAL LOGIC
// ==========================================
function closeEditModal() { 
    document.getElementById('editModal').style.display = 'none'; 
}

async function editFaculty(id) { 
    const faculty = allFaculty.find(f => f.id === id);
    if (!faculty) return;

    document.getElementById('editId').value = faculty.id;
    document.getElementById('editFacultyCode').value = faculty.faculty_code;

    const res = await window.api.getDepartments();
    const editDropdown = document.getElementById('editDept');
    
    if (res.success && editDropdown) {
        editDropdown.innerHTML = '<option value="" disabled>Select Department</option>';
        res.data.forEach(level => {
            const opt = document.createElement('option');
            opt.value = level.dept_name;
            opt.textContent = level.dept_name;
            editDropdown.appendChild(opt);
        });
    }

    const nameInput = document.getElementById('editName');
    nameInput.value = faculty.full_name;
    nameInput.removeAttribute('readonly');  
    nameInput.removeAttribute('disabled');  
    
    editDropdown.value = faculty.department;
    document.getElementById('editPhotoInput').value = '';
    
    const preview = document.getElementById('editImagePreview');
    const placeholderIcon = document.getElementById('editPlaceholder');

    if (faculty.profile_pic) {
        preview.src = encodeURI("file:///" + faculty.profile_pic.replace(/\\/g, '/'));
        preview.style.display = 'block';
        placeholderIcon.style.display = 'none';
    } else {
        preview.style.display = 'none';
        placeholderIcon.style.display = 'flex';
    }
    
    document.getElementById('editModal').style.display = 'flex';
    setTimeout(() => nameInput.focus(), 50);
}

document.getElementById('editPhotoInput').addEventListener('change', function() {
    const img = document.getElementById('editImagePreview');
    const placeholder = document.getElementById('editPlaceholder');
    if (this.files && this.files[0]) {
        img.src = URL.createObjectURL(this.files[0]);
        img.style.display = 'block';
        placeholder.style.display = 'none';
    }
});

async function saveEdit() {
    const photoInput = document.getElementById('editPhotoInput');
    const data = {
        id: parseInt(document.getElementById('editId').value), 
        faculty_code: document.getElementById('editFacultyCode').value.trim(), 
        full_name: document.getElementById('editName').value.trim(),
        department: document.getElementById('editDept').value,
        status: 1,
        profile_pic_data: null, 
        profile_pic_ext: null
    };

    if (!data.faculty_code || !data.full_name) {
        // Replaced Alert
        showModal('error', 'Missing Information', "Please fill in both the ID/Code and the Full Name.");
        return;
    }

    showLoading('Saving Changes...');
    
    try {
        await sleep(400);
        
        if (photoInput.files && photoInput.files[0]) {
            const file = photoInput.files[0];
            data.profile_pic_ext = file.name.split('.').pop();
            data.profile_pic_data = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
        }

        const result = await window.api.editFaculty(data);
        
        if (result.success) { 
            closeEditModal(); 
            // Replaced Alert & utilized Promise resolution for page reload
            await showModal('success', 'Profile Updated', 'Faculty profile successfully updated!'); 
            window.location.reload(); 
        } else {
            // Replaced Alert
            showModal('error', 'Action Blocked', result.error);
        }
    } catch (err) {
        // Replaced Alert
        showModal('error', 'System Error', 'A system error occurred while saving.');
    } finally {
        hideLoading();
    }
}

// ==========================================
// 8. EXPORT CSV LOGIC
// ==========================================
async function handleExportCSV() {
    try {
        const result = await window.api.exportFacultyCSV();
        if (result.success) {
            // Replaced Alert
            showModal('success', 'Export Successful', "The CSV file has been saved.");
        } else if (result.error !== 'Cancelled') {
            // Replaced Alert
            showModal('error', 'Export Failed', result.error);
        }
    } catch (err) {
        showModal('error', 'System Error', "System error during export.");
    }
}

// ==========================================
// 7. DELETE & RESTORE LOGIC
// ==========================================
async function deleteFaculty(id, name) {
    // Replaced confirm() with Promise Modal
    const isConfirmed = await showModal('confirm', 'Soft Delete Faculty?', `Move ${name} to the recycle bin? (You can restore them later)`);
    
    if (isConfirmed) {
        showLoading('Processing...');
        try {
            await sleep(400);
            const result = await window.api.deleteFaculty(id);
            if (result.success) {
                // Replaced Alert
                await showModal('success', 'Deleted', 'Faculty successfully soft-deleted');
                loadFaculty();
            } else {
                showModal('error', 'Action Blocked', result.error);
            }    
        } finally {
            hideLoading();
        }
    }
}

async function handleRestore(id, name) {
    // Replaced confirm() with Promise Modal
    const isConfirmed = await showModal('confirm', 'Restore Faculty?', `Are you sure you want to restore ${name} to the active roster?`);
    
    if (isConfirmed) {
        showLoading('Processing...');
        try {
            await sleep(400); 
            const result = await window.api.restoreFaculty(id);

            if (result.success) {
                // Replaced Alert
                await showModal('success', 'Restored', 'Faculty Successfully Restored!');
                await loadFaculty();
            } else {
                showModal('error', 'Action Blocked', result.error);
            }
        } catch (err) {
            showModal('error', 'System Error', 'A system error occurred while restoring.');
        } finally {
            hideLoading();
        }
    }
}

// ==========================================
// 8. ADMIN RFID ACCESS KEYS
// ==========================================

function openAdminRfidModal() {
    document.getElementById('adminRfidModal').style.display = 'flex';
    loadAdminRfids();
}

function closeAdminRfidModal() {
    document.getElementById('adminRfidModal').style.display = 'none';
    document.getElementById('newAdminName').value = '';
    document.getElementById('newAdminRfid').value = '';
    document.getElementById('adminRfidStatus').innerHTML = '';
}

async function loadAdminRfids() {
    const container = document.getElementById('adminRfidList');
    container.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 20px; font-size: 13px;">Loading...</div>';
    
    try {
        const res = await window.api.getAdminRfids();
        if (res.success && res.data.length > 0) {
            container.innerHTML = res.data.map(admin => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #e2e8f0;">
                    <div>
                        <div style="font-weight: bold; color: #1e293b;">${admin.name}</div>
                        <div style="font-size: 12px; font-family: monospace; color: #64748b;">${admin.rfid_code}</div>
                    </div>
                    <button type="button" class="delete-admin-btn" data-code="${admin.rfid_code}" style="background: transparent; color: #e74c3c; border: none; cursor: pointer; font-size: 18px;">
                        <i class='bx bx-trash'></i>
                    </button>
                </div>
            `).join('');

            document.querySelectorAll('.delete-admin-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const code = e.currentTarget.getAttribute('data-code');
                    removeAdminRfid(code);
                });
            });
        } else {
            container.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 20px; font-size: 13px;">No Admin Access Keys registered.</div>`;
        }
    } catch (err) {
        container.innerHTML = `<div style="color: red; padding: 10px;">Error loading admin keys.</div>`;
    }
}

async function saveAdminRfid() {
    const nameInput = document.getElementById('newAdminName').value.trim();
    const rfidInput = document.getElementById('newAdminRfid').value.trim();
    const statusBox = document.getElementById('adminRfidStatus');
    
    if (!nameInput || !rfidInput) {
        statusBox.innerHTML = "<span style='color: #e74c3c;'>Both Name and RFID are required.</span>";
        return;
    }
    
    statusBox.innerHTML = "<span style='color: #3b82f6;'><i class='bx bx-loader-alt bx-spin'></i> Saving...</span>";
    
    try {
        const res = await window.api.addAdminRfid(rfidInput, nameInput);
        if (res.success) {
            statusBox.innerHTML = "<span style='color: #10b981;'>Successfully added!</span>";
            document.getElementById('newAdminName').value = '';
            document.getElementById('newAdminRfid').value = '';
            loadAdminRfids();
            setTimeout(() => { statusBox.innerHTML = ''; }, 2000);
        } else {
            statusBox.innerHTML = `<span style='color: #e74c3c;'>Error: ${res.error}</span>`;
        }
    } catch (err) {
        statusBox.innerHTML = `<span style='color: #e74c3c;'>System error occurred.</span>`;
    }
}

async function removeAdminRfid(code) {
    // Replaced confirm() with Promise Modal
    const isConfirmed = await showModal('confirm', 'Delete Admin Key?', `Are you sure you want to delete this admin key (${code})?`);
    
    if (isConfirmed) {
        try {
            const res = await window.api.deleteAdminRfid(code);
            if (res.success) {
                loadAdminRfids();
                showModal('success', 'Deleted', 'Admin key successfully removed.');
            } else {
                showModal('error', 'Action Failed', `Error deleting admin key: ${res.error}`);
            }
        } catch (err) {
            showModal('error', 'System Error', 'System error occurred while deleting.');
        }
    }
}