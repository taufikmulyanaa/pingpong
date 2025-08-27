<?php
/**
 * 🏓 Ping Pong Tournament Manager
 * Tournament Model
 * 
 * @version 1.0.0
 * @author Tournament Manager Team
 * @license MIT
 */

class Tournament {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Get tournament by ID
     */
    public function getById($id) {
        $sql = "SELECT * FROM tournaments WHERE id = :id";
        $tournament = $this->db->fetchOne($sql, ['id' => $id]);
        
        if ($tournament) {
            // Decode JSON settings
            $tournament['settings'] = $tournament['settings'] ? json_decode($tournament['settings'], true) : [];
            
            // Add player count
            $tournament['player_count'] = $this->getPlayerCount($id);
            
            // Calculate progress percentage if tournament is active
            if ($tournament['status'] === 'active' && $tournament['total_rounds']) {
                $tournament['progress_percentage'] = round(($tournament['current_round'] / $tournament['total_rounds']) * 100);
            }
        }
        
        return $tournament;
    }
    
    /**
     * Get all tournaments with filtering and pagination
     */
    public function getAll($status = null, $limit = 50, $offset = 0, $search = null) {
        $conditions = [];
        $params = [];
        
        if ($status) {
            $conditions[] = "status = :status";
            $params['status'] = $status;
        }
        
        if ($search) {
            $conditions[] = "name LIKE :search";
            $params['search'] = "%{$search}%";
        }
        
        $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";
        $sql = "SELECT * FROM tournaments {$whereClause} ORDER BY created_at DESC LIMIT :limit OFFSET :offset";
        
        $params['limit'] = $limit;
        $params['offset'] = $offset;
        
        $tournaments = $this->db->fetchAll($sql, $params);
        
        // Process each tournament
        foreach ($tournaments as &$tournament) {
            $tournament['settings'] = $tournament['settings'] ? json_decode($tournament['settings'], true) : [];
            $tournament['player_count'] = $this->getPlayerCount($tournament['id']);
            
            if ($tournament['status'] === 'active' && $tournament['total_rounds']) {
                $tournament['progress_percentage'] = round(($tournament['current_round'] / $tournament['total_rounds']) * 100);
            }
        }
        
        return $tournaments;
    }
    
    /**
     * Get tournament count
     */
    public function getCount($status = null, $search = null) {
        $conditions = [];
        $params = [];
        
        if ($status) {
            $conditions[] = "status = :status";
            $params['status'] = $status;
        }
        
        if ($search) {
            $conditions[] = "name LIKE :search";
            $params['search'] = "%{$search}%";
        }
        
        $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";
        $sql = "SELECT COUNT(*) as count FROM tournaments {$whereClause}";
        
        $result = $this->db->fetchOne($sql, $params);
        return (int)$result['count'];
    }
    
    /**
     * Create new tournament
     */
    public function create($data) {
        // Encode settings as JSON
        if (isset($data['settings']) && is_array($data['settings'])) {
            $data['settings'] = json_encode($data['settings']);
        }
        
        return $this->db->insert('tournaments', $data);
    }
    
    /**
     * Update tournament
     */
    public function update($id, $data) {
        // Encode settings as JSON
        if (isset($data['settings']) && is_array($data['settings'])) {
            $data['settings'] = json_encode($data['settings']);
        }
        
        return $this->db->update('tournaments', $data, 'id = :id', ['id' => $id]);
    }
    
    /**
     * Delete tournament
     */
    public function delete($id) {
        return $this->db->delete('tournaments', 'id = :id', ['id' => $id]);
    }
    
    /**
     * Get player count for tournament
     */
    public function getPlayerCount($tournamentId) {
        $sql = "SELECT COUNT(*) as count FROM tournament_players WHERE tournament_id = :tournament_id";
        $result = $this->db->fetchOne($sql, ['tournament_id' => $tournamentId]);
        return (int)$result['count'];
    }
    
    /**
     * Get tournament players
     */
    public function getPlayers($tournamentId) {
        $sql = "SELECT p.*, tp.division, tp.seed, tp.joined_at 
                FROM players p
                JOIN tournament_players tp ON p.id = tp.player_id
                WHERE tp.tournament_id = :tournament_id
                ORDER BY tp.seed ASC, p.current_rating DESC";
        
        return $this->db->fetchAll($sql, ['tournament_id' => $tournamentId]);
    }
    
    /**
     * Add player to tournament
     */
    public function addPlayer($tournamentId, $playerId, $division = null) {
        // Check if player is already in tournament
        $sql = "SELECT COUNT(*) as count FROM tournament_players 
                WHERE tournament_id = :tournament_id AND player_id = :player_id";
        $result = $this->db->fetchOne($sql, [
            'tournament_id' => $tournamentId,
            'player_id' => $playerId
        ]);
        
        if ($result['count'] > 0) {
            return false; // Player already in tournament
        }
        
        // Get next seed number
        $sql = "SELECT COALESCE(MAX(seed), 0) + 1 as next_seed 
                FROM tournament_players WHERE tournament_id = :tournament_id";
        $result = $this->db->fetchOne($sql, ['tournament_id' => $tournamentId]);
        $seed = $result['next_seed'];
        
        $data = [
            'tournament_id' => $tournamentId,
            'player_id' => $playerId,
            'division' => $division,
            'seed' => $seed
        ];
        
        return $this->db->insert('tournament_players', $data);
    }
    
    /**
     * Remove player from tournament
     */
    public function removePlayer($tournamentId, $playerId) {
        return $this->db->delete('tournament_players', 
            'tournament_id = :tournament_id AND player_id = :player_id', 
            [
                'tournament_id' => $tournamentId,
                'player_id' => $playerId
            ]
        );
    }
    
    /**
     * Get tournament matches
     */
    public function getMatches($tournamentId, $roundNumber = null) {
        $sql = "SELECT m.*, 
                       p1.name as player1_name, p2.name as player2_name,
                       p1.current_rating as player1_rating, p2.current_rating as player2_rating,
                       winner.name as winner_name
                FROM matches m
                JOIN players p1 ON m.player1_id = p1.id
                JOIN players p2 ON m.player2_id = p2.id
                LEFT JOIN players winner ON m.winner_id = winner.id
                WHERE m.tournament_id = :tournament_id";
        
        $params = ['tournament_id' => $tournamentId];
        
        if ($roundNumber !== null) {
            $sql .= " AND m.round_number = :round_number";
            $params['round_number'] = $roundNumber;
        }
        
        $sql .= " ORDER BY m.round_number ASC, m.match_number ASC";
        
        $matches = $this->db->fetchAll($sql, $params);
        
        // Process match data
        foreach ($matches as &$match) {
            $match['sets_data'] = $match['sets_data'] ? json_decode($match['sets_data'], true) : [];
        }
        
        return $matches;
    }
    
    /**
     * Get tournament statistics
     */
    public function getStatistics($tournamentId) {
        $tournament = $this->getById($tournamentId);
        if (!$tournament) {
            return null;
        }
        
        $stats = [
            'tournament' => $tournament,
            'total_players' => $this->getPlayerCount($tournamentId),
            'total_matches' => 0,
            'completed_matches' => 0,
            'in_progress_matches' => 0,
            'scheduled_matches' => 0
        ];
        
        // Get match statistics
        $sql = "SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                    SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled
                FROM matches WHERE tournament_id = :tournament_id";
        
        $matchStats = $this->db->fetchOne($sql, ['tournament_id' => $tournamentId]);
        
        $stats['total_matches'] = (int)$matchStats['total'];
        $stats['completed_matches'] = (int)$matchStats['completed'];
        $stats['in_progress_matches'] = (int)$matchStats['in_progress'];
        $stats['scheduled_matches'] = (int)$matchStats['scheduled'];
        
        return $stats;
    }
    
    /**
     * Start tournament (change status to active)
     */
    public function start($tournamentId) {
        $tournament = $this->getById($tournamentId);
        if (!$tournament || $tournament['status'] !== 'setup') {
            return false;
        }
        
        // Check if tournament has enough players
        $playerCount = $this->getPlayerCount($tournamentId);
        if ($playerCount < MIN_PLAYERS_PER_TOURNAMENT) {
            return false;
        }
        
        return $this->update($tournamentId, [
            'status' => 'active',
            'start_date' => date('Y-m-d H:i:s')
        ]);
    }
    
    /**
     * Complete tournament
     */
    public function complete($tournamentId) {
        return $this->update($tournamentId, [
            'status' => 'completed',
            'end_date' => date('Y-m-d H:i:s')
        ]);
    }
    
    /**
     * Get tournament leaderboard
     */
    public function getLeaderboard($tournamentId, $division = null) {
        $sql = "SELECT p.*, tp.division,
                       COUNT(m.id) as total_matches,
                       SUM(CASE WHEN m.winner_id = p.id THEN 1 ELSE 0 END) as wins,
                       SUM(CASE WHEN m.winner_id != p.id AND m.winner_id IS NOT NULL THEN 1 ELSE 0 END) as losses,
                       SUM(CASE WHEN m.player1_id = p.id THEN m.player1_sets_won 
                                WHEN m.player2_id = p.id THEN m.player2_sets_won END) as sets_won,
                       SUM(CASE WHEN m.player1_id = p.id THEN m.player2_sets_won 
                                WHEN m.player2_id = p.id THEN m.player1_sets_won END) as sets_lost
                FROM players p
                JOIN tournament_players tp ON p.id = tp.player_id
                LEFT JOIN matches m ON (m.player1_id = p.id OR m.player2_id = p.id) 
                                   AND m.tournament_id = :tournament_id AND m.status = 'completed'
                WHERE tp.tournament_id = :tournament_id";
        
        $params = ['tournament_id' => $tournamentId];
        
        if ($division) {
            $sql .= " AND tp.division = :division";
            $params['division'] = $division;
        }
        
        $sql .= " GROUP BY p.id, tp.division
                  ORDER BY wins DESC, (sets_won - sets_lost) DESC, p.current_rating DESC";
        
        $leaderboard = $this->db->fetchAll($sql, $params);
        
        // Add calculated fields
        foreach ($leaderboard as $index => &$player) {
            $player['rank'] = $index + 1;
            $player['win_percentage'] = $player['total_matches'] > 0 ? 
                round(($player['wins'] / $player['total_matches']) * 100, 1) : 0;
            $player['set_difference'] = $player['sets_won'] - $player['sets_lost'];
        }
        
        return $leaderboard;
    }
}