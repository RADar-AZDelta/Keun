import { user } from '$lib/store'
import additionalColumns from '$lib/data/additionalColumns.json'

const additionalFields: Record<string, any> = additionalColumns

// A method to fill in the additional fields of a row
export async function fillInAdditionalFields(
    row: Record<string, any>,
    usagiRow: Record<string, any>,
    autoMap: boolean
): Promise<Record<string, any>> {
    let author: string | null | undefined = ''
    user.subscribe((user) => author = user.name)
    const extra: Record<string, any> = {
        statusSetBy: author,
        statusSetOn: new Date(),
        matchScore: 0,
        mappingType: null,
        comment: null,
        assignedReviewer: null,
        'ADD_INFO:approvedBy': null,
        'ADD_INFO:approvedOn': null,
        'ADD_INFO:numberOfConcepts': null,
        "ADD_INFO:customConcept": null,
    }
    if ((!usagiRow.statusSetBy || usagiRow.statusSetBy == author) && !autoMap) extra.mappingStatus = 'SEMI-APPROVED'
    if (usagiRow.createdBy && usagiRow.createdBy !== author) {
        extra.createdBy = author
        extra.createdOn = new Date()
        extra['ADD_INFO:customConcept'] = null
    }
    return row
}

export async function resetRow() {
    const reset = additionalFields
    reset.conceptId = null
    reset.domainId = null
    reset.conceptName = null
    delete reset.sourceAutoAssignedConceptIds
    return reset
}