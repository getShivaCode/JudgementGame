var app = angular.module("Cards", ['ui.router']);

app.config(function($stateProvider, $urlRouterProvider, $httpProvider) {

$stateProvider
  .state("base", {
    url: "/base",
    templateUrl: "/templates/base.html",
    controller: "CardsController",
    abstract: true
  })
  .state("base.start1", {
    url: "/start",
    templateUrl: "/templates/start.html"
  })
  .state("base.start2", {
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
  ;

  $urlRouterProvider.otherwise('/base/start');
});

app.controller("CardsController", ['$scope', '$http', '$state', '$window', function($scope, $http, $state, $window) {

  let socket = io();

  $scope.me = 0; // hard coded compute later

  $scope.status = "";

  let nextState = 'bid';

  let myTurn = false;

  $scope.players = [];

  let stateNum = 1;

  $scope.bids = 13;

  $scope.selected = "";

  let cardPlayed = 0;

  $scope.confirm = false;

  $scope.trickOver = false;
  $scope.roundOver = false;
  $scope.gameOver = false;

  $scope.makeBid = function() {
    $scope.confirm = false;
    socket.emit('bid', $scope.bid);
    nextState = 'play';
    myTurn = false;
  };

  $scope.selectBid = function(bid) {
    if (myTurn && bid) {
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
    if (myTurn && ($scope.bid > -1)) {
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
      nextState = 'play';
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

  $scope.next = function() {
    $scope.trickOver = false;
    $scope.roundOver = false;
    $scope.gameOver = false;
    if (nextState === "start") {
      $state.go('base.start');
    } else {
      $state.go(`base.${nextState}${stateNum}`);
      if (stateNum === 1) {
        stateNum = 2;
      } else {
        stateNum = 1;
      }
    }
  }

  socket.on('board', function(board) {
    board = JSON.parse(board);
    let cards = {
      "spades": [],
      "hearts": [],
      "clubs": [],
      "diamonds": []
    };

    $scope.players = [];
    for (let i=0; i<board.players.length; i++) {
      $scope.players.push({});
    }

    for (let i=0; i<board.players.length; i++) {
      delete board.players[i].id;
      if (board.players[i].cards.length) {
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

        $scope.bids = board.players[i].cards.length;

        $scope.me = i;
      } else {
        delete board.players[i].cards;
      }

      let j=(i+board.round.handWinner)%board.players.length;
      let card = board.round.cards[i];
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
      if (card && (board.round.cards.length != board.players.length)) {
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
      console.log($scope.players);
    }

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
    } else {
      $scope.diamondsTrump = "cards-trump";
      $scope.trumpEmoji = "♦️";
    }

    $state.go(`base.wait${stateNum}`);
    if (stateNum === 1) {
      stateNum = 2;
    } else {
      stateNum = 1;
    }
  });

  socket.on('status', function(msg) {
    console.log("Got Status " + JSON.stringify(msg));
    $state.go(`base.${nextState}${stateNum}`);
    if (stateNum === 1) {
      stateNum = 2;
    } else {
      stateNum = 1;
    }

    if (msg.winner) {
      $scope.trickOver = true;
      nextState = 'play';
      $state.go(`base.wait${stateNum}`);
      if (stateNum === 1) {
        stateNum = 2;
      } else {
        stateNum = 1;
      }
    }

    if (msg === 'new round') {
      bid = -1;
      $scope.bid = null;
      $scope.roundOver = true;
      nextState = 'bid';
    }

    if (msg === "game finished") {
      $scope.gameOver = true;
      nextState = 'start';
    }

    if (msg.msg === 'insufficient bid. bid again') {
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
      console.log("I am here");
      myTurn = true;
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

  function prettyCard(card) {
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
}]);