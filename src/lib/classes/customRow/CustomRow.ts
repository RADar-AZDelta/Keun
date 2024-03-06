import { reformatDate } from '@radar-azdelta-int/radar-utils'
import Mapping from '$lib/classes/mapping/Mapping'
import StoreMethods from '$lib/classes/StoreMethods'
import type {
  IAthenaRow,
  ICustomConcept,
  ICustomConceptCompact,
  ICustomConceptInput,
  IUsagiRow,
} from '$lib/components/Types'

export default class CustomRow {
  customRow: ICustomConceptCompact
  usagiRow: IUsagiRow
  usagiRowIndex: number

  constructor(customRow: ICustomConceptCompact, usagiRow: IUsagiRow, usagiRowIndex: number) {
    this.customRow = customRow
    this.usagiRow = usagiRow
    this.usagiRowIndex = usagiRowIndex
  }

  async mapCustomConcept(action: string, equivalence: string) {
    const customConcept = await this.addDetailToCustomConcept()
    const concept = await this.createCustomConcept()
    const transformedConcept = await this.transformCustomConceptToAthenaFormat(concept, equivalence)
    const rowMappingInfo = { usagiRow: this.usagiRow, usagiRowIndex: this.usagiRowIndex, athenaRow: transformedConcept }
    await Mapping.mapRow(rowMappingInfo, equivalence, action, true)
    await StoreMethods.updateMappedConceptsBib({
      [this.usagiRow.sourceCode]: {
        [`custom-${this.customRow.concept_name}`]: action,
      },
    })
    await StoreMethods.insertCustomTableRow(customConcept)
  }

  private async addDetailToCustomConcept() {
    const customConcept: ICustomConceptInput = {
      ...this.customRow,
      concept_id: 0,
      concept_code: '',
      valid_start_date: reformatDate(),
      valid_end_date: '2099-12-31',
      invalid_reason: '',
      standard_concept: '',
    }
    return customConcept
  }

  private async createCustomConcept() {
    const compactConcept = this.customRow
    const { concept_name, domain_id, vocabulary_id, concept_class_id } = compactConcept
    const concept: ICustomConcept = {
      conceptId: 0,
      conceptName: concept_name,
      domainId: domain_id,
      vocabularyId: vocabulary_id,
      conceptClassId: concept_class_id,
      standardConcept: '',
      conceptCode: this.usagiRow.sourceCode,
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
