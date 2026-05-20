console.log("🟢 The Javascript file is successfully loaded!");
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==========================================
// 1. LOADING SCREEN LOGIC
// ==========================================
function showLoading(message = "Processing...") {
    document.getElementById('loading-text').innerText = message;
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}   

// ==========================================
// 2. CSV IMPORT LOGIC (UPGRADED)
// ==========================================
async function handleImportCSV() {
    // Replaced the old browser confirm() with your custom Promise modal!
    const isConfirmed = await showModal('confirm', 'Ready to Import?', 'The system will ignore duplicates and process your CSV file.');
    
    if (isConfirmed) {
        showLoading('Importing Students...');
        try {
            const result = await window.api.importStudentsCSV();
            
            if (result.success) {
                showModal('success', 'Import Complete', `Successfully imported ${result.count} students from the CSV file.`);
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
document.getElementById('pf').addEventListener('change', function(e) {
    const img = document.getElementById('previewImage');
    const icon = document.getElementById('placeholderIcon');
    
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
// 4. LIVE VALIDATION & HID SCANNER INTERCEPTOR
// ==========================================
const codeInput = document.getElementById('code');
const nameInput = document.getElementById('name');
const codeError = document.getElementById('codeError');
const nameError = document.getElementById('nameError');

if (codeInput) {
    let scanBuffer = '';
    let lastKeyTime = Date.now();

    codeInput.addEventListener('keydown', function(event) {
        const currentTime = Date.now();
        
        // Reset buffer if typing is slow (human typing)
        if (currentTime - lastKeyTime > 50) {
            scanBuffer = ''; 
        }
        
        lastKeyTime = currentTime;

        // Intercept the Enter key from the RFID Scanner
        if (event.key === 'Enter') {
            event.preventDefault(); // STOP the form from submitting!

            // Validate that we received a full 10-digit code
            if (this.value.length === 10) {
                // Success: Move to the Name field automatically!
                document.getElementById('name').focus();
            } else {
                showModal('error', 'Invalid Scan', 'The scanned RFID tag must be exactly 10 digits. Please try scanning again.');
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

nameInput.addEventListener('input', function() {
    this.value = this.value.replace(/[^a-zA-Z\s\.\-]/g, '');
    if (this.value.length > 0 && this.value.trim().length === 0) {
        this.classList.add('invalid');
        if (nameError) nameError.innerText = "Name cannot be just empty spaces.";
    } else {
        this.classList.remove('invalid');
        if (nameError) nameError.innerText = "";
    }
});

// ==========================================
// 5. CUSTOM MODAL LOGIC (PROMISE MODEL)
// ==========================================
function showModal(type, title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customModal');
        const modalIcon = document.getElementById('modalIcon');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        const modalBtn = document.getElementById('modalBtn');



        modalBtn.style.cssText = "background-color: #10b981 !important;";

        // Dynamically create a sleek Cancel button
        let cancelBtn = document.getElementById('modalCancelBtn');
        if (!cancelBtn) {
            cancelBtn = document.createElement('button');
            cancelBtn.id = 'modalCancelBtn';
            cancelBtn.className = 'btn-modal btn-modal-cancel'; // Uses your new CSS!
            modalBtn.parentNode.insertBefore(cancelBtn, modalBtn);
        }

        modalTitle.innerText = title;
        modalMessage.innerText = message;

        // Clear previous click events
        modalBtn.onclick = null;
        cancelBtn.onclick = null;

if (type === 'success') {
            modalIcon.className = 'modal-icon success';
            modalIcon.innerHTML = "<i class='bx bx-check-circle' style='color: var(--success-color); font-size: 50px;'></i>";
            
            // 👇 THIS LINE CONNECTS TO YOUR GREEN CSS! 👇
            modalBtn.className = 'btn-modal btn-modal-primary'; 
            
            modalBtn.innerText = 'Continue';
            cancelBtn.style.display = 'none'; // Hide cancel
            
            modalBtn.onclick = () => {
                modal.classList.remove('active');
                if (title.includes("Enrolled") || title.includes("Student Registered")) {
                    window.location.href = "manage.html"; 
                } else {
                    window.location.reload(); 
                }
                resolve(true);
            };
        } 
        else if (type === 'error') {
            modalIcon.className = 'modal-icon error';
            modalIcon.innerHTML = "<i class='bx bx-x-circle' style='color: var(--danger-color); font-size: 50px;'></i>";
            
            modalBtn.className = 'btn-modal btn-modal-danger';
            modalBtn.innerText = 'Try Again';
            cancelBtn.style.display = 'none'; // Hide cancel
            
            modalBtn.onclick = () => {
                modal.classList.remove('active');
                const rfidInput = document.getElementById('code') || document.getElementById('facultyCode');
                if (rfidInput && document.activeElement !== rfidInput) { 
                    rfidInput.value = ''; 
                    rfidInput.focus(); 
                }
                resolve(true);
            };
        } 
        else if (type === 'confirm') {
            modalIcon.className = 'modal-icon warning'; 
            modalIcon.innerHTML = "<i class='bx bx-error-circle' style='color: #f59e0b; font-size: 50px;'></i>";
            
            modalBtn.className = 'btn-modal';
            modalBtn.innerText = 'Yes, Proceed';
            
            cancelBtn.innerText = 'Cancel';
            cancelBtn.style.display = 'inline-block'; // Show cancel
            
            modalBtn.onclick = () => {
                modal.classList.remove('active');
                resolve(true); 
            };
            cancelBtn.onclick = () => {
                modal.classList.remove('active');
                resolve(false); 
            };
        }
        
        modal.classList.add('active');
    });
}

// Keep this just in case you have HTML buttons explicitly calling onclick="closeModal()"
function closeModal() {
    document.getElementById('customModal').classList.remove('active');
}   

// ==========================================
// 6. FORM SUBMISSION LOGIC 
// ==========================================
document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    const codeVal = codeInput.value.trim();
    const nameVal = nameInput.value.trim();
    const gradeVal = document.getElementById('grade').value;

    if (codeVal.length !== 10) {
        codeInput.focus();
        showModal('error', 'Invalid ID Code', 'The RFID code must be exactly 10 digits long.');
        return;
    }
    if (!nameVal) {
        nameInput.focus();
        showModal('error', 'Missing Full Name', 'Please type the student\'s full name.');
        return;
    }
    if (!gradeVal) {
        document.getElementById('grade').focus();
        showModal('error', 'Grade Level Missing', 'Please select a Grade Level.');
        return;
    }

    const submitBtn = document.getElementById('saveBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Processing...`;
    
    const currentTime = new Date().toLocaleString('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });

    try {
        const data = {
            student_id: codeVal, 
            full_name: nameVal,
            grade_level: gradeVal,
            status: true,
            profile_pic_data: null,
            profile_pic_ext: null,
            addedAt: currentTime
        };

        const fileInput = document.getElementById('pf');
        
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
        submitBtn.innerHTML = `Save Student Record`;
    }
});

async function sendDataToBackend(data) {
    const submitBtn = document.getElementById('saveBtn');
    showLoading('Processing');
    try {
        const result = await window.api.addStudent(data);
        
        if (result && result.success) {
            document.getElementById('addForm').reset();
            document.getElementById('previewImage').style.display = 'none';
            document.getElementById('previewImage').src = '';
            document.getElementById('placeholderIcon').style.display = 'block';

            showModal('success', 'Student Enrolled!', `${data.full_name} has been successfully registered.`);
        } else {
            const errorMsg = result.error ? result.error.toLowerCase() : '';
            if (errorMsg.includes('unique') || errorMsg.includes('duplicate')) {
                document.getElementById('code').focus();
                showModal('error', 'ID Already Taken', `The RFID Code "${data.student_id}" is already registered.`);
            } else {
                showModal('error', 'Registration Failed', `Error: ${result.error}`);
            }
        }
    } catch (err) {
        showModal('error', 'System Error', `Background error: ${err.message}`);
    } finally {
        hideLoading();
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Save Student Record`; 
    }
}

// ==========================================
// 7. MASTER BADGE LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const openBtn = document.getElementById('openBadgeModalBtn');
    const closeBtn = document.getElementById('closeBadgeModalBtn');
    const submitBtn = document.getElementById('submitNewBadgeBtn');

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            document.getElementById('masterBadgeModal').style.display = 'flex';
            document.getElementById('newBadgeInput').focus();
            loadMasterBadges();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('masterBadgeModal').style.display = 'none';
            document.getElementById('newBadgeInput').value = '';
            if(document.getElementById('badgeFormStatus')) {
                 document.getElementById('badgeFormStatus').innerHTML = '';
            }
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', (event) => {
            event.preventDefault(); 
            saveNewBadge();
        });
    }
});

async function loadMasterBadges() {
    const container = document.getElementById('badgeListContainer');
    if (!container) return;
    
    container.innerHTML = `<div style="text-align: center; color: gray; padding: 20px;"><i class='bx bx-loader bx-spin'></i></div>`;

    try {
        const res = await window.api.getMasterBadges();

        if (res.success && res.data.length > 0) {
            container.innerHTML = res.data.map(badge => `
                <div style="display: flex; justify-content: space-between; align-items: center; background: white; padding: 10px 15px; margin-bottom: 5px; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <div>
                        <div style="font-family: monospace; font-size: 14px; font-weight: bold; color: #1e293b;">${badge.badge_code}</div>
                        <div style="font-size: 11px; color: #64748b;">Master Visitor Pass</div>
                    </div>
                    <button class="delete-badge-btn" data-code="${badge.badge_code}" style="background: transparent; color: #e74c3c; border: none; cursor: pointer; font-size: 18px;">
                        <i class='bx bx-trash'></i>
                    </button>
                </div>
            `).join('');

            document.querySelectorAll('.delete-badge-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const code = e.currentTarget.getAttribute('data-code');
                    removeBadge(code);
                });
            });

        } else {
            container.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 20px; font-size: 13px;">No Master Badges registered.</div>`;
        }
    } catch (err) {
        container.innerHTML = `<div style="color: red; padding: 10px;">Error loading badges.</div>`;
    }
}

async function saveNewBadge() {
    const codeInput = document.getElementById('newBadgeInput');
    const statusBox = document.getElementById('badgeFormStatus');
    const code = codeInput.value.trim();

    if (!code) {
        statusBox.innerHTML = "<span style='color: #e74c3c;'>Enter an RFID code.</span>";
        return;
    }

    if (code.length !== 10 || isNaN(code)) {
        statusBox.innerHTML = "<span style='color: #e74c3c;'>Invalid: RFID must be exactly 10 digits.</span>";
        return;
    }

    statusBox.innerHTML = "<span style='color: #f39c12;'><i class='bx bx-loader bx-spin'></i> Saving...</span>";

    try {
        const res = await window.api.addMasterBadge(code, "Master Visitor Pass");
        
        if (res.success) {
            statusBox.innerHTML = "<span style='color: #27ae60;'>✅ Saved successfully!</span>";
            codeInput.value = '';
            loadMasterBadges();
            setTimeout(() => statusBox.innerHTML = '', 2000);
        } else {
            statusBox.innerHTML = `<span style='color: #e74c3c;'>❌ Error: ${res.error}</span>`;
        }
    } catch (err) {
        console.error("Crash during save:", err);
    }
}

async function removeBadge(code) {
    const isConfirmed = await showModal('confirm', 'Delete Master Badge?', `Are you sure you want to delete master badge: ${code}?`);

    if (isConfirmed) {
        try {
            const res = await window.api.deleteMasterBadge(code);
            if (res.success) {
                if (window.api.saveAuditLog) {
                    await window.api.saveAuditLog({
                        action: "DELETE_MASTER_BADGE",
                        details: `Deleted badge: ${code}`,
                        user: typeof currentActiveAdmin !== 'undefined' ? currentActiveAdmin : "Admin" 
                    });
                }
                await loadMasterBadges();
            } else {
                showModal('error', 'Delete Failed', 'Could not delete badge. It might be in use.');
            }
        } catch (err) {
            showModal('error', 'System Error', 'A critical error occurred while trying to delete the badge.');
        }
    }
}

// ==========================================
// 8. DYNAMIC GRADE LEVEL FUNCTIONS
// ==========================================
async function refreshGradeData() {
    const res = await window.api.getGradeLevels();
    if (!res.success) return;

    const dropdown = document.getElementById('grade');
    if(dropdown) {
        dropdown.innerHTML = `
            <option value="" disabled selected>Select Level/Strand</option>
            <option value="1">Grade 1</option>
            <option value="2">Grade 2</option>
            <option value="3">Grade 3</option>
            <option value="4">Grade 4</option>
            <option value="5">Grade 5</option>
            <option value="6">Grade 6</option>
            <option value="7">Grade 7</option>
            <option value="8">Grade 8</option>
            <option value="9">Grade 9</option>
            <option value="10">Grade 10</option>
            <option value="11">Grade 11</option>
            <option value="12">Grade 12</option>
        `;
        res.data.forEach(level => {
            dropdown.innerHTML += `<option value="${level.level_name}">${level.level_name}</option>`;
        });
    }

    const listContainer = document.getElementById('gradeListContainer');
    if (listContainer) {
        listContainer.innerHTML = res.data.map(level => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-body); padding: 10px 15px; margin-bottom: 8px; border-radius: 8px; border: 1px solid var(--border-color);">
                <span style="font-weight: 600; font-size: 14px;">${level.level_name}</span>
                <button type="button" onclick="removeGrade(event, ${level.id})" style="background: transparent; color: #ef4444; border: none; cursor: pointer; font-size: 18px;">
                    <i class='bx bx-trash'></i>
                </button>
            </div>
        `).join('');
    }
}

function openGradeModal() { 
    document.getElementById('gradeModal').classList.add('active'); 
    refreshGradeData(); 
}

function closeGradeModal() { 
    document.getElementById('gradeModal').classList.remove('active'); 
}

async function addNewGrade() {
    const input = document.getElementById('newGradeInput');
    const submitBtn = event.target; 
    const name = input.value.trim();
    
    if (!name) {
        showModal('error', 'Empty Input', 'Please enter a name for the Grade Level or Strand.');
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
        const res = await window.api.addGradeLevel(name);
        
        if (res.success) {
            input.value = ''; 
            // Close the inner modal before showing success message!
            closeGradeModal();
            refreshGradeData();
            showModal('success', 'Level Added', `${name} is now available in the dropdown.`);
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

async function removeGrade(event, id) {
    // 🛡️ THIS IS THE MAGIC SHIELD! 
    // It stops the Trash button from accidentally submitting your main Student Form.
    event.preventDefault(); 

    const isConfirmed = await showModal('confirm', 'Remove Grade Level?', 'Are you sure? This will remove the option from the dropdown.');
    
    if (isConfirmed) {
        try {
            await window.api.deleteGradeLevel(id);
            refreshGradeData();
            
            window.location.reload();
        } catch (err) {
            showModal('error', 'System Error', 'Could not delete the Grade Level.');
        }
    }
}

// Initial load
document.addEventListener('DOMContentLoaded', refreshGradeData);