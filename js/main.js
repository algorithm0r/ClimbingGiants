/**
 * main.js
 * Main JavaScript file for the Climbing Giants website
 */

document.addEventListener('DOMContentLoaded', function() {
    // Mobile navigation toggle
    const setupMobileNav = () => {
        // This function will be implemented when we add the mobile menu button
    };

    // Project filter functionality
    const setupProjectFilter = () => {
        const categoryButtons = document.querySelectorAll('.category-btn');
        const projectCards = document.querySelectorAll('.project-card');
        
        categoryButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                categoryButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked button
                button.classList.add('active');
                
                const category = button.textContent.toLowerCase();
                
                // Show all projects if "All" is selected
                if (category === 'all') {
                    projectCards.forEach(card => {
                        card.style.display = 'block';
                    });
                    return;
                }
                
                // Otherwise, filter by category
                projectCards.forEach(card => {
                    // Check if card has the selected category in its tags
                    const tags = card.querySelectorAll('.tag');
                    let hasCategory = false;
                    
                    tags.forEach(tag => {
                        if (tag.textContent.toLowerCase() === category) {
                            hasCategory = true;
                        }
                    });
                    
                    // Show or hide the card based on category match
                    if (hasCategory) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    };

    // Add glow effect to items when scrolled into view
    const setupScrollEffects = () => {
        const animateOnScroll = () => {
            const elements = document.querySelectorAll('.project-card, .featured-item, .about-image');
            
            elements.forEach(element => {
                const elementTop = element.getBoundingClientRect().top;
                const elementVisible = 150;
                
                if (elementTop < window.innerHeight - elementVisible) {
                    element.classList.add('active');
                }
            });
        };
        
        // Run once on load
        animateOnScroll();
        
        // Add event listener for scroll
        window.addEventListener('scroll', animateOnScroll);
    };

    // Form validation for newsletter
    const setupFormValidation = () => {
        const newsletterForm = document.querySelector('.newsletter-form');
        
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const emailInput = newsletterForm.querySelector('input[type="email"]');
                const email = emailInput.value.trim();
                
                // Simple email validation
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                
                if (!emailRegex.test(email)) {
                    // Show error
                    emailInput.style.borderColor = 'red';
                    emailInput.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.5)';
                    
                    // Reset after 3 seconds
                    setTimeout(() => {
                        emailInput.style.borderColor = '';
                        emailInput.style.boxShadow = '';
                    }, 3000);
                    
                    return false;
                }
                
                // Here you would typically send the form data to a server
                // For now, we'll just show a success message
                emailInput.value = '';
                alert('Thank you for subscribing!');
            });
        }
    };

    // Initialize all functions
    setupProjectFilter();
    setupScrollEffects();
    setupFormValidation();
});
