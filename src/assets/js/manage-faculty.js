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
// 2. INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    // Load departments first, then the faculty table
    await loadDynamicDepartments();
    await loadFaculty();
});

// React to Admin changing the active Archive Year
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
        // Pass 'isArchiveView' to fetch active (false) or deleted (true) faculty
        const response = await window.api.getFaculty(isArchiveView);

        if (!response.success) { 
            alert("Failed to load database: " + response.error); 
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

    currentPage = 1; // Reset pagination
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

    // Load dynamic dropdown for departments
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
        alert("Please fill in both the ID/Code and the Full Name.");
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
            setTimeout(() => { 
                alert('Faculty profile successfully updated!'); 
                window.location.reload(); 
            }, 100);
        } else {
            alert('Action Blocked: ' + result.error);
        }
    } catch (err) {
        alert('A system error occurred while saving.');
    } finally {
        hideLoading();
    }
}

// ==========================================
// 7. DELETE & RESTORE LOGIC
// ==========================================
async function deleteFaculty(id, name) {
    if (confirm(`Soft Delete ${name}? (You can restore them in the Recycle bin)`)) {
        showLoading('Processing...');
        try {
            await sleep(400);
            const result = await window.api.deleteFaculty(id);
            if (result.success) {
                alert('Faculty successfully soft-deleted');
                loadFaculty();
            } else {
                alert('Action was Blocked: ' + result.error);
            }    
        } finally {
            hideLoading();
        }
    }
}

async function handleRestore(id, name) {
    if (confirm(`Are you sure you want to restore ${name} to the active roster?`)) {
        showLoading('Processing...');
        try {
            await sleep(400); 
            const result = await window.api.restoreFaculty(id);

            if (result.success) {
                alert('Faculty Successfully Restored!');
                await loadFaculty();
            } else {
                alert('Action Blocked: ' + result.error);
            }
        } catch (err) {
            alert('A system error occurred while restoring.');
        } finally {
            hideLoading();
        }
    }
}