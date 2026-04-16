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