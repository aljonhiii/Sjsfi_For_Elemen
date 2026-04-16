    let allStudents = [];
    let filteredStudents = [];
    let currentPage = 1;
    const rowsPerPage = 10;


    let isArchiveView = false;


    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        // Turns on the loading screen and changes the text
function showLoading(message = "Processing...") {
    const textElement = document.getElementById('loading-text');
    const loader = document.getElementById('loading-overlay');
    
    if (textElement) textElement.innerText = message;
    
    if (loader) {
        loader.classList.remove('hidden'); // Clean up the CSS just in case
        loader.style.display = 'flex';     // 🌟 FORCE IT TO APPEAR
    }
}

// Turns off the loading screen
function hideLoading() {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        // Force the browser to completely remove it from the clickable layout
        loader.style.display = 'none'; 
    }
}

async function toggleArchiveView() {
    isArchiveView = !isArchiveView;
    const btn = document.getElementById('toggleArchiveBtn');
    const headerTitle = document.querySelector('.header h1'); // Adjust selector to match your title

    if (isArchiveView) {
        // --- MODE: RECYCLE BIN ---
        btn.innerHTML = "<i class='bx bx-undo'></i> Back to Roster";
        btn.classList.add('btn-archive-active'); // We'll add a red style in CSS
        if (headerTitle) headerTitle.innerText = "Recycle Bin";

        const response = await window.api.getDeletedStudents();
        if (response.success) {
            allStudents = response.data;
            currentPage = 1; // Reset to page 1
            applyFilters(); // This will render the table using the new data
        }
    } else {
        // --- MODE: ACTIVE ROSTER ---
        btn.innerHTML = "<i class='bx bx-trash'></i> View Recycle Bin";
        btn.classList.remove('btn-archive-active');
        if (headerTitle) headerTitle.innerText = "Student Roster";

        loadStudents(); // Your original function that calls get-students (status = 1)
    }
}



    // Put this at the very bottom of your script section
window.api.onDatabaseSwitched((fileName) => {
    console.log("Database changed to: " + fileName);
    
    // 🚀 This is the critical part: Reload the data from the new source
    loadStudents(); 
    
    // Optional: Change the Title so you know you are looking at an archive
    const title = document.querySelector('.header h1');
    if (fileName === 'current') {
        title.innerText = "Student Roster";
        title.style.color = "var(--primary-dark)";
    } else {
        title.innerText = `Roster Archive: ${fileName}`;
        title.style.color = "#e67e22"; // Orange to warn it's an archive
    }
});

    async function loadStudents() {
        const response = await window.api.getStudents();
        if(!response.success) { alert("Failed to load database."); return; }
        allStudents = response.data;
        applyFilters(); 
    }

    function applyFilters() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const gradeTerm = document.getElementById('gradeFilter').value;
        filteredStudents = allStudents.filter(s => {
            const matchesSearch = s.full_name.toLowerCase().includes(searchTerm) || s.student_code.toLowerCase().includes(searchTerm);
            const matchesGrade = gradeTerm === 'all' || s.grade_level == gradeTerm;
            return matchesSearch && matchesGrade;
        });
        currentPage = 1; 
        renderTable();
    }

function renderTable() {
        const tbody = document.getElementById('studentTable');
        tbody.innerHTML = '';
        
        // Adjust the colspan if you added columns, usually 5 with the Actions column
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
            
            // 🌟 LOGIC: Switch between Registration Date and Deletion Date
            const displayDate = isArchiveView 
                ? (s.deletedAt ? s.deletedAt : 'N/A') 
                : (s.addedAt ? s.addedAt : 'Legacy Record');
            
            const dateIcon = isArchiveView ? 'bx-calendar-x' : 'bx-time';
            const dateLabel = isArchiveView ? 'Deleted:' : 'Registered:';

            tbody.innerHTML += `<tr>
                <td><div class="student-info"><div class="avatar">${avatarHTML}</div><strong>${s.full_name}</strong></div></td>
                <td style="font-family: monospace; font-weight: 600;">${s.student_code}</td>
                <td>Grade ${s.grade_level}</td>

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

function editStudent(id) {
        const student = allStudents.find(s => s.id === id);
        if (!student) return;
        
        document.getElementById('editId').value = student.id;
        
        // 🌟 1. GRAB THE NAME BOX AND UNLOCK IT
        const nameInput = document.getElementById('editName');
        nameInput.value = student.full_name;
        nameInput.removeAttribute('readonly');  // Strips away any ghost locks
        nameInput.removeAttribute('disabled');  // Strips away any disabled states
        
        document.getElementById('editGrade').value = student.grade_level;
        document.getElementById('editPhotoInput').value = '';
        
        const preview = document.getElementById('editImagePreview');
        const placeholder = document.getElementById('editPlaceholder');

        if (student.profile_pic) {
            preview.src = encodeURI("file:///" + student.profile_pic.replace(/\\/g, '/'));
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        } else {
            preview.style.display = 'none';
            placeholder.style.display = 'flex';
        }
        
        document.getElementById('editModal').style.display = 'flex';

        // 🌟 2. THE FOCUS FAILSAFE (Waits 50ms for the modal to appear, then forces the cursor inside)
        setTimeout(() => {
            nameInput.focus();
        }, 50);
    }

    // Your photo listener stays exactly the same!
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
            id: document.getElementById('editId').value,
            full_name: document.getElementById('editName').value,
            grade_level: document.getElementById('editGrade').value,
            status: 1,
            profile_pic_data: null, 
            profile_pic_ext: null
        };

        showLoading('Processing....');
        
        try {
            await sleep(400);
            
            // 1. IF THERE IS A PHOTO: Tell JavaScript to WAIT for it to finish reading
            if (photoInput.files && photoInput.files[0]) {
                const file = photoInput.files[0];
                data.profile_pic_ext = file.name.split('.').pop();
                
                // This forces the code to pause until the photo is 100% loaded
                data.profile_pic_data = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });
            }

            // 2. NOW CALL MAIN.JS (We only have to write this once now!)
            const result = await window.api.editStudent(data);
            
            // 3. CHECK THE RESULT FOR THE ARCHIVE BLOCKER
            if (result.success) { 
                closeEditModal(); 
                
                setTimeout(() => { 
                    alert('Student successfully updated!'); 
                    window.location.reload(); // ☢️ Instantly resets the entire page
                }, 100);
            } else {
                // 🛑 THIS CATCHES THE ARCHIVE ERROR
                alert('Action Blocked: ' + result.error);
            }
            
        } catch (err) {
            alert('A system error occurred while saving.');
        } finally {
            // 4. The loader will now safely turn off at the very end
            hideLoading();
        }
    }

    async function deleteStudent(id, name) {
        
        if (confirm(`Soft Delete ${name}? (You can restore it in the Recycle bin)`)) {
            showLoading('Processing....')
            try{
                await sleep(400);
            const result = await window.api.deleteStudent(id);
            if (result.success){
                alert('Student sucessfuly soft-deleted');
                loadStudents();
            } else {
                alert('Action was Blocked: ' + result.error);
                
            }    
        } finally{
            hideLoading();
        }
    }
    }



async function handleRestore(id, name) {
    if (confirm(`Are you sure you want to restore ${name} to the active roster?`)) {
        
        // 1. Turn on the loader immediately!
        showLoading('Processing....');
        
        try {
            // Optional: Keep your tiny delay for visual smoothness
            await sleep(400); 
            
            // 2. Ask the database to do the work WHILE the loader is spinning
            const result = await window.api.restoreStudent(id);

            // 3. Check the result
            if (result.success) {
                alert('Student Successfully Restored!');
                const response = await window.api.getDeletedStudents();
                allStudents = response.data;
                applyFilters();
                window.location.reload();
            } else {
                alert('Action Blocked: ' + result.error);
            }
            
        } catch (err) {
            // Catch any unexpected crashes
            alert('A system error occurred while restoring.');
        } finally {
            // 4. Always turn off the loader no matter what happens
            hideLoading();
        }
    }
}

    async function handleExportCSV() {
        showLoading('Processing...');
        try{
        const result = await window.api.exportStudentsCSV();
        if (result.success) alert("Export successful!");
        }finally{
            hideLoading();
        }
    }

    function closeEditModal() { document.getElementById('editModal').style.display = 'none'; }
    function changePage(dir) { currentPage += dir; renderTable(); }
    document.addEventListener('DOMContentLoaded', loadStudents);