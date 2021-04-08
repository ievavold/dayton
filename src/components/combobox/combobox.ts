import { fuzzy } from './fuzzy';

interface Item {
  label: string;
  value: unknown;
}

type State =
  | { state: 'closed'; choice: Item | null }
  | {
      state: 'partial';
      prior: Item | null;
      filter: string;
      filtered: Item[];
      selected: number;
    }
  | { state: 'complete'; choice: Item; filtered: Item[]; selected: number };

type Msg =
  | { msg: 'blur' }
  | { msg: 'focus' }
  | { msg: 'arrowUp' }
  | { msg: 'arrowDown' }
  | { msg: 'escape' }
  | { msg: 'enter' }
  | { msg: 'input'; newValue: string }
  | { msg: 'click'; choice: Item };

let id = 0;

export class DaytonCombobox {
  private allItems: Item[];

  private state: State = { state: 'closed', choice: null };

  private originalLabel: HTMLLabelElement | null = null;

  private uniqueId = `dayton-combobox-${id++}`;
  private labelId = `${this.uniqueId}-label`;
  private comboboxId = `${this.uniqueId}-combobox`;
  private inputId = `${this.uniqueId}-input`;
  private listboxId = `${this.uniqueId}-listbox`;
  private selectedId = `${this.uniqueId}-selected`;

  private labelElem: HTMLLabelElement;
  private comboboxElem: HTMLDivElement;
  private inputElem: HTMLInputElement;
  private listboxElem: HTMLUListElement;

  constructor(originalSelect: HTMLSelectElement) {
    // Convert each <option> element into an Item
    this.allItems = [];
    for (let i = 0; i < originalSelect.options.length; i++) {
      const label = originalSelect.options[i].innerText;
      const value = originalSelect.options[i].value;
      this.allItems.push({ label, value });
    }

    // Mark the <select> element as being instantiated and hidden
    originalSelect.classList.add('dayton-combobox__select');
    originalSelect.setAttribute('aria-hidden', 'true');

    // Mark any <label> element as hidden
    if (originalSelect.id !== '') {
      const label = document.querySelector(`label[for="${originalSelect.id}"]`);
      if (label instanceof HTMLLabelElement) {
        this.originalLabel = label;
        this.originalLabel.classList.add(`dayton-combobox__label`);
        this.originalLabel.setAttribute('aria-hidden', 'true');
      }
    }

    /**
     * Create the HTML elements for the combobox UI
     */

    this.labelElem = document.createElement('label');
    this.labelElem.id = this.labelId;
    if (this.originalLabel) {
      this.labelElem.innerText = this.originalLabel.innerText;
    }

    const spacer = document.createElement('div');
    spacer.classList.add(`dayton-combobox__spacer`);

    const overlay = document.createElement('div');
    overlay.classList.add(`dayton-combobox__overlay`);
    spacer.appendChild(overlay);

    this.comboboxElem = document.createElement('div');
    this.comboboxElem.id = this.comboboxId;
    this.comboboxElem.classList.add(`dayton-combobox__combobox`);
    this.comboboxElem.setAttribute('role', 'combobox');
    this.comboboxElem.setAttribute('aria-owns', this.listboxId);
    this.comboboxElem.setAttribute('aria-haspopup', 'listbox');
    this.comboboxElem.setAttribute('aria-expanded', 'false');
    overlay.appendChild(this.comboboxElem);

    this.inputElem = document.createElement('input');
    this.inputElem.id = this.inputId;
    this.inputElem.classList.add(`dayton-combobox__input`);
    this.inputElem.setAttribute('type', 'text');
    this.inputElem.setAttribute('aria-autocomplete', 'list');
    this.inputElem.setAttribute('aria-controls', this.listboxId);
    this.inputElem.setAttribute('aria-labelledby', this.labelId);
    this.inputElem.addEventListener('focus', this.onInputFocus.bind(this));
    this.inputElem.addEventListener('blur', this.onInputBlur.bind(this));
    this.inputElem.addEventListener('keyup', this.onInputKeyup.bind(this));
    this.inputElem.addEventListener('keydown', this.onInputKeydown.bind(this));
    this.comboboxElem.appendChild(this.inputElem);

    this.listboxElem = document.createElement('ul');
    this.listboxElem.id = this.listboxId;
    this.listboxElem.classList.add(`dayton-combobox__listbox`);
    this.listboxElem.setAttribute('role', 'listbox');
    this.listboxElem.setAttribute('aria-labelledby', this.labelId);
    overlay.appendChild(this.listboxElem);

    // Attach the newly created elements to the DOM after the original <select>
    originalSelect.parentNode!.insertBefore(spacer, originalSelect.nextSibling);
    originalSelect.parentNode!.insertBefore(this.labelElem, spacer);
  }

  private onInputFocus() {
    this.next({ msg: 'focus' });
  }

  private onInputBlur() {
    this.next({ msg: 'blur' });
  }

  private onInputKeyup(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'Escape':
      case 'Enter':
        event.preventDefault();
        break;
      default:
        const newValue = this.inputElem.value;
        this.next({ msg: 'input', newValue });
    }
  }

  private onInputKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.next({ msg: 'arrowUp' });
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.next({ msg: 'arrowDown' });
        break;
      case 'Escape':
        event.preventDefault();
        this.next({ msg: 'escape' });
        break;
      case 'Enter':
        event.preventDefault();
        this.next({ msg: 'enter' });
        break;
      default:
        const newValue = this.inputElem.value;
        this.next({ msg: 'input', newValue });
    }
  }

  private next(msg: Msg) {
    const oldState = this.state;
    this.state = this.reduce(msg, this.state);
    this.applyEffects(oldState, msg);
  }

  private applyEffects(oldState: State, msg: Msg) {
    if (oldState.state === 'closed' && this.state.state !== 'closed') {
      // moving from closed -> open
      this.inputElem.classList.add(`dayton-combobox__input--open`);
      this.listboxElem.classList.add(`dayton-combobox__listbox--open`);
    } else if (this.state.state === 'closed' && oldState.state !== 'closed') {
      // moving from open -> closed
      this.inputElem.classList.remove(`dayton-combobox__input--open`);
      this.listboxElem.classList.remove(`dayton-combobox__listbox--open`);

      // check if the input should be cleared
      this.inputElem.value = this.state.choice?.label ?? '';
    }

    const selectedClass = `dayton-combobox--selected`;

    // If the msg moved which filtered item was selected, update
    // the DOM classes to reflect the new selected item.
    if (
      this.state.state !== 'closed' &&
      (msg.msg === 'arrowDown' || msg.msg === 'arrowUp')
    ) {
      const oldSelected = oldState.state !== 'closed' ? oldState.selected : -1;
      if (oldSelected >= 0) {
        const oldSelectedElem = this.listboxElem.children.item(oldSelected);
        if (oldSelectedElem) {
          oldSelectedElem.classList.remove(selectedClass);
          oldSelectedElem.id = '';
        }
      }

      const newSelectedElem = this.listboxElem.children.item(
        this.state.selected,
      );
      if (newSelectedElem) {
        newSelectedElem.classList.add(selectedClass);
        newSelectedElem.id = this.selectedId;
        this.inputElem.setAttribute('aria-activedescendant', this.selectedId);
      } else {
        this.inputElem.setAttribute('aria-activedescendant', '');
      }
    }

    // True if the listbox should be cleared either because the list needs to
    // be rebuilt OR because the listbox has been closed.
    const shouldClearList =
      this.state.state === 'closed' && oldState.state !== 'closed';

    // Refresh the list if:
    // (a) the combobox _was_ closed and is now open
    // (b) the contents of the `filtered` attribute in the state has changed
    const shouldRefreshList =
      (oldState.state === 'closed' && this.state.state !== 'closed') ||
      (oldState.state !== 'closed' &&
        this.state.state !== 'closed' &&
        oldState.filtered !== this.state.filtered);

    if (shouldClearList || shouldRefreshList) {
      this.listboxElem.innerText = '';
    }

    if (shouldRefreshList && this.state.state !== 'closed') {
      // Potentially inefficient but easy
      const state = this.state;
      this.state.filtered.forEach((item, index) => {
        const elem = document.createElement('li');
        elem.setAttribute('value', item.value as string);
        elem.setAttribute('role', 'option');
        elem.innerText = item.label;

        if (index === state.selected) {
          elem.classList.add(selectedClass);
          elem.id = this.selectedId;
        }

        elem.addEventListener('mousedown', event => {
          event.preventDefault();
          this.next({ msg: 'click', choice: item });
        });
        this.listboxElem.appendChild(elem);
      });
    }
  }

  private reduce(msg: Msg, state: State): State {
    switch (msg.msg) {
      case 'focus': {
        if (state.state === 'closed') {
          const filtered = state.choice
            ? fuzzy(state.choice.label, this.allItems).slice(0, 10)
            : this.allItems.slice(0, 10);
          const selected = 0;
          return state.choice
            ? { state: 'complete', choice: state.choice, filtered, selected }
            : { state: 'partial', prior: null, filter: '', filtered, selected };
        }
        break;
      }

      case 'blur': {
        if (state.state === 'partial') {
          return { state: 'closed', choice: null };
        } else if (state.state === 'complete') {
          return { state: 'closed', choice: state.choice };
        }
        break;
      }

      case 'input': {
        if (
          (state.state === 'closed' && msg.newValue === state.choice?.label) ||
          (state.state === 'partial' && state.filter === msg.newValue) ||
          (state.state === 'complete' && state.choice.label === msg.newValue)
        ) {
          // Do nothing because the filter hasn't meaningfully changed
          return state;
        }

        const filtered =
          msg.newValue === ''
            ? this.allItems
            : fuzzy(msg.newValue, this.allItems);

        return {
          state: 'partial',
          prior: getPriorFromState(state),
          filter: msg.newValue,
          filtered: filtered.slice(0, 10),
          selected: 0,
        };
      }

      case 'arrowUp': {
        if (state.state !== 'closed') {
          const selected =
            state.selected <= 0
              ? state.filtered.length - 1
              : state.selected - 1;
          return { ...state, selected };
        }
        break;
      }

      case 'arrowDown': {
        if (state.state !== 'closed') {
          const selected = (state.selected + 1) % state.filtered.length;
          return { ...state, selected };
        }
        break;
      }

      case 'escape': {
        if (state.state === 'partial') {
          return { state: 'closed', choice: state.prior };
        } else if (state.state === 'complete') {
          return { state: 'closed', choice: state.choice };
        }
        break;
      }

      case 'enter': {
        if (state.state !== 'closed') {
          return { state: 'closed', choice: state.filtered[state.selected] };
        }
        break;
      }

      case 'click': {
        if (state.state !== 'closed') {
          return { state: 'closed', choice: msg.choice };
        }
      }
    }

    // When in doubt, change nothing
    return state;
  }

  /**
   * Find structures in the DOM that can be
   * turned into live combobox components.
   */
  public static initAll() {
    document.querySelectorAll('select.dayton-combobox').forEach(sel => {
      if (
        sel.classList.contains('dayton-combobox__select') ||
        !(sel instanceof HTMLSelectElement)
      ) {
        // This particular combobox has already been
        // instantiated or is not a <select> element.
        return;
      }

      new DaytonCombobox(sel);
    });
  }
}

const getPriorFromState = (state: State): Item | null => {
  if (state.state === 'complete') {
    return state.choice;
  } else if (state.state === 'partial') {
    return state.prior;
  } else {
    return state.choice;
  }
};
