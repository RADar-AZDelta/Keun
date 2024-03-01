import { reformatDate } from '@radar-azdelta-int/radar-utils'
import Mapping from './Mapping'
import StoreMethods from './StoreMethods'
import type { IAthenaRow, ICustomConcept, ICustomConceptCompact, IUsagiRow } from '$lib/components/Types'

export default class CustomRowActions {
  row: ICustomConceptCompact
  sourceCode: string
  usagiRow: IUsagiRow
  usagiRowIndex: number

  constructor(row: ICustomConceptCompact, usagiRow: IUsagiRow, usagiRowIndex: number) {
    this.row = row
    this.sourceCode = usagiRow.sourceCode
    this.usagiRow = usagiRow
    this.usagiRowIndex = usagiRowIndex
  }

  async mapCustomConcept(action: string, equivalence: string) {
    const concept = await this.createCustomConcept()
    const transformedConcept = await this.transformCustomConceptToAthenaFormat(concept, equivalence)
    const rowMappingInfo = { usagiRow: this.usagiRow, usagiRowIndex: this.usagiRowIndex, athenaRow: transformedConcept }
    await Mapping.mapRow(rowMappingInfo, equivalence, action)
    await StoreMethods.insertCustomTableRow(concept)
  }

  private async createCustomConcept() {
    const compactConcept = this.row
    const { concept_name, domain_id, vocabulary_id, concept_class_id } = compactConcept
    const concept: ICustomConcept = {
      conceptId: 0,
      conceptName: concept_name,
      domainId: domain_id,
      vocabularyId: vocabulary_id,
      conceptClassId: concept_class_id,
      standardConcept: '',
      conceptCode: this.sourceCode,
      validStartDate: reformatDate(),
      validEndDate: '2099-12-31',
      invalidReason: '',
    }
    return concept
  }

  private async transformCustomConceptToAthenaFormat(customConcept: ICustomConcept, equivalence: string) {
    const { conceptId, conceptName, domainId, vocabularyId, conceptClassId, conceptCode, invalidReason } = customConcept
    const concept: IAthenaRow = {
      id: conceptId,
      name: conceptName,
      domain: domainId,
      vocabulary: vocabularyId,
      className: conceptClassId,
      standardConcept: '',
      code: conceptCode,
      equivalence,
      invalidReason,
      score: 0,
    }
    return concept
  }
}
