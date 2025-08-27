<?php
/**
 * 🏓 Ping Pong Tournament Manager
 * Match Generator Class
 * 
 * @version 1.0.0
 * @author Tournament Manager Team
 * @license MIT
 */

class MatchGenerator {
    private $db;
    private $matchModel;
    
    public function __construct() {
        $this->db = Database::getInstance();
        require_once '../models/Match.php';
        $this->matchModel = new Match();
    }
    
    /**
     * Generate matches for a tournament based on format
     */
    public function generateMatches($tournamentId, $format, $players, $round = 1) {
        switch ($format) {
            case 'americano':
                return $this->generateAmericanoMatches($tournamentId, $players, $round);
            case 'singles':
                return $this->generateSinglesMatches($tournamentId, $players, $round);
            case 'doubles':
                return $this->generateDoublesMatches($tournamentId, $players, $round);
            case 'knockout':
                return $this->generateKnockoutMatches($tournamentId, $players, $round);
            case 'round_robin':
                return $this->generateRoundRobinMatches($tournamentId, $players, $round);
            case 'swiss':
                return $this->generateSwissMatches($tournamentId, $players, $round);
            default:
                throw new Exception("Unknown tournament format: $format");
        }
    }
    
    /**
     * Generate Americano matches (players rotate partners)
     */
    private function generateAmericanoMatches($tournamentId, $players, $round) {
        $playerCount = count($players);
        
        if ($playerCount < 4) {
            throw new Exception("Americano format requires at least 4 players");
        }
        
        // Ensure even number of players
        if ($playerCount % 4 !== 0) {
            throw new Exception("Americano format requires a multiple of 4 players");
        }
        
        $matches = [];
        $pairs = $this->generateAmericanoPairs($players, $round);
        
        // Create matches from pairs
        for ($i = 0; $i < count($pairs); $i += 2) {
            $pair1 = $pairs[$i];
            $pair2 = $pairs[$i + 1];
            
            $matchData = [
                'tournament_id' => $tournamentId,
                'round_number' => $round,
                'match_number' => ($i / 2) + 1,
                'player1_id' => $pair1[0]['id'],
                'player2_id' => $pair2[0]['id'],
                'player1_partner_id' => $pair1[1]['id'],
                'player2_partner_id' => $pair2[1]['id'],
                'match_type' => 'doubles',
                'status' => 'scheduled'
            ];
            
            $matchId = $this->matchModel->create($matchData);
            $matches[] = $matchId;
        }
        
        return $matches;
    }
    
    /**
     * Generate americano pairs with rotation algorithm
     */
    private function generateAmericanoPairs($players, $round) {
        $playerCount = count($players);
        $pairs = [];
        
        // Use round-robin style rotation for partner selection
        $rotation = ($round - 1) % ($playerCount - 1);
        
        // Create partnerships based on rotation
        $partnerships = [];
        for ($i = 0; $i < $playerCount / 2; $i++) {
            $player1Index = $i;
            $player2Index = ($i + $rotation) % $playerCount;
            
            // Avoid pairing player with themselves
            if ($player1Index === $player2Index) {
                $player2Index = ($player2Index + 1) % $playerCount;
            }
            
            $partnerships[] = [$players[$player1Index], $players[$player2Index]];
        }
        
        // Group partnerships into matches
        for ($i = 0; $i < count($partnerships); $i += 2) {
            if (isset($partnerships[$i + 1])) {
                $pairs[] = $partnerships[$i];
                $pairs[] = $partnerships[$i + 1];
            }
        }
        
        return $pairs;
    }
    
    /**
     * Generate singles tournament matches
     */
    private function generateSinglesMatches($tournamentId, $players, $round) {
        $matches = [];
        $matchNumber = 1;
        
        if ($round === 1) {
            // First round - pair players by rating (seeded)
            $sortedPlayers = $this->sortPlayersByRating($players);
            
            for ($i = 0; $i < count($sortedPlayers); $i += 2) {
                if (isset($sortedPlayers[$i + 1])) {
                    $matchData = [
                        'tournament_id' => $tournamentId,
                        'round_number' => $round,
                        'match_number' => $matchNumber++,
                        'player1_id' => $sortedPlayers[$i]['id'],
                        'player2_id' => $sortedPlayers[$i + 1]['id'],
                        'match_type' => 'singles',
                        'status' => 'scheduled'
                    ];
                    
                    $matchId = $this->matchModel->create($matchData);
                    $matches[] = $matchId;
                }
            }
        } else {
            // Subsequent rounds - Swiss system pairing
            $matches = $this->generateSwissMatches($tournamentId, $players, $round);
        }
        
        return $matches;
    }
    
    /**
     * Generate doubles tournament matches
     */
    private function generateDoublesMatches($tournamentId, $players, $round) {
        $playerCount = count($players);
        
        if ($playerCount % 4 !== 0) {
            throw new Exception("Doubles format requires a multiple of 4 players");
        }
        
        $matches = [];
        $teams = $this->createDoublesTeams($players, $round);
        
        for ($i = 0; $i < count($teams); $i += 2) {
            if (isset($teams[$i + 1])) {
                $team1 = $teams[$i];
                $team2 = $teams[$i + 1];
                
                $matchData = [
                    'tournament_id' => $tournamentId,
                    'round_number' => $round,
                    'match_number' => ($i / 2) + 1,
                    'player1_id' => $team1[0]['id'],
                    'player2_id' => $team2[0]['id'],
                    'player1_partner_id' => $team1[1]['id'],
                    'player2_partner_id' => $team2[1]['id'],
                    'match_type' => 'doubles',
                    'status' => 'scheduled'
                ];
                
                $matchId = $this->matchModel->create($matchData);
                $matches[] = $matchId;
            }
        }
        
        return $matches;
    }
    
    /**
     * Create doubles teams
     */
    private function createDoublesTeams($players, $round) {
        // For first round, create balanced teams by rating
        if ($round === 1) {
            $sortedPlayers = $this->sortPlayersByRating($players);
            $teams = [];
            
            // Snake draft style team creation
            for ($i = 0; $i < count($sortedPlayers); $i += 4) {
                if (isset($sortedPlayers[$i + 3])) {
                    // Team 1: Highest + Lowest
                    $teams[] = [$sortedPlayers[$i], $sortedPlayers[$i + 3]];
                    // Team 2: Middle ratings
                    $teams[] = [$sortedPlayers[$i + 1], $sortedPlayers[$i + 2]];
                }
            }
            
            return $teams;
        }
        
        // For subsequent rounds, use tournament standings
        return $this->createTeamsByStandings($players);
    }
    
    /**
     * Generate knockout tournament matches
     */
    private function generateKnockoutMatches($tournamentId, $players, $round) {
        $matches = [];
        
        if ($round === 1) {
            // First round - bracket seeding
            $bracketSize = $this->getNextPowerOfTwo(count($players));
            $seededPlayers = $this->seedPlayersForBracket($players, $bracketSize);
            
            for ($i = 0; $i < count($seededPlayers); $i += 2) {
                if (isset($seededPlayers[$i + 1])) {
                    $matchData = [
                        'tournament_id' => $tournamentId,
                        'round_number' => $round,
                        'match_number' => ($i / 2) + 1,
                        'player1_id' => $seededPlayers[$i]['id'] ?? null,
                        'player2_id' => $seededPlayers[$i + 1]['id'] ?? null,
                        'match_type' => 'singles',
                        'status' => 'scheduled'
                    ];
                    
                    // Handle byes (null players get automatic wins)
                    if ($matchData['player1_id'] === null) {
                        $matchData['winner_id'] = $matchData['player2_id'];
                        $matchData['status'] = 'completed';
                    } elseif ($matchData['player2_id'] === null) {
                        $matchData['winner_id'] = $matchData['player1_id'];
                        $matchData['status'] = 'completed';
                    }
                    
                    $matchId = $this->matchModel->create($matchData);
                    $matches[] = $matchId;
                }
            }
        } else {
            // Subsequent rounds - winners from previous round
            $winners = $this->getWinnersFromPreviousRound($tournamentId, $round - 1);
            
            for ($i = 0; $i < count($winners); $i += 2) {
                if (isset($winners[$i + 1])) {
                    $matchData = [
                        'tournament_id' => $tournamentId,
                        'round_number' => $round,
                        'match_number' => ($i / 2) + 1,
                        'player1_id' => $winners[$i]['winner_id'],
                        'player2_id' => $winners[$i + 1]['winner_id'],
                        'match_type' => 'singles',
                        'status' => 'scheduled'
                    ];
                    
                    $matchId = $this->matchModel->create($matchData);
                    $matches[] = $matchId;
                }
            }
        }
        
        return $matches;
    }
    
    /**
     * Generate round robin matches
     */
    private function generateRoundRobinMatches($tournamentId, $players, $round) {
        $playerCount = count($players);
        $totalRounds = $playerCount - 1;
        
        if ($round > $totalRounds) {
            return []; // Tournament complete
        }
        
        $matches = [];
        $roundMatches = $this->getRoundRobinPairings($players, $round);
        
        $matchNumber = 1;
        foreach ($roundMatches as $pairing) {
            $matchData = [
                'tournament_id' => $tournamentId,
                'round_number' => $round,
                'match_number' => $matchNumber++,
                'player1_id' => $pairing[0]['id'],
                'player2_id' => $pairing[1]['id'],
                'match_type' => 'singles',
                'status' => 'scheduled'
            ];
            
            $matchId = $this->matchModel->create($matchData);
            $matches[] = $matchId;
        }
        
        return $matches;
    }
    
    /**
     * Generate Swiss system matches
     */
    private function generateSwissMatches($tournamentId, $players, $round) {
        if ($round === 1) {
            return $this->generateSinglesMatches($tournamentId, $players, $round);
        }
        
        // Get current standings
        $standings = $this->getTournamentStandings($tournamentId);
        $matches = [];
        
        // Swiss pairing algorithm
        $paired = [];
        $matchNumber = 1;
        
        foreach ($standings as $i => $player) {
            if (in_array($player['player_id'], $paired)) {
                continue;
            }
            
            // Find best opponent with similar score
            $opponent = $this->findSwissOpponent($player, $standings, $paired, $tournamentId);
            
            if ($opponent) {
                $matchData = [
                    'tournament_id' => $tournamentId,
                    'round_number' => $round,
                    'match_number' => $matchNumber++,
                    'player1_id' => $player['player_id'],
                    'player2_id' => $opponent['player_id'],
                    'match_type' => 'singles',
                    'status' => 'scheduled'
                ];
                
                $matchId = $this->matchModel->create($matchData);
                $matches[] = $matchId;
                
                $paired[] = $player['player_id'];
                $paired[] = $opponent['player_id'];
            }
        }
        
        return $matches;
    }
    
    /**
     * Sort players by rating (descending)
     */
    private function sortPlayersByRating($players) {
        usort($players, function($a, $b) {
            return $b['current_rating'] - $a['current_rating'];
        });
        return $players;
    }
    
    /**
     * Get next power of two for bracket size
     */
    private function getNextPowerOfTwo($n) {
        $power = 1;
        while ($power < $n) {
            $power *= 2;
        }
        return $power;
    }
    
    /**
     * Seed players for knockout bracket
     */
    private function seedPlayersForBracket($players, $bracketSize) {
        $sortedPlayers = $this->sortPlayersByRating($players);
        $seeded = array_fill(0, $bracketSize, null);
        
        // Place seeded players
        for ($i = 0; $i < count($sortedPlayers); $i++) {
            $seeded[$i] = $sortedPlayers[$i];
        }
        
        return $seeded;
    }
    
    /**
     * Get winners from previous round
     */
    private function getWinnersFromPreviousRound($tournamentId, $round) {
        $sql = "SELECT winner_id, match_number 
                FROM matches 
                WHERE tournament_id = :tournament_id 
                AND round_number = :round 
                AND status = 'completed'
                AND winner_id IS NOT NULL
                ORDER BY match_number ASC";
        
        return $this->db->fetchAll($sql, [
            'tournament_id' => $tournamentId,
            'round' => $round
        ]);
    }
    
    /**
     * Get round robin pairings for a specific round
     */
    private function getRoundRobinPairings($players, $round) {
        $playerCount = count($players);
        
        if ($playerCount % 2 !== 0) {
            // Add bye player
            $players[] = ['id' => null, 'name' => 'BYE'];
            $playerCount++;
        }
        
        $pairings = [];
        
        // Round-robin algorithm
        for ($i = 0; $i < $playerCount / 2; $i++) {
            $player1Index = $i;
            $player2Index = $playerCount - 1 - $i;
            
            // Rotate players (except first player stays fixed)
            if ($player1Index > 0) {
                $player1Index = (($player1Index - 1 + $round - 1) % ($playerCount - 1)) + 1;
            }
            if ($player2Index > 0) {
                $player2Index = (($player2Index - 1 + $round - 1) % ($playerCount - 1)) + 1;
            }
            
            // Skip bye matches
            if ($players[$player1Index]['id'] !== null && $players[$player2Index]['id'] !== null) {
                $pairings[] = [$players[$player1Index], $players[$player2Index]];
            }
        }
        
        return $pairings;
    }
    
    /**
     * Get tournament standings for Swiss pairing
     */
    private function getTournamentStandings($tournamentId) {
        $sql = "SELECT tp.player_id, tp.tournament_wins, tp.tournament_losses, 
                tp.tournament_points, p.current_rating
                FROM tournament_players tp
                INNER JOIN players p ON tp.player_id = p.id
                WHERE tp.tournament_id = :tournament_id
                ORDER BY tp.tournament_points DESC, tp.tournament_wins DESC, p.current_rating DESC";
        
        return $this->db->fetchAll($sql, ['tournament_id' => $tournamentId]);
    }
    
    /**
     * Find Swiss opponent with similar score
     */
    private function findSwissOpponent($player, $standings, $paired, $tournamentId) {
        // Check if players have played before
        $playedBefore = $this->getPlayedOpponents($tournamentId, $player['player_id']);
        
        foreach ($standings as $potential) {
            if ($potential['player_id'] === $player['player_id']) {
                continue;
            }
            
            if (in_array($potential['player_id'], $paired)) {
                continue;
            }
            
            if (in_array($potential['player_id'], $playedBefore)) {
                continue; // Avoid repeat pairings if possible
            }
            
            // Check score similarity (within 1 point difference)
            if (abs($potential['tournament_points'] - $player['tournament_points']) <= 1) {
                return $potential;
            }
        }
        
        // If no suitable opponent found, relax constraints
        foreach ($standings as $potential) {
            if ($potential['player_id'] === $player['player_id']) {
                continue;
            }
            
            if (in_array($potential['player_id'], $paired)) {
                continue;
            }
            
            return $potential;
        }
        
        return null;
    }
    
    /**
     * Get opponents a player has already played
     */
    private function getPlayedOpponents($tournamentId, $playerId) {
        $sql = "SELECT DISTINCT 
                CASE 
                    WHEN player1_id = :player_id THEN player2_id
                    ELSE player1_id 
                END as opponent_id
                FROM matches 
                WHERE tournament_id = :tournament_id 
                AND (player1_id = :player_id OR player2_id = :player_id)
                AND status IN ('completed', 'in_progress')";
        
        $results = $this->db->fetchAll($sql, [
            'tournament_id' => $tournamentId,
            'player_id' => $playerId
        ]);
        
        return array_column($results, 'opponent_id');
    }
    
    /**
     * Create teams by current tournament standings
     */
    private function createTeamsByStandings($players) {
        // Sort by tournament performance
        usort($players, function($a, $b) {
            // This would need tournament standings data
            return $b['tournament_points'] - $a['tournament_points'];
        });
        
        $teams = [];
        for ($i = 0; $i < count($players); $i += 2) {
            if (isset($players[$i + 1])) {
                $teams[] = [$players[$i], $players[$i + 1]];
            }
        }
        
        return $teams;
    }
    
    /**
     * Calculate total rounds needed for tournament format
     */
    public function calculateTotalRounds($format, $playerCount) {
        switch ($format) {
            case 'americano':
                // Each player should partner with each other player once
                return $playerCount - 1;
                
            case 'singles':
            case 'swiss':
                // Swiss system typically runs for log2(n) + 1 rounds
                return ceil(log($playerCount, 2)) + 1;
                
            case 'knockout':
                // Knockout needs log2(n) rounds
                return ceil(log($this->getNextPowerOfTwo($playerCount), 2));
                
            case 'round_robin':
                // Each player plays each other player once
                return $playerCount - 1;
                
            case 'doubles':
                // Similar to singles but with team combinations
                $teamCount = $playerCount / 2;
                return ceil(log($teamCount, 2)) + 1;
                
            default:
                return 5; // Default rounds
        }
    }
    
    /**
     * Check if tournament round is complete
     */
    public function isRoundComplete($tournamentId, $round) {
        $sql = "SELECT COUNT(*) as total,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
                FROM matches 
                WHERE tournament_id = :tournament_id AND round_number = :round";
        
        $result = $this->db->fetchOne($sql, [
            'tournament_id' => $tournamentId,
            'round' => $round
        ]);
        
        return $result['total'] > 0 && $result['total'] === $result['completed'];
    }
    
    /**
     * Get match assignments for tables
     */
    public function assignMatchesToTables($matches, $tableCount) {
        $assignments = [];
        $tableNumber = 1;
        
        foreach ($matches as $matchId) {
            $assignments[$matchId] = $tableNumber;
            $tableNumber = ($tableNumber % $tableCount) + 1;
        }
        
        return $assignments;
    }
}
?>