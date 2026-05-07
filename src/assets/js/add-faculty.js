console.log("🟢 The Faculty Javascript file is successfully loaded!");
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==========================================
// 1. LOADING SCREEN LOGIC
// ==========================================
function showLoading(message = "Processing...") {
    document.getElementById('loading-text').innerText = message;
    document.getElementById('loading-overlay').classList.remove('hidden');
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
    document.getElementById('loading-overlay').style.display = 'none';
}   

// ==========================================
// 2. CSV IMPORT LOGIC
// ==========================================
async function handleImportCSV() {
    if (confirm("Ready to import? The system will ignore duplicates and process your CSV file.")) {
        showLoading('Importing....');
        try {
            const result = await window.api.importFacultyCSV();
            
            if (result.success) {
                showModal('success', 'Import Complete', `Successfully imported ${result.count} faculty from the CSV file.`);
            } else if (result.error !== 'Cancelled') {
                showModal('error', 'Import Failed', result.error);
            }
        } finally {
            hideLoading();
        }
    }
}

// ==========================================
// 3. LIVE IMAGE PREVIEW LOGIC
// ==========================================
document.getElementById('photoInput').addEventListener('change', function(e) {
    const img = document.getElementById('photoPreview');
    const icon = document.getElementById('photoPlaceholder');
    
    if (this.files && this.files[0]) {
        img.src = URL.createObjectURL(this.files[0]);
        img.style.display = 'block';
        icon.style.display = 'none';
    } else {
        img.src = '';
        img.style.display = 'none';
        icon.style.display = 'block';
    }
});

// ==========================================
// 4. LIVE VALIDATION LOGIC
// ==========================================
const codeInput = document.getElementById('facultyCode');
const nameInput = document.getElementById('fullName');

// Assuming you have <span id="codeError"> and <span id="nameError"> in your HTML
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
        this.value = this.value.replace(/[^a-zA-Z\s\.\-]/g, ''); // Letters, spaces, dots, hyphens only
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

    if(!modal) return alert(`${title}: ${message}`); // Failsafe if HTML is missing

    modalTitle.innerText = title;
    modalMessage.innerText = message;

    if (type === 'success') {
        modalIcon.className = 'modal-icon success';
        modalIcon.innerHTML = "<i class='bx bx-check-circle'></i>";
        modalBtn.className = 'btn-modal';
        modalBtn.innerText = 'Success!';
    } else {
        modalIcon.className = 'modal-icon error';
        modalIcon.innerHTML = "<i class='bx bx-x-circle'></i>";
        modalBtn.className = 'btn-modal error-btn';
        modalBtn.innerText = 'Got it';
    }
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle').innerText;
    
    modal.classList.remove('active');

    if (document.getElementById('modalIcon').classList.contains('success')) {
        // Redirect to roster on successful enrollment
        if (modalTitle.includes("Registered") || modalTitle.includes("Complete")) {
            window.location.href = "manage-faculty.html"; 
        } else {
            // For Department additions, just refresh the page
            window.location.reload(); 
        }
    }
}   

// ==========================================
// 6. FORM SUBMISSION LOGIC (BASE64)
// ==========================================
document.getElementById('addFacultyForm').addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    const codeVal = codeInput.value.trim();
    const nameVal = nameInput.value.trim();
    const deptVal = document.getElementById('department').value;

    if (codeVal.length !== 10) {
        codeInput.focus();
        showModal('error', 'Invalid ID Code', 'The RFID code must be exactly 10 digits long.');
        return;
    }
    if (!nameVal) {
        nameInput.focus();
        showModal('error', 'Missing Full Name', 'Please type the faculty member\'s full name.');
        return;
    }
    if (!deptVal) {
        document.getElementById('department').focus();
        showModal('error', 'Department Missing', 'Please select a Department.');
        return;
    }

    const submitBtn = document.querySelector('.btn-confirm');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Processing...`;
    
    const currentTime = new Date().toLocaleString('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });

    try {
        const data = {
            faculty_code: codeVal, 
            full_name: nameVal,
            department: deptVal,
            status: 1, // 1 for Active
            profile_pic_data: null,
            profile_pic_ext: null,
            addedAt: currentTime
        };

        const fileInput = document.getElementById('photoInput');
        
        if (fileInput.files && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            data.profile_pic_ext = file.name.split('.').pop(); 
            
            const reader = new FileReader();
            reader.onload = async function(e) {
                data.profile_pic_data = e.target.result; 
                await sendDataToBackend(data);
            };
            reader.readAsDataURL(file);
        } else {
            await sendDataToBackend(data);
        }

    } catch (err) {
        showModal('error', 'System Error', `Background error: ${err.message}`);
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class='bx bx-save'></i> Register Faculty`;
    }
});

async function sendDataToBackend(data) {
    const submitBtn = document.querySelector('.btn-confirm');
    showLoading('Processing...');
    try {
        const result = await window.api.addFaculty(data);
        
        if (result && result.success) {
            document.getElementById('addFacultyForm').reset();
            document.getElementById('photoPreview').style.display = 'none';
            document.getElementById('photoPreview').src = '';
            document.getElementById('photoPlaceholder').style.display = 'block';

            showModal('success', 'Faculty Registered!', `${data.full_name} has been successfully registered.`);
        } else {
            const errorMsg = result.error ? result.error.toLowerCase() : '';
            if (errorMsg.includes('unique') || errorMsg.includes('duplicate')) {
                document.getElementById('facultyCode').focus();
                showModal('error', 'ID Already Taken', `The RFID Code "${data.faculty_code}" is already registered.`);
            } else {
                showModal('error', 'Registration Failed', `Error: ${result.error}`);
            }
        }
    } catch (err) {
        showModal('error', 'System Error', `Background error: ${err.message}`);
    } finally {
        hideLoading();
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class='bx bx-save'></i> Register Faculty`; 
    }
}

// ==========================================
// 7. DYNAMIC DEPARTMENT MANAGEMENT
// ==========================================

async function refreshDeptData() {
    const res = await window.api.getDepartments();
    if (!res.success) return;

    // 1. Update the Select Dropdown in the main form
    const dropdown = document.getElementById('department');
    if(dropdown) {
        dropdown.innerHTML = '<option value="" disabled selected>Select Department...</option>';
        res.data.forEach(dept => {
            dropdown.innerHTML += `<option value="${dept.dept_name}">${dept.dept_name}</option>`;
        });
    }

    // 2. Update the List inside the Management Modal (if it exists on your page)
    const listContainer = document.getElementById('deptListContainer');
    if (listContainer) {
        listContainer.innerHTML = res.data.map(dept => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-body); padding: 10px 15px; margin-bottom: 8px; border-radius: 8px; border: 1px solid var(--border-color);">
                <span style="font-weight: 600; font-size: 14px;">${dept.dept_name}</span>
                <button onclick="removeDepartment(${dept.id})" style="background: transparent; color: #ef4444; border: none; cursor: pointer; font-size: 18px;">
                    <i class='bx bx-trash'></i>
                </button>
            </div>
        `).join('');
    }
}

// Attach these to your 'Manage Departments' button in the HTML
function openDeptModal() { document.getElementById('deptModal').classList.add('active'); refreshDeptData(); }
function closeDeptModal() { document.getElementById('deptModal').classList.remove('active'); }

async function addNewDepartment(event) {
    const input = document.getElementById('newDeptInput');
    const submitBtn = event.target; 
    const name = input.value.trim();
    
    if (!name) {
        showModal('error', 'Empty Input', 'Please enter a name for the Department.');
        input.focus();
        return;
    }

    if (name.length < 2) {
        showModal('error', 'Invalid Input', 'The name is too short. Please be more descriptive.');
        return;
    }

    const regex = /^[a-zA-Z0-9\s\-\.]+$/;
    if (!regex.test(name)) {
        showModal('error', 'Invalid Characters', 'Please use only letters, numbers, hyphens, and spaces.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i>`;
    input.readOnly = true;

    try {
        const res = await window.api.addDepartment(name);
        
        if (res.success) {
            input.value = ''; 
            showModal('success', 'Department Added', `${name} is now available in the dropdown.`);
            
            setTimeout(() => { window.location.reload(); }, 1500);

        } else {
            showModal('error', 'Entry Blocked', res.error);
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Add';
            input.readOnly = false;
        }
    } catch (err) {
        showModal('error', 'System Error', 'An unexpected error occurred. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Add';
        input.readOnly = false;
    }
}

async function removeDepartment(id) {
    if (confirm("Are you sure? This will remove the department from the system.")) {
        await window.api.deleteDepartment(id);
        refreshDeptData();
        window.location.reload();
    }
}

// Initial load
document.addEventListener('DOMContentLoaded', refreshDeptData);