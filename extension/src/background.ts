import environment from "./environment.json";
import { trackBackend } from "./track";

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
      trackBackend('extensionInstalled');
    }
});
  
chrome.runtime.onMessage.addListener(
    // Do not make this async, it messes up sendResponse
    function(request, sender, sendResponse) {
  
    switch(request.command) {
        case 'trackEvent':
          trackBackend(request.eventName, request.event);
          break;
  
        default:
          throw new Error('Unknown command: ' + request.command);
      }
  
      return true;
    }
);

console.log('Background script loaded');