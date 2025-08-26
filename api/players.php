<?php
/**
 * 🏓 Ping Pong Tournament Manager
 * Player Management API
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
checkRateLimit($clientIP . '_players');

// Initialize
$method = $_SERVER['REQUEST_METHOD'];
$requestURI = $_SERVER['REQUEST_URI'] ?? '';
$queryParams = $_GET;

// Log API request
logMessage("Player API request: $method $requestURI", 'INFO', [
    'method' => $method,
    'ip' => $clientIP,
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
    'params' => $queryParams
]);

try {
    // Initialize database and models
    $db = Database::getInstance();
    
    // Load Player model
    require_once '../models/Player.php';
    $player = new Player();
    
    switch ($method) {
        case 'GET':
            handleGetRequest($player, $queryParams);
            break;
            
        case 'POST':
            handlePostRequest($player);
            break;
            
        case 'PUT':
            handlePutRequest($player, $queryParams);
            break;
            
        case 'DELETE':
            handleDeleteRequest($player, $queryParams);
            break;
            
        default:
            sendError('Method not allowed', 405, [], 'METHOD_NOT_ALLOWED');
    }
    
} catch (Exception $e) {
    logMessage("Player API error: " . $e->getMessage(), 'ERROR', [
        'method' => $method,
        'params' => $queryParams,
        'trace' => DEBUG_MODE ? $e->getTraceAsString() : null
    ]);
    
    sendError('Internal server error', 500, [], 'INTERNAL_ERROR');
}

/**
 * Handle GET requests
 */
function handleGetRequest($player, $params) {
    if (isset($params['id'])) {
        // Get specific player
        $playerId = (int)$params['id'];
        
        if ($playerId <= 0) {
            sendError('Invalid player ID', 400, [], 'INVALID_PLAYER_ID');
        }
        
        if (isset($params['stats'])) {
            // Get player statistics
            $data = $player->getStatistics($playerId);
        } else {
            // Get basic player data
            $data = $player->getById($playerId);
        }
        
        if (!$data) {
            sendError('Player not found', 404, [], 'PLAYER_NOT_FOUND');
        }
        
        // Add additional data if requested
        if (isset($params['include'])) {
            $include = explode(',', $params['include']);
            
            if (in_array('tournaments', $include)) {
                $data['tournaments'] = $player->getTournaments($playerId);
            }
            
            if (in_array('matches', $include)) {
                require_once '../models/Match.php';
                $matchModel = new Match();
                $data['recent_matches'] = $matchModel->getByPlayer($playerId, 10); // Last 10 matches
            }
            
            if (in_array('rating_history', $include)) {
                $data['rating_history'] = $player->getRatingHistory($playerId);
            }
        }
        
        sendResponse($data, 200, 'Player retrieved successfully');
        
    } else {
        // Get players list
        $isActive = !isset($params['include_inactive']);
        $skillLevel = $params['skill_level'] ?? null;
        $limit = isset($params['limit']) ? (int)$params['limit'] : 50;
        $offset = isset($params['offset']) ? (int)$params['offset'] : 0;
        $search = $params['search'] ?? null;
        $sortBy = $params['sort_by'] ?? 'rating'; // rating, name, created_at
        $sortOrder = $params['sort_order'] ?? 'desc'; // asc, desc
        
        // Validate parameters
        if ($limit > 100) {
            $limit = 100; // Maximum limit
        }
        
        $validSkillLevels = ['beginner', 'intermediate', 'advanced'];
        if ($skillLevel && !in_array($skillLevel, $validSkillLevels)) {
            sendError('Invalid skill level parameter', 400, [], 'INVALID_SKILL_LEVEL');
        }
        
        $validSortBy = ['rating', 'name', 'created_at', 'games_played', 'games_won'];
        if (!in_array($sortBy, $validSortBy)) {
            $sortBy = 'rating';
        }
        
        $validSortOrder = ['asc', 'desc'];
        if (!in_array($sortOrder, $validSortOrder)) {
            $sortOrder = 'desc';
        }
        
        $data = $player->getAll($isActive, $skillLevel, $limit, $offset, $search, $sortBy, $sortOrder);
        $totalCount = $player->getCount($isActive, $skillLevel, $search);
        
        $meta = [
            'total_count' => $totalCount,
            'limit' => $limit,
            'offset' => $offset,
            'has_more' => ($offset + $limit) < $totalCount,
            'sort_by' => $sortBy,
            'sort_order' => $sortOrder
        ];
        
        sendResponse($data, 200, 'Players retrieved successfully', $meta);
    }
}

/**
 * Handle POST requests (Create player)
 */
function handlePostRequest($player) {
    $input = file_get_contents('php://input');
    
    if (empty($input)) {
        sendError('Request body is required', 400, [], 'EMPTY_REQUEST_BODY');
    }
    
    $data = validateJSON($input);
    
    // Validate required fields
    $required = ['name'];
    validateRequired($data, $required);
    
    // Sanitize and validate input data
    $data['name'] = sanitizeInput($data['name']);
    
    // Validate name length
    if (strlen($data['name']) < 2 || strlen($data['name']) > 100) {
        sendError('Player name must be between 2 and 100 characters', 400, [], 'INVALID_NAME_LENGTH');
    }
    
    // Validate email if provided
    if (!empty($data['email'])) {
        if (!validateEmail($data['email'])) {
            sendError('Invalid email format', 400, [], 'INVALID_EMAIL');
        }
        
        // Check if email already exists
        if ($player->emailExists($data['email'])) {
            sendError('Email already exists', 400, [], 'EMAIL_EXISTS');
        }
        
        $data['email'] = sanitizeInput($data['email']);
    }
    
    // Validate phone if provided
    if (!empty($data['phone'])) {
        $data['phone'] = sanitizeInput($data['phone']);
        // Basic phone validation (can be enhanced)
        if (!preg_match('/^[\d\s\-\+\(\)\.]+$/', $data['phone'])) {
            sendError('Invalid phone format', 400, [], 'INVALID_PHONE');
        }
    }
    
    // Validate gender if provided
    if (!empty($data['gender'])) {
        $validGenders = ['male', 'female', 'other'];
        if (!in_array($data['gender'], $validGenders)) {
            sendError('Invalid gender. Must be: male, female, or other', 400, [], 'INVALID_GENDER');
        }
    }
    
    // Validate skill level
    if (!empty($data['skill_level'])) {
        $validSkillLevels = ['beginner', 'intermediate', 'advanced'];
        if (!in_array($data['skill_level'], $validSkillLevels)) {
            sendError('Invalid skill level. Must be: beginner, intermediate, or advanced', 400, [], 'INVALID_SKILL_LEVEL');
        }
    } else {
        $data['skill_level'] = 'beginner'; // Default
    }
    
    // Set default rating if not provided
    if (empty($data['current_rating'])) {
        $data['current_rating'] = DEFAULT_RATING;
    } else {
        $rating = (int)$data['current_rating'];
        if ($rating < RATING_MIN || $rating > RATING_MAX) {
            sendError(
                "Rating must be between " . RATING_MIN . " and " . RATING_MAX,
                400,
                [],
                'INVALID_RATING'
            );
        }
        $data['current_rating'] = $rating;
    }
    
    // Set created by
    $data['created_by'] = $_SESSION['user_id'] ?? null;
    
    try {
        $db = Database::getInstance();
        $db->beginTransaction();
        
        $playerId = $player->create($data);
        
        if (!$playerId) {
            throw new Exception('Failed to create player');
        }
        
        // Record initial rating in rating history
        $player->recordRatingHistory($playerId, $data['current_rating'], $data['current_rating'], 0, 'initial_rating');
        
        $db->commit();
        
        // Get created player data
        $createdPlayer = $player->getById($playerId);
        
        logMessage("Player created successfully", 'INFO', [
            'player_id' => $playerId,
            'name' => $data['name'],
            'email' => $data['email'] ?? null,
            'skill_level' => $data['skill_level'],
            'created_by' => $data['created_by']
        ]);
        
        sendResponse($createdPlayer, 201, 'Player created successfully');
        
    } catch (Exception $e) {
        $db->rollback();
        
        logMessage("Failed to create player", 'ERROR', [
            'error' => $e->getMessage(),
            'data' => $data
        ]);
        
        if (strpos($e->getMessage(), 'Duplicate entry') !== false) {
            sendError('Player with this email already exists', 400, [], 'DUPLICATE_EMAIL');
        }
        
        sendError('Failed to create player', 500, [], 'CREATION_FAILED');
    }
}

/**
 * Handle PUT requests (Update player)
 */
function handlePutRequest($player, $params) {
    if (!isset($params['id'])) {
        sendError('Player ID is required', 400, [], 'MISSING_PLAYER_ID');
    }
    
    $playerId = (int)$params['id'];
    
    if ($playerId <= 0) {
        sendError('Invalid player ID', 400, [], 'INVALID_PLAYER_ID');
    }
    
    // Check if player exists
    $existingPlayer = $player->getById($playerId);
    if (!$existingPlayer) {
        sendError('Player not found', 404, [], 'PLAYER_NOT_FOUND');
    }
    
    $input = file_get_contents('php://input');
    if (empty($input)) {
        sendError('Request body is required', 400, [], 'EMPTY_REQUEST_BODY');
    }
    
    $data = validateJSON($input);
    
    // Validate updateable fields
    $allowedFields = ['name', 'email', 'phone', 'gender', 'skill_level', 'is_active', 'profile_image'];
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
        if (strlen($updateData['name']) < 2 || strlen($updateData['name']) > 100) {
            sendError('Player name must be between 2 and 100 characters', 400, [], 'INVALID_NAME_LENGTH');
        }
    }
    
    if (isset($updateData['email'])) {
        if (!empty($updateData['email'])) {
            if (!validateEmail($updateData['email'])) {
                sendError('Invalid email format', 400, [], 'INVALID_EMAIL');
            }
            
            // Check if email already exists for other players
            if ($player->emailExists($updateData['email'], $playerId)) {
                sendError('Email already exists', 400, [], 'EMAIL_EXISTS');
            }
        }
        $updateData['email'] = sanitizeInput($updateData['email']);
    }
    
    if (isset($updateData['phone'])) {
        if (!empty($updateData['phone'])) {
            $updateData['phone'] = sanitizeInput($updateData['phone']);
            if (!preg_match('/^[\d\s\-\+\(\)\.]+$/', $updateData['phone'])) {
                sendError('Invalid phone format', 400, [], 'INVALID_PHONE');
            }
        }
    }
    
    if (isset($updateData['gender'])) {
        $validGenders = ['male', 'female', 'other'];
        if (!empty($updateData['gender']) && !in_array($updateData['gender'], $validGenders)) {
            sendError('Invalid gender. Must be: male, female, or other', 400, [], 'INVALID_GENDER');
        }
    }
    
    if (isset($updateData['skill_level'])) {
        $validSkillLevels = ['beginner', 'intermediate', 'advanced'];
        if (!in_array($updateData['skill_level'], $validSkillLevels)) {
            sendError('Invalid skill level. Must be: beginner, intermediate, or advanced', 400, [], 'INVALID_SKILL_LEVEL');
        }
    }
    
    if (isset($updateData['is_active'])) {
        $updateData['is_active'] = (bool)$updateData['is_active'];
    }
    
    try {
        $db = Database::getInstance();
        $db->beginTransaction();
        
        $updated = $player->update($playerId, $updateData);
        
        if (!$updated) {
            throw new Exception('Failed to update player');
        }
        
        $db->commit();
        
        // Get updated player data
        $updatedPlayer = $player->getById($playerId);
        
        logMessage("Player updated successfully", 'INFO', [
            'player_id' => $playerId,
            'updated_fields' => array_keys($updateData),
            'updated_by' => $_SESSION['user_id'] ?? null
        ]);
        
        sendResponse($updatedPlayer, 200, 'Player updated successfully');
        
    } catch (Exception $e) {
        $db->rollback();
        
        logMessage("Failed to update player", 'ERROR', [
            'player_id' => $playerId,
            'error' => $e->getMessage(),
            'data' => $updateData
        ]);
        
        if (strpos($e->getMessage(), 'Duplicate entry') !== false) {
            sendError('Email already exists', 400, [], 'DUPLICATE_EMAIL');
        }
        
        sendError('Failed to update player', 500, [], 'UPDATE_FAILED');
    }
}

/**
 * Handle DELETE requests (Soft delete player)
 */
function handleDeleteRequest($player, $params) {
    if (!isset($params['id'])) {
        sendError('Player ID is required', 400, [], 'MISSING_PLAYER_ID');
    }
    
    $playerId = (int)$params['id'];
    
    if ($playerId <= 0) {
        sendError('Invalid player ID', 400, [], 'INVALID_PLAYER_ID');
    }
    
    // Check if player exists
    $existingPlayer = $player->getById($playerId);
    if (!$existingPlayer) {
        sendError('Player not found', 404, [], 'PLAYER_NOT_FOUND');
    }
    
    // Check if player is in active tournaments
    $activeTournaments = $player->getActiveTournaments($playerId);
    if (!empty($activeTournaments) && !isset($params['force'])) {
        sendError(
            'Player is in active tournaments. Use force=1 parameter to deactivate anyway.',
            400,
            ['tournaments' => $activeTournaments],
            'PLAYER_IN_ACTIVE_TOURNAMENTS'
        );
    }
    
    try {
        $db = Database::getInstance();
        $db->beginTransaction();
        
        // Soft delete (deactivate) instead of hard delete
        $deactivated = $player->update($playerId, ['is_active' => false]);
        
        if (!$deactivated) {
            throw new Exception('Failed to deactivate player');
        }
        
        $db->commit();
        
        logMessage("Player deactivated successfully", 'INFO', [
            'player_id' => $playerId,
            'name' => $existingPlayer['name'],
            'deactivated_by' => $_SESSION['user_id'] ?? null
        ]);
        
        sendResponse([], 200, 'Player deactivated successfully');
        
    } catch (Exception $e) {
        $db->rollback();
        
        logMessage("Failed to deactivate player", 'ERROR', [
            'player_id' => $playerId,
            'error' => $e->getMessage()
        ]);
        
        sendError('Failed to deactivate player', 500, [], 'DEACTIVATION_FAILED');
    }
}

?>