console.log("🟢 The Javascript file is successfully loaded!");
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// Turns on the loading screen and changes the text
function showLoading(message = "Processing...") {
    document.getElementById('loading-text').innerText = message;
    document.getElementById('loading-overlay').classList.remove('hidden');
}

// Turns off the loading screen
function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}   
        // === CSV IMPORT LOGIC ===
        async function handleImportCSV() {
            if (confirm("Ready to import? The system will ignore duplicates and process your CSV file.")) {
                const result = await window.api.importStudentsCSV();

                showLoading('Importing....');
                try{
                if (result.success) {
                    showModal('success', 'Import Complete', `Successfully imported ${result.count} students from the CSV file.`);
                } else if (result.error !== 'Cancelled') {
                    showModal('error', 'Import Failed', result.error);
                }
            }  finally {
            hideLoading();
        }
        }
    }

        // === LIVE IMAGE PREVIEW LOGIC ===
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

        // === LIVE VALIDATION LOGIC ===
        const codeInput = document.getElementById('code');
        const nameInput = document.getElementById('name');
        const codeError = document.getElementById('codeError');
        const nameError = document.getElementById('nameError');

        codeInput.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, ''); 
            if (this.value.length > 0 && this.value.length !== 10) {
                this.classList.add('invalid');
                codeError.innerText = "RFID code must be exactly 10 digits.";
            } else {
                this.classList.remove('invalid');
                codeError.innerText = "";
            }
        });

        nameInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^a-zA-Z\s\.\-]/g, '');
            if (this.value.length > 0 && this.value.trim().length === 0) {
                this.classList.add('invalid');
                nameError.innerText = "Name cannot be just empty spaces.";
            } else {
                this.classList.remove('invalid');
                nameError.innerText = "";
            }
        });

        // === MODAL LOGIC ===
        function showModal(type, title, message) {


            const modal = document.getElementById('customModal');
            const modalIcon = document.getElementById('modalIcon');
            const modalTitle = document.getElementById('modalTitle');
            const modalMessage = document.getElementById('modalMessage');
            const modalBtn = document.getElementById('modalBtn');

            modalTitle.innerText = title;
            modalMessage.innerText = message;

            if (type === 'success') {
                modalIcon.className = 'modal-icon success';
                modalIcon.innerHTML = "<i class='bx bx-check-circle'></i>";
                modalBtn.className = 'btn-modal';
                modalBtn.innerText = 'Sucess!';
            } else {
                modalIcon.className = 'modal-icon error';
                modalIcon.innerHTML = "<i class='bx bx-x-circle'></i>";
                modalBtn.className = 'btn-modal error-btn';
                modalBtn.innerText = 'Got it';
            }
            modal.classList.add('active');
        }

        function closeModal() {
            document.getElementById('customModal').classList.remove('active');
            if (document.getElementById('modalIcon').classList.contains('success')) {
                window.location.href = "manage.html"; 
            }
        }

        // === FORM SUBMISSION LOGIC (BASE64) ===
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
                    student_code: codeVal,
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
                        showModal('error', 'ID Already Taken', `The RFID Code "${data.student_code}" is already registered.`);
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

    // 🛡️ 10-Digit Validation
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
        // Description is sent as a generic string since it's removed from UI
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
        // 1. Ask for confirmation
        if (confirm(`Are you sure you want to delete master badge: ${code}?`)) {
            try {
                // 2. Wait for the backend to finish deleting the record
                const res = await window.api.deleteMasterBadge(code);
                
                if (res.success) {
                    // 3. Log the action to your Audit Trail text file
                    // This helps you track who deleted what and when
                    if (window.api.saveAuditLog) {
                        await window.api.saveAuditLog({
                            action: "DELETE_MASTER_BADGE",
                            details: `Deleted badge: ${code}`,
                            user: currentActiveAdmin // From your global variable
                        });
                    }

                    // 4. Refresh the UI list
                    // We 'await' this so the app doesn't try to do anything else 
                    // until the list is fully redrawn.
                    await loadMasterBadges();
                    window.location.reload();
                    
                } else {
                    console.error("Delete failed:", res.error);
                    alert("Could not delete badge. It might be in use.");
                }
            } catch (err) {
                // This catches system crashes without freezing your UI
                console.error("Critical crash during removeBadge:", err);
            }
        }
    }