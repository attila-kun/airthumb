import mixpanel from "mixpanel-browser";
import { isRunningAsBackgroundScript } from "./utils";

export async function track(eventName: string, props?) {
  if (isRunningAsBackgroundScript()) {
    mixpanel.track(eventName);
    return;
  }

  chrome.runtime.sendMessage({
    command: 'trackEvent',
    eventName: eventName,
    event: {
      timestamp: new Date().valueOf(),
      props: props,
    }
  });
}