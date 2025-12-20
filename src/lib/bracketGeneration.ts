/**
 * Bracket Generation Utilities
 * Handles single elimination, double elimination, and round robin bracket generation
 */

import { v4 as uuidv4 } from 'uuid';

// Use a simple UUID generator fallback for React Native
const generateId = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export interface Participant {
    id: string;
    name: string;
    seed?: number;
    rating_mr?: number;
}

export interface BracketMatch {
    id: string;
    round: number;
    matchNumber: number;
    player1: Participant | null;
    player2: Participant | null;
    winner: Participant | null;
    score1: number;
    score2: number;
    nextMatchId?: string;
    nextMatchSlot?: number;
    isBye: boolean;
    bracketSide: 'WINNERS' | 'LOSERS' | 'GRAND_FINAL';
    scheduledAt?: string;
    tableNumber?: number;
    losersNextMatchId?: string;
    losersNextMatchSlot?: number;
}

// ============================================
// SINGLE ELIMINATION
// ============================================

export function generateSingleElimBracket(
    participants: Participant[],
    randomize: boolean = true
): BracketMatch[][] {
    const seededParticipants = randomize
        ? shuffleArray([...participants])
        : [...participants].sort((a, b) => (a.seed || 999) - (b.seed || 999));

    const slotCount = getNextPowerOfTwo(seededParticipants.length);
    const totalRounds = Math.log2(slotCount);
    const bracket: BracketMatch[][] = [];

    // Fill with byes
    while (seededParticipants.length < slotCount) {
        seededParticipants.push({ id: '', name: 'BYE', seed: 999 } as Participant);
    }

    // Generate first round
    const firstRound: BracketMatch[] = [];
    for (let i = 0; i < slotCount / 2; i++) {
        const p1 = seededParticipants[i * 2];
        const p2 = seededParticipants[i * 2 + 1];
        const isBye = !p1.id || !p2.id;
        const winner = isBye ? (p1.id ? p1 : p2) : null;

        firstRound.push({
            id: generateId(),
            round: 1,
            matchNumber: i + 1,
            player1: p1.id ? p1 : null,
            player2: p2.id ? p2 : null,
            winner,
            score1: 0,
            score2: 0,
            isBye,
            bracketSide: 'WINNERS',
        });
    }
    bracket.push(firstRound);

    // Generate subsequent rounds
    for (let round = 2; round <= totalRounds; round++) {
        const prevRound = bracket[round - 2];
        const currentRound: BracketMatch[] = [];

        for (let i = 0; i < prevRound.length / 2; i++) {
            const match1 = prevRound[i * 2];
            const match2 = prevRound[i * 2 + 1];

            const newMatch: BracketMatch = {
                id: generateId(),
                round,
                matchNumber: i + 1,
                player1: match1.isBye ? match1.winner : null,
                player2: match2.isBye ? match2.winner : null,
                winner: null,
                score1: 0,
                score2: 0,
                isBye: false,
                bracketSide: 'WINNERS',
            };

            // Link previous matches to this one
            match1.nextMatchId = newMatch.id;
            match1.nextMatchSlot = 1;
            match2.nextMatchId = newMatch.id;
            match2.nextMatchSlot = 2;

            currentRound.push(newMatch);
        }
        bracket.push(currentRound);
    }

    return bracket;
}

// ============================================
// DOUBLE ELIMINATION
// ============================================

export function generateDoubleElimBracket(
    participants: Participant[],
    randomize: boolean = true
): { winners: BracketMatch[][]; losers: BracketMatch[][]; grandFinal: BracketMatch } {
    // Generate winners bracket (same as single elim)
    const winners = generateSingleElimBracket(participants, randomize);

    const slotCount = getNextPowerOfTwo(participants.length);
    const totalWinnersRounds = Math.log2(slotCount);

    // Losers bracket has (2 * winnersRounds - 2) rounds for standard double elim
    // But simplified: losers bracket has 2 * (winnersRounds - 1) rounds
    const losersRounds = 2 * (totalWinnersRounds - 1);
    const losers: BracketMatch[][] = [];

    // Round 1 of losers: receives losers from winners round 1
    const losersR1: BracketMatch[] = [];
    const winnersR1 = winners[0];
    for (let i = 0; i < winnersR1.length / 2; i++) {
        losersR1.push({
            id: generateId(),
            round: 1,
            matchNumber: i + 1,
            player1: null, // Will be filled by loser of winners R1
            player2: null,
            winner: null,
            score1: 0,
            score2: 0,
            isBye: false,
            bracketSide: 'LOSERS',
        });
    }
    losers.push(losersR1);

    // Link winners R1 losers to losers R1
    for (let i = 0; i < winnersR1.length; i++) {
        const losersMatchIdx = Math.floor(i / 2);
        const slot = (i % 2) + 1;
        winnersR1[i].losersNextMatchId = losersR1[losersMatchIdx]?.id;
        winnersR1[i].losersNextMatchSlot = slot;
    }

    // Generate remaining losers rounds
    let prevLosersCount = losersR1.length;
    for (let round = 2; round <= losersRounds; round++) {
        const isDropRound = round % 2 === 0; // Even rounds receive new losers from winners
        const currentRound: BracketMatch[] = [];

        if (isDropRound) {
            // Matches in this round = same as previous (receives drops from winners)
            for (let i = 0; i < prevLosersCount; i++) {
                currentRound.push({
                    id: generateId(),
                    round,
                    matchNumber: i + 1,
                    player1: null,
                    player2: null,
                    winner: null,
                    score1: 0,
                    score2: 0,
                    isBye: false,
                    bracketSide: 'LOSERS',
                });
            }
        } else {
            // Regular consolidation round - halve the matches
            for (let i = 0; i < prevLosersCount / 2; i++) {
                currentRound.push({
                    id: generateId(),
                    round,
                    matchNumber: i + 1,
                    player1: null,
                    player2: null,
                    winner: null,
                    score1: 0,
                    score2: 0,
                    isBye: false,
                    bracketSide: 'LOSERS',
                });
            }
            prevLosersCount = currentRound.length;
        }

        // Link previous losers round to current
        const prevRound = losers[losers.length - 1];
        for (let i = 0; i < prevRound.length; i++) {
            const nextMatchIdx = isDropRound ? i : Math.floor(i / 2);
            const slot = isDropRound ? 1 : (i % 2) + 1;
            if (currentRound[nextMatchIdx]) {
                prevRound[i].nextMatchId = currentRound[nextMatchIdx].id;
                prevRound[i].nextMatchSlot = slot;
            }
        }

        losers.push(currentRound);
    }

    // Grand Final
    const grandFinal: BracketMatch = {
        id: generateId(),
        round: 1,
        matchNumber: 1,
        player1: null, // Winners bracket champion
        player2: null, // Losers bracket champion
        winner: null,
        score1: 0,
        score2: 0,
        isBye: false,
        bracketSide: 'GRAND_FINAL',
    };

    // Link winners final to grand final
    const winnersFinal = winners[winners.length - 1][0];
    winnersFinal.nextMatchId = grandFinal.id;
    winnersFinal.nextMatchSlot = 1;

    // Link losers final to grand final
    if (losers.length > 0) {
        const losersFinal = losers[losers.length - 1][0];
        if (losersFinal) {
            losersFinal.nextMatchId = grandFinal.id;
            losersFinal.nextMatchSlot = 2;
        }
    }

    return { winners, losers, grandFinal };
}

// ============================================
// ROUND ROBIN
// ============================================

export function generateRoundRobinMatches(
    participants: Participant[],
    groupName?: string
): BracketMatch[] {
    const matches: BracketMatch[] = [];
    const n = participants.length;

    // Each participant plays every other participant once
    let matchNumber = 1;
    let round = 1;

    // Using circle method for round robin scheduling
    // This ensures balanced rounds
    const players = [...participants];
    if (players.length % 2 !== 0) {
        players.push({ id: '', name: 'BYE', seed: 999 } as Participant);
    }

    const numRounds = players.length - 1;
    const halfSize = players.length / 2;

    const playerIndices = Array.from({ length: players.length }, (_, i) => i);

    for (let roundNum = 0; roundNum < numRounds; roundNum++) {
        round = roundNum + 1;

        for (let i = 0; i < halfSize; i++) {
            const p1Idx = playerIndices[i];
            const p2Idx = playerIndices[players.length - 1 - i];

            const p1 = players[p1Idx];
            const p2 = players[p2Idx];

            // Skip if either is a BYE
            if (!p1.id || !p2.id) continue;

            matches.push({
                id: generateId(),
                round,
                matchNumber: matchNumber++,
                player1: p1,
                player2: p2,
                winner: null,
                score1: 0,
                score2: 0,
                isBye: false,
                bracketSide: 'WINNERS',
            });
        }

        // Rotate players (keep first player fixed for circle method)
        const last = playerIndices.pop()!;
        playerIndices.splice(1, 0, last);
    }

    return matches;
}

// ============================================
// GROUP TO KNOCKOUT TRANSITION
// ============================================

export interface GroupStanding {
    participantId: string;
    participant: Participant;
    matchesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    setsWon: number;
    setsLost: number;
    pointsFor: number;
    pointsAgainst: number;
    standingPoints: number;
}

export function calculateGroupStandings(
    participants: Participant[],
    matches: BracketMatch[]
): GroupStanding[] {
    const standings: Map<string, GroupStanding> = new Map();

    // Initialize standings for all participants
    participants.forEach(p => {
        standings.set(p.id, {
            participantId: p.id,
            participant: p,
            matchesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            setsWon: 0,
            setsLost: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            standingPoints: 0,
        });
    });

    // Process completed matches
    matches.forEach(match => {
        if (!match.winner || !match.player1 || !match.player2) return;

        const p1Standing = standings.get(match.player1.id);
        const p2Standing = standings.get(match.player2.id);
        if (!p1Standing || !p2Standing) return;

        // Update match counts
        p1Standing.matchesPlayed++;
        p2Standing.matchesPlayed++;

        // Update scores
        p1Standing.pointsFor += match.score1;
        p1Standing.pointsAgainst += match.score2;
        p2Standing.pointsFor += match.score2;
        p2Standing.pointsAgainst += match.score1;

        // Update wins/losses
        if (match.winner.id === match.player1.id) {
            p1Standing.wins++;
            p1Standing.standingPoints += 3; // 3 points for win
            p2Standing.losses++;
        } else if (match.winner.id === match.player2.id) {
            p2Standing.wins++;
            p2Standing.standingPoints += 3;
            p1Standing.losses++;
        } else {
            // Draw (rare in table tennis)
            p1Standing.draws++;
            p2Standing.draws++;
            p1Standing.standingPoints += 1;
            p2Standing.standingPoints += 1;
        }
    });

    // Sort by standing points, then by point difference
    return Array.from(standings.values()).sort((a, b) => {
        if (b.standingPoints !== a.standingPoints) {
            return b.standingPoints - a.standingPoints;
        }
        const aPointDiff = a.pointsFor - a.pointsAgainst;
        const bPointDiff = b.pointsFor - b.pointsAgainst;
        return bPointDiff - aPointDiff;
    });
}

export function getQualifiersFromGroups(
    groups: { groupId: string; standings: GroupStanding[] }[],
    qualifiersPerGroup: number = 2
): Participant[] {
    const qualifiers: Participant[] = [];

    groups.forEach(group => {
        // Take top N from each group
        const topN = group.standings.slice(0, qualifiersPerGroup);
        topN.forEach(standing => {
            qualifiers.push(standing.participant);
        });
    });

    return qualifiers;
}

export function generateKnockoutFromGroups(
    groups: { groupId: string; standings: GroupStanding[] }[],
    qualifiersPerGroup: number = 2
): BracketMatch[][] {
    const qualifiers = getQualifiersFromGroups(groups, qualifiersPerGroup);

    // Cross-seed: #1 from group A vs #2 from group B, etc.
    // Reorder for proper seeding
    const seededQualifiers: Participant[] = [];
    const numGroups = groups.length;

    for (let seed = 0; seed < qualifiersPerGroup; seed++) {
        for (let groupIdx = 0; groupIdx < numGroups; groupIdx++) {
            const actualGroupIdx = seed % 2 === 0 ? groupIdx : numGroups - 1 - groupIdx;
            if (groups[actualGroupIdx].standings[seed]) {
                seededQualifiers.push(groups[actualGroupIdx].standings[seed].participant);
            }
        }
    }

    // Generate single elim bracket with seeded qualifiers
    return generateSingleElimBracket(seededQualifiers, false);
}

// ============================================
// HELPERS
// ============================================

function getNextPowerOfTwo(n: number): number {
    let power = 1;
    while (power < n) power *= 2;
    return power;
}

function shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
