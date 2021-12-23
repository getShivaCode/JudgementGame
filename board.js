let createBoard = (numPlayers) => {
	let board = {
		players: [],
		round: {
			"cards": [],
			"winningPlayer": 0,
			"winningCard": 0,
			"trump": 0,
			"starter": 0,
			"handWinner": 0
		} 
	};
	for (let i=0; i<numPlayers; i++) {
		let player = {
			"name": null,
			"id": null,
			"cards": [],
			"tricks": 0,
			"bid": -1,
			"score": 0,
			// For reload purposes
			"status": 'W'
			// Reload purposes end
		}
		board.players.push(player);
	}
	return board;
}

module.exports = createBoard;