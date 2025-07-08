import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ErrorBoundary } from "@/error-boundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RotateCw } from "lucide-react";
import { useState } from "react";

// We won't need to call any of the example API endpoints for this game. Everything lives on the client.

const queryClient = new QueryClient();

// Define a simple type for our playing cards. Using strings allows us to easily display the rank on
// the card later on. Ace can be represented by "A", Jack by "J" etc.
type PlayingCard = {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  rank: string;
};

// Build a fresh deck each time the player starts a new game. Shuffling happens on every deal.
function createDeck(): PlayingCard[] {
  const suits: PlayingCard["suit"][] = ["hearts", "diamonds", "clubs", "spades"];
  const ranks = [
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
  ];
  const deck: PlayingCard[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}
// Randomly shuffle our deck on each start. We use the Fisher–Yates shuffle here. It runs in O(n).
function shuffleDeck(deck: PlayingCard[]): PlayingCard[] {
  const clone = [...deck];
  for (let i = clone.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = clone[i];
    clone[i] = clone[j];
    clone[j] = tmp;
  }
  return clone;
}
// Calculate the score of a hand. Face cards (J, Q, K) count as 10. Aces are counted as 11 whenever possible
// without busting. If there are multiple aces, count them as 1 except one if it can be counted
// as 11 safely.
function calculateScore(hand: PlayingCard[]): number {
  let score = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.rank === "A") {
      aces += 1;
      score += 1; // Count all aces as 1 for now
    } else if (["K", "Q", "J"].includes(card.rank)) {
      score += 10;
    } else {
      score += parseInt(card.rank, 10);
    }
  }
  // Count one ace as 11 if it doesn't bust
  if (aces > 0 && score + 10 <= 21) {
    score += 10;
  }
  return score;
}

function AppImpl() {
  // State to hold the deck and each player's hand. When the game starts we shuffle and deal a fresh deck.
  const [deck, setDeck] = useState<PlayingCard[]>([]);
  const [playerHand, setPlayerHand] = useState<PlayingCard[]>([]);
  const [dealerHand, setDealerHand] = useState<PlayingCard[]>([]);
  const [gameState, setGameState] = useState<
    "idle" | "playerTurn" | "dealerTurn" | "gameOver"
  >("idle");
  const [message, setMessage] = useState<string>("");
  const [hideDealer, setHideDealer] = useState<boolean>(true);

  // Start a new game. Reset all state and deal two cards to each participant.
  const startGame = () => {
    const newDeck = shuffleDeck(createDeck());
    const player = [newDeck.pop()!, newDeck.pop()!];
    const dealer = [newDeck.pop()!, newDeck.pop()!];
    setDeck(newDeck);
    setPlayerHand(player);
    setDealerHand(dealer);
    setHideDealer(true);
    setMessage("");
    setGameState("playerTurn");
  };
  // Give the player another card. If the player busts this turn ends immediately.
  const hit = () => {
    if (gameState !== "playerTurn") return;
    const card = deck.pop()!;
    const player = [...playerHand, card];
    setPlayerHand(player);
    setDeck(deck);
    const score = calculateScore(player);
    if (score > 21) {
      endGame();
    }
  };
  // End the player's turn and let the dealer play out his hand. After the dealer has finished drawing we determine the winner.
  const stand = () => {
    if (gameState !== "playerTurn") return;
    setGameState("dealerTurn");
    setHideDealer(false);
    // Dealer draws cards until reaching 17 or higher. Everything happens synchronously.
    const dealer = [...dealerHand];
    const deckCopy = [...deck];
    while (calculateScore(dealer) < 17) {
      const card = deckCopy.pop()!;
      dealer.push(card);
    }
    setDealerHand(dealer);
    setDeck(deckCopy);
    endGame(dealer);
  };
  // Determine the outcome of the game. If dealerHand is passed in, that means the dealer has finished drawing. Otherwise
  // the player has busted.
  const endGame = (finalDealerHand?: PlayingCard[]) => {
    const playerScore = calculateScore(playerHand);
    const dealerScore = finalDealerHand
      ? calculateScore(finalDealerHand)
      : calculateScore(dealerHand);
    let result = "";
    if (playerScore > 21) {
      result = "You busted! Dealer wins.";
    } else if (dealerScore > 21) {
      result = "Dealer busted! You win!";
    } else if (finalDealerHand) {
      if (playerScore > dealerScore) result = "You win!";
      else if (playerScore < dealerScore) result = "Dealer wins.";
      else result = "Push (tie).";
    }
    setMessage(result);
    setGameState("gameOver");
  };
  // Helper to render a suit icon. We use unicode symbols here for simplicity, but feel free to swap these
  // out for lucide icons if you come across suit specific icons later on.
  const getSuitSymbol = (suit: PlayingCard["suit"]) => {
    switch (suit) {
      case "hearts":
        return "♥";
      case "diamonds":
        return "♦";
      case "clubs":
        return "♣";
      case "spades":
        return "♠";
    }
  };
  const getSuitColor = (suit: PlayingCard["suit"]) => {
    return suit === "hearts" || suit === "diamonds" ? "text-red-600" : "text-black";
  };
  // Calculate scores whenever the hands change. It's OK to calculate them inline during rendering, too.
  const playerScore = calculateScore(playerHand);
  const dealerScore = calculateScore(dealerHand);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-900 p-4">
      <Card className="w-full max-w-xl rounded-xl shadow-xl bg-green-700 border border-black/10">
        <CardHeader>
          <CardTitle className="text-white text-3xl text-center">
            Blackjack
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col space-y-6">
          {/* Dealer area */}
          <div className="flex flex-col items-center">
            <span className="text-white text-xl">Dealer</span>
            <div className="flex space-x-2 mt-2">
              {dealerHand.map((card, index) => {
                const isHidden = hideDealer && index === 0 && gameState === "playerTurn";
                return (
                  <div
                    key={index}
                    className={`w-16 h-24 rounded-lg shadow-md flex flex-col items-center justify-center bg-white ${isHidden ? "bg-gray-400" : ""}`}
                  >
                    {isHidden ? (
                      <span className="text-2xl text-black">?</span>
                    ) : (
                      <>
                        <span className={`text-2xl ${getSuitColor(card.suit)}`}>
                          {getSuitSymbol(card.suit)}
                        </span>
                        <span className="text-xl font-bold">{card.rank}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            {!hideDealer && (
              <span className="text-white mt-2">Score: {dealerScore}</span>
            )}
          </div>
          <Separator />
          {/* Player area */}
          <div className="flex flex-col items-center">
            <span className="text-white text-xl">Player</span>
            <div className="flex space-x-2 mt-2">
              {playerHand.map((card, index) => (
                <div
                  key={index}
                  className={`w-16 h-24 rounded-lg shadow-md flex flex-col items-center justify-center bg-white`}
                >
                  <span className={`text-2xl ${getSuitColor(card.suit)}`}>
                    {getSuitSymbol(card.suit)}
                  </span>
                  <span className="text-xl font-bold">{card.rank}</span>
                </div>
              ))}
            </div>
            <span className="text-white mt-2">Score: {playerScore}</span>
          </div>
          {/* Action buttons and messages */}
          <div className="flex flex-col items-center space-y-2">
            {gameState === "idle" && (
              <Button onClick={startGame} className="w-32">
                Start
              </Button>
            )}
            {gameState === "playerTurn" && (
              <div className="flex space-x-2">
                <Button onClick={hit}>Hit</Button>
                <Button onClick={stand}>Stand</Button>
              </div>
            )}
            {gameState === "gameOver" && (
              <div className="flex flex-col items-center space-y-2">
                <span className="text-white text-lg">{message}</span>
                <Button onClick={startGame} className="w-32">
                  <RotateCw className="mr-2 h-4 w-4" />
                  Play Again
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppImpl />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
