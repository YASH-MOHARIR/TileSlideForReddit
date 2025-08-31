/** @typedef {import('../src/message.ts').DevvitSystemMessage} DevvitSystemMessage */
/** @typedef {import('../src/message.ts').WebViewMessage} WebViewMessage */

// Create a data store object that can be modified
const dataStore = {
  fetchedCustomLevelData: {},
  fetchedLeaderboard: [],
  fetchedCustomLevelLeaderboard: [],
  fetchedUsername: "SuperUser"
};

// Export references that will update when dataStore updates
export let fetchedCustomLevelData = dataStore.fetchedCustomLevelData;
export let fetchedLeaderboard = dataStore.fetchedLeaderboard;
export let fetchedCustomLevelLeaderboard = dataStore.fetchedCustomLevelLeaderboard;
export let fetchedUsername = dataStore.fetchedUsername;

export async function addScore(playerName, playerScore, levelReached, isCustomLevelScore) {
  if (isCustomLevelScore) {
    await postWebViewMessage({ type: "addCustomLevelScore", data: { playerName, playerScore, levelReached } });
    dataStore.fetchedCustomLevelLeaderboard.push({ playerName, playerScore, levelReached });
    fetchedCustomLevelLeaderboard = dataStore.fetchedCustomLevelLeaderboard;
  } else {
    dataStore.fetchedLeaderboard.push({ playerName, playerScore, levelReached });
    fetchedLeaderboard = dataStore.fetchedLeaderboard;
    await postWebViewMessage({ type: "addScore", data: { playerName, playerScore, levelReached } });
  }
}

export async function addCustomLevel(levelData) {
  await postWebViewMessage({ type: "addCustomLevel", data: { levelData } });
  dataStore.fetchedCustomLevelData = levelData;
  fetchedCustomLevelData = dataStore.fetchedCustomLevelData;
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
        dataStore.fetchedLeaderboard = leaderboardScores;
        fetchedLeaderboard = dataStore.fetchedLeaderboard;
        break;
      }
      case "updateCustomLevelLeaderboard": {
        const { customLevelLeaderboard } = message.data;
        const customLevelLeaderboardScores = await JSON.parse(customLevelLeaderboard);
        dataStore.fetchedCustomLevelLeaderboard = customLevelLeaderboardScores;
        fetchedCustomLevelLeaderboard = dataStore.fetchedCustomLevelLeaderboard;
        break;
      }
      case "updateUsername": {
        const { username } = message.data;
        dataStore.fetchedUsername = username;
        fetchedUsername = dataStore.fetchedUsername;
        break;
      }
      case "updateCustomLevel": {
        const { customLevelData } = message.data;
        dataStore.fetchedCustomLevelData = await JSON.parse(customLevelData);
        fetchedCustomLevelData = dataStore.fetchedCustomLevelData;
        break;
      }
      case "setInitialData": {
        const { leaderboard, username, customLevelData, customLevelLeaderboard } = message.data;
        dataStore.fetchedLeaderboard = await JSON.parse(leaderboard);
        dataStore.fetchedCustomLevelData = await JSON.parse(customLevelData);
        dataStore.fetchedCustomLevelLeaderboard = await JSON.parse(customLevelLeaderboard);
        dataStore.fetchedUsername = username;
        
        // Update exported references
        fetchedLeaderboard = dataStore.fetchedLeaderboard;
        fetchedCustomLevelData = dataStore.fetchedCustomLevelData;
        fetchedCustomLevelLeaderboard = dataStore.fetchedCustomLevelLeaderboard;
        fetchedUsername = dataStore.fetchedUsername;

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