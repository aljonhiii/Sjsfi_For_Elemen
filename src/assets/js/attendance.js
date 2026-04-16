
        const timeInSound = new Audio('assets/spelling-bee.mp3');
        const timeOutSound = new Audio('assets/times-up.mp3');
        const errorSound = new Audio('assets/perfect-fart.mp3');
        
        const librarian_admin_rfid_access =  [
            "0002045004",
            "0002102614",
            "0002075610",
            "0002075591"
            
                                             ];


        const visitor_library_id_access = [
            "0002075624"	
        ];                                     

        // Live Clock logic
        function updateClock() {
            const now = new Date();
            document.getElementById('liveClock').innerText = now.toLocaleTimeString('en-US');
        }
        setInterval(updateClock, 1000);
        updateClock();

        // Scanner Logic & UI Elements
        const scanInput = document.getElementById('scanCode');
        const statusMessage = document.getElementById('statusMessage');
        const scanResultContent = document.getElementById('scanResultContent');
        
        let isScannerLocked = false;
        let lockCountdown = 2; 
        let countdownInterval;
        let resetTimer; 

        // 🧠 THE MEMORY: Airbnb Skeleton layout
    // 🧠 THE MEMORY: A sleek outline waiting for an ID
        let lastSuccessfulProfile = `
            <div class="modern-card" style="opacity: 0.5; border: 2px dashed var(--border-color); background: transparent; display: flex; justify-content: center; align-items: center; flex-direction: column;">
                <i class='bx bxs-user-detail' style="font-size: 60px; color: var(--text-secondary); opacity: 0.5; margin-bottom: 10px;"></i>
                <div style="color: var(--text-secondary); font-weight: bold; letter-spacing: 1px;">WAITING FOR ID</div>
            </div>
        `;

        scanInput.addEventListener('keypress', async function (e) {
            if (e.key === 'Enter') {
                e.preventDefault(); 
                
                let code = scanInput.value.trim();
                scanInput.value = ''; 

                if (!code) return;


               // 🔓 INTERCEPT: CHECK IF IT IS THE MASTER KEY
// 🔓 INTERCEPT: CHECK IF IT IS THE MASTER KEY
                if (librarian_admin_rfid_access.includes(code)) {
                    console.log("🔓 Admin Master Key Scanned!");
                    
                    // 1. Lock the scanner input
                    isScannerLocked = true;

                    // 2. Play success sound (if defined)
                    if (typeof timeInSound !== 'undefined') {
                        timeInSound.currentTime = 0;
                        timeInSound.play().catch(() => {});
                    }

                    // 3. Create the Full-Screen Frosted Glass Overlay dynamically
                    const fullscreenLoader = document.createElement('div');
                    fullscreenLoader.style.position = 'fixed';
                    fullscreenLoader.style.top = '0';
                    fullscreenLoader.style.left = '0';
                    fullscreenLoader.style.width = '100vw';
                    fullscreenLoader.style.height = '100vh';
                    fullscreenLoader.style.backgroundColor = 'rgba(255, 255, 255, 0.75)'; // Transparent white
                    fullscreenLoader.style.backdropFilter = 'blur(10px)'; // Frosted glass blur
                    fullscreenLoader.style.webkitBackdropFilter = 'blur(10px)';
                    fullscreenLoader.style.display = 'flex';
                    fullscreenLoader.style.justifyContent = 'center';
                    fullscreenLoader.style.alignItems = 'center';
                    fullscreenLoader.style.zIndex = '9999'; // On top of everything
                    fullscreenLoader.style.fontFamily = '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
                    fullscreenLoader.style.animation = 'fadeIn 0.3s ease-out';
                    
                    // 4. INJECT THE PREMIUM UI (The code you just pasted!)
                    fullscreenLoader.innerHTML = `
                        <style>
                            /* Makes the logo pulse like a high-tech security scan */
                            @keyframes premium-pulse {
                                0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(39, 174, 96, 0.3); }
                                70% { transform: scale(1.05); box-shadow: 0 0 0 25px rgba(39, 174, 96, 0); }
                                100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(39, 174, 96, 0); }
                            }
                            
                            /* Animates the "dot dot dot" on the text */
                            .loading-ellipsis::after {
                                content: '.';
                                animation: ellipsis 1.5s steps(4, end) infinite;
                            }
                            @keyframes ellipsis {
                                0% { content: ''; }
                                25% { content: '.'; }
                                50% { content: '..'; }
                                75%, 100% { content: '...'; }
                            }
                        </style>
                        
                        <!-- THE PREMIUM FLOATING CARD -->
                        <div style="background: white; padding: 50px 80px; border-radius: 30px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); display: flex; flex-direction: column; align-items: center; border: 1px solid var(--border-color); animation: fadeIn 0.4s ease-out;">
                            
                            <!-- THE LOGO WITH PULSE GLOW -->
                            <div style="width: 110px; height: 110px; border-radius: 50%; background: white; display: flex; justify-content: center; align-items: center; margin-bottom: 30px; animation: premium-pulse 2s infinite;">
                                <img src="assets/images/sjsfi_school_logo.png" onerror="this.src='https://via.placeholder.com/80/27ae60/ffffff?text=SJ'" style="width: 85px; height: 85px; object-fit: contain;">
                            </div>

                            <!-- THE DOTTED SPINNER -->
                            <i class='bx bx-loader bx-spin' style="font-size: 55px; color: var(--primary-color); margin-bottom: 20px; filter: drop-shadow(0 4px 6px rgba(39, 174, 96, 0.3));"></i>
                            
                            <!-- THE MAIN HEADING -->
                            <h1 style="font-size: 38px; font-weight: 900; margin: 0 0 12px 0; color: var(--primary-dark); text-transform: uppercase; letter-spacing: 1px;">Access Granted</h1>
                            
                            <!-- THE ANIMATED DOT DOT DOT TEXT -->
                            <p style="font-size: 19px; font-weight: 600; color: var(--text-secondary); margin: 0; display: flex; align-items: center; gap: 8px;">
                                <i class='bx bx-shield-quarter' style="font-size: 24px; color: var(--primary-color);"></i>
                                Redirecting to Admin<span class="loading-ellipsis" style="width: 20px; text-align: left; display: inline-block;"></span>
                            </p>
                        </div>
                    `;
 
                    // 5. Attach it to the screen!
                    document.body.appendChild(fullscreenLoader);

                    // 6. Wait for 2.5 seconds, then redirect!
                    setTimeout(() => {
                        window.location.href = 'reports.html'; 
                    }, 2500);

                    return; // 🛑 CRITICAL: Stop the function here so it doesn't log the admin as a student!
                }


                if (visitor_library_id_access.includes(code)) {
                    console.log("🧑‍🤝‍🧑 Visitor Pass Scanned!");
                    
                    isScannerLocked = true;
                    
                    if (typeof timeInSound !== 'undefined') {
                        timeInSound.currentTime = 0;
                        timeInSound.play().catch(() => {});
                    }

                    // 3. Create the Full-Screen Frosted Glass Overlay dynamically
                    const fullscreenLoader = document.createElement('div');
                    fullscreenLoader.style.position = 'fixed';
                    fullscreenLoader.style.top = '0';
                    fullscreenLoader.style.left = '0';
                    fullscreenLoader.style.width = '100vw';
                    fullscreenLoader.style.height = '100vh';
                    fullscreenLoader.style.backgroundColor = 'rgba(255, 255, 255, 0.50)'; // Transparent white
                    fullscreenLoader.style.backdropFilter = 'blur(10px)'; // Frosted glass blur
                    fullscreenLoader.style.webkitBackdropFilter = 'blur(3px)';
                    fullscreenLoader.style.display = 'flex';
                    fullscreenLoader.style.justifyContent = 'center';
                    fullscreenLoader.style.alignItems = 'center';
                    fullscreenLoader.style.zIndex = '9999'; // On top of everything
                    fullscreenLoader.style.fontFamily = '"Arial, Sans-Serif"';
                    fullscreenLoader.style.animation = 'fadeIn 0.3s ease-out';
                    
                    // 4. INJECT THE PREMIUM UI (The code you just pasted!)
                    fullscreenLoader.innerHTML = `
                        <style>
                            /* Makes the logo pulse like a high-tech security scan */
                            @keyframes premium-pulse {
                                0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(39, 174, 96, 0.3); }
                                70% { transform: scale(1.05); box-shadow: 0 0 0 25px rgba(39, 174, 96, 0); }
                                100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(39, 174, 96, 0); }
                            }
                            
                            /* Animates the "dot dot dot" on the text */
                            .loading-ellipsis::after {
                                content: '.';
                                animation: ellipsis 1.5s steps(4, end) infinite;
                            }
                            @keyframes ellipsis {
                                0% { content: ''; }
                                25% { content: '.'; }
                                50% { content: '..'; }
                                75%, 100% { content: '...'; }
                            }
                        </style>
                        
                        <!-- THE PREMIUM FLOATING CARD -->
                        <div style="background: white; padding: 50px 80px; border-radius: 30px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); display: flex; flex-direction: column; align-items: center; border: 1px solid var(--border-color); animation: fadeIn 0.4s ease-out;">
                            
                            <!-- THE LOGO WITH PULSE GLOW -->
                            <div style="width: 110px; height: 110px; border-radius: 50%; background: white; display: flex; justify-content: center; align-items: center; margin-bottom: 30px; animation: premium-pulse 2s infinite;">
                                <img src="302020444_491445399653674_4531561179769409846_n.png" onerror="this.src='https://via.placeholder.com/80/27ae60/ffffff?text=SJ'" style="width: 85px; height: 85px; object-fit: contain;">
                            </div>

                            <!-- THE DOTTED SPINNER -->
                            <i class='bx bx-loader bx-spin' style="font-size: 55px; color: var(--primary-color); margin-bottom: 20px; filter: drop-shadow(0 4px 6px rgba(39, 174, 96, 0.3));"></i>
                            
                            <!-- THE MAIN HEADING -->
                            <h1 style="font-size: 38px; font-weight: 900; margin: 0 0 12px 0; color: var(--primary-dark); text-transform: uppercase; letter-spacing: 1px;">Access Granted</h1>
                            
                            <!-- THE ANIMATED DOT DOT DOT TEXT -->
                            <p style="font-size: 19px; font-weight: 600; color: var(--text-secondary); margin: 0; display: flex; align-items: center; gap: 8px;">
                                <i class='bx bx-shield-quarter' style="font-size: 24px; color: var(--primary-color);"></i>
                                Please Wait<span class="loading-ellipsis" style="width: 20px; text-align: left; display: inline-block;"></span>
                            </p>
                        </div>
                    `;

                    // 5. Attach it to the screen!
                    document.body.appendChild(fullscreenLoader);
                    
                    // Redirect to the new Visitor Registration Page
                    setTimeout(() => {
                        window.location.href = 'visitors.html'; 
                    }, 1000);

                    return; // 🛑 CRITICAL: Stop the function here so it doesn't log a student!
                }

                if (code.length > 10) code = code.substring(0, 10);

                if (isScannerLocked) return; 

                isScannerLocked = true;
                lockCountdown = 2; 
                
                scanInput.placeholder = `Processing... (${lockCountdown}s)`;
                scanInput.style.borderColor = '#f39c12'; 
                statusMessage.innerHTML = `<span style="color: var(--primary-color); font-weight:bold;"><i class='bx bx-loader-alt bx-spin'></i> Processing...</span>`;

                clearInterval(countdownInterval);
                countdownInterval = setInterval(() => {
                    lockCountdown--;
                    if (lockCountdown > 0) {
                        scanInput.placeholder = `Processing... (${lockCountdown}s)`;
                    } else {
                        clearInterval(countdownInterval);
                        isScannerLocked = false;
                        scanInput.placeholder = "......";
                        scanInput.style.borderColor = ''; 
                        scanInput.value = ''; 
                    }
                }, 1000);

                try {
                    const result = await window.api.processAttendance(code);

                    if (result.success) {
                        const isTimeIn = result.logType === 'TIME IN';

                        if (isTimeIn) {
                            timeInSound.currentTime = 0;
                            timeInSound.play().catch(() => {});
                        } else {
                            timeOutSound.currentTime = 0;
                            timeOutSound.play().catch(() => {});
                        }

                        statusMessage.innerHTML = `<span style="color: var(--success-color); font-weight: bold;"><i class='bx bx-check-circle'></i> Scan Successful!</span>`;
                        
                        const picSrc = result.profilePic ? result.profilePic : 'https://via.placeholder.com/360x240/2d6a4f/ffffff?text=No+Photo';
                        const badgeClass = isTimeIn ? 'success-in' : 'success-out';
                        
const timeString = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        const dateString = new Date().toLocaleDateString();

const newProfileHTML = `
                            <div class="modern-card" style="animation: fadeIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                                <img class="modern-card-img" src="${picSrc}" onerror="this.src='https://via.placeholder.com/320x400/1e293b/ffffff?text=No+Photo'">
                                
                                <div class="modern-card-overlay">
                                    <div class="modern-card-header">
                                        <h2 class="modern-card-title">${result.studentName}</h2>
                                    </div>
                                    
                                    <p class="modern-card-desc">
                                        Grade Level: <strong>${result.grade}</strong>
                                    </p>
                                    
                                    <div class="modern-card-tags">
                                        <div class="modern-tag ${badgeClass}">
                                            <i class='bx bx-scan'></i> ${result.logType}
                                        </div>
                                        
                                        <div class="modern-tag"><i class='bx bx-time'></i> ${timeString}</div>
                                        <div class="modern-tag"><i class='bx bx-calendar'></i> ${dateString}</div>
                                    </div>
                                </div>
                            </div>
                        `;

                        scanResultContent.innerHTML = newProfileHTML;
                        lastSuccessfulProfile = newProfileHTML; 

                    } else {
                        errorSound.currentTime = 0;
                        errorSound.play().catch(() => {});

                        statusMessage.innerHTML = `<span class="scan-error"><i class='bx bx-error-circle'></i> Scan Failed</span>`;
                        scanResultContent.innerHTML = `
                            <div style="color: var(--danger-color); padding: 20px; background: rgba(214, 48, 49, 0.1); border-radius: 12px; font-weight: bold; margin-top: 10px; text-align: center; width: 90%;">
                                ${result.error}
                            </div>
                        `;
                    }

                    clearTimeout(resetTimer);
                    resetTimer = setTimeout(() => {
                        statusMessage.innerHTML = ``; 
                        scanResultContent.innerHTML = lastSuccessfulProfile; 
                    }, 2000); 

                } catch (err) {
                    console.error("Database error:", err);
                    statusMessage.innerHTML = `<span class="scan-error"><i class='bx bx-error-circle'></i> Error</span>`;
                    scanResultContent.innerHTML = `<div style="color: var(--danger-color); font-weight: bold;">System Error connecting to database.</div>`;
                }
            }
        });

        document.addEventListener('click', () => { scanInput.focus(); });
        window.onload = () => scanInput.focus();
        scanInput.addEventListener('blur', () => { setTimeout(() => scanInput.focus(), 10); });

        function simulateScan(tagId) {
            scanInput.value = tagId;
            const enterEvent = new KeyboardEvent('keypress', { key: 'Enter' });
            scanInput.dispatchEvent(enterEvent);
        }

        function applyScannerLock(year) {
            const warning = document.getElementById('archiveWarning');
            const input = document.getElementById('scanCode');
            const status = document.getElementById('scannerStatus'); 

            if (!warning || !status) return; 

            if (year !== 'current') {
                warning.style.display = 'block';
                warning.innerHTML = `<i class='bx bx-error'></i> VIEWING ARCHIVE: ${year}. SCANNING BLOCKED.`;
                status.innerHTML = `<i class='bx bxs-circle' style="color: #e67e22;"></i> Connected to Archive: ${year}`;
                input.style.borderColor = "#e67e22";
            } else {
                warning.style.display = 'none';
                status.innerHTML = `<i class='bx bxs-circle' style="color: var(--primary-color);"></i> Connected to Live Data`;
                input.style.borderColor = "var(--border-color)";
            }
        }