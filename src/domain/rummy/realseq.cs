
public bool IsRealSequence(List<CardIdentifier> Allcards)
    {
        if (Allcards.Count < 3)
        {
            //Debug.Log("Not Enough Card For Validation");
            return false;
        }

        var queryAllCards = from student in Allcards
                            group student by student.Suit into newGroup
                            select newGroup;

        SetCards = new CardIdentifier[14];
        int KeyCount = 0, i = 0, FilledStart = -1, FilledEnd = 15,
            counter = Allcards.Count;

        foreach (var item in queryAllCards)
        {
            //Console.WriteLine($"Key: {item.Key}");
            KeyCount++;
        }
        if (KeyCount < 2)
        {
            for (i = 0; i < Allcards.Count; i++)
            {
                if (SetCards[RankToInt(Allcards[i].Rank) - 1] == null)
                {
                    SetCards[RankToInt(Allcards[i].Rank) - 1] = Allcards[i];
                    if (RankToInt(Allcards[i].Rank) - 1 == 0)
                    {
                        SetCards[13] = Allcards[i];
                    }
                }
                else
                {
                    //Debug.Log("Same Card Twice");
                    return false;
                }
            }
            for (i = 0; i < SetCards.Length; i++)
            {
                if (SetCards[i] != null)
                {
                    if (FilledStart == -1)
                    {
                        FilledStart = i;
                    }
                    counter--;
                }
                else
                {
                    if (FilledStart > -1 && counter == 0)
                    {
                        FilledEnd = i - 1;
                        break;
                    }
                    else if (FilledStart > -1 && counter > 0)
                    {
                        FilledStart = -1;
                        counter = Allcards.Count;
                    }
                }
            }
