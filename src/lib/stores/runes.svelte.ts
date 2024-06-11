import Config from '$lib/helpers/Config'
import type { IMappedRows, ISettings } from '$lib/interfaces/Types'

let _settings = $state(Config.defaultSettings)
let _abortAutomapping = $state(false)
let _triggerAutoMapping = $state(false)
let _mappedToConceptIds: IMappedRows = $state({})
let _disableActions = $state(false)
let _user = $state<string>()

export function createSettings() {
  const updateProp = (prop: string, value: any) => (_settings[prop] = value)
  const update = (newSettings: ISettings) => (_settings = newSettings)

  return {
    get value() {
      return _settings
    },
    updateProp,
    update,
  }
}

export function createAbortAutoMapping() {
  const update = (value: boolean) => (_abortAutomapping = value)

  return {
    get value() {
      return _abortAutomapping
    },
    update,
  }
}

export function createTriggerAutoMapping() {
  const update = (value: boolean) => (_triggerAutoMapping = value)

  return {
    get value() {
      return _triggerAutoMapping
    },
    update,
  }
}

export function createMappedToConceptIds() {
  const update = (value: IMappedRows) => (_mappedToConceptIds = value)

  return {
    get value() {
      return _mappedToConceptIds
    },
    update,
  }
}

export function createDisableActions() {
  const update = (value: boolean) => (_disableActions = value)

  return {
    get value() {
      return _disableActions
    },
    update,
  }
}

export function createUser() {
  const update = (value: string) => (_user = value)

  return {
    get value() {
      return _user
    },
    update,
  }
}
