<?php
/**
 * 🏓 Ping Pong Tournament Manager
 * Main Application Entry Point - Optimized Version
 * 
 * @version 1.0.0
 * @author Tournament Manager Team
 * @license MIT
 */

// Include configuration and auto-loader
require_once 'config/config.php';

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Check if installation is needed
if (!file_exists('config/database.php') || !file_exists('config/.installed')) {
    header('Location: install/setup.php');
    exit();
}

// Check database connection
try {
    require_once 'config/database.php';
    $db = Database::getInstance();
    $db->testConnection();
} catch (Exception $e) {
    // Database connection failed - show maintenance page
    include 'maintenance.php';
    exit();
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <meta name="description" content="Professional ping pong tournament management system with real-time scoring and leaderboards">
    <meta name="keywords" content="ping pong, table tennis, tournament, management, scoring, leaderboard">
    <meta name="author" content="Tournament Manager">
    
    <title>🏓 Ping Pong Tournament Manager</title>
    
    <!-- Preconnect to external domains for better performance -->
    <link rel="preconnect" href="https://cdn.tailwindcss.com">
    <link rel="preconnect" href="https://unpkg.com">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    
    <!-- PWA Manifest -->
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#3B82F6">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="Tournament Manager">
    
    <!-- Icons -->
    <link rel="icon" type="image/x-icon" href="assets/favicon.ico">
    <link rel="apple-touch-icon" href="assets/icon-192.png">
    <link rel="apple-touch-icon" sizes="152x152" href="assets/icon-152.png">
    <link rel="apple-touch-icon" sizes="192x192" href="assets/icon-192.png">
    
    <!-- Critical CSS - Inline for fastest loading -->
    <style>
        /* Critical loading styles */
        #loading-screen {
            position: fixed;
            inset: 0;
            background: white;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: opacity 0.3s ease-out;
        }
        
        .loading-spinner {
            border: 3px solid #f3f4f6;
            border-top: 3px solid #3B82F6;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* App initially hidden */
        #app {
            opacity: 0;
            transition: opacity 0.5s ease-in-out;
        }
        
        /* Prevent flash of unstyled content */
        .page {
            display: none;
        }
        
        .page:not(.hidden) {
            display: block;
        }
    </style>
    
    <!-- Tailwind CSS - Load asynchronously after critical content -->
    <script>
        // Load Tailwind CSS asynchronously
        const tailwindLink = document.createElement('script');
        tailwindLink.src = 'https://cdn.tailwindcss.com';
        tailwindLink.onload = function() {
            // Configure Tailwind after it loads
            tailwind.config = {
                theme: {
                    extend: {
                        fontFamily: {
                            sans: ['Inter', 'sans-serif'],
                        },
                        colors: {
                            primary: {
                                DEFAULT: '#3B82F6',
                                50: '#EBF4FF',
                                100: '#DBEAFE',
                                500: '#3B82F6',
                                600: '#2563EB',
                                700: '#1D4ED8',
                            },
                            success: '#22C55E',
                            warning: '#F59E0B',
                            danger: '#EF4444',
                        },
                        animation: {
                            'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                            'bounce-slow': 'bounce 2s infinite',
                        }
                    }
                }
            };
        };
        document.head.appendChild(tailwindLink);
    </script>
    
    <!-- Google Fonts - Load asynchronously -->
    <link rel="preload" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"></noscript>
    
    <!-- Global configuration -->
    <script>
        window.APP_CONFIG = {
            API_BASE: './api',
            VERSION: '<?php echo APP_VERSION; ?>',
            DEBUG: <?php echo DEBUG_MODE ? 'true' : 'false'; ?>,
            FEATURES: {
                QR_CODES: true,
                REAL_TIME: true,
                MULTI_TABLE: true,
                STATISTICS: true
            },
            ENVIRONMENT: '<?php echo ENVIRONMENT; ?>'
        };
    </script>
    
    <!-- Custom Styles -->
    <style>
        /* Custom scrollbar */
        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        ::-webkit-scrollbar-track {
            background: #f1f5f9;
        }
        ::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
        }
        
        /* Page transitions */
        .page-transition {
            transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
        }
        
        .page-hidden {
            opacity: 0;
            transform: translateX(20px);
        }
        
        /* Notification styles */
        .notification {
            transition: all 0.3s ease-in-out;
            transform: translateX(100%);
        }
        
        .notification.show {
            transform: translateX(0);
        }
        
        /* Mobile optimizations */
        @media (max-width: 768px) {
            .mobile-optimize {
                -webkit-tap-highlight-color: transparent;
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                user-select: none;
            }
            
            /* Improve touch targets */
            button, .nav-btn {
                min-height: 44px;
                min-width: 44px;
            }
        }
        
        /* Offline indicator */
        .offline-indicator {
            position: fixed;
            top: 70px;
            left: 50%;
            transform: translateX(-50%);
            background: #ef4444;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 1000;
            display: none;
        }
        
        /* Focus styles for accessibility */
        button:focus, .nav-btn:focus {
            outline: 2px solid #3B82F6;
            outline-offset: 2px;
        }
        
        /* Print styles */
        @media print {
            .no-print {
                display: none !important;
            }
            
            #app {
                max-width: none !important;
                box-shadow: none !important;
            }
        }
        
        /* Reduce motion for users who prefer it */
        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
                scroll-behavior: auto !important;
            }
        }
    </style>
</head>
<body class="bg-gray-50 font-sans antialiased mobile-optimize">
    <!-- Loading Screen -->
    <div id="loading-screen">
        <div class="text-center">
            <div class="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span class="text-white font-bold text-2xl">🏓</span>
            </div>
            <div class="loading-spinner mx-auto mb-4"></div>
            <p class="text-gray-600">Loading Tournament Manager...</p>
        </div>
    </div>

    <!-- Offline Indicator -->
    <div id="offline-indicator" class="offline-indicator">
        <span>You are offline. Some features may not be available.</span>
    </div>

    <!-- Mobile App Container -->
    <div id="app" class="max-w-md mx-auto bg-white min-h-screen shadow-xl">
        <!-- Header -->
        <header class="bg-primary-600 text-white sticky top-0 z-40">
            <div class="flex items-center justify-between p-4">
                <div class="flex items-center gap-3">
                    <button id="menu-btn" class="p-1 hover:bg-primary-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white" aria-label="Open menu">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                            <span class="text-primary-600 font-bold text-lg">🏓</span>
                        </div>
                        <h1 class="font-bold text-lg">Tournament Manager</h1>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button id="refresh-btn" class="p-1 hover:bg-primary-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white" aria-label="Refresh data">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <polyline points="1 20 1 14 7 14"></polyline>
                            <path d="m3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                    </button>
                    <button id="notifications-btn" class="p-1 hover:bg-primary-700 rounded-lg transition-colors relative focus:outline-none focus:ring-2 focus:ring-white" aria-label="Notifications">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        <span id="notification-badge" class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs hidden"></span>
                    </button>
                </div>
            </div>
        </header>

        <!-- Navigation Menu (Hidden by default) -->
        <nav id="mobile-menu" class="bg-white border-b border-gray-200 hidden" role="navigation">
            <div class="p-4 space-y-2">
                <button class="nav-btn w-full text-left p-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500" data-page="home" role="menuitem">
                    <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m3 12 2-2m0 0 7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                    </svg>
                    <span>Dashboard</span>
                </button>
                <button class="nav-btn w-full text-left p-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500" data-page="tournaments" role="menuitem">
                    <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                    </svg>
                    <span>Tournaments</span>
                </button>
                <button class="nav-btn w-full text-left p-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500" data-page="players" role="menuitem">
                    <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                    </svg>
                    <span>Players</span>
                </button>
                <button class="nav-btn w-full text-left p-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500" data-page="matches" role="menuitem">
                    <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <polygon points="5,3 19,12 5,21"></polygon>
                    </svg>
                    <span>Live Matches</span>
                </button>
                <button class="nav-btn w-full text-left p-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500" data-page="leaderboard" role="menuitem">
                    <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <line x1="18" y1="20" x2="18" y2="10"></line>
                        <line x1="12" y1="20" x2="12" y2="4"></line>
                        <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                    <span>Leaderboard</span>
                </button>
                <button class="nav-btn w-full text-left p-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500" data-page="statistics" role="menuitem">
                    <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="m1 12 6-6 4 4 8.5-8.5"></path>
                        <path d="m16 5 5-1v5"></path>
                    </svg>
                    <span>Statistics</span>
                </button>
            </div>
        </nav>

        <!-- Main Content -->
        <main class="pb-20 min-h-screen" role="main">
            <!-- Home Page -->
            <div id="home-page" class="page page-transition">
                <!-- Quick Stats -->
                <div class="p-4">
                    <div class="grid grid-cols-2 gap-4 mb-6">
                        <div class="bg-gradient-to-br from-primary-500 to-primary-600 text-white p-4 rounded-xl shadow-lg">
                            <div class="flex items-center gap-2 mb-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                                </svg>
                                <span class="text-sm opacity-90">Active Tournaments</span>
                            </div>
                            <div class="text-2xl font-bold" data-stat="tournaments">0</div>
                            <div class="text-xs opacity-75 mt-1">+2 this week</div>
                        </div>
                        <div class="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-xl shadow-lg">
                            <div class="flex items-center gap-2 mb-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                                </svg>
                                <span class="text-sm opacity-90">Total Players</span>
                            </div>
                            <div class="text-2xl font-bold" data-stat="players">0</div>
                            <div class="text-xs opacity-75 mt-1">+5 new players</div>
                        </div>
                    </div>

                    <!-- Live Activity -->
                    <div class="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-200">
                        <div class="flex items-center gap-2 mb-3">
                            <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span class="font-medium">Live Activity</span>
                        </div>
                        <div id="live-activity" class="space-y-2 text-sm text-gray-600">
                            <div>Loading recent activities...</div>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="px-4 mb-6">
                    <h2 class="font-semibold text-lg mb-3">Quick Actions</h2>
                    <div class="grid grid-cols-2 gap-3">
                        <button id="create-tournament-btn" class="bg-primary-500 text-white p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-primary-600 transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-300">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="16"></line>
                                <line x1="8" y1="12" x2="16" y2="12"></line>
                            </svg>
                            <span class="font-medium">Create Tournament</span>
                        </button>
                        <button id="scan-qr-btn" class="bg-gray-800 text-white p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-gray-700 transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-500">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <rect x="3" y="3" width="5" height="5"></rect>
                                <rect x="16" y="3" width="5" height="5"></rect>
                                <rect x="3" y="16" width="5" height="5"></rect>
                                <path d="M21 16h-3a2 2 0 00-2 2v3"></path>
                                <path d="M21 21v.01"></path>
                                <path d="M12 7v3a2 2 0 002 2h3"></path>
                                <path d="M3 12h.01"></path>
                                <path d="M12 3h.01"></path>
                                <path d="M12 16v.01"></path>
                                <path d="M16 12h1"></path>
                                <path d="M21 12v.01"></path>
                                <path d="M12 21v-1"></path>
                            </svg>
                            <span class="font-medium">Scan QR</span>
                        </button>
                        <button class="nav-btn bg-orange-500 text-white p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-orange-600 transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-300" data-page="players">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                            </svg>
                            <span class="font-medium">Add Player</span>
                        </button>
                        <button class="nav-btn bg-purple-500 text-white p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-purple-600 transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-300" data-page="matches">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <polygon points="5,3 19,12 5,21"></polygon>
                            </svg>
                            <span class="font-medium">Live Matches</span>
                        </button>
                    </div>
                </div>

                <!-- Recent Tournaments -->
                <div class="px-4">
                    <h2 class="font-semibold text-lg mb-3">Recent Tournaments</h2>
                    <div id="recent-tournaments-list" class="space-y-3">
                        <!-- Tournaments will be loaded here -->
                        <div class="bg-white rounded-xl p-4 border border-gray-200 animate-pulse">
                            <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div class="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Other pages will be dynamically loaded -->
            <div id="create-tournament-page" class="page page-transition hidden">
                <div class="p-4">
                    <div class="flex items-center gap-3 mb-6">
                        <button id="back-home" class="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500" aria-label="Go back">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                            </svg>
                        </button>
                        <h1 class="text-xl font-bold">Create Tournament</h1>
                    </div>

                    <form id="tournament-form" class="space-y-6">
                        <!-- Tournament Name -->
                        <div>
                            <label for="tournament-name" class="block text-sm font-medium text-gray-700 mb-2">Tournament Name *</label>
                            <input type="text" id="tournament-name" name="tournament-name" required 
                                class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" 
                                placeholder="Enter tournament name"
                                aria-describedby="tournament-name-help">
                            <p id="tournament-name-help" class="text-xs text-gray-500 mt-1">Give your tournament a memorable name</p>
                        </div>

                        <!-- Tournament Format -->
                        <fieldset>
                            <legend class="block text-sm font-medium text-gray-700 mb-3">Tournament Format</legend>
                            <div class="space-y-3" role="radiogroup" aria-labelledby="format-legend">
                                <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input type="radio" name="format" value="americano" class="mr-3 focus:ring-primary-500" checked>
                                    <div class="flex-1">
                                        <div class="font-medium">Americano</div>
                                        <div class="text-sm text-gray-600">Players rotate partners every round</div>
                                    </div>
                                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path>
                                    </svg>
                                </label>
                                <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input type="radio" name="format" value="singles" class="mr-3 focus:ring-primary-500">
                                    <div class="flex-1">
                                        <div class="font-medium">Singles Tournament</div>
                                        <div class="text-sm text-gray-600">One-on-one matches</div>
                                    </div>
                                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                    </svg>
                                </label>
                                <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input type="radio" name="format" value="doubles" class="mr-3 focus:ring-primary-500">
                                    <div class="flex-1">
                                        <div class="font-medium">Mixed Doubles</div>
                                        <div class="text-sm text-gray-600">Men and women paired together</div>
                                    </div>
                                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                    </svg>
                                </label>
                                <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input type="radio" name="format" value="knockout" class="mr-3 focus:ring-primary-500">
                                    <div class="flex-1">
                                        <div class="font-medium">Knockout</div>
                                        <div class="text-sm text-gray-600">Single elimination bracket</div>
                                    </div>
                                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <polyline points="22,12 18,8 13,13 9,9 2,16"></polyline>
                                        <polyline points="16,6 22,12 16,18"></polyline>
                                    </svg>
                                </label>
                            </div>
                        </fieldset>

                        <!-- Division System -->
                        <fieldset>
                            <legend class="block text-sm font-medium text-gray-700 mb-3">Division System</legend>
                            <div class="space-y-3" role="radiogroup" aria-labelledby="division-legend">
                                <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input type="radio" name="division_type" value="single" class="mr-3 focus:ring-primary-500" checked>
                                    <div class="flex-1">
                                        <div class="font-medium">Single Division</div>
                                        <div class="text-sm text-gray-600">All players compete together</div>
                                    </div>
                                </label>
                                <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input type="radio" name="division_type" value="skill" class="mr-3 focus:ring-primary-500">
                                    <div class="flex-1">
                                        <div class="font-medium">Skill-based Division</div>
                                        <div class="text-sm text-gray-600">Beginner / Intermediate / Advanced</div>
                                    </div>
                                </label>
                                <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input type="radio" name="division_type" value="rating" class="mr-3 focus:ring-primary-500">
                                    <div class="flex-1">
                                        <div class="font-medium">Rating System</div>
                                        <div class="text-sm text-gray-600">ELO-based automatic grouping</div>
                                    </div>
                                </label>
                            </div>
                        </fieldset>

                        <!-- Settings -->
                        <fieldset>
                            <legend class="block text-sm font-medium text-gray-700 mb-3">Tournament Settings</legend>
                            <div class="space-y-3">
                                <label class="flex items-center justify-between p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <div>
                                        <div class="font-medium">Enable QR Score Input</div>
                                        <div class="text-sm text-gray-600">Players can input scores via QR code</div>
                                    </div>
                                    <input type="checkbox" name="qr_enabled" class="ml-3 w-5 h-5 text-primary-600 focus:ring-primary-500" checked>
                                </label>
                                <label class="flex items-center justify-between p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <div>
                                        <div class="font-medium">Real-time Leaderboard</div>
                                        <div class="text-sm text-gray-600">Live ranking updates</div>
                                    </div>
                                    <input type="checkbox" name="real_time" class="ml-3 w-5 h-5 text-primary-600 focus:ring-primary-500" checked>
                                </label>
                                <label class="flex items-center justify-between p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <div>
                                        <div class="font-medium">Multi-table Support</div>
                                        <div class="text-sm text-gray-600">Manage multiple tables simultaneously</div>
                                    </div>
                                    <input type="checkbox" name="multi_table" class="ml-3 w-5 h-5 text-primary-600 focus:ring-primary-500">
                                </label>
                            </div>
                        </fieldset>

                        <button type="submit" class="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary-300">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Create Tournament
                        </button>
                    </form>
                </div>
            </div>

            <!-- Other pages - placeholders that will be populated by JavaScript -->
            <div id="tournaments-page" class="page page-transition hidden">
                <div class="p-4">
                    <h1 class="text-xl font-bold mb-4">Loading tournaments...</h1>
                </div>
            </div>

            <div id="players-page" class="page page-transition hidden">
                <div class="p-4">
                    <h1 class="text-xl font-bold mb-4">Loading players...</h1>
                </div>
            </div>

            <div id="matches-page" class="page page-transition hidden">
                <div class="p-4">
                    <h1 class="text-xl font-bold mb-4">Loading matches...</h1>
                </div>
            </div>

            <div id="leaderboard-page" class="page page-transition hidden">
                <div class="p-4">
                    <h1 class="text-xl font-bold mb-4">Loading leaderboard...</h1>
                </div>
            </div>

            <div id="statistics-page" class="page page-transition hidden">
                <div class="p-4">
                    <h1 class="text-xl font-bold mb-4">Loading statistics...</h1>
                </div>
            </div>
        </main>

        <!-- Bottom Navigation -->
        <nav class="fixed bottom-0 left-1/2 transform -translate-x-1/2 max-w-md w-full bg-white border-t border-gray-200 no-print" role="navigation">
            <div class="flex justify-around py-2">
                <button class="nav-btn flex flex-col items-center gap-1 p-2 text-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-300" data-page="home" aria-label="Home">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m3 12 2-2m0 0 7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                    </svg>
                    <span class="text-xs">Home</span>
                </button>
                <button class="nav-btn flex flex-col items-center gap-1 p-2 text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-300" data-page="tournaments" aria-label="Tournaments">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                    </svg>
                    <span class="text-xs">Tournaments</span>
                </button>
                <button class="nav-btn flex flex-col items-center gap-1 p-2 text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-300" data-page="matches" aria-label="Live matches">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <polygon points="5,3 19,12 5,21"></polygon>
                    </svg>
                    <span class="text-xs">Live</span>
                </button>
                <button class="nav-btn flex flex-col items-center gap-1 p-2 text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-300" data-page="leaderboard" aria-label="Rankings">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <line x1="18" y1="20" x2="18" y2="10"></line>
                        <line x1="12" y1="20" x2="12" y2="4"></line>
                        <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                    <span class="text-xs">Rankings</span>
                </button>
                <button class="nav-btn flex flex-col items-center gap-1 p-2 text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-300" data-page="players" aria-label="Players">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                    </svg>
                    <span class="text-xs">Players</span>
                </button>
            </div>
        </nav>
    </div>

    <!-- Notification Container -->
    <div id="notification-container" class="fixed top-4 right-4 z-50 space-y-2" aria-live="polite" role="status"></div>

    <!-- Load Lucide Icons asynchronously -->
    <script>
        // Load Lucide Icons after critical content
        const lucideScript = document.createElement('script');
        lucideScript.src = 'https://unpkg.com/lucide@latest/dist/umd/lucide.js';
        lucideScript.onload = function() {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        };
        document.head.appendChild(lucideScript);
    </script>

    <!-- Include Main Application JavaScript -->
    <script src="js/app.js"></script>
    
    <!-- Service Worker Registration -->
    <script>
        // Service Worker Registration with error handling
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
                navigator.serviceWorker.register('sw.js')
                .then(function(registration) {
                    console.log('✅ ServiceWorker registration successful:', registration.scope);
                    
                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        console.log('🔄 New ServiceWorker available');
                        if (window.app) {
                            window.app.showNotification('App update available. Refresh to get the latest version.', 'info', 10000);
                        }
                    });
                })
                .catch(function(err) {
                    console.warn('⚠️ ServiceWorker registration failed:', err);
                    // App still works without service worker
                });
            });
        }

        // Online/Offline detection
        function updateOnlineStatus() {
            const offlineIndicator = document.getElementById('offline-indicator');
            if (navigator.onLine) {
                if (offlineIndicator) {
                    offlineIndicator.style.display = 'none';
                }
            } else {
                if (offlineIndicator) {
                    offlineIndicator.style.display = 'block';
                }
            }
        }

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus(); // Check initial state

        // Basic error handling
        window.addEventListener('error', function(e) {
            console.error('Global error:', e.error);
            if (window.APP_CONFIG && window.APP_CONFIG.DEBUG) {
                if (window.app) {
                    window.app.showNotification(`Error: ${e.error.message}`, 'error');
                }
            }
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', function(e) {
            console.error('Unhandled promise rejection:', e.reason);
            if (window.APP_CONFIG && window.APP_CONFIG.DEBUG) {
                if (window.app) {
                    window.app.showNotification('An unexpected error occurred', 'error');
                }
            }
        });
    </script>

</body>
</html>