<?php
/**
 * 🏓 Ping Pong Tournament Manager
 * Player Model
 * 
 * @version 1.0.0
 * @author Tournament Manager Team
 * @license MIT
 */

class Player {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Get player by ID
     */
    public function getById($id) {
        $sql = "SELECT * FROM players WHERE id = :id";
        return $this->db->fetchOne($sql, ['id' => $id]);
    }
    
    /**
     * Get all players with filtering and pagination
     */
    public function getAll($isActive = true, $skillLevel = null, $limit = 50, $offset = 0, $search = null, $sortBy = 'rating', $sortOrder = 'desc') {
        $conditions = [];
        $params = [];
        
        if ($isActive) {
            $conditions[] = "is_active = 1";
        }
        
        if ($skillLevel) {
            $conditions[] = "skill_level = :skill_level";
            $params['skill_level'] = $skillLevel;
        }
        
        if ($search) {
            $conditions[] = "(name LIKE :search OR email LIKE :search)";
            $params['search'] = "%{$search}%";
        }
        
        $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";
        $orderClause = "ORDER BY {$sortBy} {$sortOrder}";
        $limitClause = "LIMIT :limit OFFSET :offset";
        
        $sql = "SELECT * FROM players {$whereClause} {$orderClause} {$limitClause}";
        
        $params['limit'] = $limit;
        $params['offset'] = $offset;
        
        return $this->db->fetchAll($sql, $params);
    }
    
    /**
     * Get player count
     */
    public function getCount($isActive = true, $skillLevel = null, $search = null) {
        $conditions = [];
        $params = [];
        
        if ($isActive) {
            $conditions[] = "is_active = 1";
        }
        
        if ($skillLevel) {
            $conditions[] = "skill_level = :skill_level";
            $params['skill_level'] = $skillLevel;
        }
        
        if ($search) {
            $conditions[] = "(name LIKE :search OR email LIKE :search)";
            $params['search'] = "%{$search}%";
        }
        
        $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";
        $sql = "SELECT COUNT(*) as count FROM players {$whereClause}";
        
        $result = $this->db->fetchOne($sql, $params);
        return (int)$result['count'];
    }
    
    /**
     * Create new player
     */
    public function create($data) {
        return $this->db->insert('players', $data);
    }
    
    /**
     * Update player
     */
    public function update($id, $data) {
        return $this->db->update('players', $data, 'id = :id', ['id' => $id]);
    }
    
    /**
     * Check if email exists (excluding specific player ID)
     */
    public function emailExists($email, $excludeId = null) {
        $sql = "SELECT COUNT(*) as count FROM players WHERE email = :email";
        $params = ['email' => $email];
        
        if ($excludeId) {
            $sql .= " AND id != :id";
            $params['id'] = $excludeId;
        }
        
        $result = $this->db->fetchOne($sql, $params);
        return (int)$result['count'] > 0;
    }
    
    /**
     * Get player statistics
     */
    public function getStatistics($playerId) {
        $player = $this->getById($playerId);
        if (!$player) {
            return null;
        }
        
        // Get match statistics
        $sql = "SELECT 
                    COUNT(*) as total_matches,
                    SUM(CASE WHEN winner_id = :player_id THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN winner_id != :player_id AND winner_id IS NOT NULL THEN 1 ELSE 0 END) as losses,
                    AVG(CASE WHEN player1_id = :player_id THEN player1_sets_won 
                             WHEN player2_id = :player_id THEN player2_sets_won END) as avg_sets_won
                FROM matches 
                WHERE (player1_id = :player_id OR player2_id = :player_id) 
                AND status = 'completed'";
        
        $stats = $this->db->fetchOne($sql, ['player_id' => $playerId]);
        
        $player['statistics'] = [
            'total_matches' => (int)$stats['total_matches'],
            'wins' => (int)$stats['wins'],
            'losses' => (int)$stats['losses'],
            'win_percentage' => $stats['total_matches'] > 0 ? round(($stats['wins'] / $stats['total_matches']) * 100, 1) : 0,
            'avg_sets_won' => round($stats['avg_sets_won'], 1)
        ];
        
        return $player;
    }
    
    /**
     * Get player's tournaments
     */
    public function getTournaments($playerId) {
        $sql = "SELECT t.*, tp.division, tp.joined_at 
                FROM tournaments t
                JOIN tournament_players tp ON t.id = tp.tournament_id
                WHERE tp.player_id = :player_id
                ORDER BY t.created_at DESC";
        
        return $this->db->fetchAll($sql, ['player_id' => $playerId]);
    }
    
    /**
     * Get player's rating history
     */
    public function getRatingHistory($playerId) {
        $sql = "SELECT * FROM rating_history 
                WHERE player_id = :player_id 
                ORDER BY created_at DESC 
                LIMIT 50";
        
        return $this->db->fetchAll($sql, ['player_id' => $playerId]);
    }
    
    /**
     * Record rating change
     */
    public function recordRatingHistory($playerId, $oldRating, $newRating, $matchId = null, $reason = 'match_result') {
        $data = [
            'player_id' => $playerId,
            'old_rating' => $oldRating,
            'new_rating' => $newRating,
            'rating_change' => $newRating - $oldRating,
            'match_id' => $matchId,
            'reason' => $reason
        ];
        
        return $this->db->insert('rating_history', $data);
    }
    
    /**
     * Get active tournaments for player
     */
    public function getActiveTournaments($playerId) {
        $sql = "SELECT t.* FROM tournaments t
                JOIN tournament_players tp ON t.id = tp.tournament_id
                WHERE tp.player_id = :player_id 
                AND t.status IN ('setup', 'active', 'paused')";
        
        return $this->db->fetchAll($sql, ['player_id' => $playerId]);
    }
    
    /**
     * Update player rating
     */
    public function updateRating($playerId, $newRating) {
        return $this->update($playerId, ['current_rating' => $newRating]);
    }
    
    /**
     * Update game statistics
     */
    public function updateGameStats($playerId, $won = true) {
        $player = $this->getById($playerId);
        if (!$player) {
            return false;
        }
        
        $data = [
            'games_played' => $player['games_played'] + 1
        ];
        
        if ($won) {
            $data['games_won'] = $player['games_won'] + 1;
        } else {
            $data['games_lost'] = $player['games_lost'] + 1;
        }
        
        return $this->update($playerId, $data);
    }
}