import environment from "./environment.json";

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

console.log('Background script loaded');