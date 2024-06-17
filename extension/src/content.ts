import { track } from "./track";

startObserving(
  [
    {
      selector: '[data-section-id="OVERVIEW_DEFAULT_V2"] section',
      insertCallback(node: HTMLElement, tick: HTMLElement) {

        let model: {
          thumbsState: 'up' | 'down' | null,
          notes: string[]
        } = {
          thumbsState: null,
          notes: []
        };

        const listingId = String(getListingId());

        const trackListing = (eventName: string, props?: any) => {
          track(eventName, { ...props, listingId, url: window.location.href });
        };

        const saveModel = () => {
          chrome.storage.sync.set({ [listingId]: model }, () => {
            console.log('Model saved', model);
          });
        };
  
        const readModel = () => {
          chrome.storage.sync.get(listingId, (data) => {
            if (data[listingId]) {
              const storedModel = data[listingId];
        
              // Validate and set thumbsState with default null if validation fails
              model.thumbsState = (['up', 'down'].includes(storedModel.thumbsState)) ? storedModel.thumbsState : null;
        
              // Validate notes to ensure all elements are strings, filter out non-string items
              model.notes = Array.isArray(storedModel.notes) ? storedModel.notes.filter(note => typeof note === 'string') : [];
        
              render();
            } else {
              // Apply defaults if no data is found
              model.thumbsState = null;
              model.notes = [];
              render();
            }
          });
        };        

        let render, renderAndSave;

        const { listContainer, setNotes } = createListControl((noteIndex) => {
          model.notes.splice(noteIndex, 1);
          renderAndSave();
        });

        const thumbsUpHandler = () => {
          model.thumbsState = model.thumbsState === 'up' ? null : 'up';
          renderAndSave();
          trackListing("thumbsUp");
        };

        const thumbsDownHandler = () => {
          model.thumbsState = model.thumbsState === 'down' ? null : 'down';
          renderAndSave();
          trackListing("thumbsDown");
        };

        const addNoteHandler = (note) => {
          model.notes.push(note);
          renderAndSave();
          trackListing("addNote", { note });
        };
        
        const thumbs = document.createElement('div');
        thumbs.classList.add('thumbs');
        const thumbsUp = createThumbElement('up', thumbsUpHandler);
        const thumbsDown = createThumbElement('down', thumbsDownHandler);

        thumbs.appendChild(thumbsUp.node);
        thumbs.appendChild(thumbsDown.node);

        const coreControls = document.createElement('div');
        coreControls.classList.add('core-controls');

        coreControls.appendChild(thumbs);

        const inputForm = createInputForm(addNoteHandler);
        coreControls.appendChild(inputForm);

        tick.append(coreControls);
        tick.appendChild(listContainer); // Append the list container wherever you want in the DOM      

        node.appendChild(tick);

        render = () => {
          switch (model.thumbsState) {
            case 'up':
              thumbsUp.setSelected(true);
              thumbsDown.setSelected(false);
              break;

            case 'down':
              thumbsUp.setSelected(false);
              thumbsDown.setSelected(true);
              break;

            default:
              thumbsUp.setSelected(false);
              thumbsDown.setSelected(false);
              break;
          }

          setNotes(model.notes);
        };

        renderAndSave = () => {
          render();
          saveModel();
        };

        readModel();
        render();
      },
    }
  ]
);

function createListControl(onNoteRemove: (noteIndex: number) => void): {
  listContainer: HTMLElement,
  setNotes: (notes: string[]) => void
} {
  const listContainer = document.createElement('div');
  listContainer.classList.add('note-list');

  // Method to add a note to the list
  function addNote(note: string, index: number) {
    const noteItem = document.createElement('div');
    const removeIcon = document.createElement('span');
    
    noteItem.classList.add('note-item');
    removeIcon.classList.add('remove-note');
    removeIcon.textContent = '❌';
    removeIcon.onclick = () => onNoteRemove(index);

    noteItem.appendChild(removeIcon);
    noteItem.appendChild(document.createTextNode(note));
    listContainer.appendChild(noteItem);
  }

  return {
    listContainer,
    setNotes(notes) {
      listContainer.innerHTML = '';
      notes.forEach(addNote);
    },
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

function createThumbElement(type: 'up' | 'down', callback: (ev: MouseEvent) => void): {
  node: HTMLElement,
  setSelected: (isSelected: Boolean) => void
} {
  const thumb = document.createElement('div');
  thumb.classList.add('thumb', `thumbs-${type}`);
  thumb.addEventListener('click', callback);
  return {
    node: thumb,
    setSelected: (isSelected) => {
      if (isSelected) {
        thumb.classList.remove('thumb');
        thumb.classList.add('thumb-filled');
      } else {
        thumb.classList.remove('thumb-filled');
        thumb.classList.add('thumb');
      }
    }
  };
}

function createInputForm(enterCallback: (value: string) => void): HTMLElement {
  const inputForm = document.createElement('div');
  inputForm.classList.add('input-form');

  const input = document.createElement('input');
  inputForm.append(input);

  const saveButton = document.createElement('button');
  saveButton.textContent = "Add note";
  saveButton.addEventListener('click', () => {
    if (input.value === '') {
      return;
    }
    enterCallback(input.value);
    input.value = ''; // clear input after saving
  });

  // Handle enter key in the input to trigger save button click
  input.addEventListener('keydown', function(ev: KeyboardEvent) {
    if (ev.key === 'Enter') {
      if (input.value === '') {
        return;
      }
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