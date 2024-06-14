startObserving(
  [
    {
      selector: '[data-section-id="OVERVIEW_DEFAULT_V2"] section',
      insertCallback(node: HTMLElement, tick: HTMLElement) {
        const thumbs = document.createElement('div');
        thumbs.classList.add('thumbs');

        // Create thumbs up element
        const thumbsUp = document.createElement('div');
        thumbsUp.classList.add('thumb');
        thumbsUp.classList.add('thumbs-up');
        thumbsUp.addEventListener('click', function(ev: MouseEvent) {
          this.classList.toggle('thumb');
          this.classList.toggle('thumb-filled');
        });

        // Create thumbs down element
        const thumbsDown = document.createElement('div');
        thumbsDown.classList.add('thumb');
        thumbsDown.classList.add('thumbs-down');
        thumbsDown.addEventListener('click', function(ev: MouseEvent) {
          this.classList.toggle('thumb');
          this.classList.toggle('thumb-filled');
        });

        // Append thumbs up and thumbs down to tick
        thumbs.appendChild(thumbsUp);
        thumbs.appendChild(thumbsDown);

        tick.append(thumbs);

        const inputForm = document.createElement('div');
        inputForm.classList.add('input-form');

        const input = document.createElement('input');
        inputForm.append(input);

        const saveButton = document.createElement('button');
        saveButton.textContent = "Add note"
        inputForm.append(saveButton);

        tick.append(inputForm);

        // Append tick to the node
        node.appendChild(tick);
      },
    }
  ]
)

interface SelectorAndHandler {
  selector: String | (() => HTMLElement[])
  insertCallback?: (node: HTMLElement, tick: HTMLElement) => void
}

async function startObserving(selectorAndHandlerList: SelectorAndHandler[]) {

    const AIRTHUMB_SELECTION_TICK_CLASS_NAME = 'airthumb-icons';
  
    function initializeSelectors(
      node,
      insertCallback) {
  
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child.matches(`.${AIRTHUMB_SELECTION_TICK_CLASS_NAME}`)) {
          return; // already initialised
        }
      }
  
      const selectionTick = document.createElement('div');
      selectionTick.classList.add(AIRTHUMB_SELECTION_TICK_CLASS_NAME);
      insertCallback ? insertCallback(node, selectionTick) : node.appendChild(selectionTick);
    }
  
    const pollDocument = function() {
  
      for (const { selector, insertCallback } of selectorAndHandlerList) {
        let nodes;
  
        switch (typeof selector) {
          case 'function':
            nodes = selector();
            break;
  
          case 'string':
            nodes = document.querySelectorAll(selector);
            break;
  
          default:
            console.error(`Unknown selector type ${typeof selector}`);
            break;
        }
  
        // console.log('pollDocument', nodes)
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          initializeSelectors(node, insertCallback);
        }
      }
  
      setTimeout(pollDocument, 500);
    };
  
    pollDocument();
  }