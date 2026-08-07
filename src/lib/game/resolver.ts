import type { GameCommand, LegalCommand } from './commands';
import { getLegalCommands, resolveCommand, type CommandResolution } from './engine';
import type { GameEvent } from './events';
import { isPartyGameState, type AnyGameState, type PartyGameState } from './model';
import { getPartyLegalCommands, resolvePartyCommand } from './party-engine';
import type { RandomSource } from './rng';

export function getGameLegalCommands(state: AnyGameState): LegalCommand[] {
	return isPartyGameState(state) ? getPartyLegalCommands(state) : getLegalCommands(state);
}

export function resolveGameCommand(
	state: AnyGameState,
	command: GameCommand,
	rng: RandomSource
): CommandResolution | { state: PartyGameState; events: GameEvent[] } {
	return isPartyGameState(state)
		? resolvePartyCommand(state, command, rng)
		: resolveCommand(state, command, rng);
}
