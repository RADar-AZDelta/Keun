import { mappedToConceptIds } from '$lib/store'
import Settings from './Settings'
import type { IMappedRows, IMappedRowsConcept } from '$lib/Types'

export default class MappedConcepts {
  static async resetMappedConceptsBib() {
    mappedToConceptIds.set({})
  }

  static async updateMappedConceptsBib(updatedConcept: IMappedRows) {
    const multipleMapping = await Settings.getMappingToMultiple()
    mappedToConceptIds.update(
      concepts => (concepts = this.addMappedConceptsToBib(concepts, updatedConcept, multipleMapping)),
    )
  }

  static async deleteConceptInMappedConceptsBib(sourceCode: string, conceptId: number) {
    mappedToConceptIds.update(concepts => (concepts = this.deleteMappedConceptsInBib(concepts, sourceCode, conceptId)))
  }

  private static addMappedConceptsToBib(
    currentConcepts: IMappedRows,
    updatedConcepts: IMappedRows,
    multipleMapping: boolean,
  ) {
    for (let [sourceCode, conceptIds] of Object.entries(updatedConcepts))
      currentConcepts = this.addMappedConceptToBib(currentConcepts, sourceCode, conceptIds, multipleMapping)
    return currentConcepts
  }

  private static addMappedConceptToBib(
    currentConcepts: IMappedRows,
    sourceCode: string,
    concepts: IMappedRowsConcept,
    multipleMapping: boolean,
  ) {
    if (currentConcepts[sourceCode] && !multipleMapping) {
      const lastKey = Object.keys(currentConcepts[sourceCode]).at(-1)
      if (lastKey) delete currentConcepts[sourceCode][lastKey]
    }
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
