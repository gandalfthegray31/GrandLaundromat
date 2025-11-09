// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
    });
});

// Smooth Scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 70;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// Set minimum date to today for date inputs
const dropOffDateInput = document.getElementById('dropOffDate');
const pickupDateInput = document.getElementById('pickupDate');
const today = new Date().toISOString().split('T')[0];
dropOffDateInput.setAttribute('min', today);
pickupDateInput.setAttribute('min', today);

// Handle service type changes to show/hide relevant fields
const serviceTypeSelect = document.getElementById('serviceType');
const loadSizeGroup = document.getElementById('loadSizeGroup');
const pickupAddressGroup = document.getElementById('pickupAddressGroup');
const pickupDateGroup = document.getElementById('pickupDateGroup');

serviceTypeSelect.addEventListener('change', (e) => {
    const serviceType = e.target.value;
    
    // Show load size for commercial and pickup services
    if (serviceType === 'commercial' || serviceType === 'pickup') {
        loadSizeGroup.style.display = 'block';
        document.getElementById('loadSize').required = true;
    } else {
        loadSizeGroup.style.display = 'none';
        document.getElementById('loadSize').required = false;
        document.getElementById('loadSize').value = '';
    }
    
    // Show pickup address only for pickup service
    if (serviceType === 'pickup') {
        pickupAddressGroup.style.display = 'block';
        document.getElementById('pickupAddress').required = true;
    } else {
        pickupAddressGroup.style.display = 'none';
        document.getElementById('pickupAddress').required = false;
        document.getElementById('pickupAddress').value = '';
    }
    
    // Hide pickup date for self-service (they pick up themselves)
    if (serviceType === 'self-service') {
        pickupDateGroup.style.display = 'none';
        document.getElementById('pickupDate').required = false;
        document.getElementById('pickupDate').value = '';
    } else {
        pickupDateGroup.style.display = 'block';
        document.getElementById('pickupDate').required = true;
    }
});

// Schedule Form Handling
const scheduleForm = document.getElementById('scheduleForm');
const formMessage = document.getElementById('formMessage');

// API endpoint - update this to your deployed backend URL
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000/api/appointment' 
    : '/api/appointment';

scheduleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form data
    const serviceType = document.getElementById('serviceType').value;
    const formData = {
        name: document.getElementById('name').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        serviceType: serviceType,
        loadSize: document.getElementById('loadSize').value,
        pickupAddress: document.getElementById('pickupAddress').value.trim(),
        dropOffDate: document.getElementById('dropOffDate').value,
        pickupDate: document.getElementById('pickupDate').value,
        specialInstructions: document.getElementById('specialInstructions').value.trim()
    };
    
    // Validate form
    if (!formData.name || !formData.phone || !formData.serviceType || !formData.dropOffDate) {
        showMessage('Please fill in all required fields.', 'error');
        return;
    }
    
    // Validate service-specific fields
    if ((formData.serviceType === 'commercial' || formData.serviceType === 'pickup') && !formData.loadSize) {
        showMessage('Please select a load size for this service.', 'error');
        return;
    }
    
    if (formData.serviceType === 'pickup' && !formData.pickupAddress) {
        showMessage('Please provide a pickup address for pickup service.', 'error');
        return;
    }
    
    if (formData.serviceType !== 'self-service' && !formData.pickupDate) {
        showMessage('Please select a pickup date.', 'error');
        return;
    }
    
    // Validate phone format (basic validation)
    const phoneRegex = /^[\d\s\-\(\)]+$/;
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (!phoneRegex.test(formData.phone) || phoneDigits.length < 10) {
        showMessage('Please enter a valid phone number.', 'error');
        return;
    }
    
    // Validate dates (only if pickup date is provided)
    if (formData.pickupDate && new Date(formData.pickupDate) < new Date(formData.dropOffDate)) {
        showMessage('Pickup date must be on or after drop-off/service date.', 'error');
        return;
    }
    
    // Disable submit button
    const submitButton = scheduleForm.querySelector('.submit-button');
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';
    
    try {
        // Send data to backend
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('Thank you! Your service request has been received. We will contact you shortly to confirm your booking.', 'success');
            scheduleForm.reset();
            // Reset form visibility
            loadSizeGroup.style.display = 'none';
            pickupAddressGroup.style.display = 'none';
            pickupDateGroup.style.display = 'block';
        } else {
            showMessage(result.error || 'Something went wrong. Please try again later.', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Unable to send request. Please check your connection and try again.', 'error');
    } finally {
        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.textContent = 'Schedule Appointment';
        formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
});

function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;
    
    // Hide message after 5 seconds
    setTimeout(() => {
        formMessage.className = 'form-message';
    }, 5000);
}

// Add active class to navigation links on scroll
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section[id]');
    const scrollY = window.pageYOffset;
    
    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');
        
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            document.querySelectorAll('.nav-menu a').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
});

// Add fade-in animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe gallery items and form
document.querySelectorAll('.gallery-item, .schedule-form, .contact-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

