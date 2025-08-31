import "./createPost.js";
import { Devvit, useState, useWebView } from "@devvit/public-api";
import type { DevvitMessage, WebViewMessage } from "./message.js";

Devvit.configure({
  redditAPI: true,
  redis: true,
});

// Add a custom post type to Devvit
Devvit.addCustomPostType({
  name: "Tile Slide Community",
  height: "tall",
  render: (context) => {
    // Load username with `useAsync` hook
    const [username] = useState(async () => {
      return (await context.reddit.getCurrentUsername()) ?? "anon";
    });

    const [postID] = useState(async () => {
      return (await context.postId) ?? "anon";
    });

    // Only custom level leaderboard now
    const [customLevelLeaderboardScores, setCustomLevelLeaderboardScores] = useState(async () => {
      const leaderboard = await context.redis.get(`${postID}_customLevelLeaderboard`);
      const scoresData = leaderboard ? await JSON.parse(leaderboard) : [];
      return scoresData;
    });

    const webView = useWebView<WebViewMessage, DevvitMessage>({
      // URL of your web view content
      url: "index.html",

      // Handle messages sent from the web view
      async onMessage(message, webView) {
        switch (message.type) {
          case "initialData":
            const initialFetchedCustomLevel = await context.redis.get(postID);
            const initialCustomLevelLeaderboard = await context.redis.get(`${postID}_customLevelLeaderboard`);

            webView.postMessage({
              type: "setInitialData",
              data: {
                username: username,
                leaderboard: "[]", // Empty campaign leaderboard
                customLevelData: initialFetchedCustomLevel || "{}",
                customLevelLeaderboard: initialCustomLevelLeaderboard || "[]",
              },
            });
            break;

          case "addCustomLevelScore":
            const updatedCustomScores = [
              ...customLevelLeaderboardScores,
              {
                playerName: message.data.playerName,
                playerScore: message.data.playerScore,
                levelReached: message.data.levelReached,
              },
            ];
            setCustomLevelLeaderboardScores(updatedCustomScores);

            const updatedCustomScoresString = JSON.stringify(updatedCustomScores);
            await context.redis.set(`${postID}_customLevelLeaderboard`, updatedCustomScoresString);

            webView.postMessage({
              type: "updateCustomLevelLeaderboard",
              data: {
                customLevelLeaderboard: updatedCustomScoresString,
              },
            });
            break;

          case "addScore":
            // This is now only for custom level scores
            const updatedScores = [
              ...customLevelLeaderboardScores,
              {
                playerName: message.data.playerName,
                playerScore: message.data.playerScore,
                levelReached: message.data.levelReached,
              },
            ];
            setCustomLevelLeaderboardScores(updatedScores);

            const updatedScoresString = JSON.stringify(updatedScores);
            await context.redis.set(`${postID}_customLevelLeaderboard`, updatedScoresString);

            webView.postMessage({
              type: "updateCustomLevelLeaderboard",
              data: {
                customLevelLeaderboard: updatedScoresString,
              },
            });
            break;

          case "addCustomLevel":
            const levelDataString = JSON.stringify(message.data.levelData);
            await context.redis.set(postID, levelDataString);

            webView.postMessage({
              type: "updateCustomLevel",
              data: {
                customLevelData: levelDataString,
              },
            });
            break;

          case "fetchUsername":
            webView.postMessage({
              type: "updateUsername",
              data: {
                username: username,
              },
            });
            break;

          case "fetchScores":
            // Return empty for campaign scores
            webView.postMessage({
              type: "updateLeaderboard",
              data: {
                leaderboard: "[]",
              },
            });
            break;

          case "getCustomLevel":
            const fetchedCustomLevel = await context.redis.get(postID);

            if (fetchedCustomLevel) {
              webView.postMessage({
                type: "updateCustomLevel",
                data: {
                  customLevelData: fetchedCustomLevel,
                },
              });
            }
            break;

          default:
            throw new Error(`Unknown message type: ${message}`);
        }
      },
      onUnmount() {
        context.ui.showToast("Thanks for playing! Create or play more levels!");
      },
    });

    // Render the custom post type
    return (
      <vstack grow gap="medium" alignment="middle center" backgroundColor="#f0f0f0">
        <image url="tile-slide-banner.png" width="100%" imageWidth={250} imageHeight={250} description="banner" />
        <text size="xxlarge" weight="bold">
          Welcome {username ?? ""}!
        </text>
        <vstack alignment="start middle">
          <text size="large" weight="bold">
            🎮 Community Puzzle Builder
          </text>
          <text size="medium">
            Create and share puzzles with Reddit!
          </text>
        </vstack>
        <spacer />
        <button appearance="primary" size="large" width="50%" onPress={() => webView.mount()}>
          LAUNCH GAME!
        </button>
        <spacer />
      </vstack>
    );
  },
});

export default Devvit;