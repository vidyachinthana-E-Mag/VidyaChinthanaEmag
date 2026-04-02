// script.js
/**
 * Interactive JavaScript features for theme toggling, animations,
 * click interactions, smooth scrolling, and responsive designs.
 */

// Theme Toggling with LocalStorage
const themeToggle = document.getElementById('theme-toggle');
const currentTheme = localStorage.getItem('theme') || 'light';

const setTheme = (theme) => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
};

setTheme(currentTheme);

themeToggle.addEventListener('click', () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
});

// Intersection Observer for Scroll Animations
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        } else {
            entry.target.classList.remove('visible');
        }
    });
});

const elementsToAnimate = document.querySelectorAll('.animate');
elementsToAnimate.forEach(el => observer.observe(el));

// Card Click Interactions
const cards = document.querySelectorAll('.card');
cards.forEach(card => {
    card.addEventListener('click', () => {
        // Notify user
        showToast(`Card clicked: ${card.dataset.title}`);
    });
});

// Smooth Scrolling Behavior
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Responsive Window Resize Detection
window.addEventListener('resize', () => {
    console.log('Window resized. Current dimensions:', window.innerWidth, window.innerHeight);
});

// Notification System with Animated Toasts
const showToast = (message) => {
    const toast = document.createElement('div');
    toast.classList.add('toast');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade');
    }, 3000);
    setTimeout(() => {
        document.body.removeChild(toast);
    }, 4000);
};
