'use strict'

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const _ = require('lodash');

const debug = require('debug');
const consoleInfo = debug('Judgement:info');

let boards = [];
boards[0] = require('./board.json');

let currGame = boards[0];

const numPlayers = currGame.players.length;

const publicHTMLPath = process.env.NODE_STATIC_HTML || './public';

//Static HTML directory
app.use(express.static(publicHTMLPath));

let numUsers = 0;
let numCards = Math.round(52/numPlayers);

io.on('connection', (socket) => {
  consoleInfo('a user connected');
  numUsers++;
  if (numUsers > numPlayers) {
  	consoleInfo('rejecting user');
  	io.in(socket.id).disconnectSockets();
  	numUsers--;
  } else {
  	currGame.players[numUsers-1].id = socket.id;
  	if (numUsers < numPlayers) {
  		let message = `${numUsers} players have joined. Waiting for full room.`;
  		io.emit('status', message);
  	} else {
  		playGame(currGame);
  	}
  }
  socket.on('disconnect', () => {
    consoleInfo('user disconnected');
    numUsers--;
		for (let i=0; i<numPlayers; i++) {
			currGame.players[i].cards = [];
		}
  });

  socket.on('play card', (card) => {
    card = parseInt(card);
    let currPlayer = _.findIndex(currGame.players, { "id": socket.id });
    console.log(currPlayer);
  	if (socket.id === currGame.players[currPlayer].id) {
    	let index = _.indexOf(currGame.players[currPlayer].cards, card);
    	if (index === -1) {
    		let msg = {
  				"msg": 'card not found. play again',
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
    		if (currGame.round.cards.length === 4) { // Round is over
    			io.emit('status', `${currGame.players[currGame.round.winningPlayer].name} won the round.`);
    			currGame.players[currGame.round.winningPlayer].tricks++;
          currGame.round.handWinner = currGame.round.winningPlayer;
    			if (currGame.players[0].cards.length === 0) { // Check for end of round
    				for (let i=0; i<numPlayers; i++) { // No more cards in this round
    					console.log(`for player ${i} bid is ${currGame.players[i].bid} and tricks are ${currGame.players[i].tricks}`);
    					if (currGame.players[i].bid === currGame.players[i].tricks) {
    						console.log(`adding to score for player ${i}`);
    						currGame.players[i].score += currGame.players[i].tricks+10;
    					}
    					currGame.players[i].tricks = 0;
    					currGame.players[i].bid = -1;
    				}
    				if (numCards === 1) {
    					io.emit('status', 'game finished');
    				} else {
    					currGame.round.winningPlayer = 0;
	   					currGame.round.winningCard = 0;
              currGame.round.handWinner = 0;
  	 					currGame.round.cards = [];
    					io.emit('status', 'new round');
    					currGame.round.starter = (currGame.round.starter+1)%numPlayers;
    					currGame.round.trump = (currGame.round.trump+1)%numPlayers;
    					let msg = {
  							"msg": 'Your bid',
  							"canType": true
  						}
    					socket.to(currGame.players[currGame.round.starter].id).emit('status', msg);
    					numCards--;
    					playGame(currGame);
    				}
    			} else {
    				for (let i=0; i<numPlayers; i++) {
    					playerBoard(currGame, i);
    				}
    				if (currGame.players[currGame.round.winningPlayer].id === socket.id) {
    					console.log('sending');
    					let msg = {
  							"msg": 'Your turn',
  							"canType": true
  						}
    					socket.emit('status', msg);
    				} else {
    					let msg = {
  							"msg": 'Your turn',
  							"canType": true
  						}
    					socket.to(currGame.players[currGame.round.winningPlayer].id).emit('status', msg);
    				}
    			}
    			currGame.round.winningPlayer = 0;
    			currGame.round.winningCard = 0;
    			currGame.round.cards = [];
   			} else {
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
  						"msg": 'insufficient bid. bid again',
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

});

http.listen(3000, () => {
  consoleInfo('listening on: 3000');
});


function dealCards(board, numPlayers) {
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

function getSuitAndVal(card) {
	let suit = Math.floor(card/13);
	let val = card%13+2;
	return {
		"suit": suit,
		"val": val
	};
}

function compareCards(newCard, oldCard, trump) {
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

function playGame(board) {
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

function playerBoard(board, player) {
	let newBoard = JSON.parse(JSON.stringify(board));
  // Remove cards
  for (let j=0; j<numPlayers; j++) {
  	if (player === j) continue;
  	newBoard.players[j].cards = [];
  }
  // consoleInfo(`Object for player ${player} is ${JSON.stringify(newBoard)} `);
  // Send it to player
  io.to(board.players[player].id).emit('board', JSON.stringify(newBoard));
}