let id = 0;

export class DaytonRange {
  private step: number | null;

  private range = { min: 0, max: 100 };
  private value = { min: 0, max: 100 };

  private uniqueId = `dayton-range-${id++}`;
  private minLabelId = `${this.uniqueId}-min-label`;
  private maxLabelId = `${this.uniqueId}-max-label`;

  private minLabelElem: HTMLSpanElement;
  private maxLabelElem: HTMLSpanElement;
  private minBoundaryElem: HTMLDivElement;
  private minSlider: HTMLDivElement;
  private maxBoundaryElem: HTMLDivElement;
  private maxSlider: HTMLDivElement;

  constructor(
    private wrapperElem: Element,
    private inputMinElem: Element,
    private inputMaxElem: Element,
  ) {
    this.range = {
      min: strToNumOr(inputMinElem.getAttribute('min'), 0),
      max: strToNumOr(inputMaxElem.getAttribute('max'), 100),
    };

    this.value = { ...this.range };

    if (inputMinElem.hasAttribute('step')) {
      this.step = strToNumOr(inputMinElem.getAttribute('step'), 1);
    } else if (inputMaxElem.hasAttribute('step')) {
      this.step = strToNumOr(inputMaxElem.getAttribute('step'), 1);
    } else {
      this.step = null;
    }

    /**
     * BUILD THE CUSTOM ELEMENTS
     */

    // Min label
    this.minLabelElem = document.createElement('span');
    this.minLabelElem.id = this.minLabelId;
    this.minLabelElem.classList.add('dayton-range__min-label');
    this.wrapperElem.appendChild(this.minLabelElem);

    // Max label
    this.maxLabelElem = document.createElement('span');
    this.maxLabelElem.id = this.maxLabelId;
    this.maxLabelElem.classList.add('dayton-range__max-label');
    this.wrapperElem.appendChild(this.maxLabelElem);

    // Slider boundary
    const boundaryElem = document.createElement('div');
    boundaryElem.classList.add('dayton-range__boundary');
    this.wrapperElem.appendChild(boundaryElem);

    // Min boundary
    this.minBoundaryElem = document.createElement('div');
    this.minBoundaryElem.classList.add('dayton-range__min-boundary');
    boundaryElem.appendChild(this.minBoundaryElem);

    // Min slider
    this.minSlider = document.createElement('div');
    this.minSlider.classList.add('dayton-range__slider');
    this.minSlider.setAttribute('role', 'slider');
    this.minSlider.setAttribute('tabindex', '0');
    this.minSlider.setAttribute('aria-labelledby', this.minLabelId);
    this.minSlider.setAttribute('aria-valuemin', `${this.range.min}`);
    // TODO: keydown
    // TODO: mousedown
    this.minBoundaryElem.appendChild(this.minSlider);

    // Max boundary
    this.maxBoundaryElem = document.createElement('div');
    this.maxBoundaryElem.classList.add('dayton-range__max-boundary');
    boundaryElem.appendChild(this.maxBoundaryElem);

    // Max slider
    this.maxSlider = document.createElement('div');
    this.maxSlider.classList.add('dayton-range__slider');
    this.maxSlider.setAttribute('role', 'slider');
    this.maxSlider.setAttribute('tabindex', '0');
    this.maxSlider.setAttribute('aria-labelledby', this.maxLabelId);
    this.maxSlider.setAttribute('aria-valuemax', `${this.range.max}`);
    // TODO: keydown
    // TODO: mousedown
    this.maxBoundaryElem.appendChild(this.maxSlider);

    this.updateOffsets('min', this.value.min);
    this.updateOffsets('max', this.value.max);
  }

  private updateOffsets(which: 'min' | 'max', value: number) {
    const valueMin = which === 'min' ? this.range.min : this.value.min;
    const valueMax = which === 'min' ? this.range.max : this.value.max;

    value = Math.round(value);

    if (value > valueMax) {
      value = valueMax;
    }

    if (value < valueMin) {
      value = valueMin;
    }

    if (which === 'min') {
      this.value.min = value;
    } else {
      this.value.max = value;
    }

    const pos = Math.round(
      ((value - this.range.min) * 100) / (this.range.max - this.range.min),
    );

    if (which === 'min') {
      this.minLabelElem.innerText = `${this.value.min}`;
      this.minSlider.setAttribute('aria-valuenow', `${this.value.min}`);
      this.minSlider.setAttribute('aria-valuetext', `${this.value.min}`);
      this.maxSlider.setAttribute('aria-valuemin', `${this.value.min}`);
      this.minSlider.style.left = `${pos}%`;
      // TODO: left line = `${pos}%`
    } else {
      this.maxLabelElem.innerText = `${this.value.max}`;
      this.maxSlider.setAttribute('aria-valuenow', `${this.value.max}`);
      this.maxSlider.setAttribute('aria-valuetext', `${this.value.max}`);
      this.minSlider.setAttribute('aria-valuemax', `${this.value.max}`);
      this.maxSlider.style.left = `${pos}%`;
      // TODO: right line = `${100 - pos}%`
    }
  }

  public static initAll() {
    document.querySelectorAll('.dayton-range').forEach(sel => {
      const inputMinElem = sel.querySelector('input.dayton-range__input-min');
      const inputMaxElem = sel.querySelector('input.dayton-range__input-max');

      if (inputMinElem && inputMaxElem) {
        new DaytonRange(sel, inputMinElem, inputMaxElem);
      }
    });
  }
}

const strToNumOr = (str: string | null, fallback: number): number => {
  const parsed = parseInt(str ?? '', 10);
  if (isNaN(parsed)) {
    return fallback;
  } else {
    return parsed;
  }
};
