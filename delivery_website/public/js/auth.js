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
    
    if (!authSection) {
        return; // Page doesn't have auth section
    }
    
    if (user) {
        if(user.role === 'admin') {
            authSection.innerHTML = `
                <div class="auth-chip auth-chip-admin">
                    <span class="auth-user-name">Hello, Admin</span>
                    <button class="btn-primary auth-action-btn" onclick="window.location.href='admin.html'">Dashboard</button>
                    <button class="btn-primary auth-icon-btn auth-logout-btn" onclick="logout()" aria-label="Logout"><i class="fas fa-sign-out-alt"></i></button>
                </div>
            `;
        } else {
            authSection.innerHTML = `
                <div class="auth-chip">
                    <span class="auth-user-name">Hi, ${user.name}</span>
                    <button class="btn-primary auth-icon-btn auth-logout-btn" onclick="logout()" aria-label="Logout"><i class="fas fa-sign-out-alt"></i></button>
                </div>
            `;
        }
    } else {
         authSection.innerHTML = `<button class="btn-primary auth-login-btn" onclick="openLoginModal()"><i class="fas fa-user"></i> <span>Login</span></button>`;
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
    const payload = isLoginMode ? { email, password } : { name, email, password, phone, address };

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = isLoginMode ? 'Logging in...' : 'Creating...';

        if (!isLoginMode && !name) {
            alert('Please enter your name.');
            return false;
        }

        if (!isLoginMode && !phone) {
            alert('Please enter your phone number.');
            return false;
        }

        if (!isLoginMode && !address) {
            alert('Please enter your address.');
            return false;
        }

        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
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
