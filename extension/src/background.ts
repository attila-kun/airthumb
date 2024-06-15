import environment from "./environment.json";
import mixpanel from "mixpanel-browser"; // have to use a special fork: https://github.com/mixpanel/mixpanel-js/issues/304
import { track } from "./track";

globalThis.isBackgroundScript = true;
mixpanel.init(environment.mixpanelToken);
mixpanel.track('extensionLoaded');

const startMonitoringChange = () => {

    if (environment.env !== 'dev') {
      return;
    }

    let oldTimestamp = null;

    const checkTimestampFile = async () => {

        try {
            const fetchResult = await fetch('timestamp.json');
            const { timestamp } = await fetchResult.json();

            if (oldTimestamp === null) {
                oldTimestamp = timestamp;
            } else if (oldTimestamp !== timestamp) {
                chrome.runtime.reload();
            }
        } catch(error) {
            console.error("Could not check timestamp.json due to error:", error);
        }

        setTimeout(checkTimestampFile, 1000);
    };

    checkTimestampFile();
};

startMonitoringChange();

chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === 'install') {
      track('extensionInstalled');
    }
});
  
chrome.runtime.onMessage.addListener(
    // Do not make this async, it messes up sendResponse
    function(request, sender, sendResponse) {
  
    switch(request.command) {
        case 'trackEvent':
          track(request.eventName, request.event);
          break;
  
        default:
          throw new Error('Unknown command: ' + request.command);
      }
  
      return true;
    }
);

console.log('Background script loaded');