const loader = document.getElementById('globalLoader');
const loaderText = document.getElementById('loaderText');

function toggleLoader(show, text = "Please Wait...") {
    loaderText.innerText = text;
    loader.style.display = show ? 'flex' : 'none';
}

// 🌟 THE ULTIMATE FIX: CUSTOM HTML ALERT
// This completely bypasses the OS dialog, making the freezing bug physically impossible.
function customAlert(message, elementToFocus = null) {
    toggleLoader(false); // Ensure loader is off
    if (document.activeElement) document.activeElement.blur(); // Drop focus

    // Create the overlay background
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
    overlay.style.backdropFilter = 'blur(2px)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '999999';

    // Create the alert box
    const box = document.createElement('div');
    box.style.background = '#ffffff';
    box.style.padding = '24px 32px';
    box.style.borderRadius = '12px';
    box.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
    box.style.textAlign = 'center';
    box.style.maxWidth = '350px';
    box.style.fontFamily = "'Segoe UI', Arial, sans-serif";

    // Message text
    const msg = document.createElement('p');
    msg.innerText = message;
    msg.style.color = '#334155';
    msg.style.fontSize = '15px';
    msg.style.fontWeight = '600';
    msg.style.margin = '0 0 20px 0';
    msg.style.lineHeight = '1.5';

    // OK Button
    const btn = document.createElement('button');
    btn.innerText = 'OK';
    btn.style.background = '#e74c3c';
    btn.style.color = '#ffffff';
    btn.style.border = 'none';
    btn.style.padding = '10px 24px';
    btn.style.borderRadius = '6px';
    btn.style.fontWeight = 'bold';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '14px';

    // Button Hover Effect
    btn.onmouseover = () => btn.style.background = '#c0392b';
    btn.onmouseout = () => btn.style.background = '#e74c3c';

    // Close Action
    const closeDialog = () => {
        document.body.removeChild(overlay);
        if (elementToFocus) {
            setTimeout(() => elementToFocus.focus(), 50); // Safely return focus
        }
    };

    btn.onclick = closeDialog;

    // Build and show
    box.appendChild(msg);
    box.appendChild(btn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // Focus the button so hitting "Enter" closes it instantly
    btn.focus();
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
            <div class="visitor-block" style="background: #ffffff; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--border-color, #e2e8f0);">
                <div class="visitor-block-title" style="margin-bottom: 12px; font-weight: bold; color: var(--text-primary, #334155); border-bottom: 1px solid var(--border-color, #e2e8f0); padding-bottom: 5px;">Visitor 0${i}</div>
                
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    
                    <div class="input-group">
                        <label style="font-size: 12px; font-weight: bold; color: var(--text-secondary, #475569); margin-bottom: 4px; display: block;">Full Name *</label>
                        <input type="text" id="v_name_${i}" placeholder="Enter Full Name..." required autocomplete="off" style="width: 100%; padding: 8px; box-sizing: border-box; border-radius: 6px; border: 1px solid var(--border-color, #cbd5e1);">
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        <div class="input-group" style="flex: 1;">
                            <label style="font-size: 12px; font-weight: bold; color: var(--text-secondary, #475569); margin-bottom: 4px; display: block;">Mobile Number *</label>
                            <input type="tel" id="v_mobile_${i}" required placeholder="09xxxxxxxxx" maxlength="11" oninput="this.value = this.value.replace(/[^0-9]/g, '')" autocomplete="off" style="width: 100%; padding: 8px; box-sizing: border-box; border-radius: 6px; border: 1px solid var(--border-color, #cbd5e1);">
                        </div>
                        <div class="input-group" style="flex: 1;">
                            <label style="font-size: 12px; font-weight: bold; color: var(--text-secondary, #475569); margin-bottom: 4px; display: block;">Email (Optional)</label>
                            <input type="email" id="v_email_${i}" placeholder="email@example.com" autocomplete="off" style="width: 100%; padding: 8px; box-sizing: border-box; border-radius: 6px; border: 1px solid var(--border-color, #cbd5e1);">
                        </div>
                    </div>
                    
                </div>
            </div>
        `;
    }
    
    setTimeout(() => {
        const first = document.getElementById('v_name_1');
        if(first) first.focus();
    }, 100);
}

async function submitVisitors() {
    const groupIdInput = document.getElementById('visitorGroupId');
    const badgeCode = groupIdInput ? groupIdInput.value.trim().toUpperCase() : '';

    if (!badgeCode) {
        return customAlert("Please scan or enter a Badge ID first.", groupIdInput);
    }

    const countInput = document.getElementById('visitorCount');
    let count = parseInt(countInput.value);
    if(isNaN(count) || count < 1) count = 1;

    let allVisitors = [];
    const nameTracker = new Set(); 

    for (let i = 1; i <= count; i++) {
        const nameEl = document.getElementById(`v_name_${i}`);
        const mobileEl = document.getElementById(`v_mobile_${i}`);
        const emailEl = document.getElementById(`v_email_${i}`);
        
        const val = nameEl.value.trim();
        const mobileVal = mobileEl ? mobileEl.value.trim() : '';
        const emailVal = emailEl ? emailEl.value.trim() : '';

        // 1. Check if Name is missing
        if(!val) { 
            return customAlert(`Please provide a name for Visitor ${i}`, nameEl);
        }

        // 2. CHECK: Duplicate Names
        const upperName = val.toUpperCase();
        if (nameTracker.has(upperName)) {
            nameEl.value = ''; // Clear the bad text
            return customAlert(`Duplicate Name Detected: "${val}".\n\nPlease ensure all visitors have distinct names.`, nameEl);
        }
        nameTracker.add(upperName);
        
        // 3. Check if Mobile is missing
        if(!mobileVal) {
            return customAlert(`Please provide a mobile number for Visitor ${i}`, mobileEl);
        }
        
        allVisitors.push({ 
            name: val, 
            mobile: mobileVal, 
            email: emailVal 
        });
    }

    toggleLoader(true, "Registering Visitors...");

    setTimeout(async () => {
        try {
            const result = await window.api.processVisitors(badgeCode, allVisitors);
            
            if (result.success) {
                window.location.href = 'attendance.html';
            } else { 
                customAlert("Failed: " + result.error, null);
            }
        } catch (err) {
            customAlert("System error.", null);
        }
    }, 1000); 
}

window.onload = () => {
    renderVisitorForms(); 

    const urlParams = new URLSearchParams(window.location.search);
    const badgeFromScanner = urlParams.get('badge');

    if (badgeFromScanner) {
        const groupIdInput = document.getElementById('visitorGroupId');
        if (groupIdInput) {
            groupIdInput.value = badgeFromScanner;
            groupIdInput.readOnly = true; 
            groupIdInput.style.backgroundColor = "#e9ecef"; 
            groupIdInput.style.color = "#6c757d";
            groupIdInput.style.cursor = "not-allowed";
            groupIdInput.style.fontWeight = "bold";
        }
    }
};