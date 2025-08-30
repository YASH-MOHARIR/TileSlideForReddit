/** Message from Devvit to the web view. */
export type DevvitMessage = 
  | { type: "updateUsername" ; data: { username: string } }
  | { type: "updateLeaderboard" ; data: { leaderboard: string } }
  | { type: "updateCustomLevelLeaderboard" ; data: { customLevelLeaderboard: string } }
  | { type: "updateCustomLevel" ; data: { customLevelData: string } }
  | { type: "setInitialData" ; data: { 
    username: string, 
    leaderboard: string,
    customLevelData: string,
    customLevelLeaderboard:string 
  } }
  
  /** Message from the web view to Devvit. */
  export type WebViewMessage =
  | { type: "addScore"; data:  { playerName:string, playerScore:string, levelReached:string } }
  | { type: "addCustomLevelScore"; data:  { playerName:string, playerScore:string, levelReached:string } }
  | { type: "addCustomLevel"; data:  { levelData : string } }
  | { type: "getCustomLevel" ; data: { levelData: string } }
  | { type: "fetchScores" }
  | { type: "initialData" }
  | { type: "fetchUsername" };


/**
 * Web view MessageEvent listener data type. The Devvit API wraps all messages
 * from Blocks to the web view.
 */
export type DevvitSystemMessage = {
  data: { message: DevvitMessage };
  /** Reserved type for messages sent via `context.ui.webView.postMessage`. */
  type?: "devvit-message" | string;
};

////////////////////////////

 