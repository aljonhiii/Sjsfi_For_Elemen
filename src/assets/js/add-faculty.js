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
    const isConfirmed = await showModal('confirm', 'Ready to Import?', 'The system will ignore duplicates and process your CSV file.');
    
    if (isConfirmed) {
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
    let scanBuffer = '';
    let lastKeyTime = Date.now();

    codeInput.addEventListener('keydown', function(event) {
        const currentTime = Date.now();
        
        // Reset buffer if typing is too slow (human typing)
        if (currentTime - lastKeyTime > 50) {
            scanBuffer = ''; 
        }
        
        lastKeyTime = currentTime;

        // If the Enter key is pressed inside this input field
        if (event.key === 'Enter') {
            event.preventDefault(); // STOP the form from submitting!

            // Validate that we received a full 10-digit code
            if (this.value.length === 10) {
                // Focus on the next input field automatically (Full Name)
                // This makes it easy for the librarian to just start typing the name
                document.getElementById('fullName').focus();
            } else {
                // If it wasn't 10 digits, show the error
                this.classList.add('invalid');
                if(codeError) codeError.innerText = "RFID code must be exactly 10 digits.";
            }
            
            scanBuffer = '';
            return;
        }

        // Add character to buffer if it's a number
        if (event.key.length === 1 && !isNaN(event.key)) {
            scanBuffer += event.key;
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
    return new Promise((resolve) => {
        const modal = document.getElementById('customModal');
        const modalIcon = document.getElementById('modalIcon');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        const modalBtn = document.getElementById('modalBtn');

        // Dynamically create a Cancel button if it doesn't exist yet
        let cancelBtn = document.getElementById('modalCancelBtn');
        if (!cancelBtn) {
            cancelBtn = document.createElement('button');
            cancelBtn.id = 'modalCancelBtn';
            cancelBtn.className = 'btn-import'; // Uses your existing gray outline style
            cancelBtn.style.cssText = "margin-bottom:10px; padding: 18px 45%;";
            modalBtn.parentNode.insertBefore(cancelBtn, modalBtn);
        }

        modalTitle.innerText = title;
        modalMessage.innerText = message;

        // Clear any old click events
        modalBtn.onclick = null;
        cancelBtn.onclick = null;

        if (type === 'success') {
            modalIcon.innerHTML = "<i class='bx bx-check-circle' style='color: var(--success-color);'></i>";
            modalBtn.innerText = 'Continue';
            cancelBtn.style.display = 'none'; // Hide cancel button
            
            modalBtn.onclick = () => {
                modal.classList.remove('active');
                window.location.href = "manage-faculty.html";
                resolve(true);
            };
        } 
        else if (type === 'error') {
            modalIcon.innerHTML = "<i class='bx bx-x-circle' style='color: var(--danger-color);'></i>";
            modalBtn.innerText = 'Try Again';
            cancelBtn.style.display = 'none'; // Hide cancel button
            
            modalBtn.onclick = () => {
                modal.classList.remove('active');
                // Fix Input Lock
                const rfidInput = document.getElementById('facultyCode');
                if (rfidInput) { rfidInput.value = ''; rfidInput.focus(); }
                resolve(true);
            };
        } 
        else if (type === 'confirm') {
            modalIcon.innerHTML = "<i class='bx bx-error-circle' style='color: #f59e0b;'></i>"; // Warning Orange Icon
            modalBtn.innerText = 'Yes, Proceed';
            cancelBtn.innerText = 'Cancel';
            cancelBtn.style.display = 'inline-block'; // Show cancel button!
            
            // If they click Yes
            modalBtn.onclick = () => {
                modal.classList.remove('active');
                resolve(true); 
            };
            // If they click Cancel
            cancelBtn.onclick = () => {
                modal.classList.remove('active');
                resolve(false); 
            };
        }
        
        modal.classList.add('active');
    });
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
            // Show a nice success modal instead of just silently clearing the box!
            showModal('success', 'Department Added', `The department "${name}" has been successfully created.`);
        } else {
            // Replaced alert() with your custom error modal
            showModal('error', 'Invalid Department', res.error);
        }
    } catch (err) {
        // Replaced alert() with your custom error modal
        showModal('error', 'System Error', "An error occurred while adding the department.");
    }
}

async function removeDepartment(id) {
    // Look at how clean this is! It waits for the custom modal just like the old confirm()
    const isConfirmed = await showModal('confirm', 'Delete Department?', 'Members assigned to this department will keep their records, but the category will be gone. Are you sure?');
    
    if (isConfirmed) {
        try {
            await window.api.deleteDepartment(id);
            refreshDeptData();
            // Optional: Tell them it worked!
            // showModal('success', 'Deleted', 'Department removed successfully.');
        } catch (err) {
            showModal('error', 'System Error', "Could not delete the department.");
        }
    }
}

// Initial load
document.addEventListener('DOMContentLoaded', refreshDeptData);