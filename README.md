# Welcome to Judgement!
Judgement is a card game played with 4 players or higher. The objective of the game is for each player to predict how many hands/tricks they will make (after the cards have been dealt) and then exactly make that number of tricks.

## Why did I create this application?
During the COVID-19 lockdown, my entire family came together in the evenings and played this game. Now that my brother has returned to college and my school has opened up too, I wanted to keep the play alive, so I created an online version of the game. The cards are randomly dealt and we play the game exactly the way we would have, but on our phones! Now I can play the game with family and friends without using physical cards or a paper scoreboard.

## Rules of the Game:

 - All players start with a score of 0 each.
    
    >  Start of Game
    
    >![Start the game by picking your name](https://bitbucket.org/getsachincode/judgement-card-game/raw/9efc13c7a486204d651fe5bc37dd5bd26bf07c56/screenshots/chooseName.png) ![Waiting for players](https://bitbucket.org/getsachincode/judgement-card-game/raw/9efc13c7a486204d651fe5bc37dd5bd26bf07c56/screenshots/waitForStart.png)

 - Players are dealt an equal number of cards at the start of a round. *For example* if there are 4 players, there are 13 cards dealt to each player in the first round.

 - There is a strong suit (trump) assigned at the beginning of the round. After seeing their cards, the players sequentially bid the exact number of tricks they want to make during the round. The last player in the round is not allowed to bid a number where the sum of all the bids equals the number of cards dealt per player.

    >  Bid the exact number of tricks you want to make

    >![Bid](https://bitbucket.org/getsachincode/judgement-card-game/raw/9efc13c7a486204d651fe5bc37dd5bd26bf07c56/screenshots/bid.png) ![Confirm Bid](https://bitbucket.org/getsachincode/judgement-card-game/raw/9efc13c7a486204d651fe5bc37dd5bd26bf07c56/screenshots/bidConfirm.png)

- After the bidding, the first player to bid starts by playing a card. The play continues clockwise until all players have played a card. All subsequent players are required to play a card from the original suit played by the first player, unless they don't have a card from the suit. The ones who don't have a card from the original suit, may choose to trump this sequence to try to win the trick. The winner of the trick/hand is the one who plays the highest card in the original suit played or the highest trump played. The winner then starts the next trick/hand and this continues until all cards have been played.

    >  Play a card. The player winning the trick so far has the dark background.

    >![Play your card](https://bitbucket.org/getsachincode/judgement-card-game/raw/9efc13c7a486204d651fe5bc37dd5bd26bf07c56/screenshots/playCard.png) ![Confirm the end of the trick](https://bitbucket.org/getsachincode/judgement-card-game/raw/9efc13c7a486204d651fe5bc37dd5bd26bf07c56/screenshots/handWinner.png)

- At the end of the round, the total tricks are tallied. The players whose trick count exactly equals their bid, gain 10 points + their bid count in this round. For example if I bid 4 and make exactly 4 tricks, I gain 14 points. If I make 6 tricks, I get 0. Or if I make 2 tricks, I get 0. The players who don't, stay at their previous score.

    >  End of the round. The player names are prefixed by their current position

    >![End of round](https://bitbucket.org/getsachincode/judgement-card-game/raw/9efc13c7a486204d651fe5bc37dd5bd26bf07c56/screenshots/endOfRound.png)

- In the next round, the trump is changed and each player is now dealt one card less than the last round and the game continues, until the previous round only had one card dealt. To make it interesting, the one card round is repeated so that its played 3 more times (in a 4 player game). Also there is a "no-trump" round every 5th round, where is no strong suit.

- At the end the winner of the game is the one with the highest score.

    >  End of the game. The winner(s) of the game prefixed by ***1***

    >![End of game](https://bitbucket.org/getsachincode/judgement-card-game/raw/9efc13c7a486204d651fe5bc37dd5bd26bf07c56/screenshots/endOfGame.png)

## Creation of the game:
This Game was created using ***node.js*** for the server with an ***angular*** front end. I used the *socket.io* libraries for client communication and a playing cards css library from *github.com/selfthinker/CSS-Playing-Cards*

## Future enhancements to the current version:

 1.  Allow the game to be configurable to let 3-8 players play at the same time (Completed 1/24/2022)
 2. Support multiple game tables
 3. If any player drops out (or presses reload), the game terminates. In the future, I will make the game recoverable if that happens. (Completed 11/28/2021)
 4. Port the front end of the game to slack in lieu of the socket.io library

###### Feel free to download and run this game! Contact *sachinbhajekar@gmail.com* to provide feedback and suggest improvements.