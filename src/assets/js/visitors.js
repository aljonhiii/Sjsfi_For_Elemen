        const loader = document.getElementById('globalLoader');
        const loaderText = document.getElementById('loaderText');

        function toggleLoader(show, text = "Please Wait...") {
            loaderText.innerText = text;
            loader.style.display = show ? 'flex' : 'none';
        }

        function toggleDrawer() {
            const drawer = document.getElementById('sideDrawer');
            const overlay = document.getElementById('drawerOverlay');
            drawer.classList.toggle('active');
            overlay.classList.toggle('active');
            if(drawer.classList.contains('active')) {
                loadActiveVisitors();
            }
        }

        function renderVisitorForms() {
            let count = parseInt(document.getElementById('visitorCount').value);
            if (isNaN(count) || count < 1) count = 1;
            if (count > 15) count = 15; 

            const container = document.getElementById('dynamicFormsContainer');
            container.style.gridTemplateColumns = `repeat(${count > 2 ? 2 : 1}, 1fr)`; 
            container.innerHTML = ''; 

            for (let i = 1; i <= count; i++) {
                container.innerHTML += `
                    <div class="visitor-block">
                        <div class="visitor-block-title">Visitor 0${i}</div>
                        <div class="input-group">
                            <input type="text" id="v_name_${i}" placeholder="Enter Full Name..." required autocomplete="off">
                        </div>
                    </div>
                `;
            }
            
            setTimeout(() => {
                const first = document.getElementById('v_name_1');
                if(first) first.focus();
            }, 100);
        }

        // --- DRAWER SYNC WITH 3-SECOND DELAY ---
        async function loadActiveVisitors() {
            const container = document.getElementById('activeVisitorsContainer');
            container.innerHTML = '<p style="text-align:center; padding: 20px;"><i class="bx bx-loader-alt bx-spin"></i> Synchronizing...</p>';
            
            // Add a 3-second delay for the drawer refresh
            setTimeout(async () => {
                try {
                    const res = await window.api.getActiveVisitors();
                    container.innerHTML = '';
                    
                    if(res.success && res.data.length > 0) {
                        res.data.forEach(v => {
                            const div = document.createElement('div');
                            div.className = 'checkout-chip';
                            div.innerHTML = `<span>${v.visitor_name}</span> <i class='bx bx-log-out-circle'></i>`;
                            div.onclick = () => checkoutVisitor(v.visitor_name);
                            container.appendChild(div);
                        });
                    } else {
                        container.innerHTML = '<p style="text-align:center; color:#ccc; margin-top:40px; font-weight: 600;">No active visitors.</p>';
                    }
                } catch(e) { container.innerHTML = '<p style="color:red; text-align: center;">Sync Failed.</p>'; }
            }, 500);
        }

        async function checkoutVisitor(name) {
            if(confirm(`Log TIME OUT for ${name}?`)) {
                toggleLoader(true, `Signing out ${name}...`);
                // Standard 3-second interval for timeout too
                setTimeout(async () => {
                    try {
                        const res = await window.api.processAttendance(name); 
                        if(res.success) {
                            await loadActiveVisitors(); 
                        } else { alert(res.error); }
                    } catch(e) {
                        alert('Database error.');
                    } finally {
                        toggleLoader(false);
                    }
                }, 1000);
            }
        }

        // --- REGISTER LOGIC WITH 3-SECOND DELAY AND REDIRECT ---
        async function submitVisitors() {
            const countInput = document.getElementById('visitorCount');
            let count = parseInt(countInput.value);
            if(isNaN(count) || count < 1) count = 1;

            let allVisitors = [];
            for (let i = 1; i <= count; i++) {
                const inputEl = document.getElementById(`v_name_${i}`);
                const val = inputEl.value.trim();
                if(!val) { 
                    alert(`Please provide a name for Visitor ${i}`); 
                    inputEl.focus();
                    return; 
                }
                allVisitors.push({ name: val });
            }

            toggleLoader(true, "Registering Visitors...");

            // 3-SECOND INTERVAL DELAY
            setTimeout(async () => {
                try {
                    const result = await window.api.processVisitors(allVisitors);
                    if (result.success) {
                        // SUCCESS: REDIRECT TO ATTENDANCE.HTML
                        window.location.href = 'attendance.html';
                    } else { 
                        alert("Failed: " + result.error); 
                        toggleLoader(false);
                    }
                } catch (err) {
                    alert("System error.");
                    toggleLoader(false);
                }
            }, 1000); 
        }

        window.onload = renderVisitorForms;