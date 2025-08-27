<?php
/**
 * 🏓 Ping Pong Tournament Manager
 * Installation Setup Script
 * 
 * @version 1.0.0
 * @author Tournament Manager Team
 * @license MIT
 */

// Start session for setup process
session_start();

// Basic error reporting for setup
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Check PHP version
if (version_compare(PHP_VERSION, '8.2.0', '<')) {
    die('PHP 8.2.0 or higher is required. You are running PHP ' . PHP_VERSION);
}

// Define paths
define('APP_ROOT', dirname(__DIR__));
define('CONFIG_PATH', APP_ROOT . '/config/');

// Check if already installed
if (file_exists(CONFIG_PATH . '.installed')) {
    header('Location: ../index.php');
    exit();
}

$step = $_GET['step'] ?? 1;
$error = '';
$success = '';

// Handle form submissions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    switch ($step) {
        case 2:
            // Database configuration step
            $dbData = [
                'host' => $_POST['db_host'] ?? 'localhost',
                'port' => $_POST['db_port'] ?? 3306,
                'database' => $_POST['db_name'] ?? 'ping_pong_tournament',
                'username' => $_POST['db_user'] ?? 'root',
                'password' => $_POST['db_pass'] ?? ''
            ];
            
            // Test database connection
            try {
                $dsn = "mysql:host={$dbData['host']};port={$dbData['port']};charset=utf8mb4";
                $pdo = new PDO($dsn, $dbData['username'], $dbData['password'], [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
                ]);
                
                // Try to create database if it doesn't exist
                $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbData['database']}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                
                // Store database config in session
                $_SESSION['db_config'] = $dbData;
                $success = 'Database connection successful!';
                
                // Move to next step after 2 seconds
                header("refresh:2;url=?step=3");
                
            } catch (PDOException $e) {
                $error = 'Database connection failed: ' . $e->getMessage();
            }
            break;
            
        case 3:
            // Create database tables and complete installation
            if (isset($_SESSION['db_config'])) {
                try {
                    $dbConfig = $_SESSION['db_config'];
                    
                    // Connect to database
                    $dsn = "mysql:host={$dbConfig['host']};port={$dbConfig['port']};dbname={$dbConfig['database']};charset=utf8mb4";
                    $pdo = new PDO($dsn, $dbConfig['username'], $dbConfig['password'], [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
                    ]);
                    
                    // Create database tables
                    createDatabaseTables($pdo);
                    
                    // Update database configuration file
                    updateDatabaseConfig($dbConfig);
                    
                    // Create installation marker
                    file_put_contents(CONFIG_PATH . '.installed', date('Y-m-d H:i:s'));
                    
                    // Clear session data
                    unset($_SESSION['db_config']);
                    
                    $success = 'Installation completed successfully!';
                    
                    // Redirect to main application
                    header("refresh:3;url=../index.php");
                    
                } catch (Exception $e) {
                    $error = 'Installation failed: ' . $e->getMessage();
                }
            } else {
                $error = 'Database configuration not found. Please start over.';
                header("refresh:2;url=?step=1");
            }
            break;
    }
}

/**
 * Create database tables
 */
function createDatabaseTables($pdo) {
    $tables = [
        // Players table
        "CREATE TABLE IF NOT EXISTS `players` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `name` varchar(100) NOT NULL,
            `email` varchar(100) DEFAULT NULL,
            `phone` varchar(20) DEFAULT NULL,
            `gender` enum('male','female','other') DEFAULT NULL,
            `skill_level` enum('beginner','intermediate','advanced') DEFAULT 'beginner',
            `current_rating` int(11) DEFAULT 1000,
            `games_played` int(11) DEFAULT 0,
            `games_won` int(11) DEFAULT 0,
            `games_lost` int(11) DEFAULT 0,
            `is_active` tinyint(1) DEFAULT 1,
            `profile_image` varchar(255) DEFAULT NULL,
            `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            `created_by` int(11) DEFAULT NULL,
            PRIMARY KEY (`id`),
            UNIQUE KEY `email` (`email`),
            KEY `skill_level` (`skill_level`),
            KEY `current_rating` (`current_rating`),
            KEY `is_active` (`is_active`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        
        // Tournaments table
        "CREATE TABLE IF NOT EXISTS `tournaments` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `name` varchar(100) NOT NULL,
            `format` enum('americano','singles','doubles','knockout','round_robin','swiss') NOT NULL,
            `division_type` enum('single','skill','rating','group_stage') DEFAULT 'single',
            `status` enum('setup','active','paused','completed','cancelled') DEFAULT 'setup',
            `max_players` int(11) DEFAULT 32,
            `current_round` int(11) DEFAULT 0,
            `total_rounds` int(11) DEFAULT NULL,
            `settings` json DEFAULT NULL,
            `start_date` datetime DEFAULT NULL,
            `end_date` datetime DEFAULT NULL,
            `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            `created_by` int(11) DEFAULT NULL,
            PRIMARY KEY (`id`),
            KEY `format` (`format`),
            KEY `status` (`status`),
            KEY `start_date` (`start_date`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        
        // Tournament Players (many-to-many)
        "CREATE TABLE IF NOT EXISTS `tournament_players` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `tournament_id` int(11) NOT NULL,
            `player_id` int(11) NOT NULL,
            `division` varchar(50) DEFAULT NULL,
            `seed` int(11) DEFAULT NULL,
            `joined_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `tournament_player` (`tournament_id`, `player_id`),
            KEY `tournament_id` (`tournament_id`),
            KEY `player_id` (`player_id`),
            FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE,
            FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        
        // Matches table
        "CREATE TABLE IF NOT EXISTS `matches` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `tournament_id` int(11) NOT NULL,
            `round_number` int(11) NOT NULL,
            `match_number` int(11) NOT NULL,
            `table_number` int(11) DEFAULT NULL,
            `player1_id` int(11) NOT NULL,
            `player2_id` int(11) NOT NULL,
            `player1_partner_id` int(11) DEFAULT NULL,
            `player2_partner_id` int(11) DEFAULT NULL,
            `status` enum('scheduled','in_progress','completed','cancelled') DEFAULT 'scheduled',
            `winner_id` int(11) DEFAULT NULL,
            `player1_sets_won` int(11) DEFAULT 0,
            `player2_sets_won` int(11) DEFAULT 0,
            `sets_data` json DEFAULT NULL,
            `started_at` datetime DEFAULT NULL,
            `completed_at` datetime DEFAULT NULL,
            `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `tournament_id` (`tournament_id`),
            KEY `player1_id` (`player1_id`),
            KEY `player2_id` (`player2_id`),
            KEY `winner_id` (`winner_id`),
            KEY `status` (`status`),
            KEY `round_number` (`round_number`),
            FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE,
            FOREIGN KEY (`player1_id`) REFERENCES `players` (`id`) ON DELETE CASCADE,
            FOREIGN KEY (`player2_id`) REFERENCES `players` (`id`) ON DELETE CASCADE,
            FOREIGN KEY (`winner_id`) REFERENCES `players` (`id`) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        
        // Rating History
        "CREATE TABLE IF NOT EXISTS `rating_history` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `player_id` int(11) NOT NULL,
            `old_rating` int(11) NOT NULL,
            `new_rating` int(11) NOT NULL,
            `rating_change` int(11) NOT NULL,
            `match_id` int(11) DEFAULT NULL,
            `reason` varchar(100) DEFAULT 'match_result',
            `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `player_id` (`player_id`),
            KEY `match_id` (`match_id`),
            KEY `created_at` (`created_at`),
            FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE,
            FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        
        // System logs
        "CREATE TABLE IF NOT EXISTS `system_logs` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `level` varchar(20) NOT NULL,
            `message` text NOT NULL,
            `context` json DEFAULT NULL,
            `ip_address` varchar(45) DEFAULT NULL,
            `user_agent` varchar(500) DEFAULT NULL,
            `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `level` (`level`),
            KEY `created_at` (`created_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ];
    
    foreach ($tables as $sql) {
        $pdo->exec($sql);
    }
}

/**
 * Update database configuration file
 */
function updateDatabaseConfig($config) {
    $configTemplate = '<?php
/**
 * Database Configuration
 * Generated by installation script
 */

class Database {
    private $host = \'' . addslashes($config['host']) . '\';
    private $db_name = \'' . addslashes($config['database']) . '\';
    private $username = \'' . addslashes($config['username']) . '\';
    private $password = \'' . addslashes($config['password']) . '\';
    private $port = ' . intval($config['port']) . ';
    private $charset = \'utf8mb4\';
    
    private $pdo;
    private static $instance = null;
    private $queryCount = 0;
    private $queryLog = [];
    private $transactionLevel = 0;
    
    private function __construct() {
        $this->connect();
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function __clone() {
        throw new Exception("Cannot clone Database instance");
    }
    
    public function __wakeup() {
        throw new Exception("Cannot unserialize Database instance");
    }
    
    private function connect() {
        try {
            $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->db_name};charset={$this->charset}";
            
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_PERSISTENT => true,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$this->charset} COLLATE utf8mb4_unicode_ci",
                PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,
                PDO::ATTR_TIMEOUT => 30
            ];
            
            $this->pdo = new PDO($dsn, $this->username, $this->password, $options);
            $this->pdo->exec("SET sql_mode = \'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION\'");
            $this->pdo->exec("SET time_zone = \'+07:00\'");
            
        } catch(PDOException $e) {
            throw new Exception("Database connection failed: " . $e->getMessage());
        }
    }
    
    public function getConnection() {
        if (!$this->isConnected()) {
            $this->connect();
        }
        return $this->pdo;
    }
    
    private function isConnected() {
        try {
            $this->pdo->query(\'SELECT 1\');
            return true;
        } catch (PDOException $e) {
            return false;
        }
    }
    
    public function beginTransaction() {
        try {
            if ($this->transactionLevel === 0) {
                $result = $this->pdo->beginTransaction();
            } else {
                $savepointName = \'savepoint_\' . $this->transactionLevel;
                $this->pdo->exec("SAVEPOINT $savepointName");
                $result = true;
            }
            $this->transactionLevel++;
            return $result;
        } catch (PDOException $e) {
            throw $e;
        }
    }
    
    public function commit() {
        try {
            $this->transactionLevel--;
            if ($this->transactionLevel === 0) {
                $result = $this->pdo->commit();
            } else {
                $savepointName = \'savepoint_\' . $this->transactionLevel;
                $this->pdo->exec("RELEASE SAVEPOINT $savepointName");
                $result = true;
            }
            return $result;
        } catch (PDOException $e) {
            throw $e;
        }
    }
    
    public function rollback() {
        try {
            $this->transactionLevel--;
            if ($this->transactionLevel === 0) {
                $result = $this->pdo->rollback();
            } else {
                $savepointName = \'savepoint_\' . $this->transactionLevel;
                $this->pdo->exec("ROLLBACK TO SAVEPOINT $savepointName");
                $result = true;
            }
            return $result;
        } catch (PDOException $e) {
            throw $e;
        }
    }
    
    public function execute($sql, $params = []) {
        $startTime = microtime(true);
        try {
            $stmt = $this->pdo->prepare($sql);
            $result = $stmt->execute($params);
            $executionTime = microtime(true) - $startTime;
            $this->logQuery($sql, $params, $executionTime);
            return $stmt;
        } catch (PDOException $e) {
            throw $e;
        }
    }
    
    public function fetchOne($sql, $params = []) {
        $stmt = $this->execute($sql, $params);
        return $stmt->fetch();
    }
    
    public function fetchAll($sql, $params = []) {
        $stmt = $this->execute($sql, $params);
        return $stmt->fetchAll();
    }
    
    public function insert($table, $data) {
        $columns = array_keys($data);
        $placeholders = \':\' . implode(\', :\', $columns);
        $columnsList = implode(\', \', $columns);
        $sql = "INSERT INTO `$table` ($columnsList) VALUES ($placeholders)";
        $this->execute($sql, $data);
        return $this->pdo->lastInsertId();
    }
    
    public function update($table, $data, $where, $whereParams = []) {
        $setClause = [];
        foreach (array_keys($data) as $column) {
            $setClause[] = "`$column` = :$column";
        }
        $setClause = implode(\', \', $setClause);
        $sql = "UPDATE `$table` SET $setClause WHERE $where";
        $params = array_merge($data, $whereParams);
        $stmt = $this->execute($sql, $params);
        return $stmt->rowCount();
    }
    
    public function delete($table, $where, $whereParams = []) {
        $sql = "DELETE FROM `$table` WHERE $where";
        $stmt = $this->execute($sql, $whereParams);
        return $stmt->rowCount();
    }
    
    private function logQuery($sql, $params, $executionTime) {
        $this->queryCount++;
        if (defined(\'DEBUG_MODE\') && DEBUG_MODE) {
            $this->queryLog[] = [
                \'sql\' => $sql,
                \'params\' => $params,
                \'execution_time\' => round($executionTime * 1000, 2),
                \'timestamp\' => microtime(true)
            ];
        }
    }
    
    public function getQueryStats() {
        return [
            \'query_count\' => $this->queryCount,
            \'query_log\' => $this->queryLog
        ];
    }
    
    public function testConnection() {
        try {
            $this->pdo->query(\'SELECT 1\');
            return true;
        } catch (PDOException $e) {
            return false;
        }
    }
}
?>';
    
    file_put_contents(CONFIG_PATH . 'database.php', $configTemplate);
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🏓 Ping Pong Tournament Manager - Setup</title>
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
    
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    }
                }
            }
        }
    </script>
    
    <style>
        .step {
            display: none;
        }
        .step.active {
            display: block;
        }
    </style>
</head>
<body class="bg-gray-50 font-sans antialiased">
    <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full space-y-8">
            <!-- Header -->
            <div class="text-center">
                <div class="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
                    <span class="text-white font-bold text-2xl">🏓</span>
                </div>
                <h2 class="mt-6 text-3xl font-bold text-gray-900">
                    Tournament Manager
                </h2>
                <p class="mt-2 text-sm text-gray-600">
                    Setup wizard - Step <?php echo $step; ?> of 3
                </p>
            </div>

            <!-- Progress Bar -->
            <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-blue-600 h-2 rounded-full" style="width: <?php echo ($step / 3) * 100; ?>%"></div>
            </div>

            <!-- Notifications -->
            <?php if ($error): ?>
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                <div class="flex">
                    <i data-lucide="x-circle" class="w-5 h-5 text-red-400"></i>
                    <div class="ml-3">
                        <p class="text-sm text-red-800"><?php echo htmlspecialchars($error); ?></p>
                    </div>
                </div>
            </div>
            <?php endif; ?>

            <?php if ($success): ?>
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                <div class="flex">
                    <i data-lucide="check-circle" class="w-5 h-5 text-green-400"></i>
                    <div class="ml-3">
                        <p class="text-sm text-green-800"><?php echo htmlspecialchars($success); ?></p>
                    </div>
                </div>
            </div>
            <?php endif; ?>

            <!-- Step 1: Welcome -->
            <?php if ($step == 1): ?>
            <div class="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
                <div class="text-center">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">Welcome to Setup</h3>
                    <p class="text-sm text-gray-600 mb-6">
                        This wizard will help you configure your Ping Pong Tournament Manager installation.
                    </p>
                    
                    <!-- System Requirements -->
                    <div class="text-left bg-gray-50 rounded-lg p-4 mb-6">
                        <h4 class="font-medium text-gray-900 mb-2">System Requirements Check</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex items-center justify-between">
                                <span>PHP Version (8.2+ required)</span>
                                <span class="text-green-600 flex items-center">
                                    <i data-lucide="check" class="w-4 h-4 mr-1"></i>
                                    <?php echo PHP_VERSION; ?>
                                </span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span>PDO MySQL Extension</span>
                                <span class="<?php echo extension_loaded('pdo_mysql') ? 'text-green-600' : 'text-red-600'; ?> flex items-center">
                                    <i data-lucide="<?php echo extension_loaded('pdo_mysql') ? 'check' : 'x'; ?>" class="w-4 h-4 mr-1"></i>
                                    <?php echo extension_loaded('pdo_mysql') ? 'Available' : 'Missing'; ?>
                                </span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span>JSON Extension</span>
                                <span class="<?php echo extension_loaded('json') ? 'text-green-600' : 'text-red-600'; ?> flex items-center">
                                    <i data-lucide="<?php echo extension_loaded('json') ? 'check' : 'x'; ?>" class="w-4 h-4 mr-1"></i>
                                    <?php echo extension_loaded('json') ? 'Available' : 'Missing'; ?>
                                </span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span>Config Directory Writable</span>
                                <span class="<?php echo is_writable(CONFIG_PATH) ? 'text-green-600' : 'text-red-600'; ?> flex items-center">
                                    <i data-lucide="<?php echo is_writable(CONFIG_PATH) ? 'check' : 'x'; ?>" class="w-4 h-4 mr-1"></i>
                                    <?php echo is_writable(CONFIG_PATH) ? 'Yes' : 'No'; ?>
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <a href="?step=2" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        Continue to Database Setup
                    </a>
                </div>
            </div>
            <?php endif; ?>

            <!-- Step 2: Database Configuration -->
            <?php if ($step == 2): ?>
            <div class="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
                <form method="POST">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">Database Configuration</h3>
                    
                    <div class="space-y-4">
                        <div>
                            <label for="db_host" class="block text-sm font-medium text-gray-700">Database Host</label>
                            <input type="text" id="db_host" name="db_host" value="<?php echo $_POST['db_host'] ?? 'localhost'; ?>" 
                                   class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
                        </div>
                        
                        <div>
                            <label for="db_port" class="block text-sm font-medium text-gray-700">Database Port</label>
                            <input type="number" id="db_port" name="db_port" value="<?php echo $_POST['db_port'] ?? '3306'; ?>" 
                                   class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
                        </div>
                        
                        <div>
                            <label for="db_name" class="block text-sm font-medium text-gray-700">Database Name</label>
                            <input type="text" id="db_name" name="db_name" value="<?php echo $_POST['db_name'] ?? 'ping_pong_tournament'; ?>" 
                                   class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
                            <p class="mt-1 text-xs text-gray-500">Database will be created if it doesn't exist</p>
                        </div>
                        
                        <div>
                            <label for="db_user" class="block text-sm font-medium text-gray-700">Username</label>
                            <input type="text" id="db_user" name="db_user" value="<?php echo $_POST['db_user'] ?? 'root'; ?>" 
                                   class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
                        </div>
                        
                        <div>
                            <label for="db_pass" class="block text-sm font-medium text-gray-700">Password</label>
                            <input type="password" id="db_pass" name="db_pass" value="<?php echo $_POST['db_pass'] ?? ''; ?>" 
                                   class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                        </div>
                    </div>
                    
                    <div class="mt-6 flex space-x-3">
                        <a href="?step=1" class="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                            Back
                        </a>
                        <button type="submit" class="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                            Test & Continue
                        </button>
                    </div>
                </form>
            </div>
            <?php endif; ?>

            <!-- Step 3: Installation -->
            <?php if ($step == 3): ?>
            <div class="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
                <div class="text-center">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">Installing Database</h3>
                    
                    <?php if (!$success && !$error): ?>
                    <div class="mb-6">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p class="text-sm text-gray-600">Creating database tables and configuring system...</p>
                    </div>
                    
                    <form method="POST">
                        <button type="submit" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                            Install Database Tables
                        </button>
                    </form>
                    <?php else: ?>
                    <p class="text-sm text-gray-600 mb-6">
                        <?php echo $success ? 'Setup completed successfully! Redirecting to application...' : 'Installation failed. Please try again.'; ?>
                    </p>
                    
                    <?php if ($error): ?>
                    <div class="flex space-x-3">
                        <a href="?step=2" class="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                            Back to Database Config
                        </a>
                        <form method="POST" class="flex-1">
                            <button type="submit" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                                Retry Installation
                            </button>
                        </form>
                    </div>
                    <?php endif; ?>
                    <?php endif; ?>
                </div>
            </div>
            <?php endif; ?>

            <!-- Footer -->
            <div class="text-center text-xs text-gray-500">
                <p>🏓 Ping Pong Tournament Manager v1.0.0</p>
                <p>Professional tournament management system</p>
            </div>
        </div>
    </div>

    <script>
        lucide.createIcons();
    </script>
</body>
</html>