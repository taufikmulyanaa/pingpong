<?php
/**
 * 🏓 Ping Pong Tournament Manager
 * Tournament Management API
 * 
 * @version 1.0.0
 * @author Tournament Manager Team
 * @license MIT
 */

// Include required files
require_once '../config/config.php';
require_once '../config/database.php';

// Set CORS headers
setCORSHeaders();

// Rate limiting
$clientIP = getClientIP();
checkRateLimit($clientIP . '_tournaments');

// Initialize
$method = $_SERVER['REQUEST_METHOD'];
$requestURI = $_SERVER['REQUEST_URI'] ?? '';
$queryParams = $_GET;

// Log API request
logMessage("Tournament API request: $method $requestURI", 'INFO', [
    'method' => $method,
    'ip' => $clientIP,
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
    'params' => $queryParams
]);

try {
    // Initialize database and models
    $db = Database::getInstance();
    
    // Load Tournament model
    require_once '../models/Tournament.php';
    $tournament = new Tournament();
    
    switch ($method) {
        case 'GET':
            handleGetRequest($tournament, $queryParams);
            break;
            
        case 'POST':
            handlePostRequest($tournament);
            break;
            
        case 'PUT':
            handlePutRequest($tournament, $queryParams);
            break;
            
        case 'DELETE':
            handleDeleteRequest($tournament, $queryParams);
            break;
            
        default:
            sendError('Method not allowed', 405, [], 'METHOD_NOT_ALLOWED');
    }
    
} catch (Exception $e) {
    logMessage("Tournament API error: " . $e->getMessage(), 'ERROR', [
        'method' => $method,
        'params' => $queryParams,
        'trace' => DEBUG_MODE ? $e->getTraceAsString() : null
    ]);
    
    sendError('Internal server error', 500, [], 'INTERNAL_ERROR');
}

/**
 * Handle GET requests
 */
function handleGetRequest($tournament, $params) {
    if (isset($params['id'])) {
        // Get specific tournament
        $tournamentId = (int)$params['id'];
        
        if ($tournamentId <= 0) {
            sendError('Invalid tournament ID', 400, [], 'INVALID_TOURNAMENT_ID');
        }
        
        $data = $tournament->getById($tournamentId);
        
        if (!$data) {
            sendError('Tournament not found', 404, [], 'TOURNAMENT_NOT_FOUND');
        }
        
        // Add additional data if requested
        if (isset($params['include'])) {
            $include = explode(',', $params['include']);
            
            if (in_array('players', $include)) {
                $data['players'] = $tournament->getPlayers($tournamentId);
            }
            
            if (in_array('matches', $include)) {
                require_once '../models/Match.php';
                $matchModel = new Match();
                $data['matches'] = $matchModel->getByTournament($tournamentId);
            }
            
            if (in_array('statistics', $include)) {
                require_once '../classes/TournamentStatistics.php';
                $stats = new TournamentStatistics();
                $data['statistics'] = $stats->getTournamentStats($tournamentId);
            }
        }
        
        sendResponse($data, 200, 'Tournament retrieved successfully');
        
    } else {
        // Get tournaments list
        $status = $params['status'] ?? null;
        $limit = isset($params['limit']) ? (int)$params['limit'] : 50;
        $offset = isset($params['offset']) ? (int)$params['offset'] : 0;
        $search = $params['search'] ?? null;
        
        // Validate parameters
        if ($limit > 100) {
            $limit = 100; // Maximum limit
        }
        
        $validStatuses = ['setup', 'active', 'paused', 'completed', 'cancelled'];
        if ($status && !in_array($status, $validStatuses)) {
            sendError('Invalid status parameter', 400, [], 'INVALID_STATUS');
        }
        
        $data = $tournament->getAll($status, $limit, $offset, $search);
        $totalCount = $tournament->getCount($status, $search);
        
        $meta = [
            'total_count' => $totalCount,
            'limit' => $limit,
            'offset' => $offset,
            'has_more' => ($offset + $limit) < $totalCount
        ];
        
        sendResponse($data, 200, 'Tournaments retrieved successfully', $meta);
    }
}

/**
 * Handle POST requests (Create tournament)
 */
function handlePostRequest($tournament) {
    $input = file_get_contents('php://input');
    
    if (empty($input)) {
        sendError('Request body is required', 400, [], 'EMPTY_REQUEST_BODY');
    }
    
    $data = validateJSON($input);
    
    // Validate required fields
    $required = ['name', 'format', 'division_type'];
    validateRequired($data, $required);
    
    // Validate format
    $validFormats = ['americano', 'singles', 'doubles', 'knockout', 'round_robin', 'swiss'];
    if (!in_array($data['format'], $validFormats)) {
        sendError('Invalid tournament format', 400, [], 'INVALID_FORMAT');
    }
    
    // Validate division type
    $validDivisionTypes = ['single', 'skill', 'rating', 'group_stage'];
    if (!in_array($data['division_type'], $validDivisionTypes)) {
        sendError('Invalid division type', 400, [], 'INVALID_DIVISION_TYPE');
    }
    
    // Sanitize input data
    $data['name'] = sanitizeInput($data['name']);
    
    // Validate name length
    if (strlen($data['name']) < 3 || strlen($data['name']) > 100) {
        sendError('Tournament name must be between 3 and 100 characters', 400, [], 'INVALID_NAME_LENGTH');
    }
    
    // Set default values
    $data['status'] = 'setup';
    $data['current_round'] = 0;
    $data['created_by'] = $_SESSION['user_id'] ?? null;
    
    // Validate settings if provided
    if (isset($data['settings']) && !is_array($data['settings'])) {
        sendError('Settings must be an array', 400, [], 'INVALID_SETTINGS');
    }
    
    // Validate max players
    if (isset($data['max_players'])) {
        $maxPlayers = (int)$data['max_players'];
        if ($maxPlayers < MIN_PLAYERS_PER_TOURNAMENT || $maxPlayers > MAX_PLAYERS_PER_TOURNAMENT) {
            sendError(
                "Max players must be between " . MIN_PLAYERS_PER_TOURNAMENT . " and " . MAX_PLAYERS_PER_TOURNAMENT,
                400,
                [],
                'INVALID_MAX_PLAYERS'
            );
        }
        $data['max_players'] = $maxPlayers;
    }
    
    // Validate start date if provided
    if (isset($data['start_date']) && !empty($data['start_date'])) {
        $startDate = date('Y-m-d H:i:s', strtotime($data['start_date']));
        if (!$startDate || strtotime($startDate) < time()) {
            sendError('Start date must be in the future', 400, [], 'INVALID_START_DATE');
        }
        $data['start_date'] = $startDate;
    }
    
    try {
        $db = Database::getInstance();
        $db->beginTransaction();
        
        $tournamentId = $tournament->create($data);
        
        if (!$tournamentId) {
            throw new Exception('Failed to create tournament');
        }
        
        // Create initial tournament statistics
        require_once '../classes/TournamentStatistics.php';
        $stats = new TournamentStatistics();
        $stats->createInitialStats($tournamentId);
        
        $db->commit();
        
        // Get created tournament data
        $createdTournament = $tournament->getById($tournamentId);
        
        logMessage("Tournament created successfully", 'INFO', [
            'tournament_id' => $tournamentId,
            'name' => $data['name'],
            'format' => $data['format'],
            'created_by' => $data['created_by']
        ]);
        
        sendResponse($createdTournament, 201, 'Tournament created successfully');
        
    } catch (Exception $e) {
        $db->rollback();
        
        logMessage("Failed to create tournament", 'ERROR', [
            'error' => $e->getMessage(),
            'data' => $data
        ]);
        
        sendError('Failed to create tournament', 500, [], 'CREATION_FAILED');
    }
}

/**
 * Handle PUT requests (Update tournament)
 */
function handlePutRequest($tournament, $params) {
    if (!isset($params['id'])) {
        sendError('Tournament ID is required', 400, [], 'MISSING_TOURNAMENT_ID');
    }
    
    $tournamentId = (int)$params['id'];
    
    if ($tournamentId <= 0) {
        sendError('Invalid tournament ID', 400, [], 'INVALID_TOURNAMENT_ID');
    }
    
    // Check if tournament exists
    $existingTournament = $tournament->getById($tournamentId);
    if (!$existingTournament) {
        sendError('Tournament not found', 404, [], 'TOURNAMENT_NOT_FOUND');
    }
    
    $input = file_get_contents('php://input');
    if (empty($input)) {
        sendError('Request body is required', 400, [], 'EMPTY_REQUEST_BODY');
    }
    
    $data = validateJSON($input);
    
    // Validate updateable fields
    $allowedFields = ['name', 'status', 'max_players', 'total_rounds', 'settings', 'start_date', 'end_date'];
    $updateData = [];
    
    foreach ($data as $key => $value) {
        if (in_array($key, $allowedFields)) {
            $updateData[$key] = $value;
        }
    }
    
    if (empty($updateData)) {
        sendError('No valid fields to update', 400, [], 'NO_VALID_FIELDS');
    }
    
    // Validate specific fields
    if (isset($updateData['name'])) {
        $updateData['name'] = sanitizeInput($updateData['name']);
        if (strlen($updateData['name']) < 3 || strlen($updateData['name']) > 100) {
            sendError('Tournament name must be between 3 and 100 characters', 400, [], 'INVALID_NAME_LENGTH');
        }
    }
    
    if (isset($updateData['status'])) {
        $validStatuses = ['setup', 'active', 'paused', 'completed', 'cancelled'];
        if (!in_array($updateData['status'], $validStatuses)) {
            sendError('Invalid status', 400, [], 'INVALID_STATUS');
        }
        
        // Validate status transitions
        $validTransitions = [
            'setup' => ['active', 'cancelled'],
            'active' => ['paused', 'completed', 'cancelled'],
            'paused' => ['active', 'cancelled'],
            'completed' => [],
            'cancelled' => []
        ];
        
        $currentStatus = $existingTournament['status'];
        if (!in_array($updateData['status'], $validTransitions[$currentStatus])) {
            sendError("Cannot change status from $currentStatus to {$updateData['status']}", 400, [], 'INVALID_STATUS_TRANSITION');
        }
    }
    
    if (isset($updateData['max_players'])) {
        $maxPlayers = (int)$updateData['max_players'];
        if ($maxPlayers < MIN_PLAYERS_PER_TOURNAMENT || $maxPlayers > MAX_PLAYERS_PER_TOURNAMENT) {
            sendError(
                "Max players must be between " . MIN_PLAYERS_PER_TOURNAMENT . " and " . MAX_PLAYERS_PER_TOURNAMENT,
                400,
                [],
                'INVALID_MAX_PLAYERS'
            );
        }
        $updateData['max_players'] = $maxPlayers;
    }
    
    if (isset($updateData['settings']) && !is_array($updateData['settings'])) {
        sendError('Settings must be an array', 400, [], 'INVALID_SETTINGS');
    }
    
    try {
        $db = Database::getInstance();
        $db->beginTransaction();
        
        $updated = $tournament->update($tournamentId, $updateData);
        
        if (!$updated) {
            throw new Exception('Failed to update tournament');
        }
        
        // Update tournament statistics if status changed to completed
        if (isset($updateData['status']) && $updateData['status'] === 'completed') {
            require_once '../classes/TournamentStatistics.php';
            $stats = new TournamentStatistics();
            $stats->updateTournamentStats($tournamentId);
        }
        
        $db->commit();
        
        // Get updated tournament data
        $updatedTournament = $tournament->getById($tournamentId);
        
        logMessage("Tournament updated successfully", 'INFO', [
            'tournament_id' => $tournamentId,
            'updated_fields' => array_keys($updateData),
            'updated_by' => $_SESSION['user_id'] ?? null
        ]);
        
        sendResponse($updatedTournament, 200, 'Tournament updated successfully');
        
    } catch (Exception $e) {
        $db->rollback();
        
        logMessage("Failed to update tournament", 'ERROR', [
            'tournament_id' => $tournamentId,
            'error' => $e->getMessage(),
            'data' => $updateData
        ]);
        
        sendError('Failed to update tournament', 500, [], 'UPDATE_FAILED');
    }
}

/**
 * Handle DELETE requests (Delete tournament)
 */
function handleDeleteRequest($tournament, $params) {
    if (!isset($params['id'])) {
        sendError('Tournament ID is required', 400, [], 'MISSING_TOURNAMENT_ID');
    }
    
    $tournamentId = (int)$params['id'];
    
    if ($tournamentId <= 0) {
        sendError('Invalid tournament ID', 400, [], 'INVALID_TOURNAMENT_ID');
    }
    
    // Check if tournament exists
    $existingTournament = $tournament->getById($tournamentId);
    if (!$existingTournament) {
        sendError('Tournament not found', 404, [], 'TOURNAMENT_NOT_FOUND');
    }
    
    // Check if tournament can be deleted (only setup tournaments can be deleted)
    if ($existingTournament['status'] !== 'setup') {
        sendError('Only tournaments in setup status can be deleted', 400, [], 'CANNOT_DELETE_ACTIVE_TOURNAMENT');
    }
    
    // Check if tournament has players (optional restriction)
    $playerCount = $tournament->getPlayerCount($tournamentId);
    if ($playerCount > 0 && !isset($params['force'])) {
        sendError(
            'Tournament has players. Use force=1 parameter to delete anyway.',
            400,
            [],
            'TOURNAMENT_HAS_PLAYERS'
        );
    }
    
    try {
        $db = Database::getInstance();
        $db->beginTransaction();
        
        $deleted = $tournament->delete($tournamentId);
        
        if (!$deleted) {
            throw new Exception('Failed to delete tournament');
        }
        
        $db->commit();
        
        logMessage("Tournament deleted successfully", 'INFO', [
            'tournament_id' => $tournamentId,
            'name' => $existingTournament['name'],
            'deleted_by' => $_SESSION['user_id'] ?? null
        ]);
        
        sendResponse([], 200, 'Tournament deleted successfully');
        
    } catch (Exception $e) {
        $db->rollback();
        
        logMessage("Failed to delete tournament", 'ERROR', [
            'tournament_id' => $tournamentId,
            'error' => $e->getMessage()
        ]);
        
        sendError('Failed to delete tournament', 500, [], 'DELETION_FAILED');
    }
}

?>