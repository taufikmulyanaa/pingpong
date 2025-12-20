/**
 * Tournament Export Utilities
 * Export bracket and results to PDF/CSV format
 */

import { supabase } from "./supabase";

interface ExportMatch {
    round: number;
    matchNumber: number;
    player1: string;
    player2: string;
    score1: number;
    score2: number;
    winner: string;
    status: string;
}

interface ExportParticipant {
    rank: number;
    name: string;
    ratingMR: number;
    wins: number;
    losses: number;
    status: string;
}

/**
 * Fetch tournament data for export
 */
export async function fetchTournamentExportData(tournamentId: string) {
    // Fetch tournament info
    const { data: tournament } = await supabase
        .from("tournaments")
        .select("name, start_date, end_date, format, max_participants")
        .eq("id", tournamentId)
        .single();

    // Fetch matches
    const { data: matches } = await (supabase
        .from("tournament_matches") as any)
        .select(`
            round, match_number, player1_score, player2_score, status, is_bye,
            player1:player1_id (name),
            player2:player2_id (name),
            winner:winner_id (name)
        `)
        .eq("tournament_id", tournamentId)
        .order("round")
        .order("match_number");

    // Fetch participants
    const { data: participants } = await (supabase
        .from("tournament_participants") as any)
        .select(`
            seed, status,
            profiles:user_id (name, rating_mr)
        `)
        .eq("tournament_id", tournamentId)
        .order("seed");

    return {
        tournament: tournament as any,
        matches: (matches || []).filter((m: any) => !m.is_bye).map((m: any) => ({
            round: m.round,
            matchNumber: m.match_number,
            player1: m.player1?.name || "TBD",
            player2: m.player2?.name || "TBD",
            score1: m.player1_score,
            score2: m.player2_score,
            winner: m.winner?.name || "-",
            status: m.status,
        })),
        participants: (participants || []).map((p: any, index: number) => ({
            rank: index + 1,
            name: p.profiles?.name || "Unknown",
            ratingMR: p.profiles?.rating_mr || 1000,
            wins: 0, // Calculated separately
            losses: 0,
            status: p.status,
        })),
    };
}

/**
 * Generate CSV content for matches
 */
export function generateMatchesCSV(matches: ExportMatch[], tournamentName: string): string {
    const headers = ["Round", "Match #", "Player 1", "Player 2", "Score", "Winner", "Status"];
    const rows = matches.map(m => [
        m.round,
        m.matchNumber,
        m.player1,
        m.player2,
        `${m.score1} - ${m.score2}`,
        m.winner,
        m.status,
    ]);

    const csvContent = [
        `# ${tournamentName} - Match Results`,
        `# Generated: ${new Date().toLocaleDateString('id-ID')}`,
        "",
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    return csvContent;
}

/**
 * Generate CSV content for participants
 */
export function generateParticipantsCSV(participants: ExportParticipant[], tournamentName: string): string {
    const headers = ["Rank", "Name", "MR Rating", "Wins", "Losses", "Status"];
    const rows = participants.map(p => [
        p.rank,
        p.name,
        p.ratingMR,
        p.wins,
        p.losses,
        p.status,
    ]);

    const csvContent = [
        `# ${tournamentName} - Participants`,
        `# Generated: ${new Date().toLocaleDateString('id-ID')}`,
        "",
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    return csvContent;
}

/**
 * Generate HTML content for bracket (can be printed as PDF)
 */
export function generateBracketHTML(
    matches: ExportMatch[],
    tournamentName: string,
    format: string
): string {
    // Group matches by round
    const rounds = new Map<number, ExportMatch[]>();
    matches.forEach(m => {
        if (!rounds.has(m.round)) {
            rounds.set(m.round, []);
        }
        rounds.get(m.round)!.push(m);
    });

    const totalRounds = Math.max(...Array.from(rounds.keys()));

    const getRoundName = (round: number) => {
        if (round === totalRounds) return "Final";
        if (round === totalRounds - 1) return "Semi Final";
        if (round === totalRounds - 2) return "Quarter Final";
        return `Round ${round}`;
    };

    const roundsHTML = Array.from(rounds.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([round, roundMatches]) => `
            <div class="round">
                <h3>${getRoundName(round)}</h3>
                ${roundMatches.map(m => `
                    <div class="match ${m.status === 'COMPLETED' ? 'completed' : ''}">
                        <div class="player ${m.winner === m.player1 ? 'winner' : ''}">${m.player1} <span>${m.score1}</span></div>
                        <div class="player ${m.winner === m.player2 ? 'winner' : ''}">${m.player2} <span>${m.score2}</span></div>
                    </div>
                `).join('')}
            </div>
        `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${tournamentName} - Bracket</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 { color: #001064; margin-bottom: 8px; }
        h2 { color: #666; font-weight: normal; font-size: 14px; margin-bottom: 20px; }
        .bracket { display: flex; gap: 20px; overflow-x: auto; padding: 20px 0; }
        .round { 
            min-width: 180px; 
            display: flex; 
            flex-direction: column; 
            gap: 16px;
        }
        .round h3 { 
            text-align: center; 
            color: #001064; 
            font-size: 14px;
            padding-bottom: 8px;
            border-bottom: 2px solid #001064;
        }
        .match { 
            background: white; 
            border-radius: 8px; 
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .match.completed { border-left: 3px solid #10B981; }
        .player { 
            padding: 10px 12px;
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            border-bottom: 1px solid #eee;
        }
        .player:last-child { border-bottom: none; }
        .player.winner { font-weight: bold; color: #10B981; }
        .player span { font-weight: bold; }
        .footer { 
            margin-top: 40px; 
            text-align: center; 
            color: #999; 
            font-size: 12px; 
        }
    </style>
</head>
<body>
    <h1>${tournamentName}</h1>
    <h2>Format: ${format} | Generated: ${new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })}</h2>
    
    <div class="bracket">
        ${roundsHTML}
    </div>
    
    <div class="footer">
        Generated by PingpongHub
    </div>
</body>
</html>
    `;
}

/**
 * Share/Download CSV file (React Native)
 */
export async function shareCSV(content: string, filename: string) {
    try {
        // For React Native, we would use expo-sharing or react-native-share
        // This is a placeholder that logs the content
        console.log(`CSV Export: ${filename}`, content);

        // In actual implementation:
        // import * as FileSystem from 'expo-file-system';
        // import * as Sharing from 'expo-sharing';
        // 
        // const fileUri = FileSystem.documentDirectory + filename;
        // await FileSystem.writeAsStringAsync(fileUri, content);
        // await Sharing.shareAsync(fileUri);

        return { success: true };
    } catch (error) {
        console.error("Export error:", error);
        return { success: false, error };
    }
}

/**
 * Format types for the export buttons component
 */
export type ExportFormat = 'csv_matches' | 'csv_participants' | 'html_bracket';
