import './css/irs.css'
import IonRangeSlider from './ion.rangeSlider.js'

function initDemo () {
  new IonRangeSlider(document.getElementById('demo_0'), {
    min: 100,
    max: 1000,
    from: 550
  })

  new IonRangeSlider(document.getElementById('demo_1'), {
    type: 'double',
    grid: true,
    min: 0,
    max: 1000,
    from: 200,
    to: 800,
    prefix: '$'
  })

  new IonRangeSlider(document.getElementById('demo_2'), {
    type: 'double',
    grid: true,
    min: -1000,
    max: 1000,
    from: -500,
    to: 500
  })

  new IonRangeSlider(document.getElementById('demo_3'), {
    type: 'double',
    grid: true,
    min: -1000,
    max: 1000,
    from: -500,
    to: 500,
    step: 250
  })

  new IonRangeSlider(document.getElementById('demo_4'), {
    type: 'double',
    grid: true,
    min: -12.8,
    max: 12.8,
    from: -3.2,
    to: 3.2,
    step: 0.1
  })

  {
    const custom_values = [0, 10, 100, 1000, 10000, 100000, 1000000]
    // be careful! FROM and TO should be index of values array
    const my_from = custom_values.indexOf(10)
    const my_to = custom_values.indexOf(10000)
    new IonRangeSlider(document.getElementById('demo_5'), {
      type: 'double',
      grid: true,
      from: my_from,
      to: my_to,
      values: custom_values
    })
  }

  new IonRangeSlider(document.getElementById('demo_6'), {
    grid: true,
    from: new Date().getMonth(),
    values: [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ]
  })

  new IonRangeSlider(document.getElementById('demo_7'), {
    skin: 'big',
    grid: true,
    min: 1000,
    max: 1000000,
    from: 100000,
    step: 1000,
    prettify_enabled: true,
    prettify_separator: ','
  })

  new IonRangeSlider(document.getElementById('demo_8'), {
    skin: 'big',
    grid: true,
    min: 1,
    max: 1000,
    from: 100,
    prettify: n => {
      return n + ' → ' + (+Math.log2(n).toFixed(3))
    }
  })

  new IonRangeSlider(document.getElementById('demo_9'), {
    grid: true,
    min: 0,
    max: 100,
    from: 50,
    step: 5,
    max_postfix: '+',
    prefix: '$',
    // postfix: ' €/ ₽',
  })

  new IonRangeSlider(document.getElementById('demo_10'), {
    skin: 'round',
    grid: true,
    min: 0,
    max: 100,
    from: 21,
    max_postfix: '+',
    prefix: 'Age: ',
    postfix: ' years'
  })

  new IonRangeSlider(document.getElementById('demo_11'), {
    type: 'double',
    grid: true,
    min: 0,
    max: 100,
    from: 47,
    to: 53,
    prefix: 'Weight: ',
    postfix: ' million pounds',
    decorate_both: true // false,
    // values_separator: " to "
  })

  new IonRangeSlider(document.getElementById('demo_12'), {
    skin: 'big',
    type: 'double',
    min: -100000,
    max: 100000,
    from: -100000,
    to: 100000,
    step: 10000,
    grid: true,             // show/hide grid
    force_edges: false,     // force UI in the box
    hide_min_max: false,    // show/hide MIN and MAX labels
    hide_from_to: false,    // show/hide FROM and TO labels
    block: false            // block instance from changing
  })

  new IonRangeSlider(document.getElementById('demo_13'), {
    min: 0,
    max: 10000,
    from: 777,
    step: 1,            // default 1 (set step)
    grid: true,         // default false (enable grid)
    grid_num: 4,        // default 4 (set number of grid cells)
    grid_snap: false    // default false (snap grid to step)
  })

  new IonRangeSlider(document.getElementById('demo_14'), {
    type: 'double',
    min: 0,
    max: 10,
    from: 2,
    to: 8,
    grid: true,
    grid_snap: true,
    from_fixed: false,  // fix position of FROM handle
    to_fixed: false     // fix position of TO handle
  })

  new IonRangeSlider(document.getElementById('demo_15'), {
    type: 'single',
    min: 0,
    max: 1000,
    from: 500,
    grid: true,
    from_min: 250,      // set min position for FROM handle (replace FROM to TO to change handle)
    from_max: 750,      // set max position for FROM handle
    from_shadow: true   // highlight restriction for FROM handle
  })

  new IonRangeSlider(document.getElementById('demo_16'), {
    type: 'single',
    min: 0,
    max: 1000,
    from: 500,
    grid: true,
    from_min: 250,      // set min position for FROM handle (replace FROM to TO to change handle)
    from_max: 750,      // set max position for FROM handle
    from_shadow: true   // highlight restriction for FROM handle
  })

  {
    let lang = 'en-US'
    let year = new Date().getFullYear()

    function dateToTS (date) {
      return date.valueOf()
    }

    function tsToDate (ts) {
      let d = new Date(ts)

      return d.toLocaleDateString(lang, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    new IonRangeSlider(document.getElementById('demo_17'), {
      skin: 'big',
      type: 'double',
      grid: true,
      min: dateToTS(new Date(year, 10, 1)),
      max: dateToTS(new Date(year, 11, 1)),
      from: dateToTS(new Date(year, 10, 8)),
      to: dateToTS(new Date(year, 10, 23)),
      prettify: tsToDate
    })
  }
}

initDemo()
