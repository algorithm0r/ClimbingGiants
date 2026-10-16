/**
 * main.js
 * Main JavaScript file for the Climbing Giants website
 */

document.addEventListener('DOMContentLoaded', function () {
    // Mobile navigation toggle
    const setupMobileNav = () => {
        // This function will be implemented when we add the mobile menu button
    };

    // Project filter functionality (enhanced)
    const setupProjectFilter = () => {
        const categoryButtons = document.querySelectorAll('.category-btn');
        const projectCards = document.querySelectorAll('.project-card');
        const loadMoreBtn = document.getElementById('load-more-btn');
        const scholarLink = document.querySelector('.scholar-link');

        // Set initial state
        let currentCategory = 'all';
        let visibleCount = 6; // Number of items to show initially
        const increment = 3; // Number of additional items to show on "Load More"

        // Function to update visible cards
        const updateVisibleCards = () => {
            // Get all cards that match the current filter
            const matchingCards = document.querySelectorAll(
                currentCategory === 'all'
                    ? '.project-card'
                    : `.project-card[data-type="${currentCategory}"]`
            );

            // Hide all cards first
            projectCards.forEach(card => {
                card.style.display = 'none';
            });

            // Show matching cards up to the visible count
            for (let i = 0; i < Math.min(visibleCount, matchingCards.length); i++) {
                matchingCards[i].style.display = 'block';
            }

            // Show/hide load more button
            if (matchingCards.length > visibleCount) {
                loadMoreBtn.style.display = 'block';
            } else {
                loadMoreBtn.style.display = 'none';
            }

            // Show/hide scholar link
            if (currentCategory === 'publication' || currentCategory === 'all') {
                scholarLink.style.display = 'block';
            } else {
                scholarLink.style.display = 'none';
            }
        };

        // Set up category button clicks
        categoryButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                categoryButtons.forEach(btn => btn.classList.remove('active'));

                // Add active class to clicked button
                button.classList.add('active');

                // Set current category
                currentCategory = button.getAttribute('data-category');

                // Reset visible count
                visibleCount = 6;

                // Update visible cards
                updateVisibleCards();
            });
        });

        // Set up load more button
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                visibleCount += increment;
                updateVisibleCards();
            });
        }

        // Initial setup
        updateVisibleCards();
    };
    
    const setupSimulationCards = () => {
        // Setup for details toggle on simulation cards
        const detailsToggles = document.querySelectorAll('.details-toggle');
        
        detailsToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                // Toggle active class on the button
                toggle.classList.toggle('active');
                
                // Find the sibling details content and toggle its visibility
                const detailsContent = toggle.nextElementSibling;
                detailsContent.classList.toggle('active');
                
                // Update button text
                if (toggle.classList.contains('active')) {
                    toggle.textContent = 'Hide Details';
                } else {
                    toggle.textContent = 'Show Details';
                }
            });
        });
        
        // Setup for simulation preview hover effects
        const simulationCards = document.querySelectorAll('.project-card[data-type="simulation"]');
        
        simulationCards.forEach(card => {
            const image = card.querySelector('.project-image');
            const preview = card.querySelector('.simulation-preview');
            
            if (image && preview) {
                // Add subtle animation on hover
                image.addEventListener('mouseenter', () => {
                    preview.style.transform = 'scale(1.05)';
                });
                
                image.addEventListener('mouseleave', () => {
                    preview.style.transform = 'scale(1)';
                });
            }
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

    const setupCourseCards = () => {
        // Setup for course preview hover effects
        const courseCards = document.querySelectorAll('.project-card[data-type="course"]');
        
        courseCards.forEach(card => {
            const image = card.querySelector('.project-image');
            const preview = card.querySelector('.course-preview');
            
            if (image && preview) {
                // Add subtle animation on hover
                image.addEventListener('mouseenter', () => {
                    preview.style.transform = 'scale(1.05)';
                });
                
                image.addEventListener('mouseleave', () => {
                    preview.style.transform = 'scale(1)';
                });
            }
        });
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
    setupSimulationCards();
    setupCourseCards();
});
