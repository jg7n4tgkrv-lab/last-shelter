/* Last Shelter – application bootstrap */

loadGame();
render();
maybeShowPerkSelection();
maybeShowCardReward();
if (state.pendingEvent) showWorldEvent();
