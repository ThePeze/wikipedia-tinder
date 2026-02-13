Wikipedia Tinder is a project build in React + Vite.
It allows you to swipe left and right on Wikipedia articles like you would on Tinder.

### How it works
##### *Rabbithole Mode:*
- Swiping right redirects you to a random link from your current Wikipedia article
- Swiping left redirects you either to:
	- a completely new article(if you haven't swiped right before)
	- a different article from the previous page(if you swiped right before)
- Both swiping left and swiping right count as a step
- You (currently) always start at the ["Earth"](https://en.wikipedia.org/wiki/Earth) article
- The mode is infinite, there is no goal
- This mode oftentimes is rather random but that's on purpose
- Note: The whole article is loaded each time and you can scroll to the everything, this means the loading times can be rather long
##### *Speedrun Mode:*
- You have a starting article and a target article
- They vary each time(Roughly 10000 different combinations)
- Your goal is to get from the starting article to the target article in as little time and as little steps as possible
- Swiping right redirects you to the most similar article(based on tokenization, slight randomness)
- Swiping left works very similarly to the Rabbithole mode, only that it will also pick the most similar article
- When you reach your target, the game automatically stops and your time and swipes will be displayed(note that the article has to finish loading for the game to stop)
- Note: Only the top 3 paragraphs are loaded in this mode

# How to play
- Go to https://thepeze.github.io/wikipedia-tinder/ (alternatively you could build it yourself with npm run dev/npm run build after you clone this repo)
- Choose a mode at the top (default is the Rabbithole mode)
- Click and hold the header of the card(where the title is) and swipe it either to the left or right
	- Alternatively press the right or left arrow keys(note: this doesn't work 100% of the time)
- In the Speedrun mode: try to get to the target article

# Bugs & Limitations
- This project is pretty badly written, so don't expect a smooth experience.
- The loading times can be quite long(especially in the rabbit hole mode), there is definitely room for improvement but if this doesn't gain much popularity I probably won't improve this.
- Using the arrow keys sometimes isn't counted/doesn't redirect you
- If you swipe too fast before the article is fetched, it can count as a step even though you didn't get redirected.(Note: The article doesn't necessarily need to be displayed for redirection to work, there is some time between when the article is loaded and when it's displayed)
- Sometimes fetching an article fails, in that case you probably have to reload
- There probably are a lot of bugs that I haven't discovered yet, if you find any, feel free to fix them since I probably won't be doing that
