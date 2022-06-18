'use strict'

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const _ = require('lodash');

const debug = require('debug');
const consoleInfo = debug('Judgement:info');
const consoleError = debug('Judgement:error');
const PORT = process.env.PORT || 3000;
const publicHTMLPath = process.env.NODE_STATIC_HTML || './public';
//Static HTML directory
app.use(express.static(publicHTMLPath));

let boards = [];

// Hard code the number of players for now
let numPlayers = null;
let numUsers = 0;
//let numCards = null;
let currGame = null;
let createBoard = require('./board.js');

io.on('connection', (socket) => {
	numUsers++;
  consoleInfo(`a user ${socket.id} connected. Connected users: ${numUsers}`);
  // Move all connection logic to somewhere else
  // This function needs to be updated to remove player's details from the board
  socket.on('disconnect', () => {
  	numUsers--;
    consoleInfo(`user ${socket.id} disconnected. Connected users: ${numUsers}`);
  });

  /*
  socket.on('Set Name', (initializePlayer) => {
    consoleInfo("Got " + JSON.stringify(initializePlayer));
    if (numUsers === 1) {
  		numPlayers = parseInt(initializePlayer.numPlayers);
  		consoleInfo("Initializing Board with " + initializePlayer.numPlayers + " players");
  		boards[1] = createBoard(numPlayers, socket.id);
			currGame = boards[1];
			numCards = Math.floor(52/numPlayers);
			consoleInfo("Board is " + JSON.stringify(currGame));
  	}
  	if (checkGameReset()) return;
 		// The reason for using a new variable is to take into account a 
		// user that may have disconnected don't depend on numUsers
  	for (let i=0; i<currGame.players.length;) {
  		let positionFound = false;
    	if (currGame.players[i].id === null) {
    		currGame.players[i].id = socket.id;
    		// Only allow first 8 characters
  			currGame.players[i].name = initializePlayer.name.substring(0,7);
  			positionFound = true;
  			consoleInfo("Position Found is " + positionFound);
    	}
    	if (positionFound) break;
    	i++;
    	if (i >= numPlayers) {
  			let message = `Table is full. Try again later`;
  			io.to(socket.id).emit('status', message);
  			consoleError('rejecting user');
  			io.in(socket.id).disconnectSockets();
  			return; // Reject the user and exit this function
  		}
    }

  	if (numUsers < numPlayers) {
  		let message = `${numUsers} players have joined. Waiting for full room.`;
  		io.emit('status', message);
  	} else {
  		let message = `${numUsers} players have joined. Waiting for game to begin.`;
  		io.emit('status', message);
  	}
    consoleInfo("Board is " + JSON.stringify(currGame));
    if (numUsers == numPlayers) {
    	let message = {
    		"msg": "Starting the Game!",
    		"state": "wait"
    	};
  		io.emit('status', message);
  		playGame(currGame);
  	}
  });
  */

  // This function creates a brand new board
  socket.on('Start Game', (initializePlayer) => {
  	// Create brand new board with name & game_shortcode
  	let denyStart = false;
    consoleInfo("Got Start Game " + JSON.stringify(initializePlayer));
    if(!initializePlayer || initializePlayer.numPlayers === null || initializePlayer.name === null) {
    	consoleInfo("Incomplete Start Info");
    	denyStart = true;
    }
  	let boardPlayers = parseInt(initializePlayer.numPlayers);
  	if (isNaN(boardPlayers) || boardPlayers < 3 || boardPlayers > 8) {
  		consoleInfo(`Cannot start game with ${boardPlayers} boardPlayers`);
  		denyStart = true;
  	}

  	if (denyStart) {
  		socket.emit('destroy', "Cannot start game. Try again");
  		io.in(socket.id).disconnectSockets(true);
  		return;
  	}

  	consoleInfo("Initializing Board with " + initializePlayer.numPlayers + " players");
  	let presentGame = createBoard(boardPlayers, new Date().getTime() + "_" + socket.id);
  	let iter = 0;
  	while (true) {
  		let possibleID = makeid(4);
  		consoleInfo(possibleID);
  		if(_.findIndex(boards, { "short_id": possibleID }) < 0) {
  			presentGame.short_id = possibleID;
  			break;
  		}
  		iter++;
  		if (iter >= 100) { // Too many games lets reject the game
				let boardIndex = _.findIndex(boards, {id: presentGame.id});
    		if (boardIndex >= 0) {
    			boards.splice(boardIndex,1);
    			consoleInfo("Boards are " + JSON.stringify(boards));
    		}
    		socket.emit('destroy', "Too Many Games in Progress. Try Again");
  			io.in(socket.id).disconnectSockets(true);
  			return;
  		}
  	}

  	boards[boards.length] = presentGame;
  	console.log("Boards are " + JSON.stringify(boards));

  	// These two need to go away
  	// Need to return the short code to the starting player
		// currGame = presentGame;
		// numCards = Math.floor(52/boardPlayers);

		presentGame.round.numCards = Math.floor(52/boardPlayers);
		presentGame.players[0].id = socket.id;
		presentGame.players[0].name = initializePlayer.name.substring(0,7);

		consoleInfo("Board is " + JSON.stringify(presentGame));

		socket.emit('send code', {'id': presentGame.id, 'short': presentGame.short_id});
		socket.emit('status', `1 player has joined. Waiting for full room.`);
  }); 

  // This function adds a user to the board
  socket.on('Join Game', (initializePlayer) => {
  	let denyStart = false;
    consoleInfo("Got Join Game " + JSON.stringify(initializePlayer));
    if(!initializePlayer || initializePlayer.gameCode === null || initializePlayer.name === null) {
    	consoleInfo("Incomplete Join Info");
    	denyStart = true;
    }

    let presentGameIndex = -1;
    if (initializePlayer.name.length > 0) {
    	presentGameIndex = _.findIndex(boards, { "short_id": initializePlayer.gameCode.toUpperCase() });
    	if (presentGameIndex < 0) {
    		consoleInfo("Cannot find Game Board to join");
    		denyStart = true;
    	}
    } else {
    	consoleInfo("Need a player name");
    	denyStart = true;
    }

    if (denyStart) {
  		socket.emit('destroy', `Cannot Join Game '${initializePlayer.gameCode}', try again`);
  		io.in(socket.id).disconnectSockets(true);
  		return;
  	}

    let presentGame = boards[presentGameIndex];
    let boardPlayers = presentGame.players.length;

    // this for loop needs to be redone
    // If empty slot found, take it. If not found, table is full
    // Determine logic to finding this is the last player joining and start game
    //

    let emptySpot = _.findIndex(presentGame.players, {id:null});
    if (emptySpot < 0) {
  		socket.emit('destroy', `Table is full. Try a different board`);
  		consoleInfo('Rejecting user, table is full');
  		io.in(socket.id).disconnectSockets();
  		return; // Reject the user and exit this function
    }

    presentGame.players[emptySpot].id = socket.id;
  	presentGame.players[emptySpot].name = initializePlayer.name.substring(0,7);

  	let gameUsers = 0;
    for (let i=0; i<boardPlayers; i++) {
    	if (presentGame.players[i].id !== null) {
    		gameUsers++;
    	}
    }

    socket.emit('send code', {'id': presentGame.id, 'short': presentGame.short_id});
  	if (gameUsers < boardPlayers) {
  		let message = `${gameUsers} player(s) joined. Waiting for full room.`;
  		emitMessage2Board(presentGame, 'status', message);
  	} else {
  		let message = `${gameUsers} players have joined. Waiting for game to begin.`;
  		emitMessage2Board(presentGame, 'status', message);
  	}
    consoleInfo("Board is " + JSON.stringify(presentGame));
    if (gameUsers == boardPlayers) {
    	let message = {
    		"msg": "Starting the Game!",
    		"state": "wait"
    	};
  		emitMessage2Board(presentGame, 'status', message);
  		playGame(presentGame);
  	}
  });   

  //
  // Play Card has been scrubbed for gameID & numPlayers
  // Shiva 5/15

  socket.on('play card', (card) => {
  	// Added GameID
  	if(!card || card.card === null || card.gameID === null) {
    	let msg = {
  			"msg": 'Card not allowed. Try Another',
  			"canType": true,
  			"state": "play"
  		}
    	socket.emit('status', msg);
    	consoleInfo("Invalid Message " + JSON.stringify(card));
    	return; // Invalid Pay Card Message received
    }
    consoleInfo("Play Card Message " + JSON.stringify(card));
    let presentGame = getBoardOrAbort(socket, card.gameID);
    if (!presentGame) return;
    let boardPlayers = presentGame.players.length;
    consoleInfo("Board is " + JSON.stringify(presentGame));

    card = parseInt(card.card);
    let currPlayer = _.findIndex(presentGame.players, { "id": socket.id });
    consoleInfo('Current Player is ' + JSON.stringify(currPlayer));
  	if (socket.id === presentGame.players[currPlayer].id) {
  		let index = _.indexOf(presentGame.players[currPlayer].cards, card);
  		if ((index === -1) || (!isCardAllowed(card, currPlayer, presentGame))) {
    		let msg = {
  				"msg": 'Card not allowed. Try Another',
  				"canType": true,
  				"state": "play"
  			}
    		socket.emit('status', msg);
    	} else {
    		presentGame.players[currPlayer].cards.splice(index, 1);
    		presentGame.round.cards.push(card);
    		consoleInfo(`${presentGame.players[currPlayer].name} played ${card}.`);
    		let msg = {
    			"player": presentGame.players[currPlayer].name,
    			"card": card
    		};
    		emitMessage2Board(presentGame, 'play card', msg);
    		console.log(`${presentGame.round.cards}, length is ${presentGame.round.cards.length}, numPlayers are ${boardPlayers}`);
    		if (presentGame.round.cards.length === 1) {
    			presentGame.round.winningPlayer = currPlayer;
    			presentGame.round.winningCard = card;
    		} else {
    			if (compareCards(card, presentGame.round.winningCard, presentGame.round.trump)) {
    				presentGame.round.winningPlayer = currPlayer;
    				presentGame.round.winningCard = card;
    				consoleInfo(`Winner is ${currPlayer} winning card is ${card}.`);
    			}
    		}
    		if (presentGame.round.cards.length === boardPlayers) { // Round is over
    			emitMessage2Board(presentGame, 'status', `${presentGame.players[presentGame.round.winningPlayer].name} won the trick.`);
    			presentGame.players[presentGame.round.winningPlayer].tricks++;
          presentGame.round.handWinner = presentGame.round.winningPlayer;

          // My additions
          presentGame.roundOver = true;
          presentGame.acks = 0;

    			if (presentGame.players[0].cards.length === 0) { // Check for end of round

    				// My additions 
    				presentGame.dealOver = true;
    				presentGame.winners = [];

    				for (let i=0; i<boardPlayers; i++) { // No more cards in this round
    					consoleInfo(`for player ${i} bid is ${presentGame.players[i].bid} and tricks are ${presentGame.players[i].tricks}`);
    					if (presentGame.players[i].bid === presentGame.players[i].tricks) {
    						consoleInfo(`adding to score for player ${i}`);
    						presentGame.players[i].score += presentGame.players[i].tricks+10;
    						presentGame.winners.push(presentGame.players[i].name);
    					}
    					presentGame.players[i].tricks = 0;
    					presentGame.players[i].bid = -1;
    				}
    				if (presentGame.round.numCards === 1) {
    					if (presentGame.lastRound == null) {
    						presentGame.lastRound = 0;
    					}
    					presentGame.lastRound ++;
    					if (presentGame.lastRound == boardPlayers) { 
    						// My additions 
    						emitMessage2Board(presentGame, 'status', 'game finished');
    						presentGame.gameOver = true;
    						presentGame.gameWinner = [];
    						let highScore = 0;
    						for (let i=0; i<boardPlayers; i++) {
    							if (presentGame.players[i].score > highScore) {
    								highScore = presentGame.players[i].score;
    								presentGame.gameWinner = [];
    								presentGame.gameWinner[0] = presentGame.players[i].name;
    							} else if (presentGame.players[i].score == highScore) {
    								presentGame.gameWinner.push(presentGame.players[i].name);
    							}
    						}
    						presentGame.highScore = highScore;
    						for (let i=0; i<boardPlayers; i++) {
    							// For reload purposes
  								presentGame.players[i].status = 'GO'; // Game Over
  								// Reload purposes end
    							playerBoard(presentGame, i);
    							io.to(presentGame.players[i].id).emit('Acknowledge', ' ');
    							io.in(presentGame.players[i].id).disconnectSockets();
    							// Remove game from boards
    							let boardIndex = _.findIndex(boards, {id: presentGame.id});
    							if (boardIndex >= 0) {
    								boards.splice(boardIndex,1);
    								consoleInfo("Boards are " + JSON.stringify(boards));
    							}
    						}
    					} else {
    						presentGame.round.numCards ++; // Deal cards again
    						for (let i=0; i<boardPlayers; i++) {
    							// For reload purposes
  								presentGame.players[i].status = 'A'; // Acknowledge
  								// Reload purposes end
    							playerBoard(presentGame, i);
    							io.to(presentGame.players[i].id).emit('Acknowledge', ' ');
    						}
    					}
    				} else {
    					for (let i=0; i<boardPlayers; i++) {
    						// For reload purposes
  							presentGame.players[i].status = 'A'; // Acknowledge
  							// Reload purposes end
    						playerBoard(presentGame, i);
    						io.to(presentGame.players[i].id).emit('Acknowledge', ' ');
    					}
    				}
    			} else {
    				for (let i=0; i<boardPlayers; i++) {
    					// For reload purposes
  						presentGame.players[i].status = 'A'; // Acknowledge
  						// Reload purposes end
    					playerBoard(presentGame, i);
    					io.to(presentGame.players[i].id).emit('Acknowledge', ' ');
    				}
    			}
   			} else {
   				consoleInfo("Card Played " + card + " and now sending board " + JSON.stringify(presentGame));
   				// For reload purposes
  				presentGame.players[currPlayer].status = 'PD'; // Play Done
  				presentGame.players[(currPlayer+1)%boardPlayers].status = 'P'; // Play
  				// Reload purposes end
   				for (let i=0; i<boardPlayers; i++) {
    				playerBoard(presentGame, i);
   				}
   				let msg = {
  					"msg": 'Your turn',
  					"canType": true,
  					"state": "play"
  				}
    			socket.to(presentGame.players[(currPlayer+1)%boardPlayers].id).emit('status', msg);
    		}
    	}
  	}
  	consoleInfo("Board is " + JSON.stringify(presentGame));
  });

  //
  // Bid has been scrubbed for gameID & numPlayers
  // Shiva 5/15

  socket.on('bid', (bid) => {
  	// Added GameID
  	if(!bid || bid.bid === null || bid.gameID === null) {
    	let msg = {
  			"msg": 'Bid not allowed. Try Another',
  			"canType": true,
  			"state": "bid"
  		}
    	socket.emit('status', msg);
    	consoleInfo("Invalid Message " + JSON.stringify(bid));
    	return; // Invalid Pay Card Message received
    }

    consoleInfo("Bid Message Received " + JSON.stringify(bid));
    let presentGame = getBoardOrAbort(socket, bid.gameID);
    if (!presentGame) return;
    let boardPlayers = presentGame.players.length;

  	bid = parseInt(bid.bid);
  	let allBid = true;
  	for (let i=0; i<boardPlayers; i++) {
  		for (let j=0; j<boardPlayers; j++) {
  			if (socket.id === presentGame.players[j].id) {
  				presentGame.players[j].bid = bid;
          let msg = {
            "player": presentGame.players[j].name,
            "bid": bid
          };
          emitMessage2Board(presentGame, 'bid', msg);
  			}
  		}
  		playerBoard(presentGame, i);
  		if (presentGame.players[i].bid === -1) {
  			allBid = false;
  		}
  		//console.log(`bid is ${bid} and allBid is ${allBid}`);
  	}
  	for (let i=0; i<boardPlayers; i++) {
  		if (socket.id === presentGame.players[i].id) {
  			if (allBid) {
  				let bidTotal=0;
  				for (let j=0; j<boardPlayers; j++) {
  					bidTotal += presentGame.players[j].bid;
  				}
  				if (bidTotal === presentGame.round.numCards) {
  					presentGame.players[i].bid = -1;
  					let msg = {
  						"msg": 'Bid not allowed. Try Another',
  						"canType": true,
  						"state": "bid"
  					}
  					socket.emit('status', msg);
  				} else {
  					let msg = {
  						"msg": 'Your turn',
  						"canType": true,
  						"state": "play"
  					}
  					// For reload purposes
  					for (let j=0; j<boardPlayers; j++) {
  						presentGame.players[j].status = 'PW'; // Play Wait
  						playerBoard(presentGame, j);
  					}
  					presentGame.players[(i+1)%boardPlayers].status = 'P'; // Play
  					playerBoard(presentGame, (i+1)%boardPlayers);
  					// Reload purposes end
  					socket.to(presentGame.players[(i+1)%boardPlayers].id).emit('status', msg);
  				}
  			} else {
  				let msg = {
  					"msg": 'Your bid',
  					"canType": true,
  					"state": "bid"
  				}
  				// For reload purposes
  				presentGame.players[i].status = 'BD'; // Bid Done
  				presentGame.players[(i+1)%boardPlayers].status = 'B'; // Bid
  				playerBoard(presentGame, (i+1)%boardPlayers);
  				playerBoard(presentGame, i);
  				// Reload purposes end
  				socket.to(presentGame.players[(i+1)%boardPlayers].id).emit('status', msg);
  			}
  		}
 		}
  });

  // Added this function
  //
  // Ack has been scrubbed for gameID & numPlayers
  // Shiva 5/15

  socket.on('ack', (ack) => {
  	// Added GameID
  	if(!ack || ack.gameID === null) {
    	let msg = {
  			"msg": 'Try Acknowleding Again',
  			"canType": false,
  			"state": "ack"
  		}
    	socket.emit('status', msg);
    	consoleInfo("Invalid Message " + JSON.stringify(ack));
    	return; // Invalid Pay Card Message received
    }

    consoleInfo("Ack Message Received " + JSON.stringify(ack));
    let presentGame = getBoardOrAbort(socket, ack.gameID);
    if (!presentGame) return;
    let boardPlayers = presentGame.players.length;

  	presentGame.acks++;
  	consoleInfo(`We are now at ${presentGame.acks} Acks`);
  	if (presentGame.acks === boardPlayers) {
  		/* Reset the round variables */
  		let whoStarts = presentGame.round.winningPlayer;
  		presentGame.acks = 0;
  		presentGame.roundOver = false;
  		// Setting winningPlayer to previous handWinner
  		presentGame.round.winningPlayer = presentGame.round.handWinner;
    	presentGame.round.winningCard = 0;
    	presentGame.round.cards = [];

  		if (presentGame.dealOver) {
  			// Deal Over reset all deal variables
        presentGame.round.handWinner = 0;
  	 		delete presentGame.winners;
  	 		presentGame.dealOver = false;

    		emitMessage2Board(presentGame, 'status', 'new round');
    		presentGame.round.starter = (presentGame.round.starter+1)%boardPlayers;
    		presentGame.round.winningPlayer = presentGame.round.starter;
    		presentGame.round.handWinner = presentGame.round.winningPlayer;
    		presentGame.round.trump = (presentGame.round.trump+1)%5; // 5 to accomodate NoTrump
    		// For reload purposes
  			for (let j=0; j<boardPlayers; j++) {
  				if (j === presentGame.round.starter) {
  					presentGame.players[j].status = 'B'; // Bid
  				} else {
  					presentGame.players[j].status = 'BW'; // Bid Wait
  				}
  				playerBoard(presentGame, j);
  			}
  			// Reload purposes end
    		let msg = {
  				"msg": 'Your bid',
  				"canType": true,
  				"state": "bid"
  			}
    		socket.to(presentGame.players[presentGame.round.starter].id).emit('status', msg);
				presentGame.round.numCards--;
				// Don't allow NT to be the trump when there is only one card being dealt
				if (presentGame.round.numCards == 1 && presentGame.round.trump == 4) {
					presentGame.round.trump = 0;
				} 
				// Deal New Cards to all
    		playGame(presentGame);
  		} else {
  			// Send updated board back to everybody for the next trick
    		for (let i=0; i<boardPlayers; i++) {
    			// For reload purposes
    			if (i === whoStarts) {
    				presentGame.players[i].status = 'P'; // Play
    			} else {
						presentGame.players[i].status = 'PW'; // Bid Wait
					}
					// Reload purposes end
    			playerBoard(presentGame, i);
    		}
  			// Send signal to all whose turn it is
  			let msg = {
 					"msg": 'Your turn',
 					"canType": true,
 					"state": "play"
  			}
  			if (presentGame.players[whoStarts].id === socket.id) {
    			consoleInfo('msg using socket.emit ' + whoStarts);
    			socket.emit('status', msg);
    		} else {
					consoleInfo('msg using socket.to ' + whoStarts);
 					socket.to(presentGame.players[whoStarts].id).emit('status', msg);
 				}
  		}
  	} else {
  		// For reload purposes
  		let currPlayer = _.findIndex(presentGame.players, { "id": socket.id });
    	if (currPlayer >= 0) {
  			presentGame.players[currPlayer].status = 'AD'; // Ack Done
  		}
  		// Reload purposes end
  	}
  });

  //
  // Reload has been scrubbed for gameID & numPlayers
  // Shiva 5/16

  socket.on('reload', (initializePlayer) => {
  	consoleInfo("Reload Message Received " + JSON.stringify(initializePlayer) + " from " + socket.id);
  	// Added GameID
  	let gameFound = false;
    if (initializePlayer && initializePlayer.gameID && initializePlayer.playerID) {
    	let presentGame = getBoardOrAbort(socket, initializePlayer.gameID);
    	if (!presentGame) return;
    	let boardPlayers = presentGame.players.length;
    	consoleInfo("Present Game is " + JSON.stringify(presentGame));
    	let currPlayer = _.findIndex(presentGame.players, { "id": initializePlayer.playerID });
    	if (currPlayer >= 0) {
    		gameFound = true;
    		consoleInfo("Player is " + currPlayer);
    		// replace socketID of player
    		presentGame.players[currPlayer].id = socket.id;
    		// Send it to player
    		let newBoard = JSON.parse(JSON.stringify(presentGame));
  			// Remove cards
  			for (let j=0; j<boardPlayers; j++) {
  				if (currPlayer === j) continue;
  				newBoard.players[j].cards = [];
  				delete newBoard.players[j].status;
  			}
  			consoleInfo("Sending Board back " + JSON.stringify(newBoard));
  			io.to(socket.id).emit('reload', newBoard);
  			// If game hasn't begun, dont send the board back
  			if (newBoard.players[currPlayer].status != 'W') {
  				playerBoard(presentGame, currPlayer);
  			} else {
  				socket.emit('send code', {'id': presentGame.id, 'short': presentGame.short_id});
  			}
    	}
    }
    if (!gameFound) {
    	// Cant accept this user since this game doesn't exist
    	io.to(socket.id).emit('reload', null);
    	io.in(socket.id).disconnectSockets();
    }
  });

	//
  // Destroy has been scrubbed for gameID & numPlayers
  // Shiva 5/16

  socket.on('destroy', (destroy) => {
  	// Added GameID
  	consoleInfo("Leave Game Message " + JSON.stringify(destroy));
  	if(!destroy || destroy.gameID === null) {
    	consoleError("Destroy Game Request Denied");
    	return; // Invalid Destroy Message received
    }
    let presentGame = getBoardOrAbort(socket, destroy.gameID);
    if (!presentGame) return;

  	let currPlayer = _.findIndex(presentGame.players, { "id": socket.id });
    consoleInfo('Current Player is ' + JSON.stringify(currPlayer));
    if (currPlayer === 0) { // Destroy Game
    	let temp = presentGame;
    	// boards[destroy.gameID] = null;
    	// This needs to be deleted later
    	// currGame = null;
    	consoleInfo("Destroy Game Request Received from Starter");
    	for(let i=0; i<temp.players.length; i++) {
    		io.to(temp.players[i].id).emit('destroy', "Game Destroyed by Leader");
    		io.in(temp.players[i].id).disconnectSockets(true);
    	}
    	// Remove game from boards
    	let boardIndex = _.findIndex(boards, {id: destroy.gameID});
    	if (boardIndex >= 0) {
    		boards.splice(boardIndex,1);
    		consoleInfo("Boards are " + JSON.stringify(boards));
    	}
    	//io.disconnectSockets();
    } else { // Leave Game
    	if (presentGame.players[currPlayer].status === "W") {
    		// Allow leave only if in wait status
    		presentGame.players[currPlayer].id = null;
    		io.to(socket.id).emit('destroy', "You've left the game");
    		io.in(socket.id).disconnectSockets(true);
    		
    		let gameUsers = 0;
    		let boardPlayers = presentGame.players.length;

    		for (let i=0; i<boardPlayers; i++) {
    			if (presentGame.players[i].id !== null) {
    				gameUsers++;
    			}
    		}
				if (gameUsers < boardPlayers) {
  				let message = `${gameUsers} player(s) joined. Waiting for full room.`;
  				emitMessage2Board(presentGame, 'status', message);
  			}
    	} else {
    		consoleError("Destroy/Leave Game Request Denied");
    	}
    }
  });

});

http.listen(PORT, () => {
  consoleInfo(`listening on: ${PORT}`);
});

// Helper functions

// Need to get rid of numCards
// Shiva 5/16
let dealCards = (board, numPlayers) => {
	let arr = [];
	for (let i=0; i<52; i++) {
		arr.push(i);
	}
	let discardCards = 52 - numPlayers*board.round.numCards;
	for (let i=52; i>discardCards; i--) {
		let card = arr.splice(Math.floor(Math.random()*i), 1)[0];
		let player = i%numPlayers;
		board.players[player].cards.push(card);
		board.players[player].cards = _.sortBy(board.players[player].cards);
	}
	consoleInfo("Discarded cards " + arr);
	consoleInfo("Dealt cards " + JSON.stringify(board));
	// Added status for reload
	for (let i=0; i<numPlayers; i++) {
  	board.players[i].status = 'BW'; //bid wait
  }
}

let getSuitAndVal = (card) => {
	let suit = Math.floor(card/13);
	let val = card%13+2;
	return {
		"suit": suit,
		"val": val
	};
}

let compareCards = (newCard, oldCard, trump) => {
	let card1 = getSuitAndVal(newCard);
	let card2 = getSuitAndVal(oldCard);
	consoleInfo(`old card: ${oldCard}, new card: ${newCard}`);
	if (card1.suit === card2.suit) {
		if (card1.val > card2.val) {
			return true;
		} else {
			return false;
		}
	} else {
		if (card1.suit === trump) {
			return true;
		} else {
			return false;
		}
	}
}

// Fixed this for numPlayers
// Shiva 5/16
let playGame = (board) => {
	let boardPlayers = board.players.length;
	dealCards(board, boardPlayers);
	// Added status for reload
  board.players[board.round.starter].status = 'B';
	for (let i=0; i<boardPlayers; i++) {
		playerBoard(board, i);
  }
  let msg = {
  	"msg": 'Your bid',
  	"canType": true,
  	"state": "bid"
  }
  io.to(board.players[board.round.starter].id).emit('status', msg);
}

// Fixed this for numPlayers
// Shiva 5/16
let playerBoard = (board, player) => {
	let newBoard = JSON.parse(JSON.stringify(board));
  // Remove cards
  let boardPlayers = board.players.length;
  for (let j=0; j<boardPlayers; j++) {
  	if (player === j) continue;
  	newBoard.players[j].cards = [];
  	delete newBoard.players[j].status;
  }
  // Send it to player
  io.to(board.players[player].id).emit('board', JSON.stringify(newBoard));
  // consoleInfo("Sent Board to " + player + " " + JSON.stringify(newBoard));
}

let isCardAllowed = (card, currPlayer, thisGame) => {
	let currPlayerCards = thisGame.players[currPlayer].cards;
  let firstCard = thisGame.round.cards[0];
  let noCardsInSuit = true;
  if (firstCard != null) {
  	let firstCardSuit = getSuitAndVal(firstCard).suit;
  	let cardSuit = getSuitAndVal(card).suit;
  	if (firstCardSuit != cardSuit) {
  		let minCard = firstCardSuit*13;
  		let maxCard = minCard + 13;
  		for (let i=0; i<currPlayerCards.length; i++) {
  			consoleInfo(`MinMax=${minCard} ${maxCard} ${currPlayerCards[i]}`);
  			if ((currPlayerCards[i]>=minCard) && (currPlayerCards[i]<maxCard)) {
  				//Player is holding a valid card. Disallow this play
  				noCardsInSuit = false;
  				break;
  			}
  		} // Went through all cards in the same suit
  	} // This is the same suit no else needed
  } // This is first card no else needed
  consoleInfo(`Card=${card} firstCard=${firstCard} ${currPlayerCards} noCardsInSuit=${noCardsInSuit}`);
  return noCardsInSuit;
}

/*let checkGameReset = () => {
	if (currGame == null) {
		// Kill all sockets since there is no game present
		io.sockets.emit('destroy', null);
  	io.disconnectSockets();
  	return true;
  }
  return false;
}*/

let getBoardOrAbort = (socket, id) => {
	let board = null;
	let boardIndex = _.findIndex(boards, {id: id});

	if (boardIndex < 0) {
		socket.emit('destroy', `Join new game. Old game dead`);
  	io.in(socket.id).disconnectSockets(true);
	} else {
		board = boards[boardIndex];
	}
	return board;
}

let makeid = (length) => {
  let result = '';
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
  	result += characters.charAt(Math.floor(Math.random()*charactersLength));
  }
  return result;
}

let emitMessage2Board = (board, category, message) => {
	if (board && board.players && (board.players.length > 0) && category && message) {
		for(let i=0; i<board.players.length; i++) {
   		io.to(board.players[i].id).emit(category, message);
    }
  } else {
  	consoleError("No message to emit");
  }
}
