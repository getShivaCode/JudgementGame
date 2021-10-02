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
let numPlayers = 4;
let numUsers = 0;
let numCards = Math.round(52/numPlayers);
let currGame = null;
let createBoard = require('./board.js');

io.on('connection', (socket) => {
  consoleInfo(`a user ${socket.id} connected`);
  if (numUsers == 0) {
  	consoleInfo("Initializing Board");
  	boards[0] = createBoard(numPlayers);
		currGame = boards[0];
		numCards = Math.round(52/numPlayers);
		consoleInfo("Board is " + JSON.stringify(currGame));
  }
  numUsers++;
  if (numUsers > numPlayers) {
  	let message = `Table is full. Try again later`;
  	io.to(socket.id).emit('status', message);
  	consoleError('rejecting user');
  	io.in(socket.id).disconnectSockets();
  	numUsers--;
  } else {
  	currGame.players[numUsers-1].id = socket.id;
  	if (numUsers < numPlayers) {
  		let message = `${numUsers} players have joined. Waiting for full room.`;
  		io.emit('status', message);
  	} else {
  		let message = `${numUsers} players have joined. Waiting for game to begin.`;
  		io.emit('status', message);
  		//playGame(currGame);
  		// Dont deal the cards. let the Set Name event deal the cards!
  	}
  }

  // This function needs to be updated to remove player's details from the board
  socket.on('disconnect', () => {
    consoleInfo('user disconnected');
    numUsers--;
		for (let i=0; i<numPlayers; i++) {
			currGame.players[i].cards = [];
		}
  });

  socket.on('Set Name', (initializePlayer) => {
    consoleInfo("Got " + JSON.stringify(initializePlayer));
    let currPlayer = _.findIndex(currGame.players, { "id": socket.id });
    consoleInfo("Player is " + currPlayer);
    currGame.players[currPlayer].name = initializePlayer.name;
    consoleInfo("Board is " + JSON.stringify(currGame));
    if (numUsers == numPlayers) {
    	let message = `Starting the Game!`;
  		io.emit('status', message);
  		playGame(currGame);
  	}
  });

  socket.on('play card', (card) => {
    card = parseInt(card);
    let currPlayer = _.findIndex(currGame.players, { "id": socket.id });
    consoleInfo('Current Player is ' + JSON.stringify(currPlayer));
  	if (socket.id === currGame.players[currPlayer].id) {
  		let index = _.indexOf(currGame.players[currPlayer].cards, card);
  		if ((index === -1) || (!isCardAllowed(card, currPlayer, currGame))) {
    		let msg = {
  				"msg": 'Card not allowed. Try Another',
  				"canType": true
  			}
    		io.emit('status', msg);
    	} else {
    		currGame.players[currPlayer].cards.splice(index, 1);
    		currGame.round.cards.push(card);
    		consoleInfo(`${currGame.players[currPlayer].name} played ${card}.`);
    		let msg = {
    			"player": currGame.players[currPlayer].name,
    			"card": card
    		};
    		io.emit('play card', msg);
    		console.log(`${currGame.round.cards}, length is ${currGame.round.cards.length}`);
    		if (currGame.round.cards.length === 1) {
    			currGame.round.winningPlayer = currPlayer;
    			currGame.round.winningCard = card;
    		} else {
    			if (compareCards(card, currGame.round.winningCard, currGame.round.trump)) {
    				currGame.round.winningPlayer = currPlayer;
    				currGame.round.winningCard = card;
    				consoleInfo(`Winner is ${currPlayer} winning card is ${card}.`);
    			}
    		}
    		if (currGame.round.cards.length === numPlayers) { // Round is over
    			io.emit('status', `${currGame.players[currGame.round.winningPlayer].name} won the trick.`);
    			currGame.players[currGame.round.winningPlayer].tricks++;
          currGame.round.handWinner = currGame.round.winningPlayer;

          // My additions
          currGame.roundOver = true;
          currGame.acks = 0;

    			if (currGame.players[0].cards.length === 0) { // Check for end of round

    				// My additions 
    				currGame.dealOver = true;
    				currGame.winners = [];

    				for (let i=0; i<numPlayers; i++) { // No more cards in this round
    					consoleInfo(`for player ${i} bid is ${currGame.players[i].bid} and tricks are ${currGame.players[i].tricks}`);
    					if (currGame.players[i].bid === currGame.players[i].tricks) {
    						consoleInfo(`adding to score for player ${i}`);
    						currGame.players[i].score += currGame.players[i].tricks+10;
    						currGame.winners.push(currGame.players[i].name);
    					}
    					currGame.players[i].tricks = 0;
    					currGame.players[i].bid = -1;
    				}
    				if (numCards === 1) {
    					if (currGame.lastRound == null) {
    						currGame.lastRound = 0;
    					}
    					currGame.lastRound ++;
    					if (currGame.lastRound == numPlayers) { 
    						// My additions 
    						io.emit('status', 'game finished');
    						currGame.gameOver = true;
    						currGame.gameWinner = [];
    						let highScore = 0;
    						for (let i=0; i<numPlayers; i++) {
    							if (currGame.players[i].score > highScore) {
    								highScore = currGame.players[i].score;
    								currGame.gameWinner = [];
    								currGame.gameWinner[0] = currGame.players[i].name;
    							} else if (currGame.players[i].score == highScore) {
    								currGame.gameWinner.push(currGame.players[i].name);
    							}
    						}
    						currGame.highScore = highScore;
    						for (let i=0; i<numPlayers; i++) {
    							playerBoard(currGame, i);
    							io.to(currGame.players[i].id).emit('Acknowledge', ' ');
    							io.in(currGame.players[i].id).disconnectSockets();
    						}
    					} else {
    						numCards ++; // Deal cards again
    						for (let i=0; i<numPlayers; i++) {
    							playerBoard(currGame, i);
    							io.to(currGame.players[i].id).emit('Acknowledge', ' ');
    						}
    					}
    				} else {
    					for (let i=0; i<numPlayers; i++) {
    						playerBoard(currGame, i);
    						io.to(currGame.players[i].id).emit('Acknowledge', ' ');
    					}
    				}
    			} else {
    				for (let i=0; i<numPlayers; i++) {
    					playerBoard(currGame, i);
    					io.to(currGame.players[i].id).emit('Acknowledge', ' ');
    				}
    			}
   			} else {
   				consoleInfo("Card Played " + card + " and now sending board " + JSON.stringify(currGame));
   				for (let i=0; i<numPlayers; i++) {
    				playerBoard(currGame, i);
   				}
   				let msg = {
  					"msg": 'Your turn',
  					"canType": true
  				}
    			socket.to(currGame.players[(currPlayer+1)%numPlayers].id).emit('status', msg);
    		}
    	}
  	}
  	consoleInfo("Board is " + JSON.stringify(currGame));
  });

  socket.on('bid', (bid) => {
  	bid = parseInt(bid);
  	let allBid = true;
  	for (let i=0; i<numPlayers; i++) {
  		for (let j=0; j<numPlayers; j++) {
  			if (socket.id === currGame.players[j].id) {
  				currGame.players[j].bid = bid;
          let msg = {
            "player": currGame.players[j].name,
            "bid": bid
          };
          io.emit('bid', msg);
  			}
  		}
  		playerBoard(currGame, i);
  		if (currGame.players[i].bid === -1) {
  			allBid = false;
  		}
  		console.log(`bid is ${bid} and allBid is ${allBid}`);
  	}
  	for (let i=0; i<numPlayers; i++) {
  		if (socket.id === currGame.players[i].id) {
  			if (allBid) {
  				let bidTotal=0;
  				for (let j=0; j<numPlayers; j++) {
  					bidTotal += currGame.players[j].bid;
  				}
  				if (bidTotal === numCards) {
  					currGame.players[i].bid = -1;
  					let msg = {
  						"msg": 'Bid not allowed. Try Another',
  						"canType": true
  					}
  					socket.emit('status', msg);
  				} else {
  					let msg = {
  						"msg": 'Your turn',
  						"canType": true
  					}
  					socket.to(currGame.players[(i+1)%numPlayers].id).emit('status', msg);
  				}
  			} else {
  				let msg = {
  					"msg": 'Your bid',
  					"canType": true
  				}
  				socket.to(currGame.players[(i+1)%numPlayers].id).emit('status', msg);
  			}
  		}
 		}
  });

  // Added this function
  socket.on('ack', (ack) => {
  	currGame.acks++;
  	consoleInfo(`We are now at ${currGame.acks} Acks`);
  	if (currGame.acks === numPlayers) {
  		/* Reset the round variables */
  		let whoStarts = currGame.round.winningPlayer;
  		currGame.acks = 0;
  		currGame.roundOver = false;
  		// Setting winningPlayer to previous handWinner
  		currGame.round.winningPlayer = currGame.round.handWinner;
    	currGame.round.winningCard = 0;
    	currGame.round.cards = [];

  		if (currGame.dealOver) {
  			// Deal Over reset all deal variables
        currGame.round.handWinner = 0;
  	 		delete currGame.winners;
  	 		currGame.dealOver = false;

    		io.emit('status', 'new round');
    		currGame.round.starter = (currGame.round.starter+1)%numPlayers;
    		currGame.round.winningPlayer = currGame.round.starter;
    		currGame.round.handWinner = currGame.round.winningPlayer;
    		currGame.round.trump = (currGame.round.trump+1)%5; // 5 to accomodate NoTrump
    		let msg = {
  				"msg": 'Your bid',
  				"canType": true
  			}
    		socket.to(currGame.players[currGame.round.starter].id).emit('status', msg);
				numCards--;
				// Don't allow NT to be the trump when there is only one card being dealt
				if (numCards == 1 && currGame.round.trump == 4) {
					currGame.round.trump =0;
				} 
				// Deal New Cards to all
    		playGame(currGame);
  		} else {
  			// Send updated board back to everybody for the next trick
    		for (let i=0; i<numPlayers; i++) { playerBoard(currGame, i); }
  			// Send signal to all whose turn it is
  			let msg = {
 					"msg": 'Your turn',
 					"canType": true
  			}
  			if (currGame.players[whoStarts].id === socket.id) {
    			consoleInfo('msg using socket.emit ' + whoStarts);
    			socket.emit('status', msg);
    		} else {
					consoleInfo('msg using socket.to ' + whoStarts);
 					socket.to(currGame.players[whoStarts].id).emit('status', msg);
 				}
  		}
  	}
  });

});

http.listen(PORT, () => {
  consoleInfo(`listening on: ${PORT}`);
});

// Helper functions

let dealCards = (board, numPlayers) => {
	let arr = [];
	for (let i=0; i<52; i++) {
		arr.push(i);
	}
	let discardCards = 52 - numPlayers*numCards;
	for (let i=52; i>discardCards; i--) {
		let card = arr.splice(Math.floor(Math.random()*i), 1)[0];
		let player = i%numPlayers;
		board.players[player].cards.push(card);
		board.players[player].cards = _.sortBy(board.players[player].cards);
	}
	consoleInfo("Discarded cards " + arr);
	consoleInfo("Dealt cards " + JSON.stringify(board));
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

let playGame = (board) => {
	dealCards(board, numPlayers);
	for (let i=0; i<numPlayers; i++) {
		playerBoard(board, i);
  }
  let msg = {
  	"msg": 'Your bid',
  	"canType": true
  }
  io.to(board.players[board.round.starter].id).emit('status', msg);
}

let playerBoard = (board, player) => {
	let newBoard = JSON.parse(JSON.stringify(board));
  // Remove cards
  for (let j=0; j<numPlayers; j++) {
  	if (player === j) continue;
  	newBoard.players[j].cards = [];
  }
  // Send it to player
  io.to(board.players[player].id).emit('board', JSON.stringify(newBoard));
  // consoleInfo("Sent Board to " + player + " " + JSON.stringify(newBoard));
}

let isCardAllowed = (card, currPlayer, currGame) => {
	let currPlayerCards = currGame.players[currPlayer].cards;
  let firstCard = currGame.round.cards[0];
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