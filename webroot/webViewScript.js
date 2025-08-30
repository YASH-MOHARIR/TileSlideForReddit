/** @typedef {import('../src/message.ts').DevvitSystemMessage} DevvitSystemMessage */
/** @typedef {import('../src/message.ts').WebViewMessage} WebViewMessage */

export let fetchedCustomLevelData = {};
export let fetchedLeaderboard = [];
export let fetchedCustomLevelLeaderboard = [];
export let fetchedUsername = "SuperUser";

export async function addScore(playerName, playerScore, levelReached, isCustomLevelScore) {
  if (isCustomLevelScore) {
    await postWebViewMessage({ type: "addCustomLevelScore", data: { playerName, playerScore, levelReached } });
    fetchedCustomLevelLeaderboard.push({ playerName, playerScore, levelReached });
  } else {
    fetchedLeaderboard.push({ playerName, playerScore, levelReached });
    await postWebViewMessage({ type: "addScore", data: { playerName, playerScore, levelReached } });
  }
}

export async function addCustomLevel(levelData) {
  await postWebViewMessage({ type: "addCustomLevel", data: { levelData } });
  fetchedCustomLevelData = levelData;
}

addEventListener("load", async () => {
  await postWebViewMessage({ type: "initialData" });
});

class App {
  constructor() {
    addEventListener("message", this.#onMessage);
  }

  /**
   * @arg {MessageEvent<DevvitSystemMessage>} ev
   * @return {void}
   */
  #onMessage = async (ev) => {
    // Reserved type for messages sent via `context.ui.webView.postMessage`
    if (ev.data.type !== "devvit-message") return;
    const { message } = ev.data.data;

    switch (message.type) {
      case "updateLeaderboard": {
        const { leaderboard } = message.data;
        const leaderboardScores = await JSON.parse(leaderboard);
        fetchedLeaderboard = leaderboardScores;
        break;
      }
      case "updateCustomLevelLeaderboard": {
        const { customLevelLeaderboard } = message.data;
        const customLevelLeaderboardScores = await JSON.parse(customLevelLeaderboard);
        fetchedCustomLevelLeaderboard = customLevelLeaderboardScores;
        break;
      }
      case "updateUsername": {
        const { username } = message.data;
        fetchedUsername = username;
        break;
      }
      case "updateCustomLevel": {
        const { customLevelData } = message.data;
        fetchedCustomLevelData = await JSON.parse(customLevelData);
        break;
      }
      case "setInitialData": {
        const { leaderboard, username, customLevelData, customLevelLeaderboard } = message.data;
        fetchedLeaderboard = await JSON.parse(leaderboard);
        fetchedCustomLevelData = await JSON.parse(customLevelData);
        fetchedCustomLevelLeaderboard = await JSON.parse(customLevelLeaderboard);
        fetchedUsername = username;

        document.dispatchEvent(new Event("initialDataLoaded"));
        break;
      }
      default:
        /** to-do: @satisifes {never} */
        const _ = message;
        break;
    }
  };
}

/**
 * Sends a message to the Devvit app.
 * @arg {WebViewMessage} msg
 * @return {void}
 */
function postWebViewMessage(msg) {
  parent.postMessage(msg, "*");
}

new App();
