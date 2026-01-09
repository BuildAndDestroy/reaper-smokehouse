// Main JavaScript for Reaper's Smokehouse

// Dark Mode Toggle Functionality
function initDarkMode() {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const html = document.documentElement;
    
    // Get saved theme preference or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    // Toggle theme on button click
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
            updateNavbarOnScroll(); // Update navbar styling
        });
    }
    
    function updateThemeIcon(theme) {
        if (themeIcon) {
            themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    }
}

// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function() {
    // Initialize dark mode first
    initDarkMode();
    
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Toggle mobile menu
    if (navToggle) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }

    // Close mobile menu when clicking on a link (but not theme toggle)
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            // Don't close menu if clicking theme toggle
            if (!this.closest('.theme-toggle')) {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            }
        });
    });
    
    // Don't close menu when clicking theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        const isClickInsideNav = navMenu.contains(event.target);
        const isClickOnToggle = navToggle.contains(event.target);
        const isClickOnThemeToggle = themeToggle && themeToggle.contains(event.target);
        
        if (!isClickInsideNav && !isClickOnToggle && !isClickOnThemeToggle && navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        }
    });

    // Smooth scrolling for navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetSection = document.getElementById(targetId);
                
                if (targetSection) {
                    const navHeight = document.querySelector('.navbar').offsetHeight;
                    const targetPosition = targetSection.offsetTop - navHeight;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // Navbar background on scroll
    const navbar = document.getElementById('navbar');
    let lastScroll = 0;
    
    function updateNavbarOnScroll() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 50) {
            if (currentTheme === 'dark') {
                navbar.style.backgroundColor = 'rgba(26, 26, 26, 0.95)';
            } else {
                navbar.style.backgroundColor = 'rgba(44, 24, 16, 0.95)';
            }
            navbar.style.backdropFilter = 'blur(10px)';
        } else {
            navbar.style.backgroundColor = '';
            navbar.style.backdropFilter = 'none';
        }
    }

    window.addEventListener('scroll', function() {
        updateNavbarOnScroll();
        lastScroll = window.pageYOffset;
    });
    
    // Update on initial load
    updateNavbarOnScroll();

    // Contact Form Handling
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitButton = contactForm.querySelector('.submit-button');
            const originalButtonText = submitButton.textContent;
            
            // Disable button and show loading state
            submitButton.disabled = true;
            submitButton.textContent = 'Sending...';
            
            // Get form data
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                message: document.getElementById('message').value
            };

            try {
                // Send to backend API
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();
                
                if (response.ok) {
                    // Show success message
                    alert(result.message || 'Thank you for your message! We will get back to you soon.');
                    // Reset form
                    contactForm.reset();
                } else {
                    // Handle validation errors
                    if (result.errors && Array.isArray(result.errors)) {
                        let errorMessage = 'Please fix the following errors:\n';
                        result.errors.forEach(err => {
                            errorMessage += `- ${err.field}: ${err.message}\n`;
                        });
                        alert(errorMessage);
                    } else {
                        alert(result.message || 'Failed to send message. Please try again later.');
                    }
                }
            } catch (error) {
                // Don't expose internal error details to users
                console.error('Error submitting form:', error);
                alert('Sorry, there was an error sending your message. Please try again later.');
            } finally {
                // Re-enable button
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }

    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe all cards and sections
    const animatedElements = document.querySelectorAll('.offer-card, .feature-card, .about-text');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

