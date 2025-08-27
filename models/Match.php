<?php
/**
 * 🏓 Ping Pong Tournament Manager
 * Match Model
 * 
 * @version 1.0.0
 * @author Tournament Manager Team
 * @license MIT
 */

class Match {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Create new match
     */
    public function create($data) {
        $sql = "INSERT INTO matches (
            tournament_id, round_number, match_number, table_number,
            player1_id, player2_id, player1_partner_id, player2_partner_id,
            status, match_type, best_of, scheduled_time, notes,
            created_at, updated_at
        ) VALUES (
            :tournament_id, :round_number, :match_number, :table_number,
            :player1_id, :player2_id, :player1_partner_id, :player2_partner_id,
            :status, :match_type, :best_of, :scheduled_time, :notes,
            NOW(), NOW()
        )";
        
        $params = [
            'tournament_id' => $data['tournament_id'],
            'round_number' => $data['round_number'] ?? 1,
            'match_number' => $data['match_number'],
            'table_number' => $data['table_number'] ?? null,
            'player1_id' => $data['player1_id'],
            'player2_id' => $data['player2_id'],
            'player1_partner_id' => $data['player1_partner_id'] ?? null,
            'player2_partner_id' => $data['player2_partner_id'] ?? null,
            'status' => $data['status'] ?? 'scheduled',
            'match_type' => $data['match_type'] ?? 'singles',
            'best_of' => $data['best_of'] ?? 3,
            'scheduled_time' => $data['scheduled_time'] ?? null,
            'notes' => $data['notes'] ?? null
        ];
        
        $stmt = $this->db->execute($sql, $params);
        return $this->db->getConnection()->lastInsertId();
    }
    
    /**
     * Get match by ID
     */
    public function getById($id) {
        $sql = "SELECT m.*,
                p1.name as player1_name, p1.current_rating as player1_rating,
                p2.name as player2_name, p2.current_rating as player2_rating,
                p1p.name as player1_partner_name,
                p2p.name as player2_partner_name,
                w.name as winner_name,
                t.name as tournament_name, t.format as tournament_format,
                CASE 
                    WHEN m.end_time IS NOT NULL AND m.start_time IS NOT NULL 
                    THEN TIMESTAMPDIFF(MINUTE, m.start_time, m.end_time)
                    ELSE NULL 
                END as duration_minutes
                FROM matches m
                LEFT JOIN players p1 ON m.player1_id = p1.id
                LEFT JOIN players p2 ON m.player2_id = p2.id
                LEFT JOIN players p1p ON m.player1_partner_id = p1p.id
                LEFT JOIN players p2p ON m.player2_partner_id = p2p.id
                LEFT JOIN players w ON m.winner_id = w.id
                LEFT JOIN tournaments t ON m.tournament_id = t.id
                WHERE m.id = :id";
        
        return $this->db->fetchOne($sql, ['id' => $id]);
    }
    
    /**
     * Get matches by tournament
     */
    public function getByTournament($tournamentId, $round = null, $status = null) {
        $sql = "SELECT m.*,
                p1.name as player1_name, p1.current_rating as player1_rating,
                p2.name as player2_name, p2.current_rating as player2_rating,
                p1p.name as player1_partner_name,
                p2p.name as player2_partner_name,
                w.name as winner_name
                FROM matches m
                LEFT JOIN players p1 ON m.player1_id = p1.id
                LEFT JOIN players p2 ON m.player2_id = p2.id
                LEFT JOIN players p1p ON m.player1_partner_id = p1p.id
                LEFT JOIN players p2p ON m.player2_partner_id = p2p.id
                LEFT JOIN players w ON m.winner_id = w.id
                WHERE m.tournament_id = :tournament_id";
        
        $params = ['tournament_id' => $tournamentId];
        
        if ($round !== null) {
            $sql .= " AND m.round_number = :round";
            $params['round'] = $round;
        }
        
        if ($status) {
            $sql .= " AND m.status = :status";
            $params['status'] = $status;
        }
        
        $sql .= " ORDER BY m.round_number ASC, m.match_number ASC";
        
        return $this->db->fetchAll($sql, $params);
    }
    
    /**
     * Get matches by player
     */
    public function getByPlayer($playerId, $limit = null) {
        $sql = "SELECT m.*,
                CASE 
                    WHEN m.player1_id = :player_id THEN p2.name
                    ELSE p1.name 
                END as opponent_name,
                CASE 
                    WHEN m.player1_id = :player_id THEN m.player1_sets_won
                    ELSE m.player2_sets_won 
                END as player_sets,
                CASE 
                    WHEN m.player1_id = :player_id THEN m.player2_sets_won
                    ELSE m.player1_sets_won 
                END as opponent_sets,
                CASE 
                    WHEN m.winner_id = :player_id THEN 'won'
                    WHEN m.winner_id IS NULL THEN 'pending'
                    ELSE 'lost'
                END as result,
                t.name as tournament_name
                FROM matches m
                LEFT JOIN players p1 ON m.player1_id = p1.id
                LEFT JOIN players p2 ON m.player2_id = p2.id
                LEFT JOIN tournaments t ON m.tournament_id = t.id
                WHERE (m.player1_id = :player_id OR m.player2_id = :player_id)
                ORDER BY m.start_time DESC";
        
        if ($limit) {
            $sql .= " LIMIT :limit";
        }
        
        $params = ['player_id' => $playerId];
        if ($limit) {
            $params['limit'] = $limit;
        }
        
        return $this->db->fetchAll($sql, $params);
    }
    
    /**
     * Get active/live matches
     */
    public function getActiveMatches() {
        $sql = "SELECT m.*,
                p1.name as player1_name,
                p2.name as player2_name,
                p1p.name as player1_partner_name,
                p2p.name as player2_partner_name,
                t.name as tournament_name,
                -- Get current set scores
                (SELECT ms.player1_score 
                 FROM match_sets ms 
                 WHERE ms.match_id = m.id AND ms.winner_side IS NULL 
                 ORDER BY ms.set_number DESC LIMIT 1) as current_set_p1_score,
                (SELECT ms.player2_score 
                 FROM match_sets ms 
                 WHERE ms.match_id = m.id AND ms.winner_side IS NULL 
                 ORDER BY ms.set_number DESC LIMIT 1) as current_set_p2_score,
                (SELECT COUNT(*) 
                 FROM match_sets ms 
                 WHERE ms.match_id = m.id) as current_set_number
                FROM matches m
                LEFT JOIN players p1 ON m.player1_id = p1.id
                LEFT JOIN players p2 ON m.player2_id = p2.id
                LEFT JOIN players p1p ON m.player1_partner_id = p1p.id
                LEFT JOIN players p2p ON m.player2_partner_id = p2p.id
                LEFT JOIN tournaments t ON m.tournament_id = t.id
                WHERE m.status IN ('in_progress', 'scheduled')
                ORDER BY m.status DESC, m.start_time ASC";
        
        return $this->db->fetchAll($sql);
    }
    
    /**
     * Update match
     */
    public function update($id, $data) {
        $setParts = [];
        $params = ['id' => $id];
        
        $allowedFields = ['status', 'winner_id', 'winner_partner_id', 
                         'player1_sets_won', 'player2_sets_won', 
                         'start_time', 'end_time', 'table_number', 'notes'];
        
        foreach ($data as $key => $value) {
            if (in_array($key, $allowedFields)) {
                $setParts[] = "$key = :$key";
                $params[$key] = $value;
            }
        }
        
        if (empty($setParts)) {
            return false;
        }
        
        $sql = "UPDATE matches SET " . implode(", ", $setParts) . ", updated_at = NOW() WHERE id = :id";
        $stmt = $this->db->execute($sql, $params);
        
        return $stmt->rowCount() > 0;
    }
    
    /**
     * Start match
     */
    public function start($matchId, $tableNumber = null) {
        $updateData = [
            'status' => 'in_progress',
            'start_time' => date('Y-m-d H:i:s')
        ];
        
        if ($tableNumber) {
            $updateData['table_number'] = $tableNumber;
        }
        
        return $this->update($matchId, $updateData);
    }
    
    /**
     * Complete match
     */
    public function complete($matchId, $winnerId, $winnerPartnerId = null) {
        $updateData = [
            'status' => 'completed',
            'winner_id' => $winnerId,
            'end_time' => date('Y-m-d H:i:s')
        ];
        
        if ($winnerPartnerId) {
            $updateData['winner_partner_id'] = $winnerPartnerId;
        }
        
        return $this->update($matchId, $updateData);
    }
    
    /**
     * Add set to match
     */
    public function addSet($matchId, $setNumber, $player1Score, $player2Score) {
        // Determine winner
        $winnerSide = null;
        if ($player1Score > $player2Score) {
            $winnerSide = 'player1';
        } elseif ($player2Score > $player1Score) {
            $winnerSide = 'player2';
        }
        
        $sql = "INSERT INTO match_sets (
            match_id, set_number, player1_score, player2_score, 
            winner_side, created_at, updated_at
        ) VALUES (
            :match_id, :set_number, :player1_score, :player2_score,
            :winner_side, NOW(), NOW()
        )";
        
        $params = [
            'match_id' => $matchId,
            'set_number' => $setNumber,
            'player1_score' => $player1Score,
            'player2_score' => $player2Score,
            'winner_side' => $winnerSide
        ];
        
        $stmt = $this->db->execute($sql, $params);
        
        if ($stmt->rowCount() > 0) {
            // Update match set counts
            $this->updateMatchSetCounts($matchId);
            
            // Check if match is complete
            $this->checkMatchComplete($matchId);
        }
        
        return $stmt->rowCount() > 0;
    }
    
    /**
     * Update match set counts
     */
    private function updateMatchSetCounts($matchId) {
        $sql = "UPDATE matches m SET
                player1_sets_won = (
                    SELECT COUNT(*) FROM match_sets ms 
                    WHERE ms.match_id = m.id AND ms.winner_side = 'player1'
                ),
                player2_sets_won = (
                    SELECT COUNT(*) FROM match_sets ms 
                    WHERE ms.match_id = m.id AND ms.winner_side = 'player2'
                )
                WHERE m.id = :match_id";
        
        $this->db->execute($sql, ['match_id' => $matchId]);
    }
    
    /**
     * Check if match is complete
     */
    private function checkMatchComplete($matchId) {
        $match = $this->getById($matchId);
        if (!$match) return;
        
        $setsToWin = ceil($match['best_of'] / 2);
        
        if ($match['player1_sets_won'] >= $setsToWin) {
            $this->complete($matchId, $match['player1_id'], $match['player1_partner_id']);
        } elseif ($match['player2_sets_won'] >= $setsToWin) {
            $this->complete($matchId, $match['player2_id'], $match['player2_partner_id']);
        }
    }
    
    /**
     * Get match sets
     */
    public function getSets($matchId) {
        $sql = "SELECT * FROM match_sets 
                WHERE match_id = :match_id 
                ORDER BY set_number ASC";
        
        return $this->db->fetchAll($sql, ['match_id' => $matchId]);
    }
    
    /**
     * Update current set score
     */
    public function updateCurrentSetScore($matchId, $player1Score, $player2Score) {
        // Get current set number
        $sql = "SELECT COALESCE(MAX(set_number), 0) + 1 as current_set
                FROM match_sets 
                WHERE match_id = :match_id AND winner_side IS NOT NULL";
        
        $result = $this->db->fetchOne($sql, ['match_id' => $matchId]);
        $currentSet = $result['current_set'];
        
        // Check if current set exists
        $existingSql = "SELECT id FROM match_sets 
                       WHERE match_id = :match_id AND set_number = :set_number";
        $existing = $this->db->fetchOne($existingSql, [
            'match_id' => $matchId,
            'set_number' => $currentSet
        ]);
        
        if ($existing) {
            // Update existing set
            $updateSql = "UPDATE match_sets SET 
                         player1_score = :player1_score,
                         player2_score = :player2_score,
                         updated_at = NOW()
                         WHERE match_id = :match_id AND set_number = :set_number";
            
            $params = [
                'match_id' => $matchId,
                'set_number' => $currentSet,
                'player1_score' => $player1Score,
                'player2_score' => $player2Score
            ];
        } else {
            // Insert new set
            $insertSql = "INSERT INTO match_sets (
                         match_id, set_number, player1_score, player2_score, created_at, updated_at
                         ) VALUES (
                         :match_id, :set_number, :player1_score, :player2_score, NOW(), NOW()
                         )";
            
            $params = [
                'match_id' => $matchId,
                'set_number' => $currentSet,
                'player1_score' => $player1Score,
                'player2_score' => $player2Score
            ];
        }
        
        $stmt = $this->db->execute($existing ? $updateSql : $insertSql, $params);
        
        // Check if set is complete (standard ping pong rules)
        if (($player1Score >= 11 || $player2Score >= 11) && abs($player1Score - $player2Score) >= 2) {
            $winnerSide = $player1Score > $player2Score ? 'player1' : 'player2';
            
            // Mark set as complete
            $completeSql = "UPDATE match_sets SET winner_side = :winner_side, updated_at = NOW()
                           WHERE match_id = :match_id AND set_number = :set_number";
            
            $this->db->execute($completeSql, [
                'match_id' => $matchId,
                'set_number' => $currentSet,
                'winner_side' => $winnerSide
            ]);
            
            // Update match set counts and check completion
            $this->updateMatchSetCounts($matchId);
            $this->checkMatchComplete($matchId);
        }
        
        return $stmt->rowCount() > 0;
    }
    
    /**
     * Delete match
     */
    public function delete($id) {
        $sql = "DELETE FROM matches WHERE id = :id";
        $stmt = $this->db->execute($sql, ['id' => $id]);
        return $stmt->rowCount() > 0;
    }
    
    /**
     * Get match statistics
     */
    public function getMatchStats($matchId) {
        $match = $this->getById($matchId);
        $sets = $this->getSets($matchId);
        
        if (!$match) return null;
        
        $stats = [
            'match' => $match,
            'sets' => $sets,
            'total_sets' => count($sets),
            'player1_total_points' => array_sum(array_column($sets, 'player1_score')),
            'player2_total_points' => array_sum(array_column($sets, 'player2_score')),
            'longest_set_points' => 0,
            'closest_set_margin' => null
        ];
        
        foreach ($sets as $set) {
            $totalPoints = $set['player1_score'] + $set['player2_score'];
            $margin = abs($set['player1_score'] - $set['player2_score']);
            
            if ($totalPoints > $stats['longest_set_points']) {
                $stats['longest_set_points'] = $totalPoints;
            }
            
            if ($stats['closest_set_margin'] === null || $margin < $stats['closest_set_margin']) {
                $stats['closest_set_margin'] = $margin;
            }
        }
        
        return $stats;
    }
    
    /**
     * Get upcoming matches for a tournament
     */
    public function getUpcoming($tournamentId, $limit = 10) {
        $sql = "SELECT m.*,
                p1.name as player1_name,
                p2.name as player2_name,
                p1p.name as player1_partner_name,
                p2p.name as player2_partner_name
                FROM matches m
                LEFT JOIN players p1 ON m.player1_id = p1.id
                LEFT JOIN players p2 ON m.player2_id = p2.id
                LEFT JOIN players p1p ON m.player1_partner_id = p1p.id
                LEFT JOIN players p2p ON m.player2_partner_id = p2p.id
                WHERE m.tournament_id = :tournament_id AND m.status = 'scheduled'
                ORDER BY m.round_number ASC, m.match_number ASC
                LIMIT :limit";
        
        return $this->db->fetchAll($sql, [
            'tournament_id' => $tournamentId,
            'limit' => $limit
        ]);
    }
    
    /**
     * Get completed matches for a tournament
     */
    public function getCompleted($tournamentId, $limit = null) {
        $sql = "SELECT m.*,
                p1.name as player1_name,
                p2.name as player2_name,
                w.name as winner_name,
                TIMESTAMPDIFF(MINUTE, m.start_time, m.end_time) as duration_minutes
                FROM matches m
                LEFT JOIN players p1 ON m.player1_id = p1.id
                LEFT JOIN players p2 ON m.player2_id = p2.id
                LEFT JOIN players w ON m.winner_id = w.id
                WHERE m.tournament_id = :tournament_id AND m.status = 'completed'
                ORDER BY m.end_time DESC";
        
        if ($limit) {
            $sql .= " LIMIT :limit";
        }
        
        $params = ['tournament_id' => $tournamentId];
        if ($limit) {
            $params['limit'] = $limit;
        }
        
        return $this->db->fetchAll($sql, $params);
    }
    
    /**
     * Get head-to-head record between two players
     */
    public function getHeadToHead($player1Id, $player2Id) {
        $sql = "SELECT 
                COUNT(*) as total_matches,
                COUNT(CASE WHEN m.winner_id = :player1_id THEN 1 END) as player1_wins,
                COUNT(CASE WHEN m.winner_id = :player2_id THEN 1 END) as player2_wins,
                SUM(CASE WHEN m.player1_id = :player1_id THEN m.player1_sets_won ELSE m.player2_sets_won END) as player1_sets,
                SUM(CASE WHEN m.player1_id = :player1_id THEN m.player2_sets_won ELSE m.player1_sets_won END) as player2_sets
                FROM matches m
                WHERE m.status = 'completed' 
                AND ((m.player1_id = :player1_id AND m.player2_id = :player2_id) 
                     OR (m.player1_id = :player2_id AND m.player2_id = :player1_id))";
        
        return $this->db->fetchOne($sql, [
            'player1_id' => $player1Id,
            'player2_id' => $player2Id
        ]);
    }
    
    /**
     * Validate match data
     */
    public function validateMatchData($data) {
        $errors = [];
        
        if (empty($data['tournament_id'])) {
            $errors[] = 'Tournament ID is required';
        }
        
        if (empty($data['player1_id'])) {
            $errors[] = 'Player 1 is required';
        }
        
        if (empty($data['player2_id'])) {
            $errors[] = 'Player 2 is required';
        }
        
        if (!empty($data['player1_id']) && !empty($data['player2_id']) && $data['player1_id'] == $data['player2_id']) {
            $errors[] = 'Player 1 and Player 2 cannot be the same';
        }
        
        if (isset($data['best_of']) && ($data['best_of'] < 1 || $data['best_of'] > 7 || $data['best_of'] % 2 == 0)) {
            $errors[] = 'Best of must be an odd number between 1 and 7';
        }
        
        return $errors;
    }
}
?>