// @ts-expect-error There is an error with this package because this type is not exported correctly
import { LatencyOptimisedTranslator } from '@browsermt/bergamot-translator/translator.js'
import { browser, dev } from '$app/environment'

export class BergamotTranslator {
  translator: LatencyOptimisedTranslator
  constructor() {
    const registryUrl = dev ? 'bergamot/dev-registry.json' : '/Keun/bergamot/registry.json'
    this.translator = new LatencyOptimisedTranslator({ workers: 1, batchSize: 1, registryUrl, html: true }, undefined)
  }

  // A method to translate text
  async translate(text: string, language: string): Promise<string> {
    // Check the settings and if the language set is not english, translate the text
    if (!browser || !language || language === 'en') return text
    const translation = await this.translator.translate({ from: language, to: 'en', text: text, html: true })
    return translation.target.text
  }
}
