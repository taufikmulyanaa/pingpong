<?php
/**
 * 🏓 Ping Pong Tournament Manager
 * Application Configuration
 * 
 * @version 1.0.0
 * @author Tournament Manager Team
 * @license MIT
 */

// Prevent direct access and check PHP version
if (!defined('PHP_VERSION_ID') || PHP_VERSION_ID < 80200) {
    die('PHP 8.2+ is required to run this application.');
}

// Application Information
define('APP_NAME', 'Ping Pong Tournament Manager');
define('APP_VERSION', '1.0.0');
define('APP_ROOT', dirname(__DIR__));
define('BASE_URL', 'http' . (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] ? 's' : '') . '://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['SCRIPT_NAME']));
define('API_BASE_URL', BASE_URL . '/api');

// Environment Configuration
define('ENVIRONMENT', $_ENV['APP_ENV'] ?? 'production'); // development, staging, production
define('DEBUG_MODE', ENVIRONMENT === 'development');

// Time zone configuration
date_default_timezone_set('Asia/Jakarta');

// Security Configuration
define('SESSION_LIFETIME', 24 * 60 * 60); // 24 hours
define('CSRF_TOKEN_LENGTH', 32);
define('PASSWORD_MIN_LENGTH', 8);

// Database Configuration Constants
define('DB_CHARSET', 'utf8mb4');
define('DB_COLLATION', 'utf8mb4_unicode_ci');

// File Upload Configuration
define('UPLOAD_MAX_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_IMAGE_TYPES', ['jpg', 'jpeg', 'png', 'gif', 'webp']);
define('UPLOAD_PATH', APP_ROOT . '/uploads/');
define('TEMP_PATH', APP_ROOT . '/temp/');
define('LOGS_PATH', APP_ROOT . '/logs/');

// Tournament Configuration
define('DEFAULT_RATING', 1000);
define('RATING_K_FACTOR', 32);
define('RATING_MIN', 100);
define('RATING_MAX', 3000);
define('MAX_PLAYERS_PER_TOURNAMENT', 64);
define('MIN_PLAYERS_PER_TOURNAMENT', 4);
define('DEFAULT_MATCH_DURATION', 20); // minutes
define('MAX_SETS_PER_MATCH', 7);
define('DEFAULT_POINTS_TO_WIN_SET', 11);

// API Configuration
define('API_RATE_LIMIT', 100); // requests per minute
define('API_TIMEOUT', 30); // seconds
define('API_VERSION', 'v1');

// Cache Configuration
define('CACHE_ENABLED', true);
define('CACHE_LIFETIME', 300); // 5 minutes
define('CACHE_PATH', APP_ROOT . '/cache/');

// Error Handling Configuration
if (DEBUG_MODE) {
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', 0);
    ini_set('display_startup_errors', 0);
    error_reporting(0);
}

// Session Configuration
if (!session_id()) {
    ini_set('session.cookie_lifetime', SESSION_LIFETIME);
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_secure', isset($_SERVER['HTTPS']));
    ini_set('session.use_strict_mode', 1);
    session_start();
}

/**
 * CORS Headers for API
 */
function setCORSHeaders() {
    // Allow from any origin
    if (isset($_SERVER['HTTP_ORIGIN'])) {
        header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 86400'); // cache for 1 day
    }

    // Access-Control headers are received during OPTIONS requests
    if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
        if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
            header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
        }

        if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
            header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
        }

        http_response_code(200);
        exit(0);
    }

    header('Content-Type: application/json; charset=UTF-8');
}

/**
 * Send JSON Response
 */
function sendResponse($data = [], $status = 200, $message = '', $meta = []) {
    http_response_code($status);
    
    $response = [
        'success' => $status >= 200 && $status < 300,
        'status' => $status,
        'message' => $message,
        'data' => $data,
        'meta' => array_merge([
            'timestamp' => date('c'),
            'version' => APP_VERSION,
            'endpoint' => $_SERVER['REQUEST_URI'] ?? '',
            'method' => $_SERVER['REQUEST_METHOD'] ?? ''
        ], $meta),
    ];
    
    // Add debug information in development
    if (DEBUG_MODE) {
        $response['debug'] = [
            'memory_usage' => memory_get_usage(true),
            'execution_time' => microtime(true) - $_SERVER['REQUEST_TIME_FLOAT'],
            'queries' => 0 // This would be populated by database class
        ];
    }
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR);
    exit;
}

/**
 * Send Error Response
 */
function sendError($message, $status = 400, $errors = [], $code = null) {
    $meta = [];
    if ($code) {
        $meta['error_code'] = $code;
    }
    
    if (DEBUG_MODE && !empty($errors)) {
        $meta['errors'] = $errors;
    }
    
    sendResponse([], $status, $message, $meta);
}

/**
 * Validate Required Parameters
 */
function validateRequired($data, $required) {
    $missing = [];
    foreach ($required as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            $missing[] = $field;
        }
    }
    
    if (!empty($missing)) {
        sendError('Missing required fields: ' . implode(', ', $missing), 400, $missing, 'MISSING_FIELDS');
    }
    
    return true;
}

/**
 * Auto-load Classes
 */
spl_autoload_register(function ($class) {
    $directories = [
        APP_ROOT . '/models/',
        APP_ROOT . '/classes/',
        APP_ROOT . '/includes/',
        APP_ROOT . '/config/'
    ];
    
    foreach ($directories as $dir) {
        $file = $dir . $class . '.php';
        if (file_exists($file)) {
            require_once $file;
            return;
        }
    }
    
    // Log missing class if in debug mode
    if (DEBUG_MODE) {
        error_log("Class not found: $class");
    }
});

/**
 * Security Functions
 */

/**
 * Sanitize input data
 */
function sanitizeInput($data) {
    if (is_array($data)) {
        return array_map('sanitizeInput', $data);
    }
    
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}

/**
 * Validate email address
 */
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Generate secure random token
 */
function generateToken($length = 32) {
    return bin2hex(random_bytes($length / 2));
}

/**
 * Generate CSRF token
 */
function generateCSRFToken() {
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = generateToken(CSRF_TOKEN_LENGTH);
    }
    return $_SESSION['csrf_token'];
}

/**
 * Verify CSRF token
 */
function verifyCSRFToken($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Hash password securely
 */
function hashPassword($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

/**
 * Verify password hash
 */
function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

/**
 * Utility Functions
 */

/**
 * Log message to file
 */
function logMessage($message, $level = 'INFO', $context = []) {
    if (!is_dir(LOGS_PATH)) {
        mkdir(LOGS_PATH, 0755, true);
    }
    
    $logFile = LOGS_PATH . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $contextStr = !empty($context) ? ' ' . json_encode($context) : '';
    $logEntry = "[$timestamp] [$level] $message$contextStr" . PHP_EOL;
    
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    
    // Also log to error_log in debug mode
    if (DEBUG_MODE) {
        error_log("[$level] $message");
    }
}

/**
 * Format file size
 */
function formatFileSize($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
        $bytes /= 1024;
    }
    
    return round($bytes, $precision) . ' ' . $units[$i];
}

/**
 * Generate UUID v4
 */
function generateUUID() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

/**
 * Validate JSON input
 */
function validateJSON($input) {
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendError('Invalid JSON format: ' . json_last_error_msg(), 400, [], 'INVALID_JSON');
    }
    
    return $data;
}

/**
 * Rate limiting function
 */
function checkRateLimit($key, $limit = null, $window = 60) {
    if (!$limit) {
        $limit = API_RATE_LIMIT;
    }
    
    $cacheKey = 'rate_limit_' . md5($key);
    $cacheFile = CACHE_PATH . $cacheKey . '.txt';
    
    if (!is_dir(CACHE_PATH)) {
        mkdir(CACHE_PATH, 0755, true);
    }
    
    $now = time();
    $requests = [];
    
    // Read existing requests
    if (file_exists($cacheFile)) {
        $data = file_get_contents($cacheFile);
        $requests = json_decode($data, true) ?: [];
    }
    
    // Remove old requests outside the window
    $requests = array_filter($requests, function($timestamp) use ($now, $window) {
        return ($now - $timestamp) < $window;
    });
    
    // Check if limit exceeded
    if (count($requests) >= $limit) {
        sendError('Rate limit exceeded. Please try again later.', 429, [], 'RATE_LIMIT_EXCEEDED');
    }
    
    // Add current request
    $requests[] = $now;
    
    // Save updated requests
    file_put_contents($cacheFile, json_encode($requests));
    
    return true;
}

/**
 * Get client IP address
 */
function getClientIP() {
    $ipKeys = ['HTTP_CF_CONNECTING_IP', 'HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_FORWARDED', 'HTTP_FORWARDED_FOR', 'HTTP_FORWARDED', 'REMOTE_ADDR'];
    
    foreach ($ipKeys as $key) {
        if (array_key_exists($key, $_SERVER) === true) {
            foreach (explode(',', $_SERVER[$key]) as $ip) {
                $ip = trim($ip);
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
            }
        }
    }
    
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

/**
 * Create required directories
 */
function createRequiredDirectories() {
    $directories = [UPLOAD_PATH, TEMP_PATH, LOGS_PATH, CACHE_PATH];
    
    foreach ($directories as $dir) {
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        
        // Create .htaccess for security
        $htaccess = $dir . '.htaccess';
        if (!file_exists($htaccess)) {
            file_put_contents($htaccess, "Options -Indexes\nDeny from all\n");
        }
    }
}

// Create required directories on load
createRequiredDirectories();

/**
 * Application State Management
 */
class AppState {
    private static $instance = null;
    private $data = [];
    
    private function __construct() {
        $this->data = $_SESSION['app_state'] ?? [];
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function get($key, $default = null) {
        return $this->data[$key] ?? $default;
    }
    
    public function set($key, $value) {
        $this->data[$key] = $value;
        $_SESSION['app_state'] = $this->data;
    }
    
    public function has($key) {
        return isset($this->data[$key]);
    }
    
    public function remove($key) {
        unset($this->data[$key]);
        $_SESSION['app_state'] = $this->data;
    }
    
    public function clear() {
        $this->data = [];
        unset($_SESSION['app_state']);
    }
}

// Initialize application state
$appState = AppState::getInstance();

// Log application start in debug mode
if (DEBUG_MODE) {
    logMessage('Application initialized', 'DEBUG', [
        'version' => APP_VERSION,
        'environment' => ENVIRONMENT,
        'php_version' => PHP_VERSION,
        'memory_limit' => ini_get('memory_limit'),
        'request_uri' => $_SERVER['REQUEST_URI'] ?? '',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? ''
    ]);
}

?>