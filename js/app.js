/**
 * 🏓 Ping Pong Tournament Manager
 * Main Application JavaScript
 * 
 * @version 1.0.0
 * @author Tournament Manager Team
 * @license MIT
 */

// Application State
class TournamentApp {
    constructor() {
        this.currentPage = 'home';
        this.tournaments = [];
        this.players = [];
        this.liveMatches = [];
        this.isLoading = false;
        
        // API configuration
        this.API_BASE = window.APP_CONFIG?.API_BASE || './api';
        
        // Initialize app
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('🏓 Initializing Tournament Manager...');
        
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setupApp());
            } else {
                await this.setupApp();
            }
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showNotification('Failed to initialize application', 'error');
        }
    }

    /**
     * Setup the application after DOM is ready
     */
    async setupApp() {
        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // Setup event listeners
        this.setupEventListeners();
        
        // Setup navigation
        this.setupNavigation();
        
        // Hide loading screen
        this.hideLoadingScreen();
        
        // Show app
        this.showApp();
        
        // Start with home page
        this.showPage('home');
        
        // Setup auto-refresh for live data
        this.setupAutoRefresh();

        console.log('✅ Tournament Manager ready!');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Menu button
        const menuBtn = document.getElementById('menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        
        if (menuBtn && mobileMenu) {
            menuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }

        // Navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = btn.dataset.page;
                this.showPage(pageId);
            });
        });

        // Tournament creation
        const createTournamentBtn = document.getElementById('create-tournament-btn');
        if (createTournamentBtn) {
            createTournamentBtn.addEventListener('click', () => {
                this.showPage('create-tournament');
            });
        }

        const newTournamentBtn = document.getElementById('new-tournament-btn');
        if (newTournamentBtn) {
            newTournamentBtn.addEventListener('click', () => {
                this.showPage('create-tournament');
            });
        }

        const backHomeBtn = document.getElementById('back-home');
        if (backHomeBtn) {
            backHomeBtn.addEventListener('click', () => {
                this.showPage('home');
            });
        }

        // Tournament form submission
        const tournamentForm = document.getElementById('tournament-form');
        if (tournamentForm) {
            tournamentForm.addEventListener('submit', (e) => this.handleTournamentSubmit(e));
        }

        // Add player button
        const addPlayerBtn = document.getElementById('add-player-btn');
        if (addPlayerBtn) {
            addPlayerBtn.addEventListener('click', () => this.promptAddPlayer());
        }

        // QR Scanner simulation
        const scanQrBtn = document.getElementById('scan-qr-btn');
        if (scanQrBtn) {
            scanQrBtn.addEventListener('click', () => {
                this.showNotification('QR Scanner would open here for player registration or score input', 'info');
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshCurrentPage());
        }

        // Notifications button
        const notificationsBtn = document.getElementById('notifications-btn');
        if (notificationsBtn) {
            notificationsBtn.addEventListener('click', () => {
                this.showNotification('Notifications feature coming soon!', 'info');
            });
        }

        // Click outside to close menu
        document.addEventListener('click', (e) => {
            const mobileMenu = document.getElementById('mobile-menu');
            const menuBtn = document.getElementById('menu-btn');
            
            if (mobileMenu && !mobileMenu.classList.contains('hidden') && 
                !mobileMenu.contains(e.target) && !menuBtn.contains(e.target)) {
                mobileMenu.classList.add('hidden');
            }
        });
    }

    /**
     * Setup navigation system
     */
    setupNavigation() {
        // Nothing additional needed for now
    }

    /**
     * Hide loading screen and show app
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const app = document.getElementById('app');
        
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 300);
            }, 500);
        }
        
        if (app) {
            setTimeout(() => {
                app.style.opacity = '1';
            }, 300);
        }
    }

    /**
     * Show the main app
     */
    showApp() {
        const app = document.getElementById('app');
        if (app) {
            app.classList.remove('opacity-0');
            app.classList.add('opacity-100');
        }
    }

    /**
     * Show specific page
     */
    showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
        });

        // Show target page
        const targetPage = document.getElementById(pageId + '-page');
        if (targetPage) {
            targetPage.classList.remove('hidden');
        }

        // Update navigation active states
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('text-primary-600');
            btn.classList.add('text-gray-600');
        });

        // Set active nav button
        const activeBtn = document.querySelector(`[data-page="${pageId}"]`);
        if (activeBtn) {
            activeBtn.classList.remove('text-gray-600');
            activeBtn.classList.add('text-primary-600');
        }

        // Close mobile menu
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu) {
            mobileMenu.classList.add('hidden');
        }

        // Update current page
        this.currentPage = pageId;

        // Load page-specific data
        this.loadPageData(pageId);
    }

    /**
     * Load page-specific data
     */
    async loadPageData(pageId) {
        try {
            switch (pageId) {
                case 'home':
                    await Promise.all([
                        this.loadTournaments(),
                        this.loadPlayers()
                    ]);
                    this.updateDashboard();
                    break;
                
                case 'tournaments':
                    await this.loadTournaments();
                    this.updateTournamentsList();
                    break;
                
                case 'players':
                    await this.loadPlayers();
                    this.updatePlayersList();
                    break;
                
                case 'matches':
                    await this.loadLiveMatches();
                    this.updateLiveMatchesList();
                    break;
                
                case 'leaderboard':
                    // Leaderboard is loaded when tournament is selected
                    this.setupLeaderboard();
                    break;
                
                case 'statistics':
                    await this.loadStatistics();
                    break;
            }
        } catch (error) {
            console.error(`Failed to load data for page ${pageId}:`, error);
            this.showNotification(`Failed to load ${pageId} data`, 'error');
        }
    }

    /**
     * API call helper
     */
    async apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.API_BASE}/${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'API request failed');
            }

            return data.data;
        } catch (error) {
            console.error('API Error:', error);
            
            // Check if offline
            if (!navigator.onLine) {
                this.showNotification('You are offline. Some features may not be available.', 'warning');
                return this.getOfflineData(endpoint);
            }
            
            this.showNotification(error.message, 'error');
            throw error;
        }
    }

    /**
     * Get offline data (placeholder)
     */
    getOfflineData(endpoint) {
        // In a real implementation, this would return cached data
        return [];
    }

    /**
     * Load tournaments data
     */
    async loadTournaments() {
        try {
            this.tournaments = await this.apiCall('tournaments.php');
            return this.tournaments;
        } catch (error) {
            this.tournaments = [];
            console.error('Failed to load tournaments:', error);
        }
    }

    /**
     * Load players data
     */
    async loadPlayers() {
        try {
            this.players = await this.apiCall('players.php');
            return this.players;
        } catch (error) {
            this.players = [];
            console.error('Failed to load players:', error);
        }
    }

    /**
     * Load live matches data
     */
    async loadLiveMatches() {
        try {
            this.liveMatches = await this.apiCall('live-updates.php');
            return this.liveMatches;
        } catch (error) {
            this.liveMatches = [];
            console.error('Failed to load live matches:', error);
        }
    }

    /**
     * Load statistics data
     */
    async loadStatistics() {
        try {
            // Implementation for statistics loading
            console.log('Loading statistics...');
        } catch (error) {
            console.error('Failed to load statistics:', error);
        }
    }

    /**
     * Update dashboard with current data
     */
    updateDashboard() {
        const activeTournaments = this.tournaments.filter(t => t.status === 'active').length;
        const totalPlayers = this.players.length;

        const tournamentsEl = document.querySelector('[data-stat="tournaments"]');
        const playersEl = document.querySelector('[data-stat="players"]');

        if (tournamentsEl) tournamentsEl.textContent = activeTournaments;
        if (playersEl) playersEl.textContent = totalPlayers;

        // Update recent tournaments
        this.updateRecentTournaments();
        
        // Update live activity
        this.updateLiveActivity();
    }

    /**
     * Update recent tournaments section
     */
    updateRecentTournaments() {
        const container = document.getElementById('recent-tournaments-list');
        if (!container) return;

        const recentTournaments = this.tournaments
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 3);

        if (recentTournaments.length === 0) {
            container.innerHTML = `
                <div class="bg-white rounded-xl p-4 border border-gray-200 text-center">
                    <p class="text-gray-500">No tournaments yet. Create your first tournament!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = recentTournaments.map(tournament => `
            <div class="bg-white border border-gray-200 rounded-xl p-4">
                <div class="flex items-center justify-between mb-2">
                    <h3 class="font-medium">${tournament.name}</h3>
                    <span class="bg-${this.getStatusColor(tournament.status)}-100 text-${this.getStatusColor(tournament.status)}-800 text-xs px-2 py-1 rounded-full">
                        ${this.getStatusLabel(tournament.status)}
                    </span>
                </div>
                <div class="text-sm text-gray-600 mb-3">
                    <div class="flex items-center gap-4">
                        <span class="flex items-center gap-1">
                            <i data-lucide="users" class="w-3 h-3"></i>
                            ${tournament.player_count || 0} players
                        </span>
                        <span class="flex items-center gap-1">
                            <i data-lucide="trophy" class="w-3 h-3"></i>
                            ${this.formatTournamentFormat(tournament.format)}
                        </span>
                    </div>
                </div>
                <button onclick="app.viewTournament(${tournament.id})" class="w-full bg-primary-50 text-primary-600 py-2 rounded-lg font-medium hover:bg-primary-100 transition-colors text-sm">
                    View Tournament
                </button>
            </div>
        `).join('');

        // Re-initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Update live activity section
     */
    updateLiveActivity() {
        const container = document.getElementById('live-activity');
        if (!container) return;

        // Mock live activity data
        const activities = [
            'Match started: John vs Sarah (Table 1)',
            'Tournament "Monday Night" completed',
            'New player registered: Mike Chen',
            'Score update: 11-8 in Set 2'
        ];

        container.innerHTML = activities.slice(0, 3).map(activity => `
            <div class="flex items-center gap-2">
                <div class="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span>${activity}</span>
            </div>
        `).join('');
    }

    /**
     * Handle tournament form submission
     */
    async handleTournamentSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const settings = {};
        
        // Collect checkbox settings
        settings.qr_enabled = formData.get('qr_enabled') === 'on';
        settings.real_time = formData.get('real_time') === 'on';
        settings.multi_table = formData.get('multi_table') === 'on';
        
        const tournamentData = {
            name: formData.get('tournament-name') || document.getElementById('tournament-name')?.value,
            format: formData.get('format'),
            division_type: formData.get('division_type'),
            settings: settings
        };
        
        if (!tournamentData.name) {
            this.showNotification('Tournament name is required', 'error');
            return;
        }
        
        try {
            this.setLoading(true);
            
            const result = await this.apiCall('tournaments.php', {
                method: 'POST',
                body: JSON.stringify(tournamentData)
            });
            
            this.showNotification(`Tournament "${tournamentData.name}" created successfully!`, 'success');
            this.showPage('home');
            await this.loadTournaments(); // Reload tournaments
            
        } catch (error) {
            this.showNotification('Failed to create tournament', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Prompt to add a new player
     */
    promptAddPlayer() {
        const name = prompt('Enter player name:');
        if (name && name.trim()) {
            this.createPlayer(name.trim());
        }
    }

    /**
     * Create a new player
     */
    async createPlayer(name) {
        try {
            this.setLoading(true);
            
            const playerData = {
                name: name,
                skill_level: 'beginner'
            };
            
            await this.apiCall('players.php', {
                method: 'POST',
                body: JSON.stringify(playerData)
            });
            
            this.showNotification(`Player "${name}" added successfully!`, 'success');
            await this.loadPlayers(); // Reload players
            
            if (this.currentPage === 'players') {
                this.updatePlayersList();
            }
            
        } catch (error) {
            this.showNotification('Failed to add player', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Update tournaments list display
     */
    updateTournamentsList() {
        const container = document.getElementById('tournaments-list');
        if (!container) return;

        if (this.tournaments.length === 0) {
            container.innerHTML = `
                <div class="bg-white border border-gray-200 rounded-xl p-6 text-center">
                    <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i data-lucide="trophy" class="w-8 h-8 text-gray-400"></i>
                    </div>
                    <h3 class="font-medium text-gray-900 mb-2">No tournaments yet</h3>
                    <p class="text-gray-500 mb-4">Create your first tournament to get started</p>
                    <button onclick="app.showPage('create-tournament')" class="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors">
                        Create Tournament
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.tournaments.map(tournament => `
            <div class="bg-white border border-gray-200 rounded-xl p-4">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="font-medium">${tournament.name}</h3>
                    <span class="bg-${this.getStatusColor(tournament.status)}-100 text-${this.getStatusColor(tournament.status)}-800 text-xs px-2 py-1 rounded-full">
                        ${this.getStatusLabel(tournament.status)}
                    </span>
                </div>
                
                <div class="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                    <div class="flex items-center gap-2">
                        <i data-lucide="users" class="w-4 h-4"></i>
                        <span>${tournament.player_count || 0} players</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <i data-lucide="calendar" class="w-4 h-4"></i>
                        <span>${this.formatDate(tournament.created_at)}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <i data-lucide="play" class="w-4 h-4"></i>
                        <span>Round ${tournament.current_round}/${tournament.total_rounds || '?'}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <i data-lucide="trophy" class="w-4 h-4"></i>
                        <span>${this.formatTournamentFormat(tournament.format)}</span>
                    </div>
                </div>
                
                ${tournament.progress_percentage !== undefined ? `
                <div class="mb-4">
                    <div class="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>${tournament.progress_percentage}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="bg-primary-600 h-2 rounded-full" style="width: ${tournament.progress_percentage}%"></div>
                    </div>
                </div>
                ` : ''}
                
                <div class="flex gap-3">
                    <button onclick="app.viewTournament(${tournament.id})" class="flex-1 bg-primary-50 text-primary-600 py-2 rounded-lg font-medium hover:bg-primary-100 transition-colors">
                        View Details
                    </button>
                    <button onclick="app.manageTournament(${tournament.id})" class="flex-1 bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors">
                        Manage
                    </button>
                </div>
            </div>
        `).join('');

        // Re-initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Update players list display
     */
    updatePlayersList() {
        const container = document.getElementById('players-list');
        if (!container) return;

        if (this.players.length === 0) {
            container.innerHTML = `
                <div class="bg-white border border-gray-200 rounded-xl p-6 text-center">
                    <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i data-lucide="user-plus" class="w-8 h-8 text-gray-400"></i>
                    </div>
                    <h3 class="font-medium text-gray-900 mb-2">No players yet</h3>
                    <p class="text-gray-500 mb-4">Add your first player to get started</p>
                    <button onclick="app.promptAddPlayer()" class="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors">
                        Add Player
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.players.map(player => `
            <div class="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
                <div class="w-12 h-12 bg-${this.getSkillColor(player.skill_level)}-100 rounded-full flex items-center justify-center">
                    <span class="font-bold text-${this.getSkillColor(player.skill_level)}-600">${this.getPlayerInitials(player.name)}</span>
                </div>
                <div class="flex-1">
                    <h3 class="font-medium">${player.name}</h3>
                    <div class="flex items-center gap-3 text-sm text-gray-600">
                        <span class="bg-${this.getSkillLevelColor(player.skill_level).bg} ${this.getSkillLevelColor(player.skill_level).text} px-2 py-1 rounded text-xs">
                            ${player.skill_level.charAt(0).toUpperCase() + player.skill_level.slice(1)}
                        </span>
                        <span>Rating: ${player.current_rating}</span>
                    </div>
                </div>
                <button onclick="app.editPlayer(${player.id})" class="text-gray-400 hover:text-gray-600">
                    <i data-lucide="more-vertical" class="w-5 h-5"></i>
                </button>
            </div>
        `).join('');

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Update live matches list
     */
    updateLiveMatchesList() {
        const container = document.getElementById('live-matches-list');
        if (!container) return;

        if (this.liveMatches.length === 0) {
            container.innerHTML = `
                <div class="bg-white border border-gray-200 rounded-xl p-6 text-center">
                    <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i data-lucide="play" class="w-8 h-8 text-gray-400"></i>
                    </div>
                    <h3 class="font-medium text-gray-900 mb-2">No live matches</h3>
                    <p class="text-gray-500">Start a tournament to see live matches here</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.liveMatches.map(match => this.createMatchCard(match)).join('');

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Create match card HTML
     */
    createMatchCard(match) {
        return `
            <div class="bg-white border border-gray-200 rounded-xl p-4">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 bg-${match.status === 'in_progress' ? 'green' : 'yellow'}-500 rounded-full ${match.status === 'in_progress' ? 'animate-pulse' : ''}"></div>
                        <span class="font-medium">Table ${match.table_number || '?'} - ${match.status === 'in_progress' ? 'Live' : 'Waiting'}</span>
                    </div>
                    <span class="text-sm text-gray-600">
                        ${match.status === 'in_progress' ? `Set ${match.current_set_number || 1}/${match.best_of || 3}` : 'Ready to start'}
                    </span>
                </div>
                
                <div class="space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span class="text-xs font-bold text-blue-600">${match.player1_initials || this.getPlayerInitials(match.player1_name)}</span>
                            </div>
                            <span class="font-medium">${match.player1_name}</span>
                        </div>
                        ${match.status === 'in_progress' ? `
                        <div class="flex items-center gap-2">
                            <span class="bg-primary-100 text-primary-600 px-2 py-1 rounded text-sm font-bold">${match.current_set_p1_score || 0}</span>
                            <span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm">${match.player1_sets_won}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                <span class="text-xs font-bold text-purple-600">${match.player2_initials || this.getPlayerInitials(match.player2_name)}</span>
                            </div>
                            <span class="font-medium">${match.player2_name}</span>
                        </div>
                        ${match.status === 'in_progress' ? `
                        <div class="flex items-center gap-2">
                            <span class="bg-green-100 text-green-600 px-2 py-1 rounded text-sm font-bold">${match.current_set_p2_score || 0}</span>
                            <span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm">${match.player2_sets_won}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <button onclick="app.inputScore(${match.id})" class="w-full mt-4 bg-${match.status === 'in_progress' ? 'primary' : 'green'}-600 text-white py-2 rounded-lg font-medium hover:bg-${match.status === 'in_progress' ? 'primary' : 'green'}-700 transition-colors">
                    ${match.status === 'in_progress' ? 'Input Score' : 'Start Match'}
                </button>
            </div>
        `;
    }

    /**
     * Setup leaderboard functionality
     */
    setupLeaderboard() {
        const tournamentSelect = document.getElementById('tournament-select');
        if (tournamentSelect) {
            // Populate tournament options
            tournamentSelect.innerHTML = '<option value="">Select Tournament</option>' +
                this.tournaments.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
            
            tournamentSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.loadLeaderboard(e.target.value);
                }
            });
        }
    }

    /**
     * Load leaderboard for tournament
     */
    async loadLeaderboard(tournamentId, division = null) {
        try {
            let endpoint = `leaderboard.php?tournament_id=${tournamentId}`;
            if (division) {
                endpoint += `&division=${division}`;
            }
            const leaderboard = await this.apiCall(endpoint);
            this.updateLeaderboardList(leaderboard);
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
        }
    }

    /**
     * Update leaderboard list
     */
    updateLeaderboardList(leaderboard) {
        const container = document.getElementById('leaderboard-list');
        if (!container) return;

        if (!leaderboard || leaderboard.length === 0) {
            container.innerHTML = `
                <div class="bg-white border border-gray-200 rounded-xl p-6 text-center">
                    <p class="text-gray-500">No leaderboard data available</p>
                </div>
            `;
            return;
        }

        container.innerHTML = leaderboard.map((player, index) => `
            <div class="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
                <div class="w-8 h-8 ${index < 3 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-600'} rounded-full flex items-center justify-center font-bold">
                    ${index + 1}
                </div>
                <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span class="font-bold text-blue-600">${this.getPlayerInitials(player.name)}</span>
                </div>
                <div class="flex-1">
                    <h3 class="font-medium">${player.name}</h3>
                    <div class="text-sm text-gray-600">
                        ${player.wins || 0}W - ${player.losses || 0}L (${player.win_percentage || 0}%)
                    </div>
                </div>
                <div class="text-right text-sm">
                    <div class="font-medium">${player.current_rating}</div>
                    <div class="text-gray-500">Rating</div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Setup auto-refresh for live data
     */
    setupAutoRefresh() {
        setInterval(() => {
            if (this.currentPage === 'matches') {
                this.loadLiveMatches().then(() => this.updateLiveMatchesList());
            }
            if (this.currentPage === 'leaderboard') {
                const tournamentSelect = document.getElementById('tournament-select');
                if (tournamentSelect?.value) {
                    this.loadLeaderboard(tournamentSelect.value);
                }
            }
        }, 5000); // Refresh every 5 seconds
    }

    /**
     * Refresh current page data
     */
    async refreshCurrentPage() {
        this.setLoading(true);
        try {
            await this.loadPageData(this.currentPage);
            this.showNotification('Data refreshed', 'success');
        } catch (error) {
            this.showNotification('Failed to refresh data', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Set loading state
     */
    setLoading(loading) {
        this.isLoading = loading;
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            if (loading) {
                refreshBtn.innerHTML = '<div class="loading-spinner w-5 h-5"></div>';
            } else {
                refreshBtn.innerHTML = '<i data-lucide="refresh-cw" class="w-5 h-5"></i>';
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        }
    }

    /**
     * Event handlers
     */
    viewTournament(id) {
        this.loadLeaderboard(id);
        this.showPage('leaderboard');
    }

    manageTournament(id) {
        this.showNotification('Tournament management feature coming soon!', 'info');
    }

    editPlayer(id) {
        this.showNotification('Player editing feature coming soon!', 'info');
    }

    inputScore(matchId) {
        this.showNotification('Score input feature coming soon!', 'info');
    }

    /**
     * Utility functions
     */
    getPlayerInitials(name) {
        if (!name) return '??';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    getStatusColor(status) {
        const colors = {
            'setup': 'blue',
            'active': 'green', 
            'paused': 'yellow',
            'completed': 'gray',
            'cancelled': 'red'
        };
        return colors[status] || 'gray';
    }

    getStatusLabel(status) {
        const labels = {
            'setup': 'Setup',
            'active': 'Live',
            'paused': 'Paused', 
            'completed': 'Completed',
            'cancelled': 'Cancelled'
        };
        return labels[status] || status;
    }

    getSkillColor(skill) {
        const colors = {
            'beginner': 'gray',
            'intermediate': 'yellow',
            'advanced': 'green'
        };
        return colors[skill] || 'gray';
    }

    getSkillLevelColor(skill) {
        const colors = {
            'beginner': { bg: 'bg-gray-100', text: 'text-gray-800' },
            'intermediate': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
            'advanced': { bg: 'bg-green-100', text: 'text-green-800' }
        };
        return colors[skill] || colors.beginner;
    }

    formatTournamentFormat(format) {
        const formats = {
            'americano': 'Americano',
            'singles': 'Singles',
            'doubles': 'Doubles', 
            'knockout': 'Knockout',
            'round_robin': 'Round Robin',
            'swiss': 'Swiss'
        };
        return formats[format] || format;
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;

        return date.toLocaleDateString();
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notification-container') || document.body;
        
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg text-white max-w-md transition-transform transform translate-x-full ${
            type === 'error' ? 'bg-red-500' : 
            type === 'success' ? 'bg-green-500' :
            type === 'warning' ? 'bg-yellow-500' :
            'bg-blue-500'
        }`;
        
        notification.innerHTML = `
            <div class="flex items-center gap-2">
                <i data-lucide="${type === 'error' ? 'x-circle' : 
                                  type === 'success' ? 'check-circle' :
                                  type === 'warning' ? 'alert-triangle' :
                                  'info'}" class="w-5 h-5 flex-shrink-0"></i>
                <span class="flex-1">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 hover:bg-black/20 rounded p-1">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
        `;
        
        container.appendChild(notification);
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // Slide in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }, duration);
    }
}

// Initialize app when DOM is ready
window.app = new TournamentApp();

// Make app globally available
window.TournamentApp = TournamentApp;