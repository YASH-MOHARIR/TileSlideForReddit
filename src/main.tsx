import "./createPost.js";
import { Devvit, useState, useWebView } from "@devvit/public-api";
import type { DevvitMessage, WebViewMessage } from "./message.js";

Devvit.configure({
  redditAPI: true,
  redis: true,
});

// Add a custom post type to Devvit
Devvit.addCustomPostType({
  name: "Web View Example",
  height: "tall",
  render: (context) => {
    // Load username with `useAsync` hook
    const [username] = useState(async () => {
      return (await context.reddit.getCurrentUsername()) ?? "anon";
    });

    const [postID] = useState(async () => {
      return (await context.postId) ?? "anon";
    });

    const [leaderboardScores, setLeaderboardScores] = useState(async () => {
      const leaderboard = await context.redis.get("campaignLeaderboard");
      const scoresData = leaderboard ? await JSON.parse(leaderboard) : [];

      if (scoresData.length === 0) {
        return [];
      }
      return scoresData;
    });

    const [customLevelLeaderboardScores, setcustomLeveleleaderboardScores] = useState(async () => {
      const leaderboard = await context.redis.get(`${postID}_customLevelLeaderboard`);
      const scoresData = leaderboard ? await JSON.parse(leaderboard) : [];

      if (scoresData.length === 0) {
        return [];
      }
      return scoresData;
    });

    // const addDummyScore = async () => {
    //   // await context.redis.del("campaignLeaderboard");
    //   setLeaderboardScores([]);
    //   const updatedScores = [
    //     // ...leaderboardScores,
    //     { playerName: "Yash The Creator", playerScore: 999, levelReached: 12 },
    //     { playerName: "Steve Huffman", playerScore: 1209, levelReached: 12 },
    //     { playerName: "Snoo", playerScore: 811, levelReached: 12 },
    //   ];
    //   setLeaderboardScores(updatedScores);

    //   const updatedScoresString = JSON.stringify(updatedScores);
    //   await context.redis.set("campaignLeaderboard", updatedScoresString);
    //   console.log("score added");
    // };

    const webView = useWebView<WebViewMessage, DevvitMessage>({
      // URL of your web view content
      url: "index.html",

      // Handle messages sent from the web view
      async onMessage(message, webView) {
        switch (message.type) {
          case "initialData":
            const initialScoresData = await context.redis.get("campaignLeaderboard");
            const initialFetchedCustomLevel = await context.redis.get(postID);
            const initialCustomLevelLeaderboard = await context.redis.get(`${postID}_customLevelLeaderboard`);

            webView.postMessage({
              type: "setInitialData",
              data: {
                username: username,
                leaderboard: initialScoresData || "[]",
                customLevelData: initialFetchedCustomLevel || "[]",
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
            setcustomLeveleleaderboardScores(updatedCustomScores);

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
            const updatedScores = [
              ...leaderboardScores,
              {
                playerName: message.data.playerName,
                playerScore: message.data.playerScore,
                levelReached: message.data.levelReached,
              },
            ];
            setLeaderboardScores(updatedScores);

            const updatedScoresString = JSON.stringify(updatedScores);
            await context.redis.set("campaignLeaderboard", updatedScoresString);

            webView.postMessage({
              type: "updateLeaderboard",
              data: {
                leaderboard: updatedScoresString,
              },
            });
            break;

          case "addCustomLevel":
            const levelDataString = JSON.stringify(message.data.levelData);
            await context.redis.set(postID, levelDataString);

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
            const scoresData = await context.redis.get("campaignLeaderboard");

            if (scoresData) {
              webView.postMessage({
                type: "updateLeaderboard",
                data: {
                  leaderboard: scoresData,
                },
              });
            }

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
        context.ui.showToast("Web view closed! Play Again Soon !");
      },
    });

    // Render the custom post type
    return (
      <vstack grow gap="medium" alignment="middle center" backgroundColor="#f0f0f0">
        <image url="tile-slide-banner.png" width="100%" imageWidth={250} imageHeight={250} description="banner" />
        <text size="xxlarge" weight="bold">
          WELCOME {username ?? ""} !!!
        </text>
        <vstack alignment="start middle">
          <text size="large" weight="bold">
            Ready to play Tile Slide :D ?
          </text>
        </vstack>
        <spacer />
        <button appearance="primary" size="large" width="50%" onPress={() => webView.mount()}>
          LAUNCH GAME !
        </button>

        <spacer />
        {/* <button onPress={() => addDummyScore()}>add sample score</button> */}
      </vstack>
    );
  },
});

export default Devvit;
