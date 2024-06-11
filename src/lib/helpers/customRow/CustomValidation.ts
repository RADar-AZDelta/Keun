import Config from '$lib/helpers/Config'
import Database from '$lib/helpers/Database'

export default class CustomValidation {
  private static input: Record<string, string> = {}
  private static error: boolean = false

  static async validateRow(input: Record<string, string>, create: boolean = false) {
    await this.reset(input)
    await this.checkForEmptyProperties()
    await this.checkForInvalidDomain()
    await this.checkForInvalidConceptClassId()
    await this.checkForInvalidConceptName()
    if (create) await this.checkForExistingConceptName()
    return this.error
  }

  private static async reset(input: Record<string, string>) {
    this.input = input
    this.error = false
  }

  private static async checkForEmptyProperties() {
    const empties: string[] = []
    for (const [property, value] of Object.entries(this.input)) if (!value) empties.push(property)
    if (!empties.length) return
    this.error = true
    throw new Error(`The following properties can't be empty: ${empties}`)
  }

  private static async checkForInvalidDomain() {
    const { domain_id } = this.input
    const validDomains = Config.customConceptInfo['domain_id']
    if (validDomains.includes(domain_id)) return
    this.error = true
    throw new Error('The domain must be one of the suggested values')
  }

  private static async checkForInvalidConceptClassId() {
    const { concept_class_id } = this.input
    const validConceptClassIds = Config.customConceptInfo['concept_class_id']
    if (validConceptClassIds.includes(concept_class_id)) return
    this.error = true
    throw new Error('The className must be one of the suggested values')
  }

  private static async checkForInvalidConceptName() {
    const { concept_name } = this.input
    if (!concept_name.includes('/')) return
    this.error = true
    throw new Error('The concept name can not contain a / character')
  }

  private static async checkForExistingConceptName() {
    const { concept_name } = this.input
    const customConceptWithNameExists = await Database.checkForCustomConceptWithSameName(concept_name)
    if (!customConceptWithNameExists) return
    this.error = true
    throw new Error('There already exists a custom concept with the same name')
  }
}
