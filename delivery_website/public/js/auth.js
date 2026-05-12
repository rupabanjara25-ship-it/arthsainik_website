let isLoginMode = true;
if (typeof API_BASE_URL === 'undefined') {
    const { protocol, hostname, port, origin } = window.location;
    const isLocalPreview = protocol === 'file:' || ['localhost', '127.0.0.1'].includes(hostname);

    window.API_BASE_URL = isLocalPreview && port !== '5000'
        ? `http://${hostname || '127.0.0.1'}:5000/api`
        : `${origin}/api`;
}

function getStoredUserInfo() {
    try {
        const storedUser = JSON.parse(localStorage.getItem('userInfo'));
        return storedUser && typeof storedUser === 'object' ? storedUser : null;
    } catch (error) {
        console.error('Error reading user info from storage', error);
        localStorage.removeItem('userInfo');
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('authForm');
    ensureSignupFields();
    if (authForm) {
        authForm.addEventListener('submit', handleAuth);
    }
});

function ensureSignupFields() {
    const authName = document.getElementById('authName');
    const authForm = document.getElementById('authForm');
    if (!authName || !authForm || document.getElementById('authPhone')) {
        return;
    }

    authName.placeholder = 'Full Name';

    const phoneInput = document.createElement('input');
    phoneInput.type = 'text';
    phoneInput.id = 'authPhone';
    phoneInput.placeholder = 'Phone Number';
    phoneInput.autocomplete = 'tel';
    phoneInput.inputMode = 'tel';
    phoneInput.className = 'hidden auth-extra-field';

    const addressInput = document.createElement('textarea');
    addressInput.id = 'authAddress';
    addressInput.placeholder = 'Address';
    addressInput.autocomplete = 'street-address';
    addressInput.rows = 3;
    addressInput.className = 'hidden auth-extra-field auth-address-field';

    const helper = document.createElement('p');
    helper.id = 'authSignupHint';
    helper.className = 'auth-helper-text hidden';
    helper.textContent = 'Phone and address help us prefill checkout faster.';

    authName.insertAdjacentElement('afterend', phoneInput);
    phoneInput.insertAdjacentElement('afterend', addressInput);
    addressInput.insertAdjacentElement('afterend', helper);
}

function checkAuthState() {
    const user = getStoredUserInfo();
    const authSection = document.getElementById('authSection');
    const authSectionHam = document.getElementById('authSectionHamburger') || document.getElementById('mobileAuthSection');
    
    if (!authSection && !authSectionHam) {
        return; 
    }
    
    if (user) {
        if(user.role === 'admin') {
            const adminHTMLHam = `<a href="admin.html" class="hamburger-menu-item"><i class="fas fa-user-shield"></i> Admin Panel</a>`;
            const adminHTMLNav = `<button type="button" class="nav-item-btn" onclick="window.location.href='admin.html'"><i class="fas fa-user-shield"></i> <span>Admin</span></button>`;
            
            if (authSectionHam) authSectionHam.innerHTML = adminHTMLHam;
            if (authSection) authSection.innerHTML = adminHTMLNav;
        } else {
            const profileContent = user.profileImage 
                ? `<img src="${window.resolveAssetUrl ? window.resolveAssetUrl(user.profileImage) : user.profileImage}" style="width: 100%; height: 100%; object-fit: cover;">`
                : `${user.name ? user.name.charAt(0).toUpperCase() : 'U'}`;

            // Mobile Hamburger Version
            if (authSectionHam) {
                authSectionHam.innerHTML = `
                    <a href="#" class="hamburger-menu-item" onclick="toggleProfileDrawer(); toggleHamburgerMenu();">
                        <div class="user-avatar-mobile" style="width: 24px; height: 24px; font-size: 0.7rem; margin-right: 10px; display: inline-flex;">
                            ${profileContent}
                        </div>
                        <span>My Profile</span>
                    </a>
                `;
            }

            // Desktop Navbar Version
            if (authSection) {
                const profileImgDesktop = user.profileImage 
                    ? `<img src="${window.resolveAssetUrl ? window.resolveAssetUrl(user.profileImage) : user.profileImage}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; margin-right: 8px;">`
                    : `<i class="fas fa-user-circle"></i>`;

                authSection.innerHTML = `
                    <button type="button" class="nav-item-btn" onclick="toggleProfileDrawer()">
                        ${profileImgDesktop} <span>Profile</span>
                    </button>
                `;
            }
        }
        if (typeof renderProfileDrawer === 'function') renderProfileDrawer();
    } else {
        const loginHTMLHam = `<a href="#" class="hamburger-menu-item" onclick="openLoginModal(); toggleHamburgerMenu();"><i class="fas fa-user"></i> Login / Register</a>`;
        const loginHTMLNav = `<button type="button" class="nav-item-btn" onclick="openLoginModal()"><i class="fas fa-user"></i> <span>Login</span></button>`;
        
        if (authSectionHam) authSectionHam.innerHTML = loginHTMLHam;
        if (authSection) authSection.innerHTML = loginHTMLNav;
    }
}

function openLoginModal() {
    isLoginMode = true;
    const authForm = document.getElementById('authForm');
    const nameInput = document.getElementById('authName');
    const phoneInput = document.getElementById('authPhone');
    const addressInput = document.getElementById('authAddress');
    const signupHint = document.getElementById('authSignupHint');
    const title = document.getElementById('authTitle');
    const toggleLink = document.getElementById('authToggleLink');
    const submitBtn = document.getElementById('authSubmitBtn');
    const forgotContainer = document.getElementById('forgotPasswordLinkContainer');

    if (authForm) {
        authForm.reset();
    }
    if (nameInput) {
        nameInput.classList.add('hidden');
        nameInput.required = false;
    }
    if (phoneInput) {
        phoneInput.classList.add('hidden');
        phoneInput.required = false;
    }
    if (addressInput) {
        addressInput.classList.add('hidden');
        addressInput.required = false;
    }
    if (signupHint) {
        signupHint.classList.add('hidden');
    }
    if (title) title.innerText = 'Login';
    if (toggleLink) toggleLink.innerText = 'Create an account';
    if (submitBtn) submitBtn.innerText = 'Login';
    if (forgotContainer) forgotContainer.style.display = 'block';
    
    const profileUpload = document.getElementById('profileImageUploadContainer');
    if (profileUpload) profileUpload.classList.add('hidden');

    document.getElementById('authModal').classList.remove('hidden');
}

function closeLoginModal() {
    document.getElementById('authModal').classList.add('hidden');
}

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('authModal');
  if (event.target == modal) {
    closeLoginModal();
  }
}

function toggleAuthMode(event) {
    if (event) {
        event.preventDefault();
    }

    isLoginMode = !isLoginMode;
    const nameInput = document.getElementById('authName');
    const phoneInput = document.getElementById('authPhone');
    const addressInput = document.getElementById('authAddress');
    const signupHint = document.getElementById('authSignupHint');
    const title = document.getElementById('authTitle');
    const toggleLink = document.getElementById('authToggleLink');
    const submitBtn = document.getElementById('authSubmitBtn');
    const forgotContainer = document.getElementById('forgotPasswordLinkContainer');

    if (isLoginMode) {
        nameInput.classList.add('hidden');
        nameInput.required = false;
        nameInput.value = '';
        if (phoneInput) {
            phoneInput.classList.add('hidden');
            phoneInput.required = false;
            phoneInput.value = '';
        }
        if (addressInput) {
            addressInput.classList.add('hidden');
            addressInput.required = false;
            addressInput.value = '';
        }
        if (signupHint) {
            signupHint.classList.add('hidden');
        }
        title.innerText = 'Login';
        toggleLink.innerText = 'Create an account';
        submitBtn.innerText = 'Login';
        forgotContainer.style.display = 'block';
    } else {
        nameInput.classList.remove('hidden');
        nameInput.required = true;
        if (phoneInput) {
            phoneInput.classList.remove('hidden');
            phoneInput.required = true;
        }
        if (addressInput) {
            addressInput.classList.remove('hidden');
            addressInput.required = true;
        }
        if (signupHint) {
            signupHint.classList.remove('hidden');
        }
        title.innerText = 'Sign Up';
        toggleLink.innerText = 'Already have an account? Login';
        submitBtn.innerText = 'Sign Up';
        forgotContainer.style.display = 'none';

        const profileUpload = document.getElementById('profileImageUploadContainer');
        if (profileUpload) profileUpload.classList.remove('hidden');
    }

    return false;
}

async function handleAuth(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('authSubmitBtn');
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const name = document.getElementById('authName').value.trim();
    const phone = document.getElementById('authPhone')?.value.trim() || '';
    const address = document.getElementById('authAddress')?.value.trim() || '';

    const endpoint = isLoginMode ? '/auth/login' : '/auth/register';
    
    let body;
    let headers = {};

    if (isLoginMode) {
        body = JSON.stringify({ email, password });
        headers['Content-Type'] = 'application/json';
    } else {
        const formData = new FormData();
        formData.append('email', email);
        formData.append('password', password);
        formData.append('name', name);
        formData.append('phone', phone);
        formData.append('address', address);
        
        const fileInput = document.getElementById('authProfileImage');
        if (fileInput && fileInput.files[0]) {
            formData.append('profileImage', fileInput.files[0]);
        } else {
            alert('Please upload a profile image.');
            return false;
        }
        body = formData;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = isLoginMode ? 'Logging in...' : 'Creating...';

        if (!isLoginMode && !name) {
            alert('Please enter your name.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign Up';
            return false;
        }

        if (!isLoginMode && !phone) {
            alert('Please enter your phone number.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign Up';
            return false;
        }

        if (!isLoginMode && !address) {
            alert('Please enter your address.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign Up';
            return false;
        }

        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: headers,
            body: body
        });

        const data = await res.json().catch(() => ({ message: 'Unexpected server response' }));

        if (res.ok) {
            localStorage.setItem('userInfo', JSON.stringify(data));
            closeLoginModal();
            checkAuthState();
            
            if(data.role === 'admin') {
                window.location.href = 'admin.html';
            }
        } else {
            alert(data.message || 'Authentication failed');
        }
    } catch (err) {
        console.error(err);
        alert(`Unable to reach the server at ${API_BASE_URL}. Please make sure the backend is running on port 5000.`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = isLoginMode ? 'Login' : 'Sign Up';
    }

    return false;
}

function logout() {
    localStorage.removeItem('userInfo');
    checkAuthState();
    window.location.href = 'index.html';
}

function showForgotPassword(event) {
    if (event) {
        event.preventDefault();
    }

    const email = prompt("Enter your registered email address:");
    if (email) {
        fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            if(data.message === 'OTP sent to email (check console)') {
                const otp = prompt("Enter the 6-digit OTP you received:");
                if(otp) {
                    const newPassword = prompt("Enter your new password:");
                    if(newPassword) {
                        fetch(`${API_BASE_URL}/auth/reset-password`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, otp, newPassword })
                        })
                        .then(r => r.json())
                        .then(d => alert(d.message));
                    }
                }
            }
        })
        .catch(err => alert('Error sending OTP'));
    }

    return false;
}

function toggleProfileDrawer() {
    const drawer = document.getElementById('profileDrawer');
    const overlay = document.getElementById('profileDrawerOverlay');
    if (!drawer) return;

    const isOpen = drawer.classList.contains('open');
    if (!isOpen) {
        renderProfileDrawer();
        drawer.classList.add('open');
        overlay.style.display = 'block';
        setTimeout(() => overlay.style.opacity = '1', 10);
        document.body.style.overflow = 'hidden';
    } else {
        drawer.classList.remove('open');
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }
}

function renderProfileDrawer() {
    const user = getStoredUserInfo();
    if (!user) return;

    const nameEl = document.getElementById('drawerProfileName');
    const emailEl = document.getElementById('drawerProfileEmail');
    if (nameEl) nameEl.innerText = user.name || 'User';
    if (emailEl) emailEl.innerText = user.email || '';
    
    const phoneEl = document.getElementById('drawerProfilePhone');
    if (phoneEl) {
        phoneEl.innerHTML = `
            ${user.phone || 'Not provided'} 
            <button onclick="editPhone()" style="background: none; color: var(--primary-color); font-size: 0.75rem; margin-left: 10px;"><i class="fas fa-edit"></i> Edit</button>
        `;
    }
    
    const addressContainer = document.getElementById('drawerProfileAddress');
    if (addressContainer) {
        const addresses = user.addresses || [];
        let html = '';
        if (addresses.length === 0) {
            html = '<p style="color: #888; font-size: 0.85rem;">No addresses saved.</p>';
        } else {
            html = addresses.map((addr, idx) => `
                <div class="profile-address-item" style="background: #fff; border: 1px solid #eee; padding: 10px; border-radius: 8px; margin-bottom: 8px; position: relative;">
                    <span style="font-size: 0.7rem; font-weight: 700; color: var(--primary-color); text-transform: uppercase;">${addr.label} ${addr.isDefault ? '(Default)' : ''}</span>
                    <p style="font-size: 0.85rem; margin: 4px 0; color: #333;">${addr.address}</p>
                    <div style="display: flex; gap: 10px; margin-top: 5px;">
                        <button onclick="editAddress(${idx})" style="background: none; color: var(--primary-color); font-size: 0.75rem; padding: 0;"><i class="fas fa-edit"></i> Edit</button>
                        ${!addr.isDefault ? `<button onclick="setDefaultAddress(${idx})" style="background: none; color: var(--primary-color); font-size: 0.75rem; padding: 0;">Set Default</button>` : ''}
                        <button onclick="removeAddress(${idx})" style="background: none; color: #e74c3c; font-size: 0.75rem; padding: 0;">Delete</button>
                    </div>
                </div>
            `).join('');
        }
        
        html += `
            <button onclick="showAddAddressForm()" style="width: 100%; padding: 10px; background: #f8f9fa; border: 1px dashed #ccc; border-radius: 8px; font-size: 0.85rem; margin-top: 10px; color: #666;">
                <i class="fas fa-plus-circle"></i> Add New Address
            </button>
            <div id="addAddressForm" class="hidden" style="margin-top: 10px; padding: 15px; background: #fff; border: 1px solid #ddd; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <h4 style="margin-bottom: 10px; font-size: 0.9rem;">Add New Address</h4>
                <input type="text" id="newAddrLabel" placeholder="Label (e.g. Home, Work)" style="width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #eee; border-radius: 8px; font-size: 0.85rem;">
                <textarea id="newAddrText" placeholder="Full Address (Jashpur only)" rows="3" style="width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #eee; border-radius: 8px; font-size: 0.85rem; resize: none;"></textarea>
                <div style="display: flex; gap: 10px;">
                    <button onclick="saveNewAddress()" style="flex: 1; padding: 10px; background: var(--primary-color); color: #fff; border-radius: 8px; font-weight: 600; font-size: 0.85rem;">Save Address</button>
                    <button onclick="document.getElementById('addAddressForm').classList.add('hidden')" style="padding: 10px; background: #eee; border-radius: 8px; font-size: 0.85rem;">Cancel</button>
                </div>
            </div>
        `;
        addressContainer.innerHTML = html;
    }
    
    const imgEl = document.getElementById('drawerProfileImg');
    if (user.profileImage) {
        imgEl.src = window.resolveAssetUrl ? window.resolveAssetUrl(user.profileImage) : user.profileImage;
    } else {
        imgEl.src = 'https://via.placeholder.com/150';
    }
}

function showAddAddressForm() {
    const form = document.getElementById('addAddressForm');
    if (form) form.classList.remove('hidden');
}

async function saveNewAddress() {
    const label = document.getElementById('newAddrLabel').value.trim();
    const address = document.getElementById('newAddrText').value.trim();
    
    if (!label || !address) {
        alert('Please provide both label and address');
        return;
    }

    const user = getStoredUserInfo();
    if (!user) return;

    const addresses = user.addresses || [];
    addresses.push({ label, address, isDefault: addresses.length === 0 });

    await updateAddressesOnServer(addresses);
}

async function removeAddress(index) {
    if (!confirm('Are you sure you want to delete this address?')) return;
    
    const user = getStoredUserInfo();
    if (!user) return;

    const addresses = user.addresses || [];
    const wasDefault = addresses[index].isDefault;
    addresses.splice(index, 1);
    
    if (wasDefault && addresses.length > 0) {
        addresses[0].isDefault = true;
    }

    await updateAddressesOnServer(addresses);
}

async function setDefaultAddress(index) {
    const user = getStoredUserInfo();
    if (!user) return;

    const addresses = user.addresses || [];
    addresses.forEach((addr, i) => {
        addr.isDefault = (i === index);
    });

    await updateAddressesOnServer(addresses);
}

async function editPhone() {
    const user = getStoredUserInfo();
    if (!user) return;

    const newPhone = prompt('Enter your phone number:', user.phone || '');
    if (newPhone === null) return; // Cancelled
    
    if (!newPhone.trim()) {
        alert('Phone number cannot be empty');
        return;
    }

    const formData = new FormData();
    formData.append('name', user.name);
    formData.append('phone', newPhone.trim());

    try {
        const res = await fetch(`${API_BASE_URL}/auth/profile`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${user.token}` },
            body: formData
        });

        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('userInfo', JSON.stringify(data));
            renderProfileDrawer();
            alert('Phone number updated!');
        } else {
            alert(data.message || 'Update failed');
        }
    } catch (err) {
        console.error(err);
        alert('Error updating phone number');
    }
}

async function editAddress(index) {
    const user = getStoredUserInfo();
    if (!user) return;

    const addresses = user.addresses || [];
    const addr = addresses[index];

    const newLabel = prompt('Enter label (Home, Work, etc.):', addr.label);
    if (newLabel === null) return;

    const newAddress = prompt('Enter full address:', addr.address);
    if (newAddress === null) return;

    if (!newLabel.trim() || !newAddress.trim()) {
        alert('Label and address cannot be empty');
        return;
    }

    addresses[index] = {
        ...addr,
        label: newLabel.trim(),
        address: newAddress.trim()
    };

    await updateAddressesOnServer(addresses);
}

async function updateAddressesOnServer(addresses) {
    const user = getStoredUserInfo();
    const formData = new FormData();
    formData.append('name', user.name);
    formData.append('addresses', JSON.stringify(addresses));

    try {
        const res = await fetch(`${API_BASE_URL}/auth/profile`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${user.token}` },
            body: formData
        });

        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('userInfo', JSON.stringify(data));
            renderProfileDrawer();
            alert('Addresses updated successfully!');
        } else {
            alert(data.message || 'Update failed');
        }
    } catch (err) {
        console.error(err);
        alert('Error updating addresses');
    }
}

async function updateProfileImage(input) {
    if (!input.files || !input.files[0]) return;

    const user = getStoredUserInfo();
    if (!user) return;

    const formData = new FormData();
    formData.append('profileImage', input.files[0]);
    formData.append('name', user.name);

    try {
        const res = await fetch(`${API_BASE_URL}/auth/profile`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${user.token}` },
            body: formData
        });

        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('userInfo', JSON.stringify(data));
            renderProfileDrawer();
            checkAuthState();
            alert('Profile image updated!');
        } else {
            alert(data.message || 'Update failed');
        }
    } catch (err) {
        console.error(err);
        alert('Error updating profile image');
    }
}
