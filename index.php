<?php
/**
 * 🏓 Ping Pong Tournament Manager
 * Main Application Entry Point
 * 
 * @version 1.0.0
 * @author Tournament Manager Team
 * @license MIT
 */

// Include configuration and auto-loader
require_once 'config/config.php';
require_once 'config/database.php';

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Basic error handling for production
if (!defined('DEBUG_MODE')) {
    ini_set('display_errors', 0);
    error_reporting(0);
}

// Check if installation is needed
if (!file_exists('config/database.php') || !file_exists('config/.installed')) {
    header('Location: install/setup.php');
    exit();
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Professional ping pong tournament management system with real-time scoring and leaderboards">
    <meta name="keywords" content="ping pong, table tennis, tournament, management, scoring, leaderboard">
    <meta name="author" content="Tournament Manager">
    
    <title>🏓 Ping Pong Tournament Manager</title>
    
    <!-- PWA Manifest -->
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#3B82F6">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="Tournament Manager">
    
    <!-- Icons -->
    <link rel="icon" type="image/x-icon" href="assets/favicon.ico">
    <link rel="apple-touch-icon" href="assets/icon-192.png">
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
    
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Tailwind Configuration -->
    <script>
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
        }
        
        // Global configuration
        window.APP_CONFIG = {
            API_BASE: './api',
            VERSION: '1.0.0',
            DEBUG: <?php echo defined('DEBUG_MODE') && DEBUG_MODE ? 'true' : 'false'; ?>,
            FEATURES: {
                QR_CODES: true,
                REAL_TIME: true,
                MULTI_TABLE: true,
                STATISTICS: true
            }
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
        
        /* Loading animation */
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
        
        /* Mobile-first optimizations */
        @media (max-width: 768px) {
            .mobile-optimize {
                -webkit-tap-highlight-color: transparent;
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                user-select: none;
            }
        }
        
        /* Print styles */
        @media print {
            .no-print {
                display: none !important;
            }
        }
    </style>
</head>
<body class="bg-gray-50 font-sans antialiased mobile-optimize">
    <!-- Loading Screen -->
    <div id="loading-screen" class="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div class="text-center">
            <div class="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span class="text-white font-bold text-2xl">🏓</span>
            </div>
            <div class="loading-spinner mx-auto mb-4"></div>
            <p class="text-gray-600">Loading Tournament Manager...</p>
        </div>
    </div>

    <!-- Mobile App Container -->
    <div id="app" class="max-w-md mx-auto bg-white min-h-screen shadow-xl opacity-0 transition-opacity duration-500">
        <!-- Header -->
        <header class="bg-primary-600 text-white sticky top-0 z-40">
            <div class="flex items-center justify-between p-4">
                <div class="flex items-center gap-3">
                    <button id="menu-btn" class="p-1 hover:bg-primary-700 rounded-lg transition-colors" aria-label="Open menu">
                        <i data-lucide="menu" class="w-6 h-6"></i>
                    </button>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                            <span class="text-primary-600 font-bold text-lg">🏓</span>
                        </div>
                        <h1 class="font-bold text-lg">Tournament Manager</h1>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button id="refresh-btn" class="p-1 hover:bg-primary-700 rounded-lg transition-colors" aria-label="Refresh data">
                        <i data-lucide="refresh-cw" class="w-5 h-5"></i>
                    </button>
                    <button id="notifications-btn" class="p-1 hover:bg-primary-700 rounded-lg transition-colors relative" aria-label="Notifications">
                        <i data-lucide="bell" class="w-5 h-5"></i>
                        <span id="notification-badge" class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs hidden"></span>
                    </button>
                </div>
            </div>
        </header>

        <!-- Navigation Menu (Hidden by default) -->
        <nav id="mobile-menu" class="bg-white border-b border-gray-200 hidden">
            <div class="p-4 space-y-2">
                <button class="nav-btn w-full text-left p-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 transition-colors" data-page="home">
                    <i data-lucide="home" class="w-5 h-5 text-gray-600"></i>
                    <span>Dashboard</span>
                </button>
                <button class="nav-btn w-full text-left p-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 transition-colors" data-page="tournaments">
                    <i data-lucide="trophy" class="w-5 h-5 text-gray-600"></i>
                    <span>Tournaments</span>
                </button>
                <button class="nav-btn w-full text-left p-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 transition-colors" data-page="players">
                    <i data-lucide="users" class="w-5 h-5 text-gray-600"></i>
                    <span>Players</span>
                </button>
                <button class="nav-btn w-full text-left p-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 transition-colors" data-page="matches">
                    <i data-lucide="play" class="w-5 h-5 text-gray-600"></i>
                    <span>Live Matches</span>
                </button>
                <button class="nav-btn w-full text-left p-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 transition-colors" data-page="leaderboard">
                    <i data-lucide="bar-chart-3" class="w-5 h-5 text-gray-600"></i>
                    <span>Leaderboard</span>
                </button>
                <button class="nav-btn w-full text-left p-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 transition-colors" data-page="statistics">
                    <i data-lucide="pie-chart" class="w-5 h-5 text-gray-600"></i>
                    <span>Statistics</span>
                </button>
            </div>
        </nav>

        <!-- Main Content -->
        <main class="pb-20 min-h-screen">
            <!-- Home Page -->
            <div id="home-page" class="page page-transition">
                <!-- Quick Stats -->
                <div class="p-4">
                    <div class="grid grid-cols-2 gap-4 mb-6">
                        <div class="bg-gradient-to-br from-primary-500 to-primary-600 text-white p-4 rounded-xl shadow-lg">
                            <div class="flex items-center gap-2 mb-2">
                                <i data-lucide="trophy" class="w-5 h-5"></i>
                                <span class="text-sm opacity-90">Active Tournaments</span>
                            </div>
                            <div class="text-2xl font-bold" data-stat="tournaments">0</div>
                            <div class="text-xs opacity-75 mt-1">+2 this week</div>
                        </div>
                        <div class="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-xl shadow-lg">
                            <div class="flex items-center gap-2 mb-2">
                                <i data-lucide="users" class="w-5 h-5"></i>
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
                        <button id="create-tournament-btn" class="bg-primary-500 text-white p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-primary-600 transition-colors shadow-lg">
                            <i data-lucide="plus-circle" class="w-8 h-8"></i>
                            <span class="font-medium">Create Tournament</span>
                        </button>
                        <button id="scan-qr-btn" class="bg-gray-800 text-white p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-gray-700 transition-colors shadow-lg">
                            <i data-lucide="qr-code" class="w-8 h-8"></i>
                            <span class="font-medium">Scan QR</span>
                        </button>
                        <button class="nav-btn bg-orange-500 text-white p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-orange-600 transition-colors shadow-lg" data-page="players">
                            <i data-lucide="user-plus" class="w-8 h-8"></i>
                            <span class="font-medium">Add Player</span>
                        </button>
                        <button class="nav-btn bg-purple-500 text-white p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-purple-600 transition-colors shadow-lg" data-page="matches">
                            <i data-lucide="play" class="w-8 h-8"></i>
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

            <!-- Tournament Creation Page -->
            <div id="create-tournament-page" class="page page-transition hidden">
                <div class="p-4">
                    <div class="flex items-center gap-3 mb-6">
                        <button id="back-home" class="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Go back">
                            <i data-lucide="arrow-left" class="w-5 h-5"></i>
                        </button>
                        <h1 class="text-xl font-bold">Create Tournament</h1>
                    </div>

                    <form id="tournament-form" class="space-y-6">
                        <!-- Tournament Name -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Tournament Name *</label>
                            <input type="text" id="tournament-name" required 
                                class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" 
                                placeholder="Enter tournament name">
                            <p class="text-xs text-gray-500 mt-1">Give your tournament a memorable name</p>
                        </div>

                        <!-- Tournament Format -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-3">Tournament Format</label>
                            <div class="space-y-3">
                                <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input type="radio" name="format" value="americano" class="mr-3" checked>
                                    <div class="flex-1">
                                        <div class="font-medium">Americano</div>
                                        <div class="text-sm text-gray-600">Players rotate partners every round</div>
                                    </div>
                                    <i data-lucide="shuffle" class="w-5 h-5 text-gray-400"></i>
                                </label>
                                <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input type="radio" name="format" value="singles" class="mr-3">
                                    <div class="flex-1">
                                        <div class="font-medium">Singles Tournament</div>
                                        <div class="text-sm text-gray-600">One-on-one matches</div>
                                    </div>
                                    <i data-lucide="user" class="w-5 h-5 text-gray-400"></i>
                                </label>
                                <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input type="radio" name="format" value="doubles" class="mr-3">
                                    <div class="flex-1">
                                        <div class="font-medium">Mixed Doubles</div>
                                        <div class="text-sm text-gray-600">Men and women paired together</div>
                                    </div>
                                    <i data-lucide="users" class="w-5 h-5 text-gray-400"></i>
                                </label>
                                <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input type="radio" name="format" value="knockout" class="mr-3">
                                    <div class="flex-1">
                                        <div class="font-medium">Knockout</div>
                                        <div class="text-sm text-gray-600">Single elimination bracket</div>
                                    </div>
                                    <i data-lucide="zap" class="w-5 h-5 text-gray-400"></i>
                                </label>
                            </div>
                        </div>

                        <!-- Division System -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-3">Division System</label>
                            <div class="space-y-3">
                                <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input type="radio" name="division_type" value="single" class="mr-3" checked>
                                    <div class="flex-1">
                                        <div class="font-medium">Single Division</div>
                                        <div class="text-sm text-gray-600">All players compete together</div>
                                    </div>
                                </label>
                                <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input type="radio" name="division_type" value="skill" class="mr-3">
                                    <div class="flex-1">
                                        <div class="font-medium">Skill-based Division</div>
                                        <div class="text-sm text-gray-600">Beginner / Intermediate / Advanced</div>
                                    </div>
                                </label>
                                <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input type="radio" name="division_type" value="rating" class="mr-3">
                                    <div class="flex-1">
                                        <div class="font-medium">Rating System</div>
                                        <div class="text-sm text-gray-600">ELO-based automatic grouping</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <!-- Settings -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-3">Tournament Settings</label>
                            <div class="space-y-3">
                                <label class="flex items-center justify-between p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <div>
                                        <div class="font-medium">Enable QR Score Input</div>
                                        <div class="text-sm text-gray-600">Players can input scores via QR code</div>
                                    </div>
                                    <input type="checkbox" name="qr_enabled" class="ml-3 w-5 h-5 text-primary-600" checked>
                                </label>
                                <label class="flex items-center justify-between p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <div>
                                        <div class="font-medium">Real-time Leaderboard</div>
                                        <div class="text-sm text-gray-600">Live ranking updates</div>
                                    </div>
                                    <input type="checkbox" name="real_time" class="ml-3 w-5 h-5 text-primary-600" checked>
                                </label>
                                <label class="flex items-center justify-between p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <div>
                                        <div class="font-medium">Multi-table Support</div>
                                        <div class="text-sm text-gray-600">Manage multiple tables simultaneously</div>
                                    </div>
                                    <input type="checkbox" name="multi_table" class="ml-3 w-5 h-5 text-primary-600">
                                </label>
                            </div>
                        </div>

                        <button type="submit" class="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2">
                            <i data-lucide="plus" class="w-5 h-5"></i>
                            Create Tournament
                        </button>
                    </form>
                </div>
            </div>

            <!-- Other pages will be loaded dynamically -->
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
        <nav class="fixed bottom-0 left-1/2 transform -translate-x-1/2 max-w-md w-full bg-white border-t border-gray-200 no-print">
            <div class="flex justify-around py-2">
                <button class="nav-btn flex flex-col items-center gap-1 p-2 text-primary-600 transition-colors" data-page="home">
                    <i data-lucide="home" class="w-5 h-5"></i>
                    <span class="text-xs">Home</span>
                </button>
                <button class="nav-btn flex flex-col items-center gap-1 p-2 text-gray-600 transition-colors" data-page="tournaments">
                    <i data-lucide="trophy" class="w-5 h-5"></i>
                    <span class="text-xs">Tournaments</span>
                </button>
                <button class="nav-btn flex flex-col items-center gap-1 p-2 text-gray-600 transition-colors" data-page="matches">
                    <i data-lucide="play" class="w-5 h-5"></i>
                    <span class="text-xs">Live</span>
                </button>
                <button class="nav-btn flex flex-col items-center gap-1 p-2 text-gray-600 transition-colors" data-page="leaderboard">
                    <i data-lucide="bar-chart-3" class="w-5 h-5"></i>
                    <span class="text-xs">Rankings</span>
                </button>
                <button class="nav-btn flex flex-col items-center gap-1 p-2 text-gray-600 transition-colors" data-page="players">
                    <i data-lucide="users" class="w-5 h-5"></i>
                    <span class="text-xs">Players</span>
                </button>
            </div>
        </nav>
    </div>

    <!-- Notification Container -->
    <div id="notification-container" class="fixed top-4 right-4 z-50 space-y-2"></div>

    <!-- Include JavaScript Application -->
    <script src="js/app.js"></script>
    
    <!-- Service Worker Registration -->
    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
                navigator.serviceWorker.register('sw.js')
                .then(function(registration) {
                    console.log('ServiceWorker registration successful');
                }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                });
            });
        }
    </script>

</body>
</html>