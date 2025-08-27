<?php
/**
 * 🏓 Ping Pong Tournament Manager
 * Rating Calculator Class - ELO Rating System
 * 
 * @version 1.0.0
 * @author Tournament Manager Team
 * @license MIT
 */

class RatingCalculator {
    private $kFactor;
    private $db;
    
    public function __construct($kFactor = null) {
        $this->kFactor = $kFactor ?? RATING_K_FACTOR;
        $this->db = Database::getInstance();
    }
    
    /**
     * Calculate new ratings after a match
     */
    public function calculateMatchRatings($player1Rating, $player2Rating, $result, $player1SetsWon = 0, $player2SetsWon = 0) {
        // Basic ELO calculation
        $expectedScore1 = $this->getExpectedScore($player1Rating, $player2Rating);
        $expectedScore2 = 1 - $expectedScore1;
        
        // Determine actual scores
        $actualScore1 = $this->getActualScore($result, 1);
        $actualScore2 = $this->getActualScore($result, 2);
        
        // Apply set bonus for closer matches
        $setBonus = $this->calculateSetBonus($player1SetsWon, $player2SetsWon);
        
        // Calculate rating changes
        $change1 = $this->kFactor * ($actualScore1 - $expectedScore1) + $setBonus;
        $change2 = $this->kFactor * ($actualScore2 - $expectedScore2) - $setBonus;
        
        // Apply minimum and maximum rating bounds
        $newRating1 = max(RATING_MIN, min(RATING_MAX, $player1Rating + $change1));
        $newRating2 = max(RATING_MIN, min(RATING_MAX, $player2Rating + $change2));
        
        return [
            'player1' => [
                'old_rating' => $player1Rating,
                'new_rating' => round($newRating1),
                'change' => round($change1)
            ],
            'player2' => [
                'old_rating' => $player2Rating,
                'new_rating' => round($newRating2),
                'change' => round($change2)
            ]
        ];
    }
    
    /**
     * Calculate expected score based on ELO formula
     */
    private function getExpectedScore($rating1, $rating2) {
        return 1 / (1 + pow(10, ($rating2 - $rating1) / 400));
    }
    
    /**
     * Get actual score based on match result
     */
    private function getActualScore($result, $player) {
        switch ($result) {
            case 'player1_win':
                return $player === 1 ? 1 : 0;
            case 'player2_win':
                return $player === 2 ? 1 : 0;
            case 'draw':
                return 0.5;
            default:
                throw new Exception("Invalid match result: $result");
        }
    }
    
    /**
     * Calculate bonus points for competitive matches
     */
    private function calculateSetBonus($player1Sets, $player2Sets) {
        $totalSets = $player1Sets + $player2Sets;
        
        if ($totalSets === 0) return 0;
        
        // Close match bonus (3-2, 2-1 etc)
        $setDifference = abs($player1Sets - $player2Sets);
        
        if ($setDifference === 1) {
            return 2; // Very close match
        } elseif ($setDifference === 2 && $totalSets >= 4) {
            return 1; // Somewhat close match
        }
        
        return 0;
    }
    
    /**
     * Update player ratings after match completion
     */
    public function updatePlayerRatings($matchId) {
        // Get match details
        $sql = "SELECT m.*, p1.current_rating as player1_rating, p2.current_rating as player2_rating
                FROM matches m
                INNER JOIN players p1 ON m.player1_id = p1.id
                INNER JOIN players p2 ON m.player2_id = p2.id
                WHERE m.id = :match_id AND m.status = 'completed' AND m.winner_id IS NOT NULL";
        
        $match = $this->db->fetchOne($sql, ['match_id' => $matchId]);
        
        if (!$match) {
            throw new Exception("Match not found or not completed");
        }
        
        // Determine result
        $result = 'draw';
        if ($match['winner_id'] == $match['player1_id']) {
            $result = 'player1_win';
        } elseif ($match['winner_id'] == $match['player2_id']) {
            $result = 'player2_win';
        }
        
        // Calculate new ratings
        $ratingChanges = $this->calculateMatchRatings(
            $match['player1_rating'],
            $match['player2_rating'],
            $result,
            $match['player1_sets_won'],
            $match['player2_sets_won']
        );
        
        // Update player ratings
        $this->updatePlayerRating($match['player1_id'], $ratingChanges['player1'], $match['tournament_id'], $matchId);
        $this->updatePlayerRating($match['player2_id'], $ratingChanges['player2'], $match['tournament_id'], $matchId);
        
        // Update partners if doubles match
        if ($match['match_type'] === 'doubles' && $match['player1_partner_id'] && $match['player2_partner_id']) {
            $this->updateDoublesPartnerRatings($match, $result);
        }
        
        return $ratingChanges;
    }
    
    /**
     * Update individual player rating
     */
    private function updatePlayerRating($playerId, $ratingData, $tournamentId, $matchId) {
        // Update player's current rating
        $sql = "UPDATE players SET current_rating = :new_rating, updated_at = NOW() WHERE id = :player_id";
        $this->db->execute($sql, [
            'player_id' => $playerId,
            'new_rating' => $ratingData['new_rating']
        ]);
        
        // Record rating history
        $historySql = "INSERT INTO player_ratings (
            player_id, tournament_id, match_id, old_rating, 
            new_rating, rating_change, reason, created_at
        ) VALUES (
            :player_id, :tournament_id, :match_id, :old_rating,
            :new_rating, :rating_change, 'match_result', NOW()
        )";
        
        $this->db->execute($historySql, [
            'player_id' => $playerId,
            'tournament_id' => $tournamentId,
            'match_id' => $matchId,
            'old_rating' => $ratingData['old_rating'],
            'new_rating' => $ratingData['new_rating'],
            'rating_change' => $ratingData['change']
        ]);
    }
    
    /**
     * Update ratings for doubles partners
     */
    private function updateDoublesPartnerRatings($match, $result) {
        // Get partner ratings
        $sql = "SELECT id, current_rating FROM players WHERE id IN (:partner1_id, :partner2_id)";
        $partners = $this->db->fetchAll($sql, [
            'partner1_id' => $match['player1_partner_id'],
            'partner2_id' => $match['player2_partner_id']
        ]);
        
        $partner1Rating = 0;
        $partner2Rating = 0;
        
        foreach ($partners as $partner) {
            if ($partner['id'] == $match['player1_partner_id']) {
                $partner1Rating = $partner['current_rating'];
            } elseif ($partner['id'] == $match['player2_partner_id']) {
                $partner2Rating = $partner['current_rating'];
            }
        }
        
        // Calculate partner rating changes (reduced impact)
        $partnerChanges = $this->calculateMatchRatings(
            $partner1Rating,
            $partner2Rating,
            $result,
            $match['player1_sets_won'],
            $match['player2_sets_won']
        );
        
        // Apply reduced multiplier for partners
        $partnerMultiplier = 0.7;
        $partnerChanges['player1']['change'] *= $partnerMultiplier;
        $partnerChanges['player2']['change'] *= $partnerMultiplier;
        $partnerChanges['player1']['new_rating'] = $partnerChanges['player1']['old_rating'] + $partnerChanges['player1']['change'];
        $partnerChanges['player2']['new_rating'] = $partnerChanges['player2']['old_rating'] + $partnerChanges['player2']['change'];
        
        // Update partner ratings
        $this->updatePlayerRating($match['player1_partner_id'], $partnerChanges['player1'], $match['tournament_id'], $match['id']);
        $this->updatePlayerRating($match['player2_partner_id'], $partnerChanges['player2'], $match['tournament_id'], $match['id']);
    }
    
    /**
     * Calculate tournament-specific rating adjustments
     */
    public function calculateTournamentRatingAdjustments($tournamentId) {
        // Get tournament results
        $sql = "SELECT tp.player_id, tp.tournament_wins, tp.tournament_losses, 
                tp.tournament_points, p.current_rating, t.format,
                COUNT(tp2.player_id) as total_players
                FROM tournament_players tp
                INNER JOIN players p ON tp.player_id = p.id
                INNER JOIN tournaments t ON tp.tournament_id = t.id
                CROSS JOIN tournament_players tp2 ON tp2.tournament_id = t.id
                WHERE tp.tournament_id = :tournament_id
                GROUP BY tp.player_id";
        
        $results = $this->db->fetchAll($sql, ['tournament_id' => $tournamentId]);
        
        $adjustments = [];
        
        foreach ($results as $result) {
            $adjustment = $this->calculateTournamentBonus(
                $result['tournament_wins'],
                $result['tournament_losses'],
                $result['total_players'],
                $result['format']
            );
            
            if ($adjustment !== 0) {
                $adjustments[] = [
                    'player_id' => $result['player_id'],
                    'current_rating' => $result['current_rating'],
                    'adjustment' => $adjustment,
                    'new_rating' => min(RATING_MAX, max(RATING_MIN, $result['current_rating'] + $adjustment))
                ];
            }
        }
        
        return $adjustments;
    }
    
    /**
     * Calculate tournament performance bonus
     */
    private function calculateTournamentBonus($wins, $losses, $totalPlayers, $format) {
        $totalGames = $wins + $losses;
        if ($totalGames === 0) return 0;
        
        $winPercentage = $wins / $totalGames;
        $participantBonus = min(10, $totalPlayers / 4); // Bonus for larger tournaments
        
        // Tournament finish bonus
        $finishBonus = 0;
        if ($winPercentage >= 0.8) {
            $finishBonus = 15; // Excellent performance
        } elseif ($winPercentage >= 0.6) {
            $finishBonus = 10; // Good performance
        } elseif ($winPercentage >= 0.4) {
            $finishBonus = 5;  // Average performance
        }
        
        // Format multiplier
        $formatMultiplier = 1;
        switch ($format) {
            case 'knockout':
                $formatMultiplier = 1.2; // Higher stakes
                break;
            case 'americano':
                $formatMultiplier = 0.8; // More balanced
                break;
            case 'round_robin':
                $formatMultiplier = 1.1; // Comprehensive
                break;
        }
        
        return round(($finishBonus + $participantBonus) * $formatMultiplier);
    }
    
    /**
     * Apply tournament rating adjustments
     */
    public function applyTournamentRatingAdjustments($tournamentId) {
        $adjustments = $this->calculateTournamentRatingAdjustments($tournamentId);
        
        foreach ($adjustments as $adjustment) {
            // Update player rating
            $sql = "UPDATE players SET current_rating = :new_rating, updated_at = NOW() WHERE id = :player_id";
            $this->db->execute($sql, [
                'player_id' => $adjustment['player_id'],
                'new_rating' => $adjustment['new_rating']
            ]);
            
            // Record rating history
            $historySql = "INSERT INTO player_ratings (
                player_id, tournament_id, old_rating, new_rating, 
                rating_change, reason, created_at
            ) VALUES (
                :player_id, :tournament_id, :old_rating, :new_rating,
                :rating_change, 'tournament_result', NOW()
            )";
            
            $this->db->execute($historySql, [
                'player_id' => $adjustment['player_id'],
                'tournament_id' => $tournamentId,
                'old_rating' => $adjustment['current_rating'],
                'new_rating' => $adjustment['new_rating'],
                'rating_change' => $adjustment['adjustment']
            ]);
        }
        
        return count($adjustments);
    }
    
    /**
     * Calculate rating distribution statistics
     */
    public function getRatingDistribution() {
        $sql = "SELECT 
                COUNT(*) as total_players,
                AVG(current_rating) as average_rating,
                MIN(current_rating) as min_rating,
                MAX(current_rating) as max_rating,
                STDDEV(current_rating) as rating_stddev,
                COUNT(CASE WHEN current_rating >= 2000 THEN 1 END) as expert_players,
                COUNT(CASE WHEN current_rating >= 1500 THEN 1 END) as advanced_players,
                COUNT(CASE WHEN current_rating >= 1000 THEN 1 END) as intermediate_players,
                COUNT(CASE WHEN current_rating < 1000 THEN 1 END) as beginner_players
                FROM players 
                WHERE is_active = 1 AND games_played >= 3";
        
        $distribution = $this->db->fetchOne($sql);
        
        // Calculate percentiles
        $percentilesSql = "SELECT current_rating,
                         PERCENT_RANK() OVER (ORDER BY current_rating) * 100 as percentile
                         FROM players 
                         WHERE is_active = 1 AND games_played >= 3
                         ORDER BY current_rating";
        
        $percentiles = $this->db->fetchAll($percentilesSql);
        
        return [
            'distribution' => $distribution,
            'percentiles' => $percentiles
        ];
    }
    
    /**
     * Get player's rating percentile
     */
    public function getPlayerPercentile($playerId) {
        $sql = "SELECT rating_percentile FROM (
                SELECT id, current_rating,
                PERCENT_RANK() OVER (ORDER BY current_rating) * 100 as rating_percentile
                FROM players 
                WHERE is_active = 1 AND games_played >= 3
            ) ranked WHERE id = :player_id";
        
        $result = $this->db->fetchOne($sql, ['player_id' => $playerId]);
        return $result ? round($result['rating_percentile'], 1) : null;
    }
    
    /**
     * Predict match outcome based on ratings
     */
    public function predictMatchOutcome($player1Rating, $player2Rating) {
        $expectedScore1 = $this->getExpectedScore($player1Rating, $player2Rating);
        $expectedScore2 = 1 - $expectedScore1;
        
        $ratingDifference = abs($player1Rating - $player2Rating);
        
        // Confidence based on rating difference
        $confidence = 'low';
        if ($ratingDifference >= 200) {
            $confidence = 'very_high';
        } elseif ($ratingDifference >= 100) {
            $confidence = 'high';
        } elseif ($ratingDifference >= 50) {
            $confidence = 'medium';
        }
        
        return [
            'player1_win_probability' => round($expectedScore1 * 100, 1),
            'player2_win_probability' => round($expectedScore2 * 100, 1),
            'confidence' => $confidence,
            'rating_difference' => $ratingDifference,
            'predicted_winner' => $expectedScore1 > 0.5 ? 'player1' : 'player2'
        ];
    }
    
    /**
     * Get optimal K-factor based on player experience
     */
    public function getOptimalKFactor($gamesPlayed, $currentRating) {
        // New players have higher K-factor for faster adjustment
        if ($gamesPlayed < 10) {
            return 40;
        } elseif ($gamesPlayed < 30) {
            return 32;
        } elseif ($currentRating > 2000) {
            return 16; // Lower K for highly rated players
        } else {
            return 24;
        }
    }
    
    /**
     * Batch update ratings for multiple matches
     */
    public function batchUpdateRatings($matchIds) {
        $updated = 0;
        
        try {
            $this->db->beginTransaction();
            
            foreach ($matchIds as $matchId) {
                $this->updatePlayerRatings($matchId);
                $updated++;
            }
            
            $this->db->commit();
        } catch (Exception $e) {
            $this->db->rollback();
            throw $e;
        }
        
        return $updated;
    }
    
    /**
     * Calculate rating volatility for a player
     */
    public function calculateRatingVolatility($playerId, $recentMatches = 10) {
        $sql = "SELECT rating_change FROM player_ratings 
                WHERE player_id = :player_id 
                ORDER BY created_at DESC 
                LIMIT :limit";
        
        $changes = $this->db->fetchAll($sql, [
            'player_id' => $playerId,
            'limit' => $recentMatches
        ]);
        
        if (count($changes) < 3) {
            return 0; // Not enough data
        }
        
        $changes = array_column($changes, 'rating_change');
        $mean = array_sum($changes) / count($changes);
        $variance = array_sum(array_map(function($x) use ($mean) { return pow($x - $mean, 2); }, $changes)) / count($changes);
        
        return round(sqrt($variance), 2);
    }
    
    /**
     * Get rating trends over time
     */
    public function getRatingTrends($playerId, $months = 6) {
        $sql = "SELECT 
                DATE(created_at) as date,
                new_rating,
                rating_change,
                reason
                FROM player_ratings 
                WHERE player_id = :player_id 
                AND created_at >= DATE_SUB(NOW(), INTERVAL :months MONTH)
                ORDER BY created_at ASC";
        
        return $this->db->fetchAll($sql, [
            'player_id' => $playerId,
            'months' => $months
        ]);
    }
    
    /**
     * Set custom K-factor for calculation
     */
    public function setKFactor($kFactor) {
        $this->kFactor = max(1, min(100, $kFactor));
    }
    
    /**
     * Get current K-factor
     */
    public function getKFactor() {
        return $this->kFactor;
    }
}
?>