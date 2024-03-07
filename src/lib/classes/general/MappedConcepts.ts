import type { IMappedRows, IMappedRowsConcept } from '$lib/components/Types'
import { mappedToConceptIds } from '$lib/store'

export default class MappedConcepts {
  static async updateMappedConceptsBib(updatedConcept: IMappedRows) {
    mappedToConceptIds.update(concepts => (concepts = this.addMappedConceptsToBib(concepts, updatedConcept)))
  }

  static async deleteConceptInMappedConceptsBib(sourceCode: string, conceptId: number) {
    mappedToConceptIds.update(concepts => (concepts = this.deleteMappedConceptsInBib(concepts, sourceCode, conceptId)))
  }

  private static addMappedConceptsToBib(currentConcepts: IMappedRows, updatedConcepts: IMappedRows) {
    for (let [sourceCode, conceptIds] of Object.entries(updatedConcepts))
      currentConcepts = this.addMappedConceptToBib(currentConcepts, sourceCode, conceptIds)
    return currentConcepts
  }

  private static addMappedConceptToBib(currentConcepts: IMappedRows, sourceCode: string, concepts: IMappedRowsConcept) {
    if (!currentConcepts[sourceCode]) {
      currentConcepts[sourceCode] = concepts
      return currentConcepts
    }
    for (let [conceptId, mappingStatus] of Object.entries(concepts))
      currentConcepts[sourceCode][conceptId] = mappingStatus
    return currentConcepts
  }

  private static deleteMappedConceptsInBib(currentConcepts: IMappedRows, sourceCode: string, conceptId: number) {
    const currentRow = currentConcepts[sourceCode]
    if (!currentRow) return currentConcepts
    delete currentRow[conceptId]
    return currentConcepts
  }

  static async getMappedConceptsBib(): Promise<IMappedRows> {
    return new Promise(resolve =>
      mappedToConceptIds.subscribe(concepts => {
        if (!concepts) throw new Error('Concepts not found')
        resolve(concepts)
      }),
    )
  }
}
