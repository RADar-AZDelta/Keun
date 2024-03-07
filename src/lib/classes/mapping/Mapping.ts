import SingleMapping from '$lib/classes/mapping/SingleMapping'
import MultipleMapping from '$lib/classes/mapping/MultipleMapping'
import Table from '../tables/Table'
import Settings from '../general/Settings'
import type { IAthenaInfo, IMappingExtra } from '$lib/Types'

export default class Mapping {
  static async updateMappingInfo(index: number, mappingInfo: IMappingExtra) {
    await Table.updateTableRow(index, mappingInfo)
  }

  static async mapRow(athenaInfo: IAthenaInfo, equivalence: string, action: string, custom: boolean = false) {
    const mapToMultipleConcepts = await Settings.getMappingToMultiple()
    if (mapToMultipleConcepts) await MultipleMapping.multipleMapping(athenaInfo, action, equivalence, custom)
    else await SingleMapping.singleMapping(athenaInfo, action, equivalence, custom)
  }
}
