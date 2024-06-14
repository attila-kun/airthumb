startObserving(
  [
    {
      selector: '[data-section-id="OVERVIEW_DEFAULT_V2"] section',
      insertCallback(node: HTMLElement, tick: HTMLElement) {

        const { listContainer, addNote } = createListControl();
  
        // Example: appending the list container to a specific part of the node
        tick.appendChild(listContainer); // Append the list container wherever you want in the DOM      

        const thumbsUpHandler = () => {
          console.log('thumbs up');
        };

        const thumbsDownHandler = () => {
          console.log('thumbs down');
        };

        const addNoteHandler = (note) => {
          addNote(note)
        };
        
        const thumbs = document.createElement('div');
        thumbs.classList.add('thumbs');
        const thumbsUp = createThumbElement('up', thumbsUpHandler);
        const thumbsDown = createThumbElement('down', thumbsDownHandler);

        thumbs.appendChild(thumbsUp);
        thumbs.appendChild(thumbsDown);

        const coreControls = document.createElement('div');
        coreControls.classList.add('core-controls');

        coreControls.appendChild(thumbs);

        const inputForm = createInputForm(addNoteHandler);
        coreControls.appendChild(inputForm);

        tick.append(coreControls);

        node.appendChild(tick);
      },
    }
  ]
)

function createListControl(): { listContainer: HTMLElement, addNote: (note: string) => void } {
  const listContainer = document.createElement('div');
  listContainer.classList.add('note-list');

  // Method to add a note to the list
  function addNote(note: string) {
    const noteItem = document.createElement('div');
    noteItem.classList.add('note-item');
    noteItem.textContent = note;
    listContainer.appendChild(noteItem);
  }

  return {
    listContainer,
    addNote
  };
}

function getListingId() {
  const regex = /airbnb\.\w+(?:\.\w+)?\/rooms\/(\d+)/;
  const matches = window.location.href.match(regex);
  if (!matches || matches?.length < 1) {
    return null;
  }
  const result = parseInt(matches[1], 10);
  if (isNaN(result)) {
    return null;
  }

  return result;
}

function createThumbElement(type: 'up' | 'down', callback: (ev: MouseEvent) => void): HTMLElement {
  const thumb = document.createElement('div');
  thumb.classList.add('thumb', `thumbs-${type}`);
  thumb.addEventListener('click', callback);
  return thumb;
}

function createInputForm(enterCallback: (value: string) => void): HTMLElement {
  const inputForm = document.createElement('div');
  inputForm.classList.add('input-form');

  const input = document.createElement('input');
  inputForm.append(input);

  const saveButton = document.createElement('button');
  saveButton.textContent = "Add note";
  saveButton.addEventListener('click', () => {
    enterCallback(input.value);
    input.value = ''; // clear input after saving
  });

  // Handle enter key in the input to trigger save button click
  input.addEventListener('keydown', function(ev: KeyboardEvent) {
    if (ev.key === 'Enter') {
      saveButton.click();
    }
  });

  inputForm.append(saveButton);
  return inputForm;
}

interface SelectorAndHandler {
  selector: String | (() => HTMLElement[])
  insertCallback?: (node: HTMLElement, tick: HTMLElement) => void
}

async function startObserving(selectorAndHandlerList: SelectorAndHandler[]) {

    const AIRTHUMB_SELECTION_TICK_CLASS_NAME = 'airthumb-controls';
  
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