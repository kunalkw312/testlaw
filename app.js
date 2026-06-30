// ==========================================
// FIREBASE INTEGRATION & STATE MANAGEMENT
// ==========================================
import { db } from './config.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Global Memory State
let settingsData = {
    tel: "+1 (555) 000-0000",
    email: "legal@lawsuitfiles.com",
    address: "New York, United States"
};
let categoriesData = [];
let casesData = [];
let leadsData = [];

// ==========================================
// INITIAL DATABASE SYNC
// ==========================================

async function fetchDatabaseRecords() {
    try {
        // 1. Fetch Global Settings
        const settingsSnap = await getDoc(doc(db, "settings", "global"));
        if (settingsSnap.exists()) {
            settingsData = settingsSnap.data();
        } else {
            await setDoc(doc(db, "settings", "global"), settingsData);
        }

        // 2. Fetch Categories
        const catSnap = await getDocs(collection(db, "categories"));
        categoriesData = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 3. Fetch Active Cases
        const casesSnap = await getDocs(collection(db, "cases"));
        casesData = casesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 4. Fetch Submitted Leads
        const leadsSnap = await getDocs(collection(db, "leads"));
        leadsData = leadsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Render data onto the UI
        renderSettings();
        renderCategories();
        renderPublicCases();
        renderAdminDashboard();
    } catch (error) {
        console.error("Firebase Sync Error:", error);
        window.showToast("Failed to sync with secure database servers.", "error");
    }
}

// ==========================================
// DOM RENDER ENGINES
// ==========================================

function renderSettings() {
    // Public Footer Updates
    const footerTel = document.getElementById('footerTel');
    const footerEmail = document.getElementById('footerEmail');
    const footerAddress = document.getElementById('footerAddress');

    if (footerTel) footerTel.innerText = `Tel Support: ${settingsData.tel}`;
    if (footerEmail) footerEmail.innerText = `✉ Queries: ${settingsData.email}`;
    if (footerAddress) footerAddress.innerText = `📍 Intake: ${settingsData.address}`;

    // Admin Panel Updates
    const adminTel = document.getElementById('settingTel');
    const adminEmail = document.getElementById('settingEmail');
    const adminAddress = document.getElementById('settingAddress');

    if (adminTel) adminTel.value = settingsData.tel;
    if (adminEmail) adminEmail.value = settingsData.email;
    if (adminAddress) adminAddress.value = settingsData.address;
}

function renderCategories() {
    const categoryOptions = categoriesData.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    
    // Update Select Elements
    document.getElementById('frontendFilterCases').innerHTML = `<option value="All">All Categories</option>${categoryOptions}`;
    document.getElementById('adminLeadFilter').innerHTML = `<option value="All">All Categories</option>${categoryOptions}`;
    document.getElementById('globalLeadCategory').innerHTML = `<option value="">-- Select Legal Category --</option>${categoryOptions}`;
    document.getElementById('newCaseCategory').innerHTML = `<option value="">Select Category</option>${categoryOptions}`;

    // Re-initialize custom dropdown UI styling
    if(window.initCustomSelects) window.initCustomSelects();

    // Render Admin Categories Table
    const catTableBody = document.querySelector('#adminCategoriesTable tbody');
    if (catTableBody) {
        if (categoriesData.length === 0) {
            catTableBody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:#94a3b8;">No categories added yet.</td></tr>`;
        } else {
            catTableBody.innerHTML = categoriesData.map(c => `
                <tr>
                    <td><strong>${c.name}</strong></td>
                    <td><button class="btn btn-danger btn-delete-cat" data-id="${c.id}" style="padding: 6px 12px; font-size: 0.85em;">Delete</button></td>
                </tr>
            `).join('');
        }

        catTableBody.querySelectorAll('.btn-delete-cat').forEach(btn => {
            btn.addEventListener('click', () => deleteCategory(btn.getAttribute('data-id')));
        });
    }
}

function renderPublicCases() {
    const gridContainer = document.getElementById('frontendCasesList');
    if (!gridContainer) return;

    const searchVal = document.getElementById('frontendSearchCases').value.toLowerCase();
    const filterVal = document.getElementById('frontendFilterCases').value;

    const filtered = casesData.filter(item => {
        const titleMatch = item.title ? item.title.toLowerCase().includes(searchVal) : false;
        const descMatch = item.description ? item.description.toLowerCase().includes(searchVal) : false;
        const matchesCategory = (filterVal === 'All' || item.category === filterVal);
        return (titleMatch || descMatch) && matchesCategory;
    });

    if (filtered.length === 0) {
        gridContainer.innerHTML = `<p style="grid-column: span 3; text-align: center; color: #64748b; padding: 40px 0;">No active cases matched your selected parameters.</p>`;
        return;
    }

    gridContainer.innerHTML = filtered.map(item => {
        const imageSrc = item.imageUrl || 'https://via.placeholder.com/400x250?text=Legal+Case';
        return `
            <div class="case-card" data-id="${item.id}">
                <div class="case-img-wrap">
                    <img src="${imageSrc}" alt="${item.category}" onerror="this.src='https://via.placeholder.com/400x250?text=Legal+Case'">
                </div>
                <div class="case-card-body">
                    <span class="case-category">${item.category}</span>
                    <h3>${item.title}</h3>
                    <p>${item.description.substring(0, 140)}${item.description.length > 140 ? '...' : ''}</p>
                    <div class="case-btn-group">
                        <button class="btn btn-view-detail" data-id="${item.id}">View Detail</button>
                        <button class="btn btn-secondary btn-tile-contact" data-category="${item.category}">Contact Us</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    gridContainer.querySelectorAll('.btn-view-detail').forEach(btn => {
        btn.addEventListener('click', () => showCaseDetailPage(btn.getAttribute('data-id')));
    });

    gridContainer.querySelectorAll('.btn-tile-contact').forEach(btn => {
        btn.addEventListener('click', () => forwardToContactWithCategory(btn.getAttribute('data-category')));
    });
}

function showCaseDetailPage(caseId) {
    const caseObj = casesData.find(c => c.id === caseId);
    if (!caseObj) return;

    const detailsContainer = document.getElementById('dynamicCaseDetailContainer');
    if (!detailsContainer) return;

    const imageSrc = caseObj.imageUrl || 'https://via.placeholder.com/1100x380?text=Investigation+Banner';

    detailsContainer.innerHTML = `
        <div class="details-banner">
            <img src="${imageSrc}" alt="${caseObj.category}" onerror="this.src='https://via.placeholder.com/1100x380?text=Investigation+Banner'">
        </div>
        <div class="details-content">
            <span class="case-category" style="margin-bottom: 15px;">${caseObj.category}</span>
            <h1>${caseObj.title}</h1>
            <div class="full-description">${caseObj.description}</div>
        </div>
    `;

    const globalSelect = document.getElementById('globalLeadCategory');
    if (globalSelect) {
        globalSelect.value = caseObj.category;
        if(window.syncCustomSelect) window.syncCustomSelect('globalLeadCategory');
    }

    if (typeof window.navigateToPage === 'function') window.navigateToPage('case-details');
}

function forwardToContactWithCategory(categoryName) {
    const globalSelect = document.getElementById('globalLeadCategory');
    if (globalSelect) {
        globalSelect.value = categoryName;
        if(window.syncCustomSelect) window.syncCustomSelect('globalLeadCategory');
    }
    if (typeof window.navigateToPage === 'function') window.navigateToPage('connect');
    
    const formSection = document.getElementById('globalContactSection');
    if(formSection) formSection.scrollIntoView({ behavior: 'smooth' });
}

function renderAdminDashboard() {
    const leadsTableBody = document.querySelector('#adminLeadsTable tbody');
    const leadFilter = document.getElementById('adminLeadFilter').value;
    
    if (leadsTableBody) {
        const filteredLeads = leadsData.filter(l => leadFilter === 'All' || l.category === leadFilter);
        if (filteredLeads.length === 0) {
            leadsTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8;">No lead records stored.</td></tr>`;
        } else {
            leadsTableBody.innerHTML = filteredLeads.map(l => `
                <tr>
                    <td><strong>${l.firstName} ${l.lastName}</strong></td>
                    <td><a href="mailto:${l.email}">${l.email}</a></td>
                    <td>${l.phone}</td>
                    <td><span class="case-category" style="background:#475569">${l.category}</span></td>
                    <td style="font-size:0.9em; max-width: 250px; white-space: pre-wrap;">${l.message}</td>
                    <td><button class="btn btn-danger btn-admin-delete-lead" data-id="${l.id}" style="padding: 6px 10px; font-size: 0.85em;">Delete</button></td>
                </tr>
            `).join('');
        }

        leadsTableBody.querySelectorAll('.btn-admin-delete-lead').forEach(btn => {
            btn.addEventListener('click', () => deleteLeadTracker(btn.getAttribute('data-id')));
        });
    }

    const casesTableBody = document.querySelector('#adminCasesTable tbody');
    if (casesTableBody) {
        if (casesData.length === 0) {
            casesTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#94a3b8;">No dynamic cases posted.</td></tr>`;
        } else {
            casesTableBody.innerHTML = casesData.map(c => `
                <tr>
                    <td><strong>${c.title}</strong></td>
                    <td><span class="case-category" style="background:#0f172a">${c.category}</span></td>
                    <td>
                        <div style="display:flex; gap: 8px;">
                            <button class="btn btn-warning btn-admin-edit" data-id="${c.id}" style="padding: 6px 12px; font-size: 0.85em;">Edit</button>
                            <button class="btn btn-danger btn-admin-delete" data-id="${c.id}" style="padding: 6px 12px; font-size: 0.85em;">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        casesTableBody.querySelectorAll('.btn-admin-edit').forEach(btn => {
            btn.addEventListener('click', () => loadCaseIntoAdminForm(btn.getAttribute('data-id')));
        });
        casesTableBody.querySelectorAll('.btn-admin-delete').forEach(btn => {
            btn.addEventListener('click', () => deleteCaseTracker(btn.getAttribute('data-id')));
        });
    }
}

// ==========================================
// ADMIN PANEL CRUD OPERATIONS
// ==========================================

function loadCaseIntoAdminForm(caseId) {
    const targetCase = casesData.find(c => c.id === caseId);
    if (!targetCase) return;

    document.getElementById('editCaseTargetId').value = targetCase.id;
    document.getElementById('newCaseTitle').value = targetCase.title;
    document.getElementById('newCaseCategory').value = targetCase.category;
    document.getElementById('newCaseImageUrl').value = targetCase.imageUrl || "";
    document.getElementById('newCaseDesc').value = targetCase.description;

    if(window.syncCustomSelect) window.syncCustomSelect('newCaseCategory');

    document.getElementById('adminFormHeadline').innerText = "⚡ Edit Case Parameters Mode";
    document.getElementById('adminFormSubmitBtn').innerText = "Save Modified Changes";
    document.getElementById('adminFormSubmitBtn').className = "btn btn-warning";
    document.getElementById('cancelEditCaseBtn').style.display = "inline-block";

    document.getElementById('addCaseForm').scrollIntoView({ behavior: 'smooth' });
}

function clearAdminCaseFormState() {
    document.getElementById('editCaseTargetId').value = "";
    document.getElementById('addCaseForm').reset();
    if(window.syncCustomSelect) window.syncCustomSelect('newCaseCategory');
    
    document.getElementById('adminFormHeadline').innerText = "Add New Case Investigation";
    document.getElementById('adminFormSubmitBtn').innerText = "Add Case to Website";
    document.getElementById('adminFormSubmitBtn').className = "btn";
    document.getElementById('cancelEditCaseBtn').style.display = "none";
}

function deleteCaseTracker(caseId) {
    window.customConfirm("Are you sure you want to completely erase this case profile from the tracking records?", async () => {
        try {
            await deleteDoc(doc(db, "cases", caseId));
            casesData = casesData.filter(c => c.id !== caseId);
            if(document.getElementById('editCaseTargetId').value === caseId) clearAdminCaseFormState();

            renderAdminDashboard();
            renderPublicCases();
            window.showToast("Case profile securely deleted from database.");
        } catch (error) {
            console.error("Deletion Error:", error);
            window.showToast("Server refused deletion request.", "error");
        }
    });
}

function deleteLeadTracker(leadId) {
    window.customConfirm("Are you sure you want to permanently delete this lead data?", async () => {
        try {
            await deleteDoc(doc(db, "leads", leadId));
            leadsData = leadsData.filter(l => l.id !== leadId);
            
            renderAdminDashboard();
            window.showToast("Lead successfully removed from the database.");
        } catch (error) {
            console.error("Lead Deletion Error:", error);
            window.showToast("Server refused deletion request.", "error");
        }
    });
}

function deleteCategory(catId) {
    window.customConfirm("Delete this category? Cases using this category will lose their filter association.", async () => {
        try {
            await deleteDoc(doc(db, "categories", catId));
            categoriesData = categoriesData.filter(c => c.id !== catId);
            
            renderCategories();
            renderPublicCases();
            renderAdminDashboard();
            window.showToast("Category successfully deleted.");
        } catch (error) {
            console.error("Category Deletion Error:", error);
            window.showToast("Server refused deletion request.", "error");
        }
    });
}

function exportLeadsToCSV() {
    if (leadsData.length === 0) {
        window.showToast("No structural data inside the collection to export.", "error");
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,First Name,Last Name,Email,Phone,Category,Message\n";
    leadsData.forEach(l => {
        let cleanMsg = l.message ? l.message.replace(/"/g, '""') : "";
        csvContent += `"${l.firstName}","${l.lastName}","${l.email}","${l.phone}","${l.category}","${cleanMsg}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `lawsuitfiles_leads_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
}

// ==========================================
// EVENT CONTROLLER BINDINGS
// ==========================================

document.addEventListener('DOMContentLoaded', () => {

    document.getElementById('frontendSearchCases').addEventListener('input', renderPublicCases);
    document.getElementById('frontendFilterCases').addEventListener('change', renderPublicCases);
    document.getElementById('adminLeadFilter').addEventListener('change', renderAdminDashboard);
    document.getElementById('exportCsvBtn').addEventListener('click', exportLeadsToCSV);
    document.getElementById('cancelEditCaseBtn').addEventListener('click', clearAdminCaseFormState);

    // 1. Submit Public Lead Form
    document.getElementById('globalContactForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.innerText = "Processing Security Handshake...";
        submitBtn.disabled = true;

        try {
            const newLead = {
                firstName: document.getElementById('globalLeadFirstName').value,
                lastName: document.getElementById('globalLeadLastName').value,
                email: document.getElementById('globalLeadEmail').value,
                phone: document.getElementById('globalLeadPhone').value,
                category: document.getElementById('globalLeadCategory').value,
                message: document.getElementById('globalLeadMessage').value,
                timestamp: new Date().toISOString()
            };

            const docRef = await addDoc(collection(db, "leads"), newLead);
            newLead.id = docRef.id;
            leadsData.push(newLead);
            
            this.reset();
            if(window.syncCustomSelect) window.syncCustomSelect('globalLeadCategory');
            
            window.showToast("Your secure information profile has been registered.");
            renderAdminDashboard();
        } catch (error) {
            console.error("Lead Generation Error:", error);
            window.showToast("Database intake rejected. Try again.", "error");
        } finally {
            submitBtn.innerText = "Submit Secure Consultation Request";
            submitBtn.disabled = false;
        }
    });

    // 2. Admin Login (Hardcoded as requested)
    document.getElementById('adminLoginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value.trim();

        if (email === "admin@gmail.com" && password === "admin1234") {
            document.getElementById('adminLoginBox').style.display = 'none';
            document.getElementById('adminDashboardBox').style.display = 'flex';
            window.showToast("Authentication confirmed. Access granted.");
            renderAdminDashboard();
        } else {
            window.showToast("Invalid clearance credentials.", "error");
        }
    });

    // 3. Admin Logout
    document.getElementById('adminLogoutBtn').addEventListener('click', () => {
        document.getElementById('adminLoginForm').reset();
        clearAdminCaseFormState();
        document.getElementById('adminDashboardBox').style.display = 'none';
        document.getElementById('adminLoginBox').style.display = 'block';
        document.getElementById('adminOverlay').style.display = 'none';
        window.showToast("Secure session terminated.");
    });

    // 4. Submit Admin Case (Create/Update)
    document.getElementById('addCaseForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const targetId = document.getElementById('editCaseTargetId').value;
        const titleVal = document.getElementById('newCaseTitle').value;
        const catVal = document.getElementById('newCaseCategory').value;
        const imgUrlVal = document.getElementById('newCaseImageUrl').value;
        const descVal = document.getElementById('newCaseDesc').value;

        const submitBtn = document.getElementById('adminFormSubmitBtn');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = "Updating Database...";
        submitBtn.disabled = true;

        try {
            if (targetId) {
                // Update Existing
                await updateDoc(doc(db, "cases", targetId), {
                    title: titleVal, category: catVal, imageUrl: imgUrlVal, description: descVal
                });
                
                const idx = casesData.findIndex(c => c.id === targetId);
                if(idx !== -1) {
                    casesData[idx] = { ...casesData[idx], title: titleVal, category: catVal, imageUrl: imgUrlVal, description: descVal };
                }
                window.showToast("Case parameters successfully modified.");
                clearAdminCaseFormState();
            } else {
                // Insert New
                const newCaseRef = await addDoc(collection(db, "cases"), {
                    title: titleVal, category: catVal, imageUrl: imgUrlVal, description: descVal, createdAt: new Date().toISOString()
                });
                casesData.push({ id: newCaseRef.id, title: titleVal, category: catVal, imageUrl: imgUrlVal, description: descVal });
                this.reset();
                if(window.syncCustomSelect) window.syncCustomSelect('newCaseCategory');
                window.showToast("New investigation active on frontend database.");
            }
            renderAdminDashboard();
            renderPublicCases();
        } catch (error) {
            console.error("Database Write Error:", error);
            window.showToast("Failed to modify database collection.", "error");
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });

    // 5. Submit Global Settings
    document.getElementById('updateSettingsForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.innerText = "Syncing Settings...";
        submitBtn.disabled = true;
        
        const newSettings = {
            tel: document.getElementById('settingTel').value,
            email: document.getElementById('settingEmail').value,
            address: document.getElementById('settingAddress').value
        };

        try {
            await setDoc(doc(db, "settings", "global"), newSettings);
            settingsData = newSettings;
            renderSettings();
            window.showToast("Contact indices successfully updated!");
        } catch (error) {
            console.error("Settings Update Error:", error);
            window.showToast("Failed to lock global settings.", "error");
        } finally {
            submitBtn.innerText = "Save Updates Globally";
            submitBtn.disabled = false;
        }
    });

    // 6. Add New Category
    document.getElementById('addCategoryForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        
        const catName = document.getElementById('newCategoryName').value.trim();

        try {
            const newCatRef = await addDoc(collection(db, "categories"), { name: catName });
            categoriesData.push({ id: newCatRef.id, name: catName });
            
            this.reset();
            renderCategories();
            window.showToast("New category successfully added.");
        } catch (error) {
            console.error("Category Addition Error:", error);
            window.showToast("Failed to add new category.", "error");
        } finally {
            submitBtn.disabled = false;
        }
    });

    // Mount initial Firebase Fetch
    fetchDatabaseRecords();
});
