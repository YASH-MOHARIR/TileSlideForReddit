import { Devvit } from "@devvit/public-api";

// Configure Devvit's plugins
Devvit.configure({
  redditAPI: true,
});

// Adds a new menu item to the subreddit allowing to create a new post
Devvit.addMenuItem({
  label: "Create Tile Slide Community Post",
  location: "subreddit",
  onPress: async (_event, context) => {
    const { reddit, ui } = context;
    const subreddit = await reddit.getCurrentSubreddit();
    const post = await reddit.submitPost({
      title: "🎮 Tile Slide - Community Puzzle",
      subredditName: subreddit.name,
      // The preview appears while the post loads
      preview: (
        <vstack height="100%" width="100%" alignment="middle center">
          <image url="loading.gif" imageWidth={300} imageHeight={300} />
          <text size="large">Loading Community Puzzle Builder...</text>
        </vstack>
      ),
    });
    ui.showToast({ text: "Created community puzzle post! Build and share your level!" });
    ui.navigateTo(post);
  },
});