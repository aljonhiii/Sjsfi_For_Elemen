// ==========================================
// 1. GLOBAL STATE & HELPERS
// ==========================================
let allStudents = [];
let filteredStudents = [];
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
    if (loader) {
        loader.style.display = 'none'; 
    }
}

// ==========================================
// NEW: CUSTOM PROMISE MODAL (BRUTE-FORCE OVERRIDE)
// ==========================================
function showModal(type, title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customModal');
        const modalIcon = document.getElementById('modalIcon');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        const modalBtn = document.getElementById('modalBtn');

        let cancelBtn = document.getElementById('modalCancelBtn');
        if (!cancelBtn) {
            cancelBtn = document.createElement('button');
            cancelBtn.id = 'modalCancelBtn';
            modalBtn.parentNode.insertBefore(cancelBtn, modalBtn);
        }

        // Reset manual styles
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
                modal.style.display = 'none';
                resolve(true);
            };
        } 
        else if (type === 'error') {
            modalIcon.innerHTML = "<i class='bx bx-x-circle' style='color: #ef4444; font-size: 50px;'></i>";
            modalBtn.style.backgroundColor = "#ef4444"; // Force Red
            modalBtn.style.color = "white";
            modalBtn.innerText = 'Got it';
            
            modalBtn.onclick = () => {
                modal.style.display = 'none';
                resolve(true);
            };
        } 
        else if (type === 'confirm') {
            modalIcon.innerHTML = "<i class='bx bx-error-circle' style='color: #f59e0b; font-size: 50px;'></i>";
            
            modalBtn.style.backgroundColor = "#10b981"; // Force Green
            modalBtn.style.color = "white";
            modalBtn.innerText = 'Yes, Proceed';
            
            cancelBtn.innerText = 'Cancel';
            cancelBtn.style.display = 'inline-block'; 
            
            modalBtn.onclick = () => {
                modal.style.display = 'none';
                resolve(true); 
            };
            cancelBtn.onclick = () => {
                modal.style.display = 'none';
                resolve(false); 
            };
        }
        
        modal.style.display = 'flex'; 
    });
}

function closeModal() {
    const modal = document.getElementById('customModal');
    if(modal) modal.style.display = 'none';
}

// ==========================================
// ARCHIVE TOGGLE & INITIALIZATION
// ==========================================
async function toggleArchiveView() {
    isArchiveView = !isArchiveView;
    const btn = document.getElementById('toggleArchiveBtn');
    const headerTitle = document.querySelector('.header h1'); 

    document.body.classList.toggle('recycle-mode');

    if (isArchiveView) {
        btn.innerHTML = `<i class='bx bx-undo'></i> Back to Roster`;
        btn.classList.add('btn-archive-active'); 
        
        if (headerTitle) {
            headerTitle.innerHTML = `<i class='bx bx-trash'></i> Deleted Students Interface`;
        }

        const response = await window.api.getDeletedStudents();
        if (response.success) {
            allStudents = response.data;
            currentPage = 1;
            applyFilters();
        }
    } else {
        btn.innerHTML = `<i class='bx bx-recycle'></i> View Recycle Bin`;
        btn.classList.remove('btn-archive-active');
        
        if (headerTitle) {
            headerTitle.innerHTML = `Student Roster`;
        }
        loadStudents(); 
    }
}

window.api.onDatabaseSwitched((fileName) => {
    console.log("Database changed to: " + fileName);
    loadStudents(); 
    
    const title = document.querySelector('.header h1');
    if (fileName === 'current') {
        title.innerText = "Student Roster";
        title.style.color = "var(--primary-dark)";
    } else {
        title.innerText = `Roster Archive: ${fileName}`;
        title.style.color = "#e67e22"; 
    }
});

async function loadStudents() {
    const response = await window.api.getStudents();
    if(!response.success) { 
        showModal('error', 'Database Error', "Failed to load database."); 
        return; 
    }
    allStudents = response.data;
    applyFilters(); 
}

// ==========================================
// RENDERING & FILTERING
// ==========================================
function renderTable() {
    const tbody = document.getElementById('studentTable');
    tbody.innerHTML = '';
    
    if (filteredStudents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 50px;">No students found.</td></tr>`;
        document.getElementById('pageInfo').innerText = "Showing 0 records";
        return;
    }

    const totalPages = Math.ceil(filteredStudents.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedData = filteredStudents.slice(startIndex, startIndex + rowsPerPage);

    paginatedData.forEach(s => {
        let avatarHTML = '';
        if (s.profile_pic) {
            let safeUrl = encodeURI("file:///" + s.profile_pic.replace(/\\/g, '/'));
            avatarHTML = `<img src="${safeUrl}">`;
        } else {
            const initials = s.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            avatarHTML = `<span>${initials}</span>`;
        }
        
        const displayDate = isArchiveView 
            ? (s.deletedAt ? s.deletedAt : 'N/A') 
            : (s.addedAt ? s.addedAt : 'Legacy Record');
        
        const dateIcon = isArchiveView ? 'bx-calendar-x' : 'bx-time';
        const dateLabel = isArchiveView ? 'Deleted:' : 'Registered:';

        tbody.innerHTML += `<tr>
            <td><div class="student-info"><div class="avatar">${avatarHTML}</div><strong>${s.full_name}</strong></div></td>
            <td style="font-family: monospace; font-weight: 600;">${s.student_code}</td>
            <td><span style="background:#e0e7ff; color:#3730a3; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${s.grade_level}</span></td>
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
                            onclick="handleRestore(${s.id}, '${s.full_name}')" title="Restore Student">
                        <i class='bx bx-undo'></i> Restore
                    </button>
                ` : `
                    <button class="action-btn" onclick="editStudent(${s.id})" title="Edit"><i class='bx bx-edit-alt'></i></button>
                    <button class="action-btn" style="color: var(--danger-color);" 
                            onclick="deleteStudent(${s.id}, '${s.full_name}')" title="Delete"><i class='bx bx-trash'></i></button>
                `}
            </td>
        </tr>`;
    });
    
    document.getElementById('pageInfo').innerText = `Page ${currentPage} of ${totalPages} (${filteredStudents.length} total records)`;
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages || totalPages === 0;
}

function changePage(dir) { 
    currentPage += dir; 
    renderTable();
}

function applyFilters() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const gradeFilter = document.getElementById('gradeFilter').value;

    filteredStudents = allStudents.filter(student => {
        const matchesSearch = 
            (student.full_name || "").toLowerCase().includes(searchInput) || 
            (student.student_code || "").toLowerCase().includes(searchInput);

        const matchesGrade = (gradeFilter === 'all' || student.grade_level === gradeFilter);

        return matchesSearch && matchesGrade;
    });

    currentPage = 1;
    renderTable();
}

// ==========================================
// DYNAMIC GRADES & EDIT LOGIC
// ==========================================
async function loadDynamicGrades() {
    const dropdown = document.getElementById('gradeFilter');
    if (!dropdown) return;

    try {
        const response = await window.api.getGradeLevels(); 
        if (response.success) {
            dropdown.innerHTML = `
                <option value="all">All Levels</option>
            `;
            response.data.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.level_name; 
                opt.innerText = item.level_name;
                dropdown.appendChild(opt);
            });
        }
    } catch (err) {
        console.error("Failed to load grade categories:", err);
    }
}

function closeEditModal() { 
    document.getElementById('editModal').style.display = 'none'; 
}

async function editStudent(id) { 
    const student = allStudents.find(s => s.id === id);
    if (!student) return;

    document.getElementById('editId').value = student.id;
    document.getElementById('editRfid').value = student.student_code;

    const res = await window.api.getGradeLevels();
    const editDropdown = document.getElementById('editGrade');
    
    if (res.success && editDropdown) {
        editDropdown.innerHTML = `
            <option value="" disabled>Select Level</option>
        `;

        res.data.forEach(level => {
            const opt = document.createElement('option');
            opt.value = level.level_name;
            opt.textContent = level.level_name;
            editDropdown.appendChild(opt);
        });
    }

    const nameInput = document.getElementById('editName');
    nameInput.value = student.full_name;
    nameInput.removeAttribute('readonly');  
    nameInput.removeAttribute('disabled');  
    
    editDropdown.value = student.grade_level;
    document.getElementById('editPhotoInput').value = '';
    
    const preview = document.getElementById('editImagePreview');
    const placeholderIcon = document.getElementById('editPlaceholder');

    if (student.profile_pic) {
        preview.src = encodeURI("file:///" + student.profile_pic.replace(/\\/g, '/'));
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
        student_id: document.getElementById('editRfid').value.trim(), 
        full_name: document.getElementById('editName').value.trim(),
        grade_level: document.getElementById('editGrade').value,
        status: 1,
        profile_pic_data: null, 
        profile_pic_ext: null
    };

    if (!data.student_id || !data.full_name) {
        showModal('error', 'Missing Information', "Please fill in both the ID/Code and the Full Name.");
        return;
    }

    showLoading('Processing....');
    
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

        const result = await window.api.editStudent(data);
        
        if (result.success) { 
            closeEditModal(); 
            await showModal('success', 'Student Updated', 'Student successfully updated!'); 
            window.location.reload(); 
        } else {
            showModal('error', 'Action Blocked', result.error);
        }
    } catch (err) {
        showModal('error', 'System Error', 'A system error occurred while saving.');
    } finally {
        hideLoading();
    }
}

// ==========================================
// EXPORT, DELETE & RESTORE LOGIC
// ==========================================
async function handleExportCSV() {
    showLoading('Processing...');
    try {
        const result = await window.api.exportStudentsCSV();
        if (result.success) {
            showModal('success', 'Export Successful', "The CSV file has been saved.");
        } else if (result.error !== 'Cancelled') {
            showModal('error', 'Export Failed', result.error);
        }
    } catch (err) {
        showModal('error', 'System Error', "System error during export.");
    } finally {
        hideLoading();
    }
}

async function deleteStudent(id, name) {
    const isConfirmed = await showModal('confirm', 'Soft Delete Student?', `Move ${name} to the recycle bin?`);
    
    if (isConfirmed) {
        showLoading('Processing....')
        try {
            await sleep(400);
            const result = await window.api.deleteStudent(id);
            if (result.success) {
                await showModal('success', 'Deleted', 'Student successfully soft-deleted');
                loadStudents();
            } else {
                showModal('error', 'Action Blocked', result.error);
            }    
        } finally {
            hideLoading();
        }
    }
}

async function handleRestore(id, name) {
    const isConfirmed = await showModal('confirm', 'Restore Student?', `Restore ${name} to the active roster?`);
    
    if (isConfirmed) {
        showLoading('Processing....');
        try {
            await sleep(400); 
            const result = await window.api.restoreStudent(id);

            if (result.success) {
                await showModal('success', 'Restored', 'Student Successfully Restored!');
                const response = await window.api.getDeletedStudents();
                allStudents = response.data;
                applyFilters();
                window.location.reload();
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

// Ensure this runs when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadDynamicGrades();
    loadStudents();
}); 