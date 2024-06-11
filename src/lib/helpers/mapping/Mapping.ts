import Usagi from '$lib/helpers/usagi/Usagi'
import Table from '$lib/helpers/tables/Table'
import Settings from '$lib/helpers/general/Settings'
import SingleMapping from '$lib/helpers/mapping/SingleMapping'
import MultipleMapping from '$lib/helpers/mapping/MultipleMapping'
import type { IAthenaInfo, ICustomConceptCompact, IMappingExtra, IUsagiRow } from '$lib/interfaces/Types'

export default class Mapping {
  static async updateMappingInfo(index: number, mappingInfo: IMappingExtra) {
    await Table.updateTableRow(index, mappingInfo)
  }

  static async mapRow(athenaInfo: IAthenaInfo, equivalence: string, action: string, custom: boolean = false) {
    const mapToMultipleConcepts = await Settings.getMappingToMultiple()
    if (mapToMultipleConcepts) await MultipleMapping.multipleMapping(athenaInfo, action, equivalence, custom)
    else await SingleMapping.singleMapping(athenaInfo, action, equivalence, custom)
  }

  static async updateRowMappingToUpdatedCustom(usagiRow: IUsagiRow, index: number, newCustom: ICustomConceptCompact) {
    const { concept_name, concept_class_id, domain_id, vocabulary_id } = newCustom
    const row = new Usagi(usagiRow, index)
    await row.updatePropertyValue('conceptName', concept_name)
    await row.updatePropertyValue('className', concept_class_id)
    await row.updatePropertyValue('domainId', domain_id)
    await row.updatePropertyValue('vocabularyId', vocabulary_id)
  }
}
