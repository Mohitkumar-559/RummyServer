let cards = [];
let cardRanks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

for (let suit of ['spade', 'heart', 'diamond', 'club']) {
     for (let i = 2; i <= 10; i++) {
        const id = Date.now();
          const card = {
               id: id,
               suit: suit,
               rank: "" + i,
               value: cardRanks.indexOf("" + i),
               deckId: "deckId"
          }
          console.log("\n",card);
          cards.push(card);
     }

     for (let face of ['A', 'J', 'Q', 'K']) {
          const id = Date.now();
          const card = {
               id: id,
               suit: suit,
               rank: face,
               value: cardRanks.indexOf(face),
               deckId: "deckId"
          }
          console.log("\n",card);
          cards.push(card);
     }

}
return cards;