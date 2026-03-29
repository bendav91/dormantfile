import React from 'react';
import './MobileNav.css'; // Importing CSS for animations and styles

const MobileNav = () => {
    return (
        <nav className="mobile-nav">
            <ul>
                <li>
                    <a href="/home" className="nav-link" aria-label="Home">Home</a>
                </li>
                <li>
                    <a href="/about" className="nav-link" aria-label="About Us">About</a>
                </li>
                <li>
                    <a href="/services" className="nav-link" aria-label="Services">Services</a>
                </li>
                <li>
                    <a href="/contact" className="nav-link" aria-label="Contact">Contact</a>
                </li>
            </ul>
        </nav>
    );
};

export default MobileNav;

// CSS for improved touch targets and animations
/* MobileNav.css */
.mobile-nav {
    display: flex;
    flex-direction: column;
    background-color: #fff;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    animation: slideIn 0.3s ease-in-out;
}

.nav-link {
    padding: 16px; /* Increased touch target size */
    font-size: 18px;
    text-decoration: none;
    color: #333;
    transition: background-color 0.2s;
}

.nav-link:hover,
.nav-link:focus {
    background-color: #f0f0f0; /* Highlight on hover/focus */
}

@keyframes slideIn {
    from {
        transform: translateY(-100%);
    }
    to {
        transform: translateY(0);
    }
}