// Add smooth scrolling to all links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Navbar scroll effect
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Mobile menu toggle
const menuToggle = document.querySelector('.navbar-toggler');
const menu = document.querySelector('.navbar-menu');

menuToggle.addEventListener('click', () => {
    menu.classList.toggle('active');
    menuToggle.classList.toggle('active');
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !menuToggle.contains(e.target)) {
        menu.classList.remove('active');
        menuToggle.classList.remove('active');
    }
});

// Lazy loading for images
document.addEventListener('DOMContentLoaded', function() {
    const lazyImages = [].slice.call(document.querySelectorAll('img.lazy'));
    
    if ('IntersectionObserver' in window) {
        let lazyImageObserver = new IntersectionObserver(function(entries, observer) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    let lazyImage = entry.target;
                    lazyImage.src = lazyImage.dataset.src;
                    lazyImage.classList.remove('lazy');
                    lazyImageObserver.unobserve(lazyImage);
                }
            });
        });

        lazyImages.forEach(function(lazyImage) {
            lazyImageObserver.observe(lazyImage);
        });
    }
});

// Add animation on scroll
function animateOnScroll() {
    const elements = document.querySelectorAll('.fade-in, .slide-up, .slide-left, .slide-right');
    
    elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        
        if (elementTop < windowHeight - 100) {
            element.classList.add('animate');
        }
    });
}

// Initial check
animateOnScroll();

// Check on scroll
window.addEventListener('scroll', animateOnScroll);

// Search functionality
const searchInput = document.querySelector('.search-input');
if (searchInput) {
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            const searchTerm = this.value.trim();
            if (searchTerm) {
                // Implement your search functionality here
                console.log('Searching for:', searchTerm);
                // Example: window.location.href = `/search?q=${encodeURIComponent(searchTerm)}`;
            }
        }
    });
}
