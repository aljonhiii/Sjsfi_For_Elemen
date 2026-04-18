const loader = document.getElementById('globalLoader');
const loaderText = document.getElementById('loaderText');

function toggleLoader(show, text = "Please Wait...") {
    loaderText.innerText = text;
    loader.style.display = show ? 'flex' : 'none';
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

// --- REGISTER LOGIC WITH 3-SECOND DELAY AND REDIRECT ---
async function submitVisitors() {
    const groupIdInput = document.getElementById('visitorGroupId');
    const badgeCode = groupIdInput ? groupIdInput.value.trim().toUpperCase() : '';

    if (!badgeCode) {
        alert("Please scan or enter a Badge ID first.");
        if(groupIdInput) groupIdInput.focus();
        return;
    }

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

    setTimeout(async () => {
        try {
            // Sends both the badge code and the array of names to main.js
            const result = await window.api.processVisitors(badgeCode, allVisitors);
            
            if (result.success) {
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

// ==========================================
// 🌟 TELEPORT CATCHER: AUTO-FILL SCANNED BADGE
// ==========================================
window.onload = () => {
    renderVisitorForms(); 

    const urlParams = new URLSearchParams(window.location.search);
    const badgeFromScanner = urlParams.get('badge');

    if (badgeFromScanner) {
        const groupIdInput = document.getElementById('visitorGroupId');
        if (groupIdInput) {
            groupIdInput.value = badgeFromScanner;
            
            // Lock the box so it can't be messed up
            groupIdInput.readOnly = true; 
            groupIdInput.style.backgroundColor = "#e9ecef"; 
            groupIdInput.style.color = "#6c757d";
            groupIdInput.style.cursor = "not-allowed";
            groupIdInput.style.fontWeight = "bold";
        }
    }
};      