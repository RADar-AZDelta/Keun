import { user } from '$lib/store'
import type {
  ICustomConcept,
  ICustomConceptInput,
  IExtraUsagiCols,
  IUsagiAllExtra,
  IUsagiRow,
} from '$lib/components/Types'
import { Config } from './helperClasses/Config'

const additionalFields: IExtraUsagiCols = Config.additionalColumns

// A method to fill in the additional fields of a row
export async function addExtraFields(row: IUsagiRow): Promise<IUsagiRow> {
  let author: string | null | undefined = ''
  user.subscribe(user => (author = user.name))
  const extra: IExtraUsagiCols = {
    statusSetBy: author,
    statusSetOn: new Date().getTime(),
    matchScore: 0,
    mappingType: null,
    comment: null,
    assignedReviewer: null,
    'ADD_INFO:approvedBy': null,
    'ADD_INFO:approvedOn': null,
    'ADD_INFO:numberOfConcepts': null,
    'ADD_INFO:customConcept': null,
  }
  if (row.createdBy && row.createdBy !== author) {
    extra.createdBy = author
    extra.createdOn = new Date().getTime()
    extra['ADD_INFO:customConcept'] = null
  }
  Object.assign(row, extra)
  return row
}

export async function resetRow() {
  const reset: IUsagiAllExtra = additionalFields
  reset.conceptId = null
  reset.domainId = null
  reset.vocabularyId = null
  reset.conceptName = null
  delete reset.sourceAutoAssignedConceptIds
  return reset
}

export async function transformFromCustomRowToUsagiRow(custom: ICustomConceptInput) {
  const usagiRow: ICustomConcept = {
    conceptId: custom.concept_id,
    conceptName: custom.concept_name,
    domainId: custom.domain_id,
    vocabularyId: custom.vocabulary_id,
    conceptClassId: custom.concept_class_id,
    standardConcept: custom.standard_concept,
    conceptCode: custom.concept_code,
    validStartDate: custom.valid_start_date,
    validEndDate: custom.valid_end_date,
    invalidReason: custom.invalid_reason,
  }
  return usagiRow
}
