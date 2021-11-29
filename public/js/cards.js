var app = angular.module("Cards", ['ui.router', 'angular-storage']);

app.config((storeProvider) => {
  storeProvider.setStore('localStorage');
});

app.config(function($stateProvider, $urlRouterProvider, $httpProvider) {

$stateProvider
  .state("base", {
    url: "/base",
    templateUrl: "/templates/base.html",
    controller: "CardsController",
    abstract: true
  })
  .state("base.start", {
    url: "/start",
    templateUrl: "/templates/start.html"
  })
  .state("base.bid1", {
    url: "/bid",
    templateUrl: "/templates/bid.html"
  })
  .state("base.bid2", {
    url: "/bid",
    templateUrl: "/templates/bid.html"
  })
  .state("base.play1", {
    url: "/play",
    templateUrl: "/templates/play.html"
  })

  .state("base.play2", {
    url: "/play",
    templateUrl: "/templates/play.html"
  })
  .state("base.wait1", {
    url: "/wait",
    templateUrl: "/templates/wait.html"
  })
  .state("base.wait2", {
    url: "/wait",
    templateUrl: "/templates/wait.html"
  })
  .state("base.next1", {
    url: "/next",
    templateUrl: "/templates/next.html"
  })
  .state("base.next2", {
    url: "/next",
    templateUrl: "/templates/next.html"
  })
  $urlRouterProvider.otherwise('/base/start');
});

app.controller("CardsController", ['$scope', '$http', '$state', '$window', 'store', function($scope, $http, $state, $window, store) {

  // Controller variables
  let socket, nextState, myTurn, stateNum, cardPlayed, storageInitialized;

  let initializeSocketOperations = (socket) => {

    socket.on('board', function(board) {
      $scope.winningPlayerName = null;
      board = JSON.parse(board);
      if (board.round.cards.length == board.players.length) { // This is the end of the trick
          $scope.winningPlayerName = board.players[board.round.handWinner].name;
      } else {
        playerOne = board.round.handWinner; // Who played the first card?
      }
  
      let cards = {
        "spades": [],
        "hearts": [],
        "clubs": [],
        "diamonds": []
      };
  
      // Is Game Over
      if (board.gameOver) {
        resetStore();
        $scope.endOfGame = true;
        $scope.gameWinner = board.gameWinner.join(", ");
        $scope.highScore = board.highScore;
      } else {
        $scope.endOfGame = false;
        delete $scope.gameWinner;
        delete $scope.highScore;
      }
  
      // Is Deal Over
      if (board.dealOver) {
        $scope.endOfDeal = true;
        $scope.winners = null;
        if (board.winners && board.winners.length) {
          $scope.winners = board.winners.join(", ");
        } else {
          $scope.winners = 'Nobody';
        }
      } else {
        $scope.endOfDeal = false;
        delete $scope.winners;
      }
  
      $scope.players = [];
      for (let i=0; i<board.players.length; i++) {
        $scope.players.push({});
      }
  
      $scope.cards = cards; // Reset cards to blanks
  
      for (let i=0; i<board.players.length; i++) {
        delete board.players[i].id;
        if (board.players[i].cards.length) { // This is you! $scope.me will be i
          for (let j=0; j<board.players[i].cards.length; j++) {
            let suit = Math.floor(board.players[i].cards[j]/13);
            if (suit === 0) {
              cards.spades.push(prettyCard(board.players[i].cards[j]));
            } else if (suit === 1) {
              cards.hearts.push(prettyCard(board.players[i].cards[j]));
            } else if (suit === 2) {
              cards.clubs.push(prettyCard(board.players[i].cards[j]));
            } else {
              cards.diamonds.push(prettyCard(board.players[i].cards[j]));
            }
          }
          $scope.cards = cards;
          console.log("Got board " + JSON.stringify(board));
          if ($scope.bids == null) {
            $scope.bids = board.players[i].cards.length;
          }
          if ($scope.me == null) $scope.me = i; // Set me just once
        } else {
          delete board.players[i].cards;
        }
        // Get the card played by the player
        let card = board.round.cards[i];
          
        let j=(i+playerOne)%board.players.length;
        let player = {
          "name": board.players[j].name,
          "bid": board.players[j].bid,
          "tricks": board.players[j].tricks,
          "score": board.players[j].score,
          "card": {
            "rank": 0,
            "suit": "",
            "suitEmoji": ""
          }
        };
        if (card!= null) {
          let suitNum = Math.floor(card/13);
          let suit = "";
          card = prettyCard(card);
          if (suitNum === 0) {
            suitEmoji = "♠️";
            suit = "spades";
          } else if (suitNum === 1) {
            suitEmoji = "♥️";
            suit = "hearts";
          } else if (suitNum === 2) {
            suitEmoji = "♣️";
            suit = "clubs";
          } else {
            suitEmoji = "♦️";
            suit = "diams";
          }
          player.card.rank = card;
          player.card.suit = suit;
          player.card.suitEmoji = suitEmoji;
        } 
  
        if (board.round.winningPlayer === j) {
          player.winning = "winning";
        } else {
          player.winning = "";
        }
        $scope.players[j] = player;
      }
  
      // Document the current rankings of the players
      let sortedScore = _.orderBy($scope.players,['score'],['desc']);
      let prevHighScore = -1;
      for (let k=0; k<sortedScore.length; k++) {
        if (sortedScore[k].score === prevHighScore) {
            sortedScore[k].rank = sortedScore[k-1].rank;
        } else {
            sortedScore[k].rank = k+1;
            prevHighScore = sortedScore[k].score;
        }
      }
  
      console.log("Table display is " + JSON.stringify($scope.players));
  
      $scope.spadesTrump = "";
      $scope.heartsTrump = "";
      $scope.clubsTrump = "";
      $scope.diamondsTrump = "";
      if (board.round.trump === 0) {
        $scope.spadesTrump = "cards-trump";
        $scope.trumpEmoji = "♠️";
      } else if (board.round.trump === 1) {
        $scope.heartsTrump = "cards-trump";
        $scope.trumpEmoji = "♥️";
      } else if (board.round.trump === 2) {
        $scope.diamondsTrump = "cards-trump";
        $scope.trumpEmoji = "♣️";
      } else if (board.round.trump === 3){
        $scope.diamondsTrump = "cards-trump";
        $scope.trumpEmoji = "♦️";
      } else { // No Trump
        $scope.trumpEmoji = '🌋';
      }
  
      $state.go(`base.${nextState}${stateNum}`);
      if (stateNum === 1) {
        stateNum = 2;
      } else {
        stateNum = 1;
      }
    });

    socket.on('status', function(msg) {
      if (!storageInitialized) {
        store.set('playerID', socket.id);
        store.set('gameID', 1);
        store.set('playerName', $scope.playerName);
        storageInitialized = true;
      }
      console.log("Got Status " + JSON.stringify(msg));
      $state.go(`base.${nextState}${stateNum}`);
      if (stateNum === 1) {
        stateNum = 2;
      } else {
        stateNum = 1;
      }
      if (msg === 'new round') {
        bid = -1;
        $scope.bid = 0;
        $state.go(`base.next${stateNum}`);
        if (stateNum === 1) {
          stateNum = 2;
        } else {
          stateNum = 1;
        }
        nextState = 'wait';
      }
  
      if (msg.msg === 'Bid not allowed. Try Another') {
        bid = -1;
        myTurn = true;
        $scope.confirm = false;
        $state.go(`base.bid${stateNum}`);
        if (stateNum === 1) {
          stateNum = 2;
        } else {
          stateNum = 1;
        }
      }
  
      if (msg.msg) {
        $scope.status = msg.msg;
      } else {
        $scope.status = msg;
      }
  
      if (msg.canType) {
        console.log("Its my turn");
        myTurn = true;
      }

      if (msg.state) {
        $state.go(`base.${msg.state}${stateNum}`);
        if (stateNum === 1) {
          stateNum = 2;
        } else {
          stateNum = 1;
        }
      }
    });

    socket.on('play card', function(msg) {
      let suit = Math.floor(msg.card/13);
      let card = prettyCard(msg.card);
      console.log(`card is ${card} and suit is ${suit}`)
      if (suit === 0) {
        card += "♠️";
      } else if (suit === 1) {
        card += "♥️";
      } else if (suit === 2) {
        card += "♣️";
      } else {
        card += "♦️";
      }
      $scope.status = `${msg.player} played ${card}`;
      $state.go(`base.wait${stateNum}`);
      if (stateNum === 1) {
        stateNum = 2;
      } else {
        stateNum = 1;
      }
    });

    socket.on('bid', function(msg) {
      $scope.status = `${msg.player} bid ${msg.bid}`;
      $state.go(`base.wait${stateNum}`);
      if (stateNum === 1) {
        stateNum = 2;
      } else {
        stateNum = 1;
      }
    });

    socket.on('Acknowledge', function(msg) {
      console.log("Got Acknowledgement");
      $state.go(`base.next${stateNum}`);
      if (stateNum === 1) {
          stateNum = 2;
      } else {
        stateNum = 1;
      }
      $scope.acknowledged = false;
    });

    socket.on('reload', function(msg) {
      console.log("Got Reload Answer " + JSON.stringify(msg));
      if (!msg) { // If game not found
        resetAndStartAgain();
      } else {  // Load the variables appropriately and go to the right state
        // First find me (This will be the player with status)
        let reloadStatus = null;
        let restartBoard = true;
        if (msg.players) {
          for(let i=0; i<msg.players.length; i++) {
            if(msg.players[i].status) {
              $scope.me = i;
              reloadStatus = msg.players[i].status;
              restartBoard = false;
              store.set('playerID', socket.id);
              break;
            }
          }
        }
        if (restartBoard) {
          resetAndStartAgain();
        } else {
          console.log("State: " + JSON.stringify($state.current) + " Status: " + msg.players[$scope.me].status);
          myTurn = false;
          if ($state.current.name.slice(-1) === '1') {
            stateNum = 2;
          } else {
            stateNum = 1;
          }
          $scope.status = 'Wait for your turn';
          switch (msg.players[$scope.me].status) {
            case 'B':
              myTurn = true;
              nextState = 'bid';
              $scope.status = 'Your bid';
              break;
            case 'P':
              myTurn = true;
              nextState = 'play';
              $scope.status = 'Your turn';
              break;
            case 'AD':
              $scope.acknowledged = true;
            case 'A':
              myTurn = true;
              nextState = 'next';
              $scope.status = 'Acknowledge';
              break;
            case 'W':
              $state.go('base.wait' + stateNum);
              break;
            default:
              nextState = 'wait';
              break;
          }
        }
      }

    });
  }

  let initialize = () => {
    // Controller variables
    socket = io();
    nextState = 'wait';
    myTurn = false;
    stateNum = 1;
    cardPlayed = 0;
    playerOne = 0;

    //$scope initializations
    $scope.me = null;
    $scope.status = "";
    $scope.players = [];
    $scope.bids = null;
    $scope.selected = "";
    $scope.confirm = false;
    $scope.bid = 0;

    initializeSocketOperations(socket);
  }

  $scope.beginGame = (playerName, numPlayers) => {
    playerName = playerName.substring(0,7)
    $scope.playerName = playerName;
    $scope.numPlayers = 4;
    // Ignore number of Players They are always 4 for now
    // $scope.numPlayers = numPlayers;
    if (playerName) {
      initialize();
      console.log("Player Name is " + playerName);
      let initializePlayer = {
        name: playerName,
        numPlayers: numPlayers
      }
      socket.emit('Set Name', initializePlayer);
    }
  }

  $scope.makeBid = function() {
    $scope.confirm = false;
    socket.emit('bid', $scope.bid);
    nextState = 'wait';
    myTurn = false;
  };

  $scope.selectBid = function(bid) {
    if (myTurn && bid != null) {
      $scope.confirm = true;
      $scope.bid = bid;
      $state.go(`base.bid${stateNum}`);
      if (stateNum === 1) {
        stateNum = 2;
      } else {
        stateNum = 1;
      }
    }
  }

  $scope.cancel = function() {
    if (myTurn) {
      $scope.confirm = false;

      $state.go(`base.bid${stateNum}`);
      if (stateNum === 1) {
        stateNum = 2;
      } else {
        stateNum = 1;
      }
    }
  }

  $scope.select = function(card, suit) {
    if (myTurn && ($scope.status !== "Your bid")) {
      if (card === 'J') {
        cardPlayed = 9;
      } else if (card === 'Q') {
        cardPlayed = 10;
      } else if (card === 'K') {
        cardPlayed = 11;
      } else if (card === 'A') {
        cardPlayed = 12;
      } else {
        cardPlayed = parseInt(card)-2;
      }
      cardPlayed = cardPlayed+13*(suit);

      if (suit === 0) {
        suitEmoji = "♠️";
        suitString = "spades";
      } else if (suit === 1) {
        suitEmoji = "♥️";
        suitString = "hearts";
      } else if (suit === 2) {
        suitEmoji = "♣️";
        suitString = "clubs";
      } else {
        suitEmoji = "♦️";
        suitString = "diams";
      }
      $scope.selected = {
        "card": card,
        "emoji": suitEmoji,
        "suit": suitString
      };

      $state.go(`base.play${stateNum}`);
      if (stateNum === 1) {
        stateNum = 2;
      } else {
        stateNum = 1;
      }
    }
  }

  $scope.playCard = function() {
    if (myTurn) {
      socket.emit('play card', cardPlayed);
      $scope.selected = {};
      nextState = 'wait';
      myTurn = false;
    }
  };

  $scope.playPage = function() {
    $state.go(`base.play${stateNum}`);
    if (stateNum === 1) {
      stateNum = 2;
    } else {
      stateNum = 1;
    }

  };

  let prettyCard = (card) => {
    let val = card%13+2;

    if (val === 11) {
      val = "J";
    } else if (val === 12) {
      val = "Q";
    } else if (val === 13) {
      val = "K";
    } else if (val === 14) {
      val = "A";
    }

    return val;
  }

  $scope.acknowledge = () => {
    if (!$scope.endOfGame) {
      if ($scope.endOfDeal) {
        $scope.bids = null;
      }
      socket.emit('ack', '');
      $scope.acknowledged = true;
    } else {
      //reset Board & Go to start page again
      $scope.players = [];
      $state.go(`base.start`);
    }
  };

  let resetAndStartAgain = () => {
    if (socket) socket.disconnect();
    resetStore();
    $scope.players = [];
    $state.go(`base.start`);
  }

  let resetStore = () => {
    store.remove('playerID');
    store.remove('gameID');
    // store.remove('playerName');
    storageInitialized = false;
  }

  $scope.playerName = null;
  $scope.numPlayers = 4;
  $scope.status = "Set Your Name";

  // Retrieve from local storage (name, gameid, socketid)
  let playerID = store.get('playerID');
  let gameID = store.get('gameID');
  //let playerName = store.get('playerName');

  if (playerID && gameID /*&& playerName*/) {
    // If all are found call initialize, then send message to server to reload
    console.log(`This is a reload of the existing game ${gameID}: ${playerID}`);
    initialize();
    let initializePlayer = {
      gameID: gameID,
      playerID: playerID
    }
    socket.emit('reload', initializePlayer);
  } else {
    console.log('This is a new game');
    resetAndStartAgain();
  }
}]);