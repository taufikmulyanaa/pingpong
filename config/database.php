<?php
/**
 * 🏓 Ping Pong Tournament Manager
 * Database Connection Class
 * 
 * @version 1.0.0
 * @author Tournament Manager Team
 * @license MIT
 */

/**
 * Database connection class using Singleton pattern
 * Handles PDO connection, transactions, and query logging
 */
class Database {
    // Database configuration
    private $host = 'localhost';
    private $db_name = 'ping_pong_tournament';
    private $username = 'root';
    private $password = '';
    private $port = 3306;
    private $charset = 'utf8mb4';
    
    // Connection properties
    private $pdo;
    private static $instance = null;
    private $queryCount = 0;
    private $queryLog = [];
    private $transactionLevel = 0;
    
    /**
     * Private constructor to prevent multiple instances
     */
    private function __construct() {
        $this->connect();
    }
    
    /**
     * Get singleton instance
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Prevent cloning
     */
    public function __clone() {
        throw new Exception("Cannot clone Database instance");
    }
    
    /**
     * Prevent unserialization
     */
    public function __wakeup() {
        throw new Exception("Cannot unserialize Database instance");
    }
    
    /**
     * Establish database connection
     */
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
            
            // Set SQL mode for strict operations
            $this->pdo->exec("SET sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION'");
            
            // Set timezone
            $this->pdo->exec("SET time_zone = '+07:00'");
            
            if (defined('DEBUG_MODE') && DEBUG_MODE) {
                logMessage('Database connection established successfully', 'DEBUG');
            }
            
        } catch(PDOException $e) {
            $this->logError('Database connection failed', $e);
            throw new Exception("Database connection failed: " . $e->getMessage());
        }
    }
    
    /**
     * Get PDO connection instance
     */
    public function getConnection() {
        // Check if connection is still alive
        if (!$this->isConnected()) {
            $this->connect();
        }
        return $this->pdo;
    }
    
    /**
     * Check if database connection is alive
     */
    private function isConnected() {
        try {
            $this->pdo->query('SELECT 1');
            return true;
        } catch (PDOException $e) {
            return false;
        }
    }
    
    /**
     * Begin database transaction
     */
    public function beginTransaction() {
        try {
            if ($this->transactionLevel === 0) {
                $result = $this->pdo->beginTransaction();
                if (defined('DEBUG_MODE') && DEBUG_MODE) {
                    logMessage('Transaction started', 'DEBUG');
                }
            } else {
                // Use savepoints for nested transactions
                $savepointName = 'savepoint_' . $this->transactionLevel;
                $this->pdo->exec("SAVEPOINT $savepointName");
                if (defined('DEBUG_MODE') && DEBUG_MODE) {
                    logMessage("Savepoint created: $savepointName", 'DEBUG');
                }
                $result = true;
            }
            
            $this->transactionLevel++;
            return $result;
        } catch (PDOException $e) {
            $this->logError('Failed to begin transaction', $e);
            throw $e;
        }
    }
    
    /**
     * Commit database transaction
     */
    public function commit() {
        try {
            $this->transactionLevel--;
            
            if ($this->transactionLevel === 0) {
                $result = $this->pdo->commit();
                if (defined('DEBUG_MODE') && DEBUG_MODE) {
                    logMessage('Transaction committed', 'DEBUG');
                }
            } else {
                // Release savepoint
                $savepointName = 'savepoint_' . $this->transactionLevel;
                $this->pdo->exec("RELEASE SAVEPOINT $savepointName");
                if (defined('DEBUG_MODE') && DEBUG_MODE) {
                    logMessage("Savepoint released: $savepointName", 'DEBUG');
                }
                $result = true;
            }
            
            return $result;
        } catch (PDOException $e) {
            $this->logError('Failed to commit transaction', $e);
            throw $e;
        }
    }
    
    /**
     * Rollback database transaction
     */
    public function rollback() {
        try {
            $this->transactionLevel--;
            
            if ($this->transactionLevel === 0) {
                $result = $this->pdo->rollback();
                if (defined('DEBUG_MODE') && DEBUG_MODE) {
                    logMessage('Transaction rolled back', 'DEBUG');
                }
            } else {
                // Rollback to savepoint
                $savepointName = 'savepoint_' . $this->transactionLevel;
                $this->pdo->exec("ROLLBACK TO SAVEPOINT $savepointName");
                if (defined('DEBUG_MODE') && DEBUG_MODE) {
                    logMessage("Rolled back to savepoint: $savepointName", 'DEBUG');
                }
                $result = true;
            }
            
            return $result;
        } catch (PDOException $e) {
            $this->logError('Failed to rollback transaction', $e);
            throw $e;
        }
    }
    
    /**
     * Execute a prepared statement with parameters
     */
    public function execute($sql, $params = []) {
        $startTime = microtime(true);
        
        try {
            $stmt = $this->pdo->prepare($sql);
            $result = $stmt->execute($params);
            
            $executionTime = microtime(true) - $startTime;
            $this->logQuery($sql, $params, $executionTime);
            
            return $stmt;
        } catch (PDOException $e) {
            $this->logError('Query execution failed', $e, $sql, $params);
            throw $e;
        }
    }
    
    /**
     * Fetch single row
     */
    public function fetchOne($sql, $params = []) {
        $stmt = $this->execute($sql, $params);
        return $stmt->fetch();
    }
    
    /**
     * Fetch multiple rows
     */
    public function fetchAll($sql, $params = []) {
        $stmt = $this->execute($sql, $params);
        return $stmt->fetchAll();
    }
    
    /**
     * Insert record and return last insert ID
     */
    public function insert($table, $data) {
        $columns = array_keys($data);
        $placeholders = ':' . implode(', :', $columns);
        $columnsList = implode(', ', $columns);
        
        $sql = "INSERT INTO `$table` ($columnsList) VALUES ($placeholders)";
        
        $this->execute($sql, $data);
        return $this->pdo->lastInsertId();
    }
    
    /**
     * Update records
     */
    public function update($table, $data, $where, $whereParams = []) {
        $setClause = [];
        foreach (array_keys($data) as $column) {
            $setClause[] = "`$column` = :$column";
        }
        $setClause = implode(', ', $setClause);
        
        $sql = "UPDATE `$table` SET $setClause WHERE $where";
        
        $params = array_merge($data, $whereParams);
        $stmt = $this->execute($sql, $params);
        
        return $stmt->rowCount();
    }
    
    /**
     * Delete records
     */
    public function delete($table, $where, $whereParams = []) {
        $sql = "DELETE FROM `$table` WHERE $where";
        $stmt = $this->execute($sql, $whereParams);
        return $stmt->rowCount();
    }
    
    /**
     * Get table schema information
     */
    public function getTableSchema($table) {
        $sql = "DESCRIBE `$table`";
        return $this->fetchAll($sql);
    }
    
    /**
     * Check if table exists
     */
    public function tableExists($table) {
        $sql = "SHOW TABLES LIKE :table";
        $result = $this->fetchOne($sql, ['table' => $table]);
        return !empty($result);
    }
    
    /**
     * Get database size
     */
    public function getDatabaseSize() {
        $sql = "SELECT 
                    ROUND(SUM(data_length + index_length) / 1024 / 1024, 1) AS 'size_mb'
                FROM information_schema.tables 
                WHERE table_schema = :db_name";
        
        $result = $this->fetchOne($sql, ['db_name' => $this->db_name]);
        return $result['size_mb'] ?? 0;
    }
    
    /**
     * Get table statistics
     */
    public function getTableStats() {
        $sql = "SELECT 
                    table_name,
                    table_rows,
                    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'size_mb'
                FROM information_schema.TABLES 
                WHERE table_schema = :db_name
                ORDER BY (data_length + index_length) DESC";
        
        return $this->fetchAll($sql, ['db_name' => $this->db_name]);
    }
    
    /**
     * Optimize database tables
     */
    public function optimizeTables() {
        $tables = $this->fetchAll("SHOW TABLES");
        $results = [];
        
        foreach ($tables as $table) {
            $tableName = array_values($table)[0];
            try {
                $this->pdo->exec("OPTIMIZE TABLE `$tableName`");
                $results[$tableName] = 'OK';
            } catch (PDOException $e) {
                $results[$tableName] = 'ERROR: ' . $e->getMessage();
            }
        }
        
        return $results;
    }
    
    /**
     * Create database backup
     */
    public function createBackup($outputFile = null) {
        if (!$outputFile) {
            $outputFile = LOGS_PATH . 'backup_' . date('Y-m-d_H-i-s') . '.sql';
        }
        
        $command = sprintf(
            'mysqldump -h%s -P%d -u%s %s %s > %s',
            escapeshellarg($this->host),
            $this->port,
            escapeshellarg($this->username),
            $this->password ? '-p' . escapeshellarg($this->password) : '',
            escapeshellarg($this->db_name),
            escapeshellarg($outputFile)
        );
        
        $returnVar = 0;
        exec($command, $output, $returnVar);
        
        if ($returnVar === 0) {
            logMessage("Database backup created: $outputFile", 'INFO');
            return $outputFile;
        } else {
            logMessage("Database backup failed", 'ERROR');
            return false;
        }
    }
    
    /**
     * Log query for debugging
     */
    private function logQuery($sql, $params, $executionTime) {
        $this->queryCount++;
        
        if (defined('DEBUG_MODE') && DEBUG_MODE) {
            $this->queryLog[] = [
                'sql' => $sql,
                'params' => $params,
                'execution_time' => round($executionTime * 1000, 2), // Convert to milliseconds
                'timestamp' => microtime(true)
            ];
            
            // Log slow queries (> 100ms)
            if ($executionTime > 0.1) {
                logMessage('Slow query detected', 'WARNING', [
                    'sql' => $sql,
                    'params' => $params,
                    'execution_time' => $executionTime
                ]);
            }
        }
    }
    
    /**
     * Log database errors
     */
    private function logError($message, $exception, $sql = null, $params = null) {
        $context = [
            'error' => $exception->getMessage(),
            'code' => $exception->getCode(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine()
        ];
        
        if ($sql) {
            $context['sql'] = $sql;
        }
        
        if ($params) {
            $context['params'] = $params;
        }
        
        logMessage($message, 'ERROR', $context);
    }
    
    /**
     * Get query statistics
     */
    public function getQueryStats() {
        return [
            'query_count' => $this->queryCount,
            'query_log' => $this->queryLog,
            'connection_info' => [
                'host' => $this->host,
                'database' => $this->db_name,
                'charset' => $this->charset,
                'server_version' => $this->pdo->getAttribute(PDO::ATTR_SERVER_VERSION),
                'client_version' => $this->pdo->getAttribute(PDO::ATTR_CLIENT_VERSION)
            ]
        ];
    }
    
    /**
     * Reset query statistics
     */
    public function resetQueryStats() {
        $this->queryCount = 0;
        $this->queryLog = [];
    }
    
    /**
     * Get current transaction level
     */
    public function getTransactionLevel() {
        return $this->transactionLevel;
    }
    
    /**
     * Check if currently in transaction
     */
    public function inTransaction() {
        return $this->transactionLevel > 0;
    }
    
    /**
     * Test database connection
     */
    public function testConnection() {
        try {
            $this->pdo->query('SELECT 1');
            return true;
        } catch (PDOException $e) {
            return false;
        }
    }
    
    /**
     * Get database connection info
     */
    public function getConnectionInfo() {
        try {
            return [
                'host' => $this->host,
                'port' => $this->port,
                'database' => $this->db_name,
                'charset' => $this->charset,
                'server_version' => $this->pdo->getAttribute(PDO::ATTR_SERVER_VERSION),
                'client_version' => $this->pdo->getAttribute(PDO::ATTR_CLIENT_VERSION),
                'connection_status' => $this->pdo->getAttribute(PDO::ATTR_CONNECTION_STATUS),
                'server_info' => $this->pdo->getAttribute(PDO::ATTR_SERVER_INFO)
            ];
        } catch (PDOException $e) {
            return ['error' => $e->getMessage()];
        }
    }
    
    /**
     * Destructor - Clean up resources
     */
    public function __destruct() {
        // Rollback any uncommitted transactions
        if ($this->transactionLevel > 0) {
            try {
                while ($this->transactionLevel > 0) {
                    $this->rollback();
                }
                logMessage('Auto-rollback uncommitted transactions', 'WARNING');
            } catch (Exception $e) {
                logMessage('Failed to auto-rollback transactions: ' . $e->getMessage(), 'ERROR');
            }
        }
        
        // Log final query statistics in debug mode
        if (defined('DEBUG_MODE') && DEBUG_MODE && $this->queryCount > 0) {
            logMessage('Database session ended', 'DEBUG', [
                'total_queries' => $this->queryCount,
                'session_duration' => microtime(true) - $_SERVER['REQUEST_TIME_FLOAT']
            ]);
        }
        
        $this->pdo = null;
    }
}

/**
 * Database Migration Helper Class
 */
class DatabaseMigration {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Run database migrations
     */
    public function runMigrations($migrationsPath = null) {
        if (!$migrationsPath) {
            $migrationsPath = APP_ROOT . '/migrations/';
        }
        
        if (!is_dir($migrationsPath)) {
            return ['error' => 'Migrations directory not found'];
        }
        
        // Create migrations table if not exists
        $this->createMigrationsTable();
        
        // Get executed migrations
        $executedMigrations = $this->getExecutedMigrations();
        
        // Get all migration files
        $migrationFiles = glob($migrationsPath . '*.sql');
        sort($migrationFiles);
        
        $results = [];
        
        foreach ($migrationFiles as $file) {
            $filename = basename($file, '.sql');
            
            if (in_array($filename, $executedMigrations)) {
                $results[] = ['file' => $filename, 'status' => 'skipped'];
                continue;
            }
            
            try {
                $this->db->beginTransaction();
                
                $sql = file_get_contents($file);
                $statements = array_filter(array_map('trim', explode(';', $sql)));
                
                foreach ($statements as $statement) {
                    if (!empty($statement)) {
                        $this->db->getConnection()->exec($statement);
                    }
                }
                
                // Record migration as executed
                $this->recordMigration($filename);
                
                $this->db->commit();
                $results[] = ['file' => $filename, 'status' => 'executed'];
                
            } catch (Exception $e) {
                $this->db->rollback();
                $results[] = ['file' => $filename, 'status' => 'failed', 'error' => $e->getMessage()];
                logMessage("Migration failed: $filename", 'ERROR', ['error' => $e->getMessage()]);
            }
        }
        
        return $results;
    }
    
    private function createMigrationsTable() {
        $sql = "CREATE TABLE IF NOT EXISTS `migrations` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `migration` varchar(255) NOT NULL,
            `executed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `migration` (`migration`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        $this->db->getConnection()->exec($sql);
    }
    
    private function getExecutedMigrations() {
        try {
            return array_column(
                $this->db->fetchAll("SELECT migration FROM migrations ORDER BY id"),
                'migration'
            );
        } catch (Exception $e) {
            return [];
        }
    }
    
    private function recordMigration($migration) {
        $this->db->insert('migrations', ['migration' => $migration]);
    }
}

?>