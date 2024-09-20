const eventListeners = {}
let elId = 0

export default {
  offsetLeft (element) {
    if (!element) {
      return 0
    }
    const rect = element.getBoundingClientRect()
    return rect.left + window.pageXOffset - document.documentElement.clientLeft
  },
  getEventName (el, eventName) {
    const id = el.eventEmitterId || (el.eventEmitterId = ++elId)

    return `${eventName}__event__${id}`
  },
  on(el, eventName, listener) {
    if (!el || !eventName) {
      return
    }
    const tNEventName = this.getEventName(el, eventName)
    if (!eventListeners[tNEventName]) {
      eventListeners[tNEventName] = []
    }
    eventListeners[tNEventName].push(listener)
    el.addEventListener(eventName.split('.')[0], listener)
  },
  off(el, eventName) {
    if (!el || !eventName) {
      return
    }
    Object.keys(eventListeners).forEach(tNEventName => {
      const currentEventName = tNEventName.split('__event__')[0]
      if (
        eventName == currentEventName &&
        this.getEventName(el, currentEventName) === tNEventName
      ) {
        eventListeners[tNEventName].forEach(listener => {
          el.removeEventListener(currentEventName.split('.')[0],listener)
        })
        delete eventListeners[tNEventName]
      }
    })
  }
}
