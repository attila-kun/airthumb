export async function trackBackend(eventName: string, props?) {  
    console.log('track', eventName, props);
}

export async function trackFrontend(eventName: string, props?) {  
    chrome.runtime.sendMessage({
      command: 'trackEvent',
      eventName: eventName,
      event: {
        timestamp: new Date().valueOf(),
        props: props,
      }
    });
}