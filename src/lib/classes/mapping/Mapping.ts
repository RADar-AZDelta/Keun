import StoreMethods from '$lib/classes/StoreMethods'
import SingleMapping from '$lib/classes/mapping/SingleMapping'
import MultipleMapping from '$lib/classes/mapping/MultipleMapping'
import type { IAthenaInfo, IMappingExtra } from '$lib/components/Types'

export default class Mapping {
  static async updateMappingInfo(index: number, mappingInfo: IMappingExtra) {
    await StoreMethods.updateTableRow(index, mappingInfo)
  }

  static async mapRow(athenaInfo: IAthenaInfo, equivalence: string, action: string, custom: boolean = false) {
    const settings = await StoreMethods.getSettings()
    const { mapToMultipleConcepts } = settings
    if (mapToMultipleConcepts) await MultipleMapping.multipleMapping(athenaInfo, action, equivalence, custom)
    else await SingleMapping.singleMapping(athenaInfo, action, equivalence, custom)
  }
}
