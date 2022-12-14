var app = angular.module("Cards", ['ui.router', 'angular-storage', 'ngclipboard']);

app.config((storeProvider) => {
  storeProvider.setStore('sessionStorage');
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
  .state("base.start1", {
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

app.controller("CardsController", ['$scope', '$http', '$state', '$window', 'store', '$location', 
  function($scope, $http, $state, $window, store, $location) {

  // Controller variables
  let socket, nextState, myTurn, stateNum, cardPlayed, storageInitialized;

  $scope.disableClick = false;

  let initializeSocketOperations = (socket) => {

    socket.on('board', function(board) {
      $scope.winningPlayerName = null;
      board = JSON.parse(board);
      console.log("Game ID is " + board.id);
      if ($scope.numPlayers != board.players.length) {
        $scope.numPlayers = board.players.length;
        console.log("Setting correct numPlayers to " + $scope.numPlayers);
      }
      if (board.round.cards.length == board.players.length) { // This is the end of the trick
        $scope.winningPlayerName = board.players[board.round.handWinner].name;
        for (let i=0; i<board.round.cards.length; i++) { // Compute who played the first card
          if (board.round.winningCard == board.round.cards[i]) {
            playerOne = ($scope.numPlayers + board.round.handWinner - i)%$scope.numPlayers;
            console.log(`Winning Card: ${i} position, PlayerOne: ${playerOne}`);
            break;
          }
        }
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
        $scope.gameCode = null;
        $scope.disableClick = false;
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
            $scope.bids += board.players[i].cards.length;
          }
          if ($scope.me == null) {
            $scope.me = i; // Set me just once
            $scope.topDisplayPlayer = null;
            if ($scope.numPlayers%2 == 0) {
              $scope.topDisplayPlayer = (i+($scope.numPlayers/2))%$scope.numPlayers;
            }
            $scope.arrangePlayers = [];
            for (var k=1; k<Math.round($scope.numPlayers/2); k++) {
              $scope.arrangePlayers[k-1] = [(i+$scope.numPlayers+k)%$scope.numPlayers, 
                (i+$scope.numPlayers-k)%$scope.numPlayers];
            }
            $scope.arrangePlayers.reverse();
            console.log("Arranged Players = " + $scope.arrangePlayers);
          }
          $scope.bidStatus = calculateBidStatus(board, $scope.me);
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
            suitEmoji = "??????";
            suit = "spades";
          } else if (suitNum === 1) {
            suitEmoji = "??????";
            suit = "hearts";
          } else if (suitNum === 2) {
            suitEmoji = "??????";
            suit = "clubs";
          } else {
            suitEmoji = "??????";
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
        $scope.trumpEmoji = "??????";
      } else if (board.round.trump === 1) {
        $scope.heartsTrump = "cards-trump";
        $scope.trumpEmoji = "??????";
      } else if (board.round.trump === 2) {
        $scope.clubsTrump = "cards-trump";
        $scope.trumpEmoji = "??????";
      } else if (board.round.trump === 3){
        $scope.diamondsTrump = "cards-trump";
        $scope.trumpEmoji = "??????";
      } else { // No Trump
        //$scope.trumpEmoji = '????';
        $scope.trumpEmoji = null;
      }
  
      $state.go(`base.${nextState}${stateNum}`);
      console.log(`State is base.${nextState}${stateNum}`);
      if (stateNum === 1) {
        stateNum = 2;
      } else {
        stateNum = 1;
      }
    });

    socket.on('status', function(msg) {
      if (!storageInitialized) {
        store.set('playerID', socket.id);
        //store.set('gameID', 1);
        // Reinitialize the local variables
        playerID = socket.id;
        //gameID = 1;
        // store.set('playerName', $scope.playerName);
        storageInitialized = true;
      }
      console.log("Got Status " + JSON.stringify(msg));
      console.log("State was " + $state.current.name);
      $state.go(`base.${nextState}${stateNum}`);
      console.log(`State is base.${nextState}${stateNum}`);
      if (stateNum === 1) {
        stateNum = 2;
      } else {
        stateNum = 1;
      }
      if (msg === 'new round') {
        bid = -1;
        $scope.bid = 0;
        $state.go(`base.next${stateNum}`);
        console.log(`State is base.next${stateNum}`);
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
        console.log(`State is ${nextState}${stateNum}`);
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
        console.log(`State is base.${nextState}${stateNum}`);
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
        card += "??????";
      } else if (suit === 1) {
        card += "??????";
      } else if (suit === 2) {
        card += "??????";
      } else {
        card += "??????";
      }
      $scope.status = `${msg.player} played ${card}`;
      $state.go(`base.wait${stateNum}`);
      console.log(`State is base.wait${stateNum}`);
      if (stateNum === 1) {
        stateNum = 2;
      } else {
        stateNum = 1;
      }
    });

    socket.on('bid', function(msg) {
      $scope.status = `${msg.player} bid ${msg.bid}`;
      $state.go(`base.wait${stateNum}`);
      console.log(`State is base.wait${stateNum}`);
      if (stateNum === 1) {
        stateNum = 2;
      } else {
        stateNum = 1;
      }
    });

    socket.on('Acknowledge', function(msg) {
      console.log("Got Acknowledgement");
      $state.go(`base.next${stateNum}`);
      console.log(`State is base.next${stateNum}`);
      if (stateNum === 1) {
          stateNum = 2;
      } else {
        stateNum = 1;
      }
      $scope.acknowledged = false;
    });

    socket.on('send code', function(msg) {
      console.log("Got Codes for the game " + JSON.stringify(msg));
      $scope.gameCode = msg.short;
      console.log("Game Code is " + $scope.gameCode);
      $scope.gameCodeURL = $location.absUrl().split('?')[0] + '?gameCode=' + $scope.gameCode;
      store.set('gameID', msg.id);
      gameID = msg.id;
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
              $scope.numPlayers = msg.players.length;
              $scope.playerName = msg.players[i].name;
              $scope.topDisplayPlayer = null;
              if ($scope.numPlayers%2 == 0) {
                $scope.topDisplayPlayer = (i+($scope.numPlayers/2))%$scope.numPlayers;
              }
              $scope.arrangePlayers = [];
              for (var k=1; k<Math.round($scope.numPlayers/2); k++) {
                $scope.arrangePlayers[k-1] = [(i+$scope.numPlayers+k)%$scope.numPlayers, 
                  (i+$scope.numPlayers-k)%$scope.numPlayers];
              }
              $scope.arrangePlayers.reverse();
              console.log("Arranged Players = " + $scope.arrangePlayers);
              $scope.bidStatus = calculateBidStatus(msg, $scope.me);
              reloadStatus = msg.players[i].status;
              restartBoard = false;
              store.set('playerID', socket.id);
              // Reinitialize the local variables
              playerID = socket.id;
              gameID = store.get('gameID');;
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
              $scope.status = 'Acknowledgement';
              break;
            case 'W':
              $state.go('base.wait' + stateNum);
              console.log(`State is base.wait${stateNum}`);
              break;
            default:
              nextState = 'wait';
              break;
          }
        }
      }

    });

    socket.on('destroy', function(msg) {
      console.log('Get Destroy Message from server ' + msg);
      $scope.cards = null;
      $scope.gameCode = null;
      $scope.disableClick = false;
      $scope.status = msg;
      resetAndStartAgain();
    });

    //socket.on("disconnect", (reason) => {
    //  console.log(`Reason is ${reason}`);
    //});
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
    $scope.disableClick = true;
    playerName = playerName.substring(0,7)
    $scope.playerName = playerName;
    //$scope.numPlayers = 6;
    // Ignore number of Players They are always 4 for now
    $scope.numPlayers = numPlayers;
    if (playerName) {
      initialize();
      console.log("Player Name is " + playerName);
      let initializePlayer = {
        name: playerName,
        numPlayers: numPlayers
      }
      //socket.emit('Set Name', initializePlayer);
      socket.emit('Start Game', initializePlayer);
    }
  }

  $scope.joinGame = (playerName, gameCode) => {
    $scope.disableClick = true;
    playerName = playerName.substring(0,7)
    $scope.playerName = playerName;
    $scope.gameCode = gameCode;
    if (playerName) {
      initialize();
      console.log("Player Name is " + playerName);
      let initializePlayer = {
        name: playerName,
        gameCode: gameCode
      }
      socket.emit('Join Game', initializePlayer);
    }
  }

  $scope.makeBid = function() {
    $scope.confirm = false;
    if (isBidAllowed()) {
      // Added Bid Message
      let bidMsg = {'bid': $scope.bid, 'gameID': gameID};
      socket.emit('bid', bidMsg);
      nextState = 'wait';
      myTurn = false;
    } else {
      $scope.status = `Bid ${$scope.bid} not allowed. Try another`;
    }
  };

  $scope.selectBid = function(bid) {
    if (myTurn && bid != null) {
      $scope.confirm = true;
      $scope.bid = bid;
      $state.go(`base.bid${stateNum}`);
      console.log(`State is base.bid${stateNum}`);
      if (stateNum === 1) {
        stateNum = 2;
      } else {
        stateNum = 1;
      }
    }
  }

  $scope.cancel = function(stateName) {
    if (myTurn) {
      $scope.confirm = false;
      $scope.selected = {};

      $state.go(`base.${stateName}${stateNum}`);
      console.log(`State is base.${stateName}${stateNum}`);
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
        suitEmoji = "??????";
        suitString = "spades";
      } else if (suit === 1) {
        suitEmoji = "??????";
        suitString = "hearts";
      } else if (suit === 2) {
        suitEmoji = "??????";
        suitString = "clubs";
      } else {
        suitEmoji = "??????";
        suitString = "diams";
      }
      $scope.selected = {
        "card": card,
        "emoji": suitEmoji,
        "suit": suitString
      };

      $state.go(`base.play${stateNum}`);
      console.log(`State is base.play${stateNum}`);
      if (stateNum === 1) {
        stateNum = 2;
      } else {
        stateNum = 1;
      }
    }
  }

  $scope.playCard = function() {
    if (myTurn) {
      //socket.emit('play card', cardPlayed);
      var playCardMsg = {'gameID': gameID, 'card': cardPlayed};
      socket.emit('play card', playCardMsg);
      $scope.selected = {};
      nextState = 'wait';
      myTurn = false;
    }
  };

  $scope.playPage = function() {
    $state.go(`base.play${stateNum}`);
    console.log(`State is base.play${stateNum}`);
    if (stateNum === 1) {
      stateNum = 2;
    } else {
      stateNum = 1;
    }
  };

  $scope.leaveGame = (destroy) => {
    if (destroy) {
      console.log("Destroying Game and Disconnecting everybody");
      $scope.showDestroy = false;
    } else {
      console.log("Leaving Game and Disconnecting");
      $scope.showLeave = false;
    }
    // Added Destroy Message
    let destroyMsg = {'gameID': gameID};
    $scope.disableClick = false;
    delete $scope.me;
    $scope.gameCode = null;
    socket.emit('destroy', destroyMsg);
  }

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
      // Added Ack Message
      let ackMsg = {'gameID': gameID};
      socket.emit('ack', ackMsg);
      $scope.acknowledged = true;
    } else {
      //reset Board & Go to start page again
      $scope.players = [];
      $scope.gameCode = null;
      $state.go(`base.start`);
    }
  };

  let calculateBidStatus = (board, me) => {
    let numPlayers = board.players.length;
    let totalBid = 0;
    let tricksMade = 0;
    let cardsDealt = 0;
    // Number of cards dealt will be 
    // the cards a player holds + all the tricks done so far & the current trick if the players turn is done
    for (let i=0; i<numPlayers; i++) {
      if (board.players[i].bid >= 0) {
        totalBid += board.players[i].bid;
      }
      tricksMade += board.players[i].tricks;
      if (i === me) {
        cardsDealt = board.players[i].cards.length;
        if (board.players[i].status === 'PD') {
          cardsDealt++;
        }
      }
    }
    cardsDealt += tricksMade;
    let bidStatus = totalBid - cardsDealt;
    console.log(`bidStatus=${bidStatus} totalBid=${totalBid} cardsDealt=${cardsDealt}`);
    if (parseInt(bidStatus) > 0) {
      console.log ('Over bid by ' + bidStatus);
    } else if (bidStatus === 0) {
      console.log ('Exact Bid of ' + cardsDealt);
    } else {
      console.log('Under bid by ' + bidStatus)
    }
    return bidStatus;
  }

  let isBidAllowed = () => {
    // Is it the last bid?
    let totalBid = 0;
    let lastBid = true;
    let totalCards = 0;
    let bidAllowed = true;
    for (let i=0; i<$scope.players.length; i++) {
      if (i === $scope.me) {
        totalBid += parseInt($scope.bid);
      } else if ($scope.players[i].bid >= 0) {
        totalBid += $scope.players[i].bid;
      } else { // Some other player has not bid yet
        lastBid = false;
        break;
      }
    }
    if (lastBid) {
      totalCards = $scope.cards.spades.length + $scope.cards.hearts.length + 
        $scope.cards.diamonds.length + $scope.cards.clubs.length;
      if (totalBid === totalCards) { // Is total bid = total cards dealt
        bidAllowed = false;
      }
    }
    console.log(`Total Bid: ${totalBid} lastBid: ${lastBid} totalCards: ${totalCards}`);
    return bidAllowed;
  }

  let resetAndStartAgain = () => {
    if (socket) socket.disconnect();
    resetStore();
    $scope.players = [];
    $state.go(`base.start1`);
    $state.go(`base.start`);
  }

  let resetStore = () => {
    store.remove('playerID');
    store.remove('gameID');
    // store.remove('playerName');
    storageInitialized = false;
  }

  $scope.playerName = null;
  $scope.numPlayers = 4; // Default Value
  $scope.status = "Set Your Name";

  // Get Game Code from URL
  let params = $location.search();
  if (params && params.gameCode) {
    $scope.gameCode = params.gameCode;
  }

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
