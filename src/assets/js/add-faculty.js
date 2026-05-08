console.log("🟢 The Faculty Javascript file is successfully loaded!");

// ==========================================
// 1. LOADING SCREEN LOGIC
// ==========================================
function showLoading(message = "Processing...") {
    const overlay = document.getElementById('loading-overlay');
    document.getElementById('loading-text').innerText = message;
    overlay.classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

// ==========================================
// 2. CSV IMPORT LOGIC
// ==========================================
async function handleImportCSV() {
    if (confirm("Ready to import? The system will ignore duplicates and process your CSV file.")) {
        showLoading('Importing Faculty Data...');
        try {
            const result = await window.api.importFacultyCSV();
            
            if (result.success) {
                showModal('success', 'Import Complete', `Successfully imported ${result.count} faculty members.`);
            } else if (result.error !== 'Cancelled') {
                showModal('error', 'Import Failed', result.error);
            }
        } catch (err) {
            showModal('error', 'System Error', err.message);
        } finally {
            hideLoading();
        }
    }
}

// ==========================================
// 3. FIXED LIVE IMAGE PREVIEW LOGIC
// ==========================================
document.getElementById('photoInput').addEventListener('change', function(e) {
    const img = document.getElementById('photoPreview');
    const icon = document.getElementById('photoPlaceholder');
    
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            img.src = e.target.result;
            img.classList.remove('hidden'); // Show the image
            icon.classList.add('hidden');    // Hide the user icon
        }
        
        reader.readAsDataURL(this.files[0]);
    } else {
        img.src = '';
        img.classList.add('hidden');
        icon.classList.remove('hidden');
    }
});

// ==========================================
// 4. LIVE VALIDATION LOGIC
// ==========================================
const codeInput = document.getElementById('facultyCode');
const nameInput = document.getElementById('fullName');
const codeError = document.getElementById('codeError');
const nameError = document.getElementById('nameError');

if (codeInput) {
    codeInput.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, ''); // Numbers only
        if (this.value.length > 0 && this.value.length !== 10) {
            this.classList.add('invalid');
            if(codeError) codeError.innerText = "RFID code must be exactly 10 digits.";
        } else {
            this.classList.remove('invalid');
            if(codeError) codeError.innerText = "";
        }
    });
}

if (nameInput) {
    nameInput.addEventListener('input', function() {
        // Allowing letters, spaces, dots, and hyphens
        this.value = this.value.replace(/[^a-zA-Z\s\.\-]/g, ''); 
        if (this.value.length > 0 && this.value.trim().length === 0) {
            this.classList.add('invalid');
            if(nameError) nameError.innerText = "Name cannot be just empty spaces.";
        } else {
            this.classList.remove('invalid');
            if(nameError) nameError.innerText = "";
        }
    });
}

// ==========================================
// 5. CUSTOM MODAL LOGIC
// ==========================================
function showModal(type, title, message) {
    const modal = document.getElementById('customModal');
    const modalIcon = document.getElementById('modalIcon');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalBtn = document.getElementById('modalBtn');

    if(!modal) return alert(`${title}: ${message}`);

    modalTitle.innerText = title;
    modalMessage.innerText = message;

    if (type === 'success') {
        modalIcon.innerHTML = "<i class='bx bx-check-circle' style='color: var(--success-color);'></i>";
        modalIcon.className = "success-indicator"; // For JS tracking
        modalBtn.innerText = 'Continue';
    } else {
        modalIcon.innerHTML = "<i class='bx bx-x-circle' style='color: var(--danger-color);'></i>";
        modalIcon.className = "error-indicator";
        modalBtn.innerText = 'Try Again';
    }
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('customModal');
    const indicator = document.getElementById('modalIcon').className;
    
    modal.classList.remove('active');

    // Only redirect/reload if it was a success modal
    if (indicator === 'success-indicator') {
        window.location.href = "manage-faculty.html"; 
    }
}

// ==========================================
// 6. FORM SUBMISSION LOGIC
// ==========================================
document.getElementById('addFacultyForm').addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    const codeVal = codeInput.value.trim();
    const nameVal = nameInput.value.trim();
    const deptVal = document.getElementById('department').value;
    const saveBtn = document.getElementById('saveBtn');

    // Validation
    if (codeVal.length !== 10) {
        showModal('error', 'Invalid ID', 'RFID must be 10 digits.');
        return;
    }
    if (!nameVal) {
        showModal('error', 'Missing Name', 'Please enter the full name.');
        return;
    }
    if (!deptVal) {
        showModal('error', 'No Department', 'Please assign a department.');
        return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Saving...`;
    
    const currentTime = new Date().toLocaleString('en-US');

    try {
        const data = {
            faculty_code: codeVal, 
            full_name: nameVal,
            department: deptVal,
            status: 1,
            profile_pic_data: null,
            profile_pic_ext: null,
            addedAt: currentTime
        };

        const fileInput = document.getElementById('photoInput');
        
        if (fileInput.files && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            data.profile_pic_ext = file.name.split('.').pop(); 
            
            const reader = new FileReader();
            reader.onload = async function(event) {
                data.profile_pic_data = event.target.result; 
                await sendDataToBackend(data);
            };
            reader.readAsDataURL(file);
        } else {
            await sendDataToBackend(data);
        }

    } catch (err) {
        showModal('error', 'System Error', err.message);
        saveBtn.disabled = false;
        saveBtn.innerHTML = `Save Faculty Member`;
    }
});

async function sendDataToBackend(data) {
    const saveBtn = document.getElementById('saveBtn');
    try {
        const result = await window.api.addFaculty(data);
        
        if (result && result.success) {
            showModal('success', 'Faculty Enrolled!', `${data.full_name} is now registered.`);
        } else {
            if (result.error.includes('UNIQUE')) {
                showModal('error', 'Duplicate ID', 'This RFID Code is already assigned to someone else.');
            } else {
                showModal('error', 'Failed', result.error);
            }
            saveBtn.disabled = false;
            saveBtn.innerHTML = `Save Faculty Member`;
        }
    } catch (err) {
        showModal('error', 'Critical Error', err.message);
        saveBtn.disabled = false;
    }
}

// ==========================================
// 7. DYNAMIC DEPARTMENT MANAGEMENT
// ==========================================
async function refreshDeptData() {
    try {
        const res = await window.api.getDepartments();
        if (!res.success) return;

        const dropdown = document.getElementById('department');
        if(dropdown) {
            dropdown.innerHTML = '<option value="" disabled selected>Select Department</option>';
            res.data.forEach(dept => {
                dropdown.innerHTML += `<option value="${dept.dept_name}">${dept.dept_name}</option>`;
            });
        }

        const listContainer = document.getElementById('deptListContainer');
        if (listContainer) {
            listContainer.innerHTML = res.data.map(dept => `
                <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 12px 15px; margin-bottom: 8px; border-radius: 10px; border: 1px solid var(--border-color);">
                    <span style="font-weight: 600; font-size: 14px; color: var(--text-primary);">${dept.dept_name}</span>
                    <button onclick="removeDepartment(${dept.id})" style="background: #fee2e2; color: #ef4444; border: none; cursor: pointer; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: 0.2s;">
                        <i class='bx bx-trash-alt'></i>
                    </button>
                </div>
            `).join('');
        }
    } catch (e) {
        console.error("Dept Load Error:", e);
    }
}

function openDeptModal() { 
    document.getElementById('deptModal').classList.add('active'); 
    refreshDeptData(); 
}

function closeDeptModal() { 
    document.getElementById('deptModal').classList.remove('active'); 
}

async function addNewDepartment(event) {
    const input = document.getElementById('newDeptInput');
    const name = input.value.trim();
    
    if (!name) return;

    try {
        const res = await window.api.addDepartment(name);
        if (res.success) {
            input.value = ''; 
            refreshDeptData();
        } else {
            alert(res.error);
        }
    } catch (err) {
        alert("Error adding department");
    }
}

async function removeDepartment(id) {
    if (confirm("Remove this department? Members already assigned to it will keep their records but the category will be gone.")) {
        await window.api.deleteDepartment(id);
        refreshDeptData();
    }
}

// Initial load
document.addEventListener('DOMContentLoaded', refreshDeptData);