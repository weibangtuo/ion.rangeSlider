
import utils from './utils.js'

let plugin_count = 0

const base_html =
    '<span class="irs">' +
    '<span class="irs-line" tabindex="0"></span>' +
    '<span class="irs-min">0</span><span class="irs-max">1</span>' +
    '<span class="irs-from">0</span><span class="irs-to">0</span><span class="irs-single">0</span>' +
    '</span>' +
    '<span class="irs-grid"></span>'

const single_html =
    '<span class="irs-bar irs-bar--single"></span>' +
    '<span class="irs-shadow shadow-single"></span>' +
    '<span class="irs-handle single"><i></i><i></i><i></i></span>'

const double_html =
    '<span class="irs-bar"></span>' +
    '<span class="irs-shadow shadow-from"></span>' +
    '<span class="irs-shadow shadow-to"></span>' +
    '<span class="irs-handle from"><i></i><i></i><i></i></span>' +
    '<span class="irs-handle to"><i></i><i></i><i></i></span>'

const disable_html =
    '<span class="irs-disable-mask"></span>'

export default class IonRangeSlider {
  /**
   * 
   * @param {HTMLInputElement} input 
   * @param {*} options 
   */
  constructor (input, options) {
    this.VERSION = import.meta.env?.VITE_APP_VERSION
    this.input = input
    this.plugin_count = ++plugin_count
    this.current_plugin = 0
    this.calc_count = 0
    this.update_tm = 0
    this.old_from = 0
    this.old_to = 0
    this.old_minInterval = null
    this.raf_id = null
    this.dragging = false
    this.force_redraw = false
    this.no_diapason = false
    this.has_tab_index = true
    this.is_key = false
    this.is_update = false
    this.is_start = true
    this.is_finish = false
    this.is_active = false
    this.is_resize = false
    this.is_click = false

    options = options || {}

    // cache for links to all DOM elements
    this.dom = {
      win: window,
      body: document.body,
      input: input,
      cont: null,
      rs: null,
      min: null,
      max: null,
      from: null,
      to: null,
      single: null,
      bar: null,
      line: null,
      s_single: null,
      s_from: null,
      s_to: null,
      shad_single: null,
      shad_from: null,
      shad_to: null,
      edge: null,
      grid: null,
      grid_labels: []
    }

    // storage for measure variables
    this.coords = {
      // left
      x_gap: 0,
      x_pointer: 0,

      // width
      w_rs: 0,
      w_rs_old: 0,
      w_handle: 0,

      // percents
      p_gap: 0,
      p_gap_left: 0,
      p_gap_right: 0,
      p_step: 0,
      p_pointer: 0,
      p_handle: 0,
      p_single_fake: 0,
      p_single_real: 0,
      p_from_fake: 0,
      p_from_real: 0,
      p_to_fake: 0,
      p_to_real: 0,
      p_bar_x: 0,
      p_bar_w: 0,

      // grid
      grid_gap: 0,
      big_num: 0,
      big: [],
      big_w: [],
      big_p: [],
      big_x: []
    }

    // storage for labels measure variables
    this.labels = {
      // width
      w_min: 0,
      w_max: 0,
      w_from: 0,
      w_to: 0,
      w_single: 0,

      // percents
      p_min: 0,
      p_max: 0,
      p_from_fake: 0,
      p_from_left: 0,
      p_to_fake: 0,
      p_to_left: 0,
      p_single_fake: 0,
      p_single_left: 0
    }


    /**
     * get and validate config
     */
    let inp = this.dom.input
    // check if base element is input
    if (inp.nodeName !== 'INPUT') {
      console.warn('Base element should be <input>!', inp)
    }

    // default config
    const config = {
      skin: 'flat',
      type: 'single',

      min: 10,
      max: 100,
      from: null,
      to: null,
      step: 1,

      minInterval: 0,
      maxInterval: 0,
      dragInterval: false,

      values: [],
      pValues: [],

      fromFixed: false,
      fromMin: null,
      fromMax: null,
      fromShadow: false,

      toFixed: false,
      toMin: null,
      toMax: null,
      toShadow: false,

      prettifyEnabled: true,
      prettifySeparator: ' ',
      prettify: null,

      forceEdges: false,

      keyboard: true,

      grid: false,
      gridMargin: true,
      gridNum: 4,
      gridSnap: false,

      hideMinMax: false,
      hideFromTo: false,

      prefix: '',
      postfix: '',
      maxPostfix: '',
      decorateBoth: true,
      valuesSeparator: ' — ',

      inputValuesSeparator: ';',

      disable: false,
      block: false,

      extraClasses: '',

      scope: null,
      onStart: null,
      onChange: null,
      onFinish: null,
      onUpdate: null
    }

    // config from data-attributes extends js config
    const config_from_data = {
      ...this.dom.input.dataset,
      values: this.dom.input.dataset.values?.split(',')
    }
    for (const [k, v] of Object.entries(config_from_data)) {
      if ([undefined, ''].includes(v)) {
        delete config_from_data[k]
      }
    }


    // input value extends default config
    let val = this.dom.input.value
    if (val !== undefined && val !== '') {
      val = val.split(config_from_data.inputValuesSeparator || options.inputValuesSeparator || ';')

      if (val[0] && val[0] == +val[0]) {
        val[0] = +val[0]
      }
      if (val[1] && val[1] == +val[1]) {
        val[1] = +val[1]
      }

      if (options && options.values && options.values.length) {
        config.from = val[0] && options.values.indexOf(val[0])
        config.to = val[1] && options.values.indexOf(val[1])
      } else {
        config.from = val[0] && +val[0]
        config.to = val[1] && +val[1]
      }
    }

    this.options = {
      ...config,
      ...options,
      ...config_from_data
    }

    // validate config, to be sure that all data types are correct
    this.update_check = {}
    this.validate()

    // default result object, returned to callbacks
    this.result = {
      input: this.dom.input,
      slider: null,

      min: this.options.min,
      max: this.options.max,

      from: this.options.from,
      fromPercent: 0,
      fromValue: null,

      to: this.options.to,
      toPercent: 0,
      toValue: null
    }

    // destroy old
    if (input._ionRangeSlider) {
      input._ionRangeSlider.destroy()
    }
    input._ionRangeSlider = this
    this.init()
  }

  /**
     * Starts or updates the plugin instance
     *
     * @param [is_update] {boolean}
     */
  init(is_update) {
    this.no_diapason = false
    this.coords.p_step = this.convertToPercent(this.options.step, true)

    this.target = 'base'

    this.toggleInput()
    this.append()
    this.setMinMax()

    if (is_update) {
      this.force_redraw = true
      this.calc(true)

      // callbacks called
      this.callOnUpdate()
    } else {
      this.force_redraw = true
      this.calc(true)

      // callbacks called
      this.callOnStart()
    }

    this.updateScene()
  }

  /**
     * Appends slider template to a DOM
     */
  append() {
    const classes = ['irs', `irs--${this.options.skin}`, `js-irs-${this.plugin_count}`, this.options.extraClasses]
    let container_html = `<span class="${classes.join(' ')}"></span>`
    this.dom.input.insertAdjacentHTML('beforebegin', container_html)
    this.dom.input.readonly = true
    this.dom.cont = this.dom.input.previousElementSibling
    this.result.slider = this.dom.cont

    this.dom.cont.innerHTML = base_html
    this.dom.rs = this.dom.cont.querySelector('.irs')
    this.dom.min = this.dom.cont.querySelector('.irs-min')
    this.dom.max = this.dom.cont.querySelector('.irs-max')
    this.dom.from = this.dom.cont.querySelector('.irs-from')
    this.dom.to = this.dom.cont.querySelector('.irs-to')
    this.dom.single = this.dom.cont.querySelector('.irs-single')
    this.dom.line = this.dom.cont.querySelector('.irs-line')
    this.dom.grid = this.dom.cont.querySelector('.irs-grid')

    if (this.options.type === 'single') {
      this.dom.cont.insertAdjacentHTML('beforeend', single_html)
      this.dom.bar = this.dom.cont.querySelector('.irs-bar')
      this.dom.edge = this.dom.cont.querySelector('.irs-bar-edge')
      this.dom.s_single = this.dom.cont.querySelector('.single')
      this.dom.from.style.visibility = 'hidden'
      this.dom.to.style.visibility = 'hidden'
      this.dom.shad_single = this.dom.cont.querySelector('.shadow-single')
    } else {
      this.dom.cont.insertAdjacentHTML('beforeend', double_html)
      this.dom.bar = this.dom.cont.querySelector('.irs-bar')
      this.dom.s_from = this.dom.cont.querySelector('.from')
      this.dom.s_to = this.dom.cont.querySelector('.to')
      this.dom.shad_from = this.dom.cont.querySelector('.shadow-from')
      this.dom.shad_to = this.dom.cont.querySelector('.shadow-to')

      this.setTopHandler()
    }

    if (this.options.hideFromTo) {
      this.dom.from.style.display = 'none'
      this.dom.to.style.display = 'none'
      this.dom.single.style.display = 'none'
    }

    this.appendGrid()

    if (this.options.disable) {
      this.appendDisableMask()
      this.dom.input.disabled = true
    } else {
      this.dom.input.disabled = false
      this.removeDisableMask()
      this.bindEvents()
    }

    // block only if not disabled
    if (!this.options.disable) {
      if (this.options.block) {
        this.appendDisableMask()
      } else {
        this.removeDisableMask()
      }
    }

    if (this.options.dragInterval) {
      this.dom.bar.style.cursor = 'ew-resize'
    }
  }

  /**
     * Determine which handler has a priority
     * works only for double slider type
     */
  setTopHandler() {
    let min = this.options.min,
      max = this.options.max,
      from = this.options.from,
      to = this.options.to

    if (from > min && to === max) {
      this.dom.s_from.classList.add('type_last')
    } else if (to < max) {
      this.dom.s_to.classList.add('type_last')
    }
  }

  /**
     * Determine which handles was clicked last
     * and which handler should have hover effect
     *
     * @param target {String}
     */
  changeLevel(target) {
    switch (target) {
      case 'single':
        this.coords.p_gap = this.toFixed(this.coords.p_pointer - this.coords.p_single_fake)
        this.dom.s_single.classList.add('state_hover')
        break
      case 'from':
        this.coords.p_gap = this.toFixed(this.coords.p_pointer - this.coords.p_from_fake)
        this.dom.s_from.classList.add('state_hover')
        this.dom.s_from.classList.add('type_last')
        this.dom.s_to.classList.remove('type_last')
        break
      case 'to':
        this.coords.p_gap = this.toFixed(this.coords.p_pointer - this.coords.p_to_fake)
        this.dom.s_to.classList.add('state_hover')
        this.dom.s_to.classList.add('type_last')
        this.dom.s_from.classList.remove('type_last')
        break
      case 'both':
        this.coords.p_gap_left = this.toFixed(this.coords.p_pointer - this.coords.p_from_fake)
        this.coords.p_gap_right = this.toFixed(this.coords.p_to_fake - this.coords.p_pointer)
        this.dom.s_to.classList.remove('type_last')
        this.dom.s_from.classList.remove('type_last')
        break
    }
  }

  /**
     * Then slider is disabled
     * appends extra layer with opacity
     */
  appendDisableMask() {
    this.dom.cont.append(disable_html)
    this.dom.cont.classList.add('irs-disabled')
  }

  /**
     * Then slider is not disabled
     * remove disable mask
     */
  removeDisableMask() {
    this.dom.cont.querySelector('.irs-disable-mask')?.remove()
    this.dom.cont.classList.remove('irs-disabled')
  }

  /**
     * Remove slider instance
     * and unbind all events
     */
  remove() {
    this.dom.cont.remove()
    this.dom.cont = null

    utils.off(this.dom.line, 'keydown.irs_' + this.plugin_count)

    utils.off(this.dom.body, 'touchmove.irs_' + this.plugin_count)
    utils.off(this.dom.body, 'mousemove.irs_' + this.plugin_count)

    utils.off(this.dom.win, 'touchend.irs_' + this.plugin_count)
    utils.off(this.dom.win, 'mouseup.irs_' + this.plugin_count)

    this.dom.grid_labels = []
    this.coords.big = []
    this.coords.big_w = []
    this.coords.big_p = []
    this.coords.big_x = []

    cancelAnimationFrame(this.raf_id)
  }

  /**
     * bind all slider events
     */
  bindEvents() {
    if (this.no_diapason) {
      return
    }

    utils.on(this.dom.body, 'touchmove.irs_' + this.plugin_count, this.pointerMove.bind(this))
    utils.on(this.dom.body, 'mousemove.irs_' + this.plugin_count, this.pointerMove.bind(this))

    utils.on(this.dom.win, 'touchend.irs_' + this.plugin_count, this.pointerUp.bind(this))
    utils.on(this.dom.win, 'mouseup.irs_' + this.plugin_count, this.pointerUp.bind(this))

    utils.on(this.dom.line, 'touchstart.irs_' + this.plugin_count, this.pointerClick.bind(this, 'click'))
    utils.on(this.dom.line, 'mousedown.irs_' + this.plugin_count, this.pointerClick.bind(this, 'click'))

    utils.on(this.dom.line, 'focus.irs_' + this.plugin_count, this.pointerFocus.bind(this))

    if (this.options.dragInterval && this.options.type === 'double') {
      utils.on(this.dom.bar, 'touchstart.irs_' + this.plugin_count, this.pointerDown.bind(this, 'both'))
      utils.on(this.dom.bar, 'mousedown.irs_' + this.plugin_count, this.pointerDown.bind(this, 'both'))
    } else {
      utils.on(this.dom.bar, 'touchstart.irs_' + this.plugin_count, this.pointerClick.bind(this, 'click'))
      utils.on(this.dom.bar, 'mousedown.irs_' + this.plugin_count, this.pointerClick.bind(this, 'click'))
    }

    if (this.options.type === 'single') {
      utils.on(this.dom.single, 'touchstart.irs_' + this.plugin_count, this.pointerDown.bind(this, 'single'))
      utils.on(this.dom.s_single, 'touchstart.irs_' + this.plugin_count, this.pointerDown.bind(this, 'single'))
      utils.on(this.dom.shad_single, 'touchstart.irs_' + this.plugin_count, this.pointerClick.bind(this, 'click'))

      utils.on(this.dom.single, 'mousedown.irs_' + this.plugin_count, this.pointerDown.bind(this, 'single'))
      utils.on(this.dom.s_single, 'mousedown.irs_' + this.plugin_count, this.pointerDown.bind(this, 'single'))
      utils.on(this.dom.edge, 'mousedown.irs_' + this.plugin_count, this.pointerClick.bind(this, 'click'))
      utils.on(this.dom.shad_single, 'mousedown.irs_' + this.plugin_count, this.pointerClick.bind(this, 'click'))
    } else {
      utils.on(this.dom.single, 'touchstart.irs_' + this.plugin_count, this.pointerDown.bind(this, null))
      utils.on(this.dom.single, 'mousedown.irs_' + this.plugin_count, this.pointerDown.bind(this, null))

      utils.on(this.dom.from, 'touchstart.irs_' + this.plugin_count, this.pointerDown.bind(this, 'from'))
      utils.on(this.dom.s_from, 'touchstart.irs_' + this.plugin_count, this.pointerDown.bind(this, 'from'))
      utils.on(this.dom.to, 'touchstart.irs_' + this.plugin_count, this.pointerDown.bind(this, 'to'))
      utils.on(this.dom.s_to, 'touchstart.irs_' + this.plugin_count, this.pointerDown.bind(this, 'to'))
      utils.on(this.dom.shad_from, 'touchstart.irs_' + this.plugin_count, this.pointerClick.bind(this, 'click'))
      utils.on(this.dom.shad_to, 'touchstart.irs_' + this.plugin_count, this.pointerClick.bind(this, 'click'))

      utils.on(this.dom.from, 'mousedown.irs_' + this.plugin_count, this.pointerDown.bind(this, 'from'))
      utils.on(this.dom.s_from, 'mousedown.irs_' + this.plugin_count, this.pointerDown.bind(this, 'from'))
      utils.on(this.dom.to, 'mousedown.irs_' + this.plugin_count, this.pointerDown.bind(this, 'to'))
      utils.on(this.dom.s_to, 'mousedown.irs_' + this.plugin_count, this.pointerDown.bind(this, 'to'))
      utils.on(this.dom.shad_from, 'mousedown.irs_' + this.plugin_count, this.pointerClick.bind(this, 'click'))
      utils.on(this.dom.shad_to, 'mousedown.irs_' + this.plugin_count, this.pointerClick.bind(this, 'click'))
    }

    if (this.options.keyboard) {
      utils.on(this.dom.line, 'keydown.irs_' + this.plugin_count, this.key.bind(this, 'keyboard'))
    }
  }

  /**
  * Focus with tabIndex
  *
  * @param e {Object} event object
  */
  pointerFocus() {
    if (!this.target) {
      const handle = this.options.type === 'single' ? this.dom.single : this.dom.from
      const width = handle && parseFloat(window.getComputedStyle(handle, null).width.replace('px', '')) || 0
      const left = utils.offsetLeft(handle)

      const x = handle ? left + (width / 2) - 1 : 0
      this.pointerClick('single', {
        preventDefault() {},
        pageX: x
      })
    }
  }

  /**
     * Mousemove or touchmove
     * only for handlers
     *
     * @param e {Object} event object
     */
  pointerMove(e) {
    if (!this.dragging) {
      return
    }

    let x = e.pageX || e.originalEvent.touches && e.originalEvent.touches[0].pageX
    this.coords.x_pointer = x - this.coords.x_gap

    this.calc()
  }

  /**
     * Mouseup or touchend
     * only for handlers
     *
     * @param e {Object} event object
     */
  pointerUp(e) {
    if (this.current_plugin !== this.plugin_count) {
      return
    }

    if (this.is_active) {
      this.is_active = false
    } else {
      return
    }

    this.dom.cont.querySelector('.state_hover')?.classList.remove('state_hover')

    this.force_redraw = true

    this.updateScene()
    this.restoreOriginalMinInterval()

    // callbacks call
    if (this.dom.cont.contains(e.target) || this.dragging) {
      this.callOnFinish()
    }

    this.dragging = false
  }

  /**
     * Mousedown or touchstart
     * only for handlers
     *
     * @param target {String|null}
     * @param e {Object} event object
     */
  pointerDown(target, e) {
    e.preventDefault()
    let x = e.pageX || e.originalEvent.touches && e.originalEvent.touches[0].pageX
    if (e.button === 2) {
      return
    }

    if (target === 'both') {
      this.setTempMinInterval()
    }

    if (!target) {
      target = this.target || 'from'
    }

    this.current_plugin = this.plugin_count
    this.target = target

    this.is_active = true
    this.dragging = true

    this.coords.x_gap = utils.offsetLeft(this.dom.rs)
    this.coords.x_pointer = x - this.coords.x_gap

    this.calcPointerPercent()
    this.changeLevel(target)

    this.dom.line.dispatchEvent(new Event('focus'))

    this.updateScene()
  }

  /**
     * Mousedown or touchstart
     * for other slider elements, like diapason line
     *
     * @param target {String}
     * @param e {Object} event object
     */
  pointerClick(target, e) {
    e.preventDefault()
    let x = e.pageX || e.originalEvent.touches && e.originalEvent.touches[0].pageX
    if (e.button === 2) {
      return
    }

    this.current_plugin = this.plugin_count
    this.target = target

    this.is_click = true
    this.coords.x_gap = utils.offsetLeft(this.dom.rs)
    this.coords.x_pointer = +(x - this.coords.x_gap).toFixed()

    this.force_redraw = true
    this.calc()

    this.dom.line.dispatchEvent(new Event('focus'))
  }

  /**
   * Keyborard controls for focused slider
   *
   * @param target {String}
   * @param e {Object} event object
   * @returns {boolean|undefined}
  */
  key(target, e) {
    if (this.current_plugin !== this.plugin_count || e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) {
      return
    }

    switch (e.which) {
      case 83: // W
      case 65: // A
      case 40: // DOWN
      case 37: // LEFT
        e.preventDefault()
        this.moveByKey(false)
        break

      case 87: // S
      case 68: // D
      case 38: // UP
      case 39: // RIGHT
        e.preventDefault()
        this.moveByKey(true)
        break
    }

    return true
  }

  /**
   * Move by key
   *
   * @param right {boolean} direction to move
  */
  moveByKey(right) {
    let p = this.coords.p_pointer
    let p_step = (this.options.max - this.options.min) / 100
    p_step = this.options.step / p_step

    if (right) {
      p += p_step
    } else {
      p -= p_step
    }

    this.coords.x_pointer = this.toFixed(this.coords.w_rs / 100 * p)
    this.is_key = true
    this.calc()
  }

  /**
   * Set visibility and content
   * of Min and Max labels
  */
  setMinMax() {
    if (!this.options) {
      return
    }

    if (this.options.hideMinMax) {
      this.dom.min.style.display = 'none'
      this.dom.max.style.display = 'none'
      return
    }

    if (this.options.values.length) {
      this.dom.min.innerHTML = this.decorate(this.options.pValues[this.options.min])
      this.dom.max.innerHTML = this.decorate(this.options.pValues[this.options.max])
    } else {
      let min_pretty = this._prettify(this.options.min)
      let max_pretty = this._prettify(this.options.max)

      this.result.min_pretty = min_pretty
      this.result.max_pretty = max_pretty

      this.dom.min.innerHTML = this.decorate(min_pretty, this.options.min)
      this.dom.max.innerHTML = this.decorate(max_pretty, this.options.max)
    }

    this.labels.w_min = this.dom.min.offsetWidth
    this.labels.w_max = this.dom.max.offsetWidth
  }

  /**
   * Then dragging interval, prevent interval collapsing
   * using minInterval option
  */
  setTempMinInterval() {
    let interval = this.result.to - this.result.from

    if (this.old_minInterval === null) {
      this.old_minInterval = this.options.minInterval
    }

    this.options.minInterval = interval
  }

  /**
   * Restore minInterval option to original
   */
  restoreOriginalMinInterval() {
    if (this.old_minInterval !== null) {
      this.options.minInterval = this.old_minInterval
      this.old_minInterval = null
    }
  }



  // =============================================================================================================
  // Calculations

  /**
   * All calculations and measures start here
   *
   * @param update {boolean=}
   */
  calc(update) {
    if (!this.options) {
      return
    }

    this.calc_count++

    if (this.calc_count === 10 || update) {
      this.calc_count = 0
      this.coords.w_rs = this.dom.rs.offsetWidth

      this.calcHandlePercent()
    }

    if (!this.coords.w_rs) {
      return
    }

    this.calcPointerPercent()
    let handle_x = this.getHandleX()


    if (this.target === 'both') {
      this.coords.p_gap = 0
      handle_x = this.getHandleX()
    }

    if (this.target === 'click') {
      this.coords.p_gap = this.coords.p_handle / 2
      handle_x = this.getHandleX()

      if (this.options.dragInterval) {
        this.target = 'both_one'
      } else {
        this.target = this.chooseHandle(handle_x)
      }
    }

    switch (this.target) {
      case 'base':
        { 
          const w = (this.options.max - this.options.min) / 100
          const  f = (this.result.from - this.options.min) / w
          const  t = (this.result.to - this.options.min) / w

          this.coords.p_single_real = this.toFixed(f)
          this.coords.p_from_real = this.toFixed(f)
          this.coords.p_to_real = this.toFixed(t)
        }

        this.coords.p_single_real = this.checkDiapason(this.coords.p_single_real, this.options.fromMin, this.options.fromMax)
        this.coords.p_from_real = this.checkDiapason(this.coords.p_from_real, this.options.fromMin, this.options.fromMax)
        this.coords.p_to_real = this.checkDiapason(this.coords.p_to_real, this.options.toMin, this.options.toMax)

        this.coords.p_single_fake = this.convertToFakePercent(this.coords.p_single_real)
        this.coords.p_from_fake = this.convertToFakePercent(this.coords.p_from_real)
        this.coords.p_to_fake = this.convertToFakePercent(this.coords.p_to_real)

        this.target = null

        break

      case 'single':
        if (this.options.fromFixed) {
          break
        }

        this.coords.p_single_real = this.convertToRealPercent(handle_x)
        this.coords.p_single_real = this.calcWithStep(this.coords.p_single_real)
        this.coords.p_single_real = this.checkDiapason(this.coords.p_single_real, this.options.fromMin, this.options.fromMax)

        this.coords.p_single_fake = this.convertToFakePercent(this.coords.p_single_real)

        break

      case 'from':
        if (this.options.fromFixed) {
          break
        }

        this.coords.p_from_real = this.convertToRealPercent(handle_x)
        this.coords.p_from_real = this.calcWithStep(this.coords.p_from_real)
        if (this.coords.p_from_real > this.coords.p_to_real) {
          this.coords.p_from_real = this.coords.p_to_real
        }
        this.coords.p_from_real = this.checkDiapason(this.coords.p_from_real, this.options.fromMin, this.options.fromMax)
        this.coords.p_from_real = this.checkMinInterval(this.coords.p_from_real, this.coords.p_to_real, 'from')
        this.coords.p_from_real = this.checkMaxInterval(this.coords.p_from_real, this.coords.p_to_real, 'from')

        this.coords.p_from_fake = this.convertToFakePercent(this.coords.p_from_real)

        break

      case 'to':
        if (this.options.toFixed) {
          break
        }

        this.coords.p_to_real = this.convertToRealPercent(handle_x)
        this.coords.p_to_real = this.calcWithStep(this.coords.p_to_real)
        if (this.coords.p_to_real < this.coords.p_from_real) {
          this.coords.p_to_real = this.coords.p_from_real
        }
        this.coords.p_to_real = this.checkDiapason(this.coords.p_to_real, this.options.toMin, this.options.toMax)
        this.coords.p_to_real = this.checkMinInterval(this.coords.p_to_real, this.coords.p_from_real, 'to')
        this.coords.p_to_real = this.checkMaxInterval(this.coords.p_to_real, this.coords.p_from_real, 'to')

        this.coords.p_to_fake = this.convertToFakePercent(this.coords.p_to_real)

        break

      case 'both':
        if (this.options.fromFixed || this.options.toFixed) {
          break
        }

        handle_x = this.toFixed(handle_x + (this.coords.p_handle * 0.001))

        this.coords.p_from_real = this.convertToRealPercent(handle_x) - this.coords.p_gap_left
        this.coords.p_from_real = this.calcWithStep(this.coords.p_from_real)
        this.coords.p_from_real = this.checkDiapason(this.coords.p_from_real, this.options.fromMin, this.options.fromMax)
        this.coords.p_from_real = this.checkMinInterval(this.coords.p_from_real, this.coords.p_to_real, 'from')
        this.coords.p_from_fake = this.convertToFakePercent(this.coords.p_from_real)

        this.coords.p_to_real = this.convertToRealPercent(handle_x) + this.coords.p_gap_right
        this.coords.p_to_real = this.calcWithStep(this.coords.p_to_real)
        this.coords.p_to_real = this.checkDiapason(this.coords.p_to_real, this.options.toMin, this.options.toMax)
        this.coords.p_to_real = this.checkMinInterval(this.coords.p_to_real, this.coords.p_from_real, 'to')
        this.coords.p_to_fake = this.convertToFakePercent(this.coords.p_to_real)

        break

      case 'both_one':
        if (this.options.fromFixed || this.options.toFixed) {
          break
        }

        {
          const real_x = this.convertToRealPercent(handle_x)
          const from = this.result.fromPercent
          const to = this.result.toPercent
          const full = to - from
          const half = full / 2
          let new_from = real_x - half
          let new_to = real_x + half

          if (new_from < 0) {
            new_from = 0
            new_to = new_from + full
          }

          if (new_to > 100) {
            new_to = 100
            new_from = new_to - full
          }

          this.coords.p_from_real = this.calcWithStep(new_from)
          this.coords.p_from_real = this.checkDiapason(this.coords.p_from_real, this.options.fromMin, this.options.fromMax)
          this.coords.p_from_fake = this.convertToFakePercent(this.coords.p_from_real)

          this.coords.p_to_real = this.calcWithStep(new_to)
          this.coords.p_to_real = this.checkDiapason(this.coords.p_to_real, this.options.toMin, this.options.toMax)
          this.coords.p_to_fake = this.convertToFakePercent(this.coords.p_to_real)
        }
        break
    }

    if (this.options.type === 'single') {
      this.coords.p_bar_x = (this.coords.p_handle / 2)
      this.coords.p_bar_w = this.coords.p_single_fake

      this.result.fromPercent = this.coords.p_single_real
      this.result.from = this.convertToValue(this.coords.p_single_real)
      this.result.fromPretty = this._prettify(this.result.from)

      if (this.options.values.length) {
        this.result.fromValue = this.options.values[this.result.from]
      }
    } else {
      this.coords.p_bar_x = this.toFixed(this.coords.p_from_fake + (this.coords.p_handle / 2))
      this.coords.p_bar_w = this.toFixed(this.coords.p_to_fake - this.coords.p_from_fake)

      this.result.fromPercent = this.coords.p_from_real
      this.result.from = this.convertToValue(this.coords.p_from_real)
      this.result.fromPretty = this._prettify(this.result.from)
      this.result.toPercent = this.coords.p_to_real
      this.result.to = this.convertToValue(this.coords.p_to_real)
      this.result.toPretty = this._prettify(this.result.to)

      if (this.options.values.length) {
        this.result.fromValue = this.options.values[this.result.from]
        this.result.toValue = this.options.values[this.result.to]
      }
    }

    this.calcMinMax()
    this.calcLabels()
  }


  /**
     * calculates pointer X in percent
     */
  calcPointerPercent() {
    if (!this.coords.w_rs) {
      this.coords.p_pointer = 0
      return
    }

    if (this.coords.x_pointer < 0 || isNaN(this.coords.x_pointer)  ) {
      this.coords.x_pointer = 0
    } else if (this.coords.x_pointer > this.coords.w_rs) {
      this.coords.x_pointer = this.coords.w_rs
    }

    this.coords.p_pointer = this.toFixed(this.coords.x_pointer / this.coords.w_rs * 100)
  }

  convertToRealPercent(fake) {
    let full = 100 - this.coords.p_handle
    return fake / full * 100
  }

  convertToFakePercent(real) {
    let full = 100 - this.coords.p_handle
    return real / 100 * full
  }

  getHandleX() {
    const max = 100 - this.coords.p_handle
    const x = Math.max(0, this.toFixed(this.coords.p_pointer - this.coords.p_gap))

    return Math.min(x, max)
  }

  calcHandlePercent() {
    if (this.options.type === 'single') {
      this.coords.w_handle = this.dom.s_single.offsetWidth
    } else {
      this.coords.w_handle = this.dom.s_from.offsetWidth
    }

    this.coords.p_handle = this.toFixed(this.coords.w_handle / this.coords.w_rs * 100)
  }

  /**
   * Find closest handle to pointer click
   *
   * @param real_x {Number}
   * @returns {String}
   */
  chooseHandle(real_x) {
    if (this.options.type === 'single') {
      return 'single'
    } else {
      let m_point = this.coords.p_from_real + ((this.coords.p_to_real - this.coords.p_from_real) / 2)
      if (real_x >= m_point) {
        return this.options.toFixed ? 'from' : 'to'
      } else {
        return this.options.fromFixed ? 'to' : 'from'
      }
    }
  }

  /**
   * Measure Min and Max labels width in percent
   */
  calcMinMax() {
    if (!this.coords.w_rs) {
      return
    }

    this.labels.p_min = this.labels.w_min / this.coords.w_rs * 100
    this.labels.p_max = this.labels.w_max / this.coords.w_rs * 100
  }

  /**
     * Measure labels width and X in percent
     */
  calcLabels() {
    if (!this.coords.w_rs || this.options.hideFromTo) {
      return
    }

    if (this.options.type === 'single') {

      this.labels.w_single = this.dom.single.offsetWidth
      this.labels.p_single_fake = this.labels.w_single / this.coords.w_rs * 100
      this.labels.p_single_left = this.coords.p_single_fake + (this.coords.p_handle / 2) - (this.labels.p_single_fake / 2)
      this.labels.p_single_left = this.checkEdges(this.labels.p_single_left, this.labels.p_single_fake)

    } else {

      this.labels.w_from = this.dom.from.offsetWidth
      this.labels.p_from_fake = this.labels.w_from / this.coords.w_rs * 100
      this.labels.p_from_left = this.coords.p_from_fake + (this.coords.p_handle / 2) - (this.labels.p_from_fake / 2)
      this.labels.p_from_left = this.toFixed(this.labels.p_from_left)
      this.labels.p_from_left = this.checkEdges(this.labels.p_from_left, this.labels.p_from_fake)

      this.labels.w_to = this.dom.to.offsetWidth
      this.labels.p_to_fake = this.labels.w_to / this.coords.w_rs * 100
      this.labels.p_to_left = this.coords.p_to_fake + (this.coords.p_handle / 2) - (this.labels.p_to_fake / 2)
      this.labels.p_to_left = this.toFixed(this.labels.p_to_left)
      this.labels.p_to_left = this.checkEdges(this.labels.p_to_left, this.labels.p_to_fake)

      this.labels.w_single = this.dom.single.offsetWidth
      this.labels.p_single_fake = this.labels.w_single / this.coords.w_rs * 100
      this.labels.p_single_left = ((this.labels.p_from_left + this.labels.p_to_left + this.labels.p_to_fake) / 2) - (this.labels.p_single_fake / 2)
      this.labels.p_single_left = this.toFixed(this.labels.p_single_left)
      this.labels.p_single_left = this.checkEdges(this.labels.p_single_left, this.labels.p_single_fake)

    }
  }



  // =============================================================================================================
  // Drawings

  /**
   * Main function called in request animation frame
   * to update everything
   */
  updateScene() {
    if (this.raf_id) {
      cancelAnimationFrame(this.raf_id)
      this.raf_id = null
    }

    clearTimeout(this.update_tm)
    this.update_tm = null

    if (!this.options) {
      return
    }

    this.drawHandles()

    if (this.is_active) {
      this.raf_id = requestAnimationFrame(this.updateScene.bind(this))
    } else {
      this.update_tm = setTimeout(this.updateScene.bind(this), 300)
    }
  }

  /**
   * Draw handles
   */
  drawHandles() {
    this.coords.w_rs = this.dom.rs.offsetWidth

    if (!this.coords.w_rs) {
      return
    }

    if (this.coords.w_rs !== this.coords.w_rs_old) {
      this.target = 'base'
      this.is_resize = true
    }

    if (this.coords.w_rs !== this.coords.w_rs_old || this.force_redraw) {
      this.setMinMax()
      this.calc(true)
      this.drawLabels()
      if (this.options.grid) {
        this.calcGridMargin()
        this.calcGridLabels()
      }
      this.force_redraw = true
      this.coords.w_rs_old = this.coords.w_rs
      this.drawShadow()
    }

    if (!this.coords.w_rs) {
      return
    }

    if (!this.dragging && !this.force_redraw && !this.is_key) {
      return
    }

    if (this.old_from !== this.result.from || this.old_to !== this.result.to || this.force_redraw || this.is_key) {

      this.drawLabels()

      this.dom.bar.style.left = this.coords.p_bar_x + '%'
      this.dom.bar.style.width = this.coords.p_bar_w + '%'

      if (this.options.type === 'single') {
        this.dom.bar.style.left = 0
        this.dom.bar.style.width = this.coords.p_bar_w + this.coords.p_bar_x + '%'

        this.dom.s_single.style.left = this.coords.p_single_fake + '%'

        this.dom.single.style.left = this.labels.p_single_left + '%'
      } else {
        this.dom.s_from.style.left = this.coords.p_from_fake + '%'
        this.dom.s_to.style.left = this.coords.p_to_fake + '%'

        if (this.old_from !== this.result.from || this.force_redraw) {
          this.dom.from.style.left = this.labels.p_from_left + '%'
        }
        if (this.old_to !== this.result.to || this.force_redraw) {
          this.dom.to.style.left = this.labels.p_to_left + '%'
        }

        this.dom.single.style.left = this.labels.p_single_left + '%'
      }

      this.writeToInput()

      if ((this.old_from !== this.result.from || this.old_to !== this.result.to) && !this.is_start) {
        this.dom.input.dispatchEvent(new Event('change'))
        this.dom.input.dispatchEvent(new Event('input'))
      }

      this.old_from = this.result.from
      this.old_to = this.result.to

      // callbacks call
      if (!this.is_resize && !this.is_update && !this.is_start && !this.is_finish) {
        this.callOnChange()
      }
      if (this.is_key || this.is_click) {
        this.is_key = false
        this.is_click = false
        this.callOnFinish()
      }

      this.is_update = false
      this.is_resize = false
      this.is_finish = false
    }

    this.is_start = false
    this.is_key = false
    this.is_click = false
    this.force_redraw = false
  }

  /**
     * Draw labels
     * measure labels collisions
     * collapse close labels
     */
  drawLabels() {
    if (!this.options) {
      return
    }

    let values_num = this.options.values.length
    let pValues = this.options.pValues
    let text_single
    let text_from
    let text_to
    let fromPretty
    let toPretty

    if (this.options.hideFromTo) {
      return
    }

    if (this.options.type === 'single') {

      if (values_num) {
        text_single = this.decorate(pValues[this.result.from])
        this.dom.single.innerHTML = text_single
      } else {
        fromPretty = this._prettify(this.result.from)

        text_single = this.decorate(fromPretty, this.result.from)
        this.dom.single.innerHTML = text_single
      }

      this.calcLabels()

      if (this.labels.p_single_left < this.labels.p_min + 1) {
        this.dom.min.style.visibility = 'hidden'
      } else {
        this.dom.min.style.visibility = 'visible'
      }

      if (this.labels.p_single_left + this.labels.p_single_fake > 100 - this.labels.p_max - 1) {
        this.dom.max.style.visibility = 'hidden'
      } else {
        this.dom.max.style.visibility = 'visible'
      }

    } else {

      if (values_num) {

        if (this.options.decorateBoth) {
          text_single = this.decorate(pValues[this.result.from])
          text_single += this.options.valuesSeparator
          text_single += this.decorate(pValues[this.result.to])
        } else {
          text_single = this.decorate(pValues[this.result.from] + this.options.valuesSeparator + pValues[this.result.to])
        }
        text_from = this.decorate(pValues[this.result.from])
        text_to = this.decorate(pValues[this.result.to])

        this.dom.single.innerHTML = text_single
        this.dom.from.innerHTML = text_from
        this.dom.to.innerHTML = text_to

      } else {
        fromPretty = this._prettify(this.result.from)
        toPretty = this._prettify(this.result.to)

        if (this.options.decorateBoth) {
          text_single = this.decorate(fromPretty, this.result.from)
          text_single += this.options.valuesSeparator
          text_single += this.decorate(toPretty, this.result.to)
        } else {
          text_single = this.decorate(fromPretty + this.options.valuesSeparator + toPretty, this.result.to)
        }
        text_from = this.decorate(fromPretty, this.result.from)
        text_to = this.decorate(toPretty, this.result.to)

        this.dom.single.innerHTML = text_single
        this.dom.from.innerHTML = text_from
        this.dom.to.innerHTML = text_to

      }

      this.calcLabels()

      let min = Math.min(this.labels.p_single_left, this.labels.p_from_left),
        single_left = this.labels.p_single_left + this.labels.p_single_fake,
        to_left = this.labels.p_to_left + this.labels.p_to_fake,
        max = Math.max(single_left, to_left)

      if (this.labels.p_from_left + this.labels.p_from_fake >= this.labels.p_to_left) {
        this.dom.from.style.visibility = 'hidden'
        this.dom.to.style.visibility = 'hidden'
        this.dom.single.style.visibility = 'visible'

        if (this.result.from === this.result.to) {
          if (this.target === 'from') {
            this.dom.from.style.visibility = 'visible'
          } else if (this.target === 'to') {
            this.dom.to.style.visibility = 'visible'
          } else if (!this.target) {
            this.dom.from.style.visibility = 'visible'
          }
          this.dom.single.style.visibility = 'hidden'
          max = to_left
        } else {
          this.dom.from.style.visibility = 'hidden'
          this.dom.to.style.visibility = 'hidden'
          this.dom.single.style.visibility = 'visible'
          max = Math.max(single_left, to_left)
        }
      } else {
        this.dom.from.style.visibility = 'visible'
        this.dom.to.style.visibility = 'visible'
        this.dom.single.style.visibility = 'hidden'
      }

      if (min < this.labels.p_min + 1) {
        this.dom.min.style.visibility = 'hidden'
      } else {
        this.dom.min.style.visibility = 'visible'
      }

      if (max > 100 - this.labels.p_max - 1) {
        this.dom.max.style.visibility = 'hidden'
      } else {
        this.dom.max.style.visibility = 'visible'
      }

    }
  }

  /**
   * Draw shadow intervals
   */
  drawShadow() {
    let o = this.options,
      c = this.dom,

      is_fromMin = typeof o.fromMin === 'number' && !isNaN(o.fromMin),
      is_fromMax = typeof o.fromMax === 'number' && !isNaN(o.fromMax),
      is_toMin = typeof o.toMin === 'number' && !isNaN(o.toMin),
      is_toMax = typeof o.toMax === 'number' && !isNaN(o.toMax),

      fromMin,
      fromMax,
      toMin,
      toMax

    if (o.type === 'single') {
      if (o.fromShadow && (is_fromMin || is_fromMax)) {
        fromMin = this.convertToPercent(is_fromMin ? o.fromMin : o.min)
        fromMax = this.convertToPercent(is_fromMax ? o.fromMax : o.max) - fromMin
        fromMin = this.toFixed(fromMin - (this.coords.p_handle / 100 * fromMin))
        fromMax = this.toFixed(fromMax - (this.coords.p_handle / 100 * fromMax))
        fromMin = fromMin + (this.coords.p_handle / 2)

        c.shad_single.style.display = 'block'
        c.shad_single.style.left = fromMin + '%'
        c.shad_single.style.width = fromMax + '%'
      } else {
        c.shad_single.style.display = 'none'
      }
    } else {
      if (o.fromShadow && (is_fromMin || is_fromMax)) {
        fromMin = this.convertToPercent(is_fromMin ? o.fromMin : o.min)
        fromMax = this.convertToPercent(is_fromMax ? o.fromMax : o.max) - fromMin
        fromMin = this.toFixed(fromMin - (this.coords.p_handle / 100 * fromMin))
        fromMax = this.toFixed(fromMax - (this.coords.p_handle / 100 * fromMax))
        fromMin = fromMin + (this.coords.p_handle / 2)

        c.shad_from.style.display = 'block'
        c.shad_from.style.left = fromMin + '%'
        c.shad_from.style.width = fromMax + '%'
      } else {
        c.shad_from.style.display = 'none'
      }

      if (o.toShadow && (is_toMin || is_toMax)) {
        toMin = this.convertToPercent(is_toMin ? o.toMin : o.min)
        toMax = this.convertToPercent(is_toMax ? o.toMax : o.max) - toMin
        toMin = this.toFixed(toMin - (this.coords.p_handle / 100 * toMin))
        toMax = this.toFixed(toMax - (this.coords.p_handle / 100 * toMax))
        toMin = toMin + (this.coords.p_handle / 2)

        c.shad_to.style.display = 'block'
        c.shad_to.style.left = toMin + '%'
        c.shad_to.style.width = toMax + '%'
      } else {
        c.shad_to.style.display = 'none'
      }
    }
  }



  /**
   * Write values to input element
   */
  writeToInput() {
    if (this.options.type === 'single') {
      if (this.options.values.length) {
        this.dom.input.value = this.result.fromValue
      } else {
        this.dom.input.value = this.result.from
      }
      this.dom.input.dataset.from = this.result.from
    } else {
      if (this.options.values.length) {
        this.dom.input.value = this.result.fromValue + this.options.inputValuesSeparator + this.result.toValue
      } else {
        this.dom.input.value = this.result.from + this.options.inputValuesSeparator + this.result.to
      }
      this.dom.input.dataset.from = this.result.from
      this.dom.input.dataset.to = this.result.to
    }
  }

  // Callbacks

  callOnStart() {
    this.writeToInput()

    if (typeof this.options.onStart === 'function') {
      if (this.options.scope) {
        this.options.onStart.call(this.options.scope, this.result)
      } else {
        this.options.onStart(this.result)
      }
    }
  }
  callOnChange() {
    this.writeToInput()

    if (typeof this.options.onChange === 'function') {
      if (this.options.scope) {
        this.options.onChange.call(this.options.scope, this.result)
      } else {
        this.options.onChange(this.result)
      }
    }
  }
  callOnFinish() {
    this.writeToInput()

    if (typeof this.options.onFinish === 'function') {
      if (this.options.scope) {
        this.options.onFinish.call(this.options.scope, this.result)
      } else {
        this.options.onFinish(this.result)
      }
    }
  }
  callOnUpdate() {
    this.writeToInput()

    if (typeof this.options.onUpdate === 'function') {
      if (this.options.scope) {
        this.options.onUpdate.call(this.options.scope, this.result)
      } else {
        this.options.onUpdate(this.result)
      }
    }
  }

  // Service methods
  toggleInput() {
    this.dom.input.classList.toggle('irs-hidden-input')

    if (this.has_tab_index) {
      this.dom.input.setAttribute('tabindex', -1)
    } else {
      this.dom.input.removeAttribute('tabindex')
    }

    this.has_tab_index = !this.has_tab_index
  }

  /**
   * Convert real value to percent
   *
   * @param value {Number} X in real
   * @param no_min {boolean=} don't use min value
   * @returns {Number} X in percent
   */
  convertToPercent(value, no_min) {
    let diapason = this.options.max - this.options.min,
      one_percent = diapason / 100,
      val, percent

    if (!diapason) {
      this.no_diapason = true
      return 0
    }

    if (no_min) {
      val = value
    } else {
      val = value - this.options.min
    }

    percent = val / one_percent

    return this.toFixed(percent)
  }

  /**
   * Convert percent to real values
   *
   * @param percent {Number} X in percent
   * @returns {Number} X in real
   */
  convertToValue(percent) {
    let min = this.options.min,
      max = this.options.max,
      min_decimals = min.toString().split('.')[1],
      max_decimals = max.toString().split('.')[1],
      min_length, max_length,
      avg_decimals = 0,
      abs = 0

    if (percent === 0) {
      return this.options.min
    }
    if (percent === 100) {
      return this.options.max
    }


    if (min_decimals) {
      min_length = min_decimals.length
      avg_decimals = min_length
    }
    if (max_decimals) {
      max_length = max_decimals.length
      avg_decimals = max_length
    }
    if (min_length && max_length) {
      avg_decimals = (min_length >= max_length) ? min_length : max_length
    }

    if (min < 0) {
      abs = Math.abs(min)
      min = +(min + abs).toFixed(avg_decimals)
      max = +(max + abs).toFixed(avg_decimals)
    }

    let number = ((max - min) / 100 * percent) + min,
      string = this.options.step.toString().split('.')[1],
      result

    if (string) {
      number = +number.toFixed(string.length)
    } else {
      number = number / this.options.step
      number = number * this.options.step

      number = +number.toFixed(0)
    }

    if (abs) {
      number -= abs
    }

    if (string) {
      result = +number.toFixed(string.length)
    } else {
      result = this.toFixed(number)
    }

    if (result < this.options.min) {
      result = this.options.min
    } else if (result > this.options.max) {
      result = this.options.max
    }

    return result
  }

  /**
   * Round percent value with step
   *
   * @param percent {Number}
   * @returns percent {Number} rounded
   */
  calcWithStep(percent) {
    let rounded = Math.round(percent / this.coords.p_step) * this.coords.p_step

    if (rounded > 100) {
      rounded = 100
    }
    if (percent === 100) {
      rounded = 100
    }

    return this.toFixed(rounded)
  }

  checkMinInterval(p_current, p_next, type) {
    let o = this.options,
      current,
      next

    if (!o.minInterval) {
      return p_current
    }

    current = this.convertToValue(p_current)
    next = this.convertToValue(p_next)

    if (type === 'from') {

      if (next - current < o.minInterval) {
        current = next - o.minInterval
      }

    } else {

      if (current - next < o.minInterval) {
        current = next + o.minInterval
      }

    }

    return this.convertToPercent(current)
  }

  checkMaxInterval(p_current, p_next, type) {
    let o = this.options,
      current,
      next

    if (!o.maxInterval) {
      return p_current
    }

    current = this.convertToValue(p_current)
    next = this.convertToValue(p_next)

    if (type === 'from') {

      if (next - current > o.maxInterval) {
        current = next - o.maxInterval
      }

    } else {

      if (current - next > o.maxInterval) {
        current = next + o.maxInterval
      }

    }

    return this.convertToPercent(current)
  }

  checkDiapason(p_num, min, max) {
    let num = this.convertToValue(p_num),
      o = this.options

    if (typeof min !== 'number') {
      min = o.min
    }

    if (typeof max !== 'number') {
      max = o.max
    }

    if (num < min) {
      num = min
    }

    if (num > max) {
      num = max
    }

    return this.convertToPercent(num)
  }

  toFixed(num) {
    num = num.toFixed(20)
    return +num
  }

  _prettify(num) {
    if (!this.options.prettifyEnabled) {
      return num
    }

    if (this.options.prettify && typeof this.options.prettify === 'function') {
      return this.options.prettify(num)
    } else {
      return this.prettify(num)
    }
  }

  prettify(num) {
    let n = num.toString()
    return n.replace(/(\d{1,3}(?=(?:\d\d\d)+(?!\d)))/g, '$1' + this.options.prettifySeparator)
  }

  checkEdges(left, width) {
    if (!this.options.forceEdges) {
      return this.toFixed(left)
    }

    if (left < 0) {
      left = 0
    } else if (left > 100 - width) {
      left = 100 - width
    }

    return this.toFixed(left)
  }

  validate() {
    let o = this.options,
      r = this.result,
      v = o.values,
      vl = v.length,
      value,
      i

    if (typeof o.min === 'string') o.min = +o.min
    if (typeof o.max === 'string') o.max = +o.max
    if (typeof o.from === 'string') o.from = +o.from
    if (typeof o.to === 'string') o.to = +o.to
    if (typeof o.step === 'string') o.step = +o.step

    if (typeof o.fromMin === 'string') o.fromMin = +o.fromMin
    if (typeof o.fromMax === 'string') o.fromMax = +o.fromMax
    if (typeof o.toMin === 'string') o.toMin = +o.toMin
    if (typeof o.toMax === 'string') o.toMax = +o.toMax

    if (typeof o.gridNum === 'string') o.gridNum = +o.gridNum

    if (o.max < o.min) {
      o.max = o.min
    }

    if (vl) {
      o.pValues = []
      o.min = 0
      o.max = vl - 1
      o.step = 1
      o.gridNum = o.max
      o.gridSnap = true

      for (i = 0; i < vl; i++) {
        value = +v[i]

        if (!isNaN(value)) {
          v[i] = value
          value = this._prettify(value)
        } else {
          value = v[i]
        }

        o.pValues.push(value)
      }
    }

    if (typeof o.from !== 'number' || isNaN(o.from)) {
      o.from = o.min
    }

    if (typeof o.to !== 'number' || isNaN(o.to)) {
      o.to = o.max
    }

    if (o.type === 'single') {

      if (o.from < o.min) o.from = o.min
      if (o.from > o.max) o.from = o.max

    } else {

      if (o.from < o.min) o.from = o.min
      if (o.from > o.max) o.from = o.max

      if (o.to < o.min) o.to = o.min
      if (o.to > o.max) o.to = o.max

      if (this.update_check.from) {

        if (this.update_check.from !== o.from) {
          if (o.from > o.to) o.from = o.to
        }
        if (this.update_check.to !== o.to) {
          if (o.to < o.from) o.to = o.from
        }

      }

      if (o.from > o.to) o.from = o.to
      if (o.to < o.from) o.to = o.from

    }

    if (typeof o.step !== 'number' || isNaN(o.step) || !o.step || o.step < 0) {
      o.step = 1
    }

    if (typeof o.fromMin === 'number' && o.from < o.fromMin) {
      o.from = o.fromMin
    }

    if (typeof o.fromMax === 'number' && o.from > o.fromMax) {
      o.from = o.fromMax
    }

    if (typeof o.toMin === 'number' && o.to < o.toMin) {
      o.to = o.toMin
    }

    if (typeof o.toMax === 'number' && o.from > o.toMax) {
      o.to = o.toMax
    }

    if (r) {
      if (r.min !== o.min) {
        r.min = o.min
      }

      if (r.max !== o.max) {
        r.max = o.max
      }

      if (r.from < r.min || r.from > r.max) {
        r.from = o.from
      }

      if (r.to < r.min || r.to > r.max) {
        r.to = o.to
      }
    }

    if (typeof o.minInterval !== 'number' || isNaN(o.minInterval) || !o.minInterval || o.minInterval < 0) {
      o.minInterval = 0
    }

    if (typeof o.maxInterval !== 'number' || isNaN(o.maxInterval) || !o.maxInterval || o.maxInterval < 0) {
      o.maxInterval = 0
    }

    if (o.minInterval && o.minInterval > o.max - o.min) {
      o.minInterval = o.max - o.min
    }

    if (o.maxInterval && o.maxInterval > o.max - o.min) {
      o.maxInterval = o.max - o.min
    }
  }

  decorate(num, original) {
    let decorated = '',
      o = this.options

    if (o.prefix) {
      decorated += o.prefix
    }

    decorated += num

    if (o.maxPostfix) {
      if (o.values.length && num === o.pValues[o.max]) {
        decorated += o.maxPostfix
        if (o.postfix) {
          decorated += ' '
        }
      } else if (original === o.max) {
        decorated += o.maxPostfix
        if (o.postfix) {
          decorated += ' '
        }
      }
    }

    if (o.postfix) {
      decorated += o.postfix
    }

    return decorated
  }

  updateFrom() {
    this.result.from = this.options.from
    this.result.fromPercent = this.convertToPercent(this.result.from)
    this.result.fromPretty = this._prettify(this.result.from)
    if (this.options.values) {
      this.result.fromValue = this.options.values[this.result.from]
    }
  }

  updateTo() {
    this.result.to = this.options.to
    this.result.toPercent = this.convertToPercent(this.result.to)
    this.result.toPretty = this._prettify(this.result.to)
    if (this.options.values) {
      this.result.toValue = this.options.values[this.result.to]
    }
  }

  updateResult() {
    this.result.min = this.options.min
    this.result.max = this.options.max
    this.updateFrom()
    this.updateTo()
  }


  // Grid
  appendGrid() {
    if (!this.options.grid) {
      return
    }

    let o = this.options,
      i, z,

      total = o.max - o.min,
      big_num = o.gridNum,
      big_p = 0,
      big_w = 0,

      small_max = 4,
      local_small_max,
      small_p,
      small_w = 0,

      result,
      html = ''

    this.calcGridMargin()

    if (o.gridSnap) {
      big_num = total / o.step
    }

    if (big_num > 50) big_num = 50
    big_p = this.toFixed(100 / big_num)

    if (big_num > 4) {
      small_max = 3
    }
    if (big_num > 7) {
      small_max = 2
    }
    if (big_num > 14) {
      small_max = 1
    }
    if (big_num > 28) {
      small_max = 0
    }

    for (i = 0; i < big_num + 1; i++) {
      local_small_max = small_max
      big_w = Math.min(this.toFixed(big_p * i), 100)

      this.coords.big[i] = big_w

      small_p = (big_w - (big_p * (i - 1))) / (local_small_max + 1)

      for (z = 1; z <= local_small_max; z++) {
        if (big_w === 0) {
          break
        }

        small_w = this.toFixed(big_w - (small_p * z))

        html += '<span class="irs-grid-pol small" style="left: ' + small_w + '%"></span>'
      }

      html += '<span class="irs-grid-pol" style="left: ' + big_w + '%"></span>'

      result = this.convertToValue(big_w)
      if (o.values.length) {
        result = o.pValues[result]
      } else {
        result = this._prettify(result)
      }

      html += '<span class="irs-grid-text js-grid-text-' + i + '" style="left: ' + big_w + '%">' + result + '</span>'
    }
    this.coords.big_num = Math.ceil(big_num + 1)



    this.dom.cont.classList.add('irs-with-grid')
    this.dom.grid.innerHTML = html
    this.cacheGridLabels()
  }

  cacheGridLabels() {
    const num = this.coords.big_num

    for (let i = 0; i < num; i++) {
      const label = this.dom.grid.querySelector('.js-grid-text-' + i)
      label && this.dom.grid_labels.push(label)
    }

    this.calcGridLabels()
  }

  calcGridLabels() {
    let i, start = [], finish = [],
      num = this.coords.big_num

    for (i = 0; i < num; i++) {
      this.coords.big_w[i] = this.dom.grid_labels[i].offsetWidth
      this.coords.big_p[i] = this.toFixed(this.coords.big_w[i] / this.coords.w_rs * 100)
      this.coords.big_x[i] = this.toFixed(this.coords.big_p[i] / 2)

      start[i] = this.toFixed(this.coords.big[i] - this.coords.big_x[i])
      finish[i] = this.toFixed(start[i] + this.coords.big_p[i])
    }

    if (this.options.forceEdges) {
      if (start[0] < -this.coords.grid_gap) {
        start[0] = -this.coords.grid_gap
        finish[0] = this.toFixed(start[0] + this.coords.big_p[0])

        this.coords.big_x[0] = this.coords.grid_gap
      }

      if (finish[num - 1] > 100 + this.coords.grid_gap) {
        finish[num - 1] = 100 + this.coords.grid_gap
        start[num - 1] = this.toFixed(finish[num - 1] - this.coords.big_p[num - 1])

        this.coords.big_x[num - 1] = this.toFixed(this.coords.big_p[num - 1] - this.coords.grid_gap)
      }
    }

    this.calcGridCollision(2, start, finish)
    this.calcGridCollision(4, start, finish)

    for (i = 0; i < num; i++) {
      const label = this.dom.grid_labels[i]

      if (this.coords.big_x[i] !== Number.POSITIVE_INFINITY) {
        label.style.marginLeft = -this.coords.big_x[i] + '%'
      }
    }
  }

  // Collisions Calc Beta
  // TODO: Refactor then have plenty of time
  calcGridCollision(step, start, finish) {
    let i, next_i,
      num = this.coords.big_num

    for (i = 0; i < num; i += step) {
      next_i = i + (step / 2)
      if (next_i >= num) {
        break
      }

      const label = this.dom.grid_labels[next_i]

      if (finish[i] <= start[next_i]) {
        label.style.visibility = 'visible'
      } else {
        label.style.visibility = 'hidden'
      }
    }
  }

  calcGridMargin() {
    if (!this.options.gridMargin) {
      return
    }

    this.coords.w_rs = this.dom.rs.offsetWidth
    if (!this.coords.w_rs) {
      return
    }

    if (this.options.type === 'single') {
      this.coords.w_handle = this.dom.s_single.offsetWidth
    } else {
      this.coords.w_handle = this.dom.s_from.offsetWidth
    }
    this.coords.p_handle = this.toFixed(this.coords.w_handle  / this.coords.w_rs * 100)
    this.coords.grid_gap = this.toFixed((this.coords.p_handle / 2) - 0.1)

    this.dom.grid.style.width = this.toFixed(100 - this.coords.p_handle) + '%'
    this.dom.grid.style.left = this.coords.grid_gap + '%'
  }

  // Public methods
  update(options) {
    if (!this.input) {
      return
    }

    this.is_update = true

    this.options.from = this.result.from
    this.options.to = this.result.to
    this.update_check.from = this.result.from
    this.update_check.to = this.result.to

    Object.assign(this.options, options)
    this.validate()
    this.updateResult(options)

    this.toggleInput()
    this.remove()
    this.init(true)
  }

  reset() {
    if (!this.input) {
      return
    }

    this.updateResult()
    this.update()
  }

  destroy() {
    if (!this.input) {
      return
    }

    this.toggleInput()
    this.dom.input.readonly = false
    delete this.input._ionRangeSlider

    this.remove()
    this.input = null
    this.options = null
  }
}
