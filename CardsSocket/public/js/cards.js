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

  $scope.status = "";

  let nextState = 'bid';

  let myTurn = false;

  $scope.players = [];

  let stateNum = 1;

  $scope.bids = 13;

  $scope.bid = 0;

  $scope.makeBid = function(bid) {
    console.log(bid);
    socket.emit('bid', bid);
    nextState = 'play';
    myTurn = false;
  };

  $scope.playCard = function(card, suit) {
    if (myTurn) {
      if (card === 'J') {
        card = 9;
      } else if (card === 'Q') {
        card = 10;
      } else if (card === 'K') {
        card = 11;
      } else if (card === 'A') {
        card = 12;
      } else {
        card = parseInt(card)-2;
      }
      card = card+13*(suit);
      socket.emit('play card', card);
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
      } else {
        delete board.players[i].cards;
      }

      if (board.players[i].bid > -1) {
        let player = {
          "name": board.players[i].name,
          "bid": board.players[i].bid,
          "tricks": board.players[i].tricks,
          "score": board.players[i].score
        };
        $scope.players.push(player);
      }
    }

    $scope.spadesTrump = "";
    $scope.heartsTrump = "";
    $scope.clubsTrump = "";
    $scope.diamondsTrump = "";
    if (board.round.trump === 0) {
      $scope.spadesTrump = "cards-trump";
    } else if (board.round.trump === 1) {
      $scope.heartsTrump = "cards-trump";
    } else if (board.round.trump === 2) {
      $scope.diamondsTrump = "cards-trump";
    } else {
      $scope.diamondsTrump = "cards-trump";
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
    if (msg === 'new round') {
      bid = -1;
      $state.go(`base.bid${stateNum}`);
      if (stateNum === 1) {
        stateNum = 2;
      } else {
        stateNum = 1;
      }
      nextState = 'bid';
    }

    if (msg.msg === 'insufficient bid. bid again') {
      bid = -1;
      myTurn = true;
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